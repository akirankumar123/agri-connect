// Simple serverless endpoint for sending SMS via Twilio (if configured)
// Fallback: returns success mock when Twilio env vars are not provided

import { URLSearchParams } from 'url';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { to, message } = req.body || {};
  if (!to || !message) {
    res.status(400).json({ error: 'Missing `to` or `message` in request body' });
    return;
  }

  const SID = process.env.TWILIO_ACCOUNT_SID;
  const AUTH = process.env.TWILIO_AUTH_TOKEN;
  const FROM = process.env.TWILIO_FROM;

  // If Twilio is configured, forward the request
  if (SID && AUTH && FROM) {
    try {
      const params = new URLSearchParams();
      params.append('To', to);
      params.append('From', FROM);
      params.append('Body', message);

      const auth = Buffer.from(`${SID}:${AUTH}`).toString('base64');
      const resp = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${SID}/Messages.json`, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: params.toString()
      });

      const data = await resp.json();
      if (resp.ok) {
        res.status(200).json({ success: true, sid: data.sid });
      } else {
        console.error('Twilio error:', data);
        res.status(500).json({ success: false, error: data });
      }
    } catch (error: any) {
      console.error('Error sending SMS via Twilio:', error);
      res.status(500).json({ success: false, error: String(error) });
    }
    return;
  }

  // Mock response when Twilio not configured
  console.log('TWILIO not configured - mocking SMS send to', to);
  res.status(200).json({ success: true, mock: true });
}
