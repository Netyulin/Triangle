import assert from 'node:assert/strict';

export const BASE_URL = process.env.BASE_URL || 'http://127.0.0.1:3001';

export async function request(path, options = {}) {
  const response = await fetch(new URL(path, BASE_URL), {
    ...options,
    headers: {
      'content-type': 'application/json',
      ...(options.headers || {})
    }
  });

  const text = await response.text();
  let body = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }

  return { response, body };
}

export function assertApiSuccess(result, message) {
  assert.equal(result.response.ok, true, message || `HTTP request failed: ${result.response.status}`);
  assert.equal(result.body?.success, true, message || `API response failed: ${JSON.stringify(result.body)}`);
  assert.equal(result.body?.code, 0, message || `API code was not 0: ${JSON.stringify(result.body)}`);
}

export function assertApiError(result, expectedCode) {
  assert.equal(result.response.ok, false, 'Expected a non-2xx response');
  assert.equal(result.body?.success, false, 'Expected the API success flag to be false');
  if (expectedCode !== undefined) {
    assert.equal(result.body?.code, expectedCode, `Unexpected API error code: ${JSON.stringify(result.body)}`);
  }
}

export async function loginAsAdmin() {
  const login = await request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      username: 'admin',
      password: 'admin123'
    })
  });

  assertApiSuccess(login, 'admin login failed');
  return login.body.data.token;
}

export async function createInviteCode(token, note = 'automated-test') {
  const created = await request('/api/admin/invite-codes/batch', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${token}`
    },
    body: JSON.stringify({
      count: 1,
      note
    })
  });

  assertApiSuccess(created, 'invite code creation failed');
  return created.body.data.codes[0];
}
