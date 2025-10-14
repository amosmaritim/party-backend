import fetch from 'node-fetch';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST')
    return res.status(405).json({ message: 'Method not allowed' });

  const { name, email, phone, amount } = req.body;

  if (!name || !email || !phone || !amount)
    return res.status(400).json({ message: 'Missing fields' });

  try {
    // Step 1: Generate access token
    const auth = Buffer.from(
      `${process.env.DAR_CONSUMER_KEY}:${process.env.DAR_CONSUMER_SECRET}`
    ).toString('base64');

    const tokenRes = await fetch(
      'https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials',
      { headers: { Authorization: `Basic ${auth}` } }
    );
    const { access_token } = await tokenRes.json();

    // Step 2: Generate password
    const timestamp = new Date()
      .toISOString()
      .replace(/[-T:.Z]/g, '')
      .slice(0, 14);
    const password = Buffer.from(
      `${process.env.DAR_BUSINESS_SHORTCODE}${process.env.DAR_PASSKEY}${timestamp}`
    ).toString('base64');

    // Step 3: STK push request
    const stkRes = await fetch(
      'https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          BusinessShortCode: process.env.DAR_BUSINESS_SHORTCODE,
          Password: password,
          Timestamp: timestamp,
          TransactionType: 'CustomerPayBillOnline',
          Amount: amount,
          PartyA: phone,
          PartyB: process.env.DAR_BUSINESS_SHORTCODE,
          PhoneNumber: phone,
          CallBackURL: `${process.env.CALLBACK_BASE_URL}/api/callback`,
          AccountReference: 'PartyPayment',
          TransactionDesc: 'Party ticket payment'
        })
      }
    );

    const stkData = await stkRes.json();

    // Step 4: Save record in Supabase
    await supabase.from('payments').insert([
      { name, email, phone, amount, status: 'pending' }
    ]);

    res.json({ message: 'Payment request sent', data: stkData });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error processing payment', error: err });
  }
}
