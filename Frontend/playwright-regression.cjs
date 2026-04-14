const { chromium } = require('playwright');
(async () => {
  const api = 'http://127.0.0.1:58085';
  const loginResp = await fetch(`${api}/api/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: 'admin', password: 'admin123' }) });
  const loginJson = await loginResp.json();
  const token = loginJson.data.token;
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto('http://127.0.0.1:3004/admin/app-categories', { waitUntil: 'domcontentloaded' });
  const result = await page.evaluate(async (tk) => {
    const response = await fetch('/api/admin/post-categories/%E8%BD%AF%E4%BB%B6%E6%8E%A8%E8%8D%90', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-Token': tk,
      },
      body: JSON.stringify({ name: '软件推荐' }),
    });
    return {
      status: response.status,
      json: await response.json(),
    };
  }, token);
  console.log(JSON.stringify(result, null, 2));
  await browser.close();
})();
