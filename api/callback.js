import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  try {
    const body = req.body;
    console.log('Callback received:', body);

    const result = body?.Body?.stkCallback?.ResultDesc || 'Unknown';
    const phone =
      body?.Body?.stkCallback?.CallbackMetadata?.Item?.find(
        (i) => i.Name === 'PhoneNumber'
      )?.Value;

    if (phone && result.includes('Success')) {
      await supabase
        .from('payments')
        .update({ status: 'paid' })
        .eq('phone', phone);
    }

    res.status(200).json({ message: 'Callback processed' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Error' });
  }
}
