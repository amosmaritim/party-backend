import { createClient } from '@supabase/supabase-js';

const REQUIRED_ENV_VARS = [
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'DAR_CONSUMER_KEY',
  'DAR_CONSUMER_SECRET',
  'DAR_BUSINESS_SHORTCODE',
  'DAR_PASSKEY',
  'CALLBACK_BASE_URL'
];

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

const normalizePhone = (raw) => {
  if (!raw) return null;
  const digits = raw.replace(/\D/g, '');
  if (digits.startsWith('254') && digits.length === 12) return digits;
  if (digits.startsWith('0') && digits.length === 10) return `254${digits.slice(1)}`;
  if (digits.startsWith('7') && digits.length === 9) return `254${digits}`;
  return null;
};

const mpesaTimestamp = () =>
  new Date().toISOString().replace(/[-T:.Z]/g, '').slice(0, 14);

async function requestAccessToken() {
  const credentials = Buffer.from(
    `${process.env.DAR_CONSUMER_KEY}:${process.env.DAR_CONSUMER_SECRET}`
  ).toString('base64');

  const response = await fetch(
    'https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials',
    { headers: { Authorization: `Basic ${credentials}` } }
  );

  if (!response.ok) {
    throw new Error('Failed to obtain M-Pesa access token');
  }

  const data = await response.json();
  if (!data.access_token) throw new Error('No access token returned by M-Pesa');
  return data.access_token;
}

async function initiateStkPush(payload, accessToken) {
  const response = await fetch(
    'https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    }
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`STK push request failed: ${text}`);
  }

  return response.json();
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    assertEnv();

    const {
      name,
      email,
      phone,
      amount,
      qty = 1,
      eventName = 'General Admission',
      currency = 'KES'
    } = req.body || {};

    const sanitizedName = name?.trim();
    const sanitizedEmail = email?.trim();
    const normalizedPhone = normalizePhone(phone);
    const numericAmount = Number(amount);
    const numericQty = Math.max(1, Math.min(10, Number(qty) || 1));

    if (!sanitizedName || !sanitizedEmail || !normalizedPhone || !numericAmount) {
      return res.status(400).json({ message: 'Missing or invalid fields' });
    }

    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      return res.status(400).json({ message: 'Invalid amount provided' });
    }

    const accessToken = await requestAccessToken();
    const timestamp = mpesaTimestamp();
    const password = Buffer.from(
      `${process.env.DAR_BUSINESS_SHORTCODE}${process.env.DAR_PASSKEY}${timestamp}`
    ).toString('base64');

    const stkPayload = {
      BusinessShortCode: process.env.DAR_BUSINESS_SHORTCODE,
      Password: password,
      Timestamp: timestamp,
      TransactionType: 'CustomerPayBillOnline',
      Amount: Math.round(numericAmount),
      PartyA: normalizedPhone,
      PartyB: process.env.DAR_BUSINESS_SHORTCODE,
      PhoneNumber: normalizedPhone,
      CallBackURL: `${process.env.CALLBACK_BASE_URL}/api/callback`,
      AccountReference: eventName.slice(0, 12),
      TransactionDesc: `Tickets x${numericQty}`
    };

    const stkResponse = await initiateStkPush(stkPayload, accessToken);

    if (stkResponse?.ResponseCode !== '0') {
      return res.status(400).json({
        message:
          stkResponse?.errorMessage ||
          stkResponse?.CustomerMessage ||
          'Failed to initiate payment',
        data: stkResponse
      });
    }

    const paymentRecord = {
      name: sanitizedName,
      email: sanitizedEmail,
      phone: normalizedPhone,
      amount: Math.round(numericAmount),
      qty: numericQty,
      event_name: eventName,
      currency,
      merchant_request_id: stkResponse.MerchantRequestID || null,
      checkout_request_id: stkResponse.CheckoutRequestID || null,
      status: 'pending',
      status_reason: stkResponse.ResponseDescription || null
    };

    const { data, error } = await supabase
      .from('payments')
      .insert(paymentRecord)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return res.status(200).json({
      message:
        stkResponse.CustomerMessage ||
        'Payment request sent. Check your phone for the STK prompt.',
      paymentId: data.id,
      merchantRequestId: data.merchant_request_id,
      checkoutRequestId: data.checkout_request_id
    });
  } catch (err) {
    console.error('Error during STK push:', err);
    return res
      .status(500)
      .json({ message: 'Error processing payment', error: err.message });
  }
}
