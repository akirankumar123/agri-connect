import handler from './send-sms';
import { describe, it, expect, vi, beforeEach } from 'vitest';

function createMockReq(method = 'POST', body: any = {}) {
  return { method, body } as any;
}

function createMockRes() {
  const res: any = {};
  let statusCode = 200;
  let jsonBody: any = null;

  res.status = (code: number) => {
    statusCode = code;
    return res;
  };

  res.json = (body: any) => {
    jsonBody = body;
    res.body = body;
    res.statusCode = statusCode;
    return res;
  };

  return res;
}

describe('API /api/send-sms handler', () => {
  beforeEach(() => {
    delete process.env.TWILIO_ACCOUNT_SID;
    delete process.env.TWILIO_AUTH_TOKEN;
    delete process.env.TWILIO_FROM;
  });

  it('returns 400 when missing parameters', async () => {
    const req = createMockReq('POST', {});
    const res = createMockRes();

    await handler(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.body).toMatchObject({ error: 'Missing `to` or `message` in request body' });
  });

  it('returns mock success when Twilio not configured', async () => {
    const req = createMockReq('POST', { to: '+911234567890', message: 'Test' });
    const res = createMockRes();

    await handler(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject({ success: true, mock: true });
  });
});
