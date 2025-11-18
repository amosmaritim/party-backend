import { createClient } from '@supabase/supabase-js';

const REQUIRED_ENV_VARS = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'];

function assertEnv() {
  const missing = REQUIRED_ENV_VARS.filter((key) => !process.env[key]);
  if (missing.length) {
    throw new Error(`Missing required env variables: ${missing.join(', ')}`);
  }
}

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const getMetadataValue = (items = [], name) =>
  items.find((item) => item?.Name === name)?.Value ?? null;

const parseMpesaTimestamp = (value) => {
  if (!value) return null;
  // M-Pesa formats timestamps as YYYYMMDDHHMMSS
  const padded = `${value}`.padStart(14, '0');
  const dt = `${padded.slice(0, 4)}-${padded.slice(4, 6)}-${padded.slice(
    6,
    8
  )}T${padded.slice(8, 10)}:${padded.slice(10, 12)}:${padded.slice(12, 14)}Z`;
  return new Date(dt).toISOString();
};

async function updatePaymentRecord(updates, identifiers = {}) {
  const { checkoutRequestId, merchantRequestId, phone } = identifiers;

  if (!checkoutRequestId && !merchantRequestId && !phone) {
    throw new Error('Callback missing identifiers to update payment record');
  }

  const baseQuery = supabase.from('payments').update(updates);

  if (checkoutRequestId) baseQuery.eq('checkout_request_id', checkoutRequestId);
  if (merchantRequestId) baseQuery.eq('merchant_request_id', merchantRequestId);

  let { data, error } = await baseQuery.select('id');
  if (error) throw error;

  if (!data?.length && phone) {
    // Fallback: update the latest pending payment for this phone number
    const { data: candidate, error: lookupError } = await supabase
      .from('payments')
      .select('id')
      .eq('phone', phone)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(1);

    if (lookupError) throw lookupError;
    if (candidate?.[0]?.id) {
      const { error: fallbackError } = await supabase
        .from('payments')
        .update(updates)
        .eq('id', candidate[0].id);
      if (fallbackError) throw fallbackError;
      data = candidate;
    }
  }

  return data;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    assertEnv();

    const callback = req.body?.Body?.stkCallback;
    if (!callback) {
      return res.status(400).json({ message: 'Invalid callback payload' });
    }

    const {
      CheckoutRequestID,
      MerchantRequestID,
      ResultCode,
      ResultDesc
    } = callback;

    const metadataItems = callback?.CallbackMetadata?.Item || [];
    const amount = getMetadataValue(metadataItems, 'Amount');
    const receipt = getMetadataValue(metadataItems, 'MpesaReceiptNumber');
    const phone = getMetadataValue(metadataItems, 'PhoneNumber');
    const transactionDate = getMetadataValue(metadataItems, 'TransactionDate');

    const status = Number(ResultCode) === 0 ? 'paid' : 'failed';
    const paidAt =
      Number(ResultCode) === 0
        ? parseMpesaTimestamp(transactionDate) || new Date().toISOString()
        : null;

    await updatePaymentRecord(
      {
        status,
        status_reason: ResultDesc || null,
        paid_amount: amount ? Number(amount) : null,
        mpesa_receipt: receipt || null,
        phone: phone || null,
        paid_at: paidAt
      },
      {
        checkoutRequestId: CheckoutRequestID || null,
        merchantRequestId: MerchantRequestID || null,
        phone
      }
    );

    return res.status(200).json({ message: 'Callback processed' });
  } catch (e) {
    console.error('Callback processing error:', e);
    return res.status(500).json({ message: 'Error processing callback' });
  }
}
