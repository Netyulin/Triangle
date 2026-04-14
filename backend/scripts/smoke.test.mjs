import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { request, assertApiSuccess, createInviteCode, loginAsAdmin } from './test-helpers.mjs';

async function main() {
  const health = await request('/health');
  assertApiSuccess(health, 'health check failed');

  const home = await request('/api/home');
  assertApiSuccess(home, 'home summary failed');
  if (!Array.isArray(home.body.data?.heroSlides) || !Array.isArray(home.body.data?.softwareRankings)) {
    throw new Error(`unexpected home summary payload: ${JSON.stringify(home.body.data)}`);
  }

  const apps = await request('/api/apps?page=1&pageSize=5');
  assertApiSuccess(apps, 'apps list failed');

  const categories = await request('/api/apps/categories');
  assertApiSuccess(categories, 'app categories failed');
  if (!Array.isArray(categories.body.data)) {
    throw new Error(`unexpected categories payload: ${JSON.stringify(categories.body.data)}`);
  }

  const posts = await request('/api/posts?page=1&pageSize=5');
  assertApiSuccess(posts, 'posts list failed');

  const topics = await request('/api/topics/all');
  assertApiSuccess(topics, 'topics list failed');
  if (!Array.isArray(topics.body.data)) {
    throw new Error(`unexpected topics payload: ${JSON.stringify(topics.body.data)}`);
  }

  const search = await request('/api/search?q=figma&type=all&page=1&pageSize=6');
  assertApiSuccess(search, 'search failed');

  const requestSearch = await request('/api/search?q=Affinity&type=request&page=1&pageSize=5');
  assertApiSuccess(requestSearch, 'request search failed');
  if (!Array.isArray(requestSearch.body.data?.requests) || typeof requestSearch.body.data?.totalRequests !== 'number') {
    throw new Error(`unexpected request search payload: ${JSON.stringify(requestSearch.body.data)}`);
  }

  const temp = randomUUID().slice(0, 8);
  const username = `smoke_${temp}`;
  const email = `${username}@triangle-portal.com`;
  const adminToken = await loginAsAdmin();
  const inviteCode = await createInviteCode(adminToken, 'smoke-test');

  const register = await request('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      username,
      email,
      password: 'Smoke123456',
      name: 'Smoke User',
      gender: 'male',
      phone: '13800138000',
      inviteCode
    })
  });
  assertApiSuccess(register, 'register failed');
  if (register.body.data?.user?.role !== 'reader') {
    throw new Error(`expected registered user role to be reader, got ${register.body.data?.user?.role}`);
  }
  if (register.body.data?.permissions?.role !== 'reader') {
    throw new Error(`expected registered permissions role to be reader, got ${register.body.data?.permissions?.role}`);
  }

  const token = register.body.data.token;

  const permissions = await request('/api/auth/permissions', {
    headers: {
      authorization: `Bearer ${token}`
    }
  });
  assertApiSuccess(permissions, 'permissions failed');
  if (permissions.body.data?.canComment !== true || permissions.body.data?.canSubmitRequest !== true) {
    throw new Error(`unexpected permissions payload: ${JSON.stringify(permissions.body.data)}`);
  }

  const login = await request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      username,
      password: 'Smoke123456'
    })
  });
  assertApiSuccess(login, 'login failed');
  if (login.body.data?.user?.role !== 'reader') {
    throw new Error(`expected login user role to be reader, got ${login.body.data?.user?.role}`);
  }

  console.log('smoke passed');
}

main().catch((error) => {
  console.error('smoke failed');
  console.error(error);
  process.exit(1);
});
