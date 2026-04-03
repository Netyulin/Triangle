# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: manual-smoke.spec.js >> triangle frontend smoke >> click through major pages
- Location: output\playwright\manual-smoke.spec.js:4:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('main a[href^="/software/"]').first()
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for locator('main a[href^="/software/"]').first()

```

# Page snapshot

```yaml
- generic [ref=e2]:
  - banner [ref=e3]:
    - generic [ref=e4]:
      - link "TRIANGLE 软件 / 文章 / 需求" [ref=e5] [cursor=pointer]:
        - /url: /
        - img [ref=e7]
        - generic [ref=e9]:
          - generic [ref=e10]: TRIANGLE
          - generic [ref=e11]: 软件 / 文章 / 需求
      - navigation [ref=e12]:
        - link "首页" [ref=e13] [cursor=pointer]:
          - /url: /
        - link "软件库" [ref=e14] [cursor=pointer]:
          - /url: /software
        - link "文章" [ref=e15] [cursor=pointer]:
          - /url: /articles
        - link "需求墙" [ref=e16] [cursor=pointer]:
          - /url: /requests
        - link "搜索" [ref=e17] [cursor=pointer]:
          - /url: /search
      - generic [ref=e19]:
        - img [ref=e20]
        - textbox "搜索软件、文章或需求" [ref=e23]
      - generic [ref=e24]:
        - button "切换到深色模式" [ref=e25]:
          - img [ref=e26]
        - generic [ref=e28]:
          - link "登录" [ref=e29] [cursor=pointer]:
            - /url: /login
          - link "注册" [ref=e30] [cursor=pointer]:
            - /url: /register
  - main [ref=e31]:
    - generic [ref=e32]:
      - generic [ref=e33]:
        - generic [ref=e34]:
          - paragraph [ref=e35]: Software Library
          - heading "软件库" [level=1] [ref=e36]
          - paragraph [ref=e37]: 这里展示后端已发布的软件条目，支持按分类筛选，也支持按下载量、更新时间和评分排序。
        - generic [ref=e38]:
          - generic [ref=e39]:
            - paragraph [ref=e40]: 软件总数
            - paragraph [ref=e41]: "0"
          - generic [ref=e42]:
            - paragraph [ref=e43]: 当前结果
            - paragraph [ref=e44]: "0"
          - generic [ref=e45]:
            - paragraph [ref=e46]: 推荐条目
            - paragraph [ref=e47]: "0"
          - generic [ref=e48]:
            - paragraph [ref=e49]: 分类数量
            - paragraph [ref=e50]: "0"
      - generic [ref=e51]:
        - generic [ref=e52]:
          - img [ref=e53]
          - textbox "搜索软件名、简介或标签" [ref=e56]
        - generic [ref=e57]:
          - button "推荐优先" [ref=e58]:
            - img [ref=e59]
            - text: 推荐优先
          - button "按下载量" [ref=e61]:
            - img [ref=e62]
            - text: 按下载量
          - button "最近更新" [ref=e64]:
            - img [ref=e65]
            - text: 最近更新
          - button "按评分" [ref=e67]:
            - img [ref=e68]
            - text: 按评分
      - button "全部 (0)" [ref=e71]
    - generic [ref=e72]: 软件列表加载中...
  - contentinfo [ref=e73]:
    - generic [ref=e75]:
      - generic [ref=e76]:
        - link "Triangle 软件 / 文章 / 需求" [ref=e77] [cursor=pointer]:
          - /url: /
          - img [ref=e79]
          - generic [ref=e81]:
            - generic [ref=e82]: Triangle
            - generic [ref=e83]: 软件 / 文章 / 需求
        - paragraph [ref=e84]: 把软件、文章和真实需求放到一个清楚的入口里。
      - generic [ref=e85]:
        - heading "站点入口" [level=3] [ref=e86]
        - list [ref=e87]:
          - listitem [ref=e88]:
            - link "首页" [ref=e89] [cursor=pointer]:
              - /url: /
          - listitem [ref=e90]:
            - link "软件库" [ref=e91] [cursor=pointer]:
              - /url: /software
          - listitem [ref=e92]:
            - link "文章" [ref=e93] [cursor=pointer]:
              - /url: /articles
          - listitem [ref=e94]:
            - link "需求墙" [ref=e95] [cursor=pointer]:
              - /url: /requests
      - generic [ref=e96]:
        - heading "账号功能" [level=3] [ref=e97]
        - list [ref=e98]:
          - listitem [ref=e99]:
            - link "登录" [ref=e100] [cursor=pointer]:
              - /url: /login
          - listitem [ref=e101]:
            - link "注册" [ref=e102] [cursor=pointer]:
              - /url: /register
          - listitem [ref=e103]:
            - link "个人中心" [ref=e104] [cursor=pointer]:
              - /url: /profile
          - listitem [ref=e105]:
            - link "搜索" [ref=e106] [cursor=pointer]:
              - /url: /search
      - generic [ref=e107]:
        - heading "页面语言" [level=3] [ref=e108]
        - generic [ref=e109]:
          - button "简体中文" [ref=e110]
          - button "繁體中文" [ref=e111]
          - button "English" [ref=e112]
```

# Test source

```ts
  1  | const { test, expect } = require('@playwright/test');
  2  | 
  3  | test.describe('triangle frontend smoke', () => {
  4  |   test('click through major pages', async ({ page }) => {
  5  |     test.setTimeout(120000);
  6  | 
  7  |     await page.goto('http://127.0.0.1:3000/', { waitUntil: 'networkidle' });
  8  |     await expect(page.getByRole('heading', { name: '编辑推荐' }).first()).toBeVisible();
  9  |     await expect(page.getByRole('heading', { name: '软件下载排行' }).first()).toBeVisible();
  10 | 
  11 |     await page.goto('http://127.0.0.1:3000/software', { waitUntil: 'networkidle' });
  12 |     await expect(page.getByRole('heading', { name: '软件库' })).toBeVisible();
  13 |     const firstSoftware = page.locator('main a[href^="/software/"]').first();
> 14 |     await expect(firstSoftware).toBeVisible();
     |                                 ^ Error: expect(locator).toBeVisible() failed
  15 |     await firstSoftware.click();
  16 |     await page.waitForLoadState('networkidle');
  17 |     await expect(page.locator('main')).toContainText('软件简介');
  18 | 
  19 |     await page.goto('http://127.0.0.1:3000/articles', { waitUntil: 'networkidle' });
  20 |     await expect(page.getByRole('heading', { name: '文章列表' })).toBeVisible();
  21 |     const firstArticle = page.locator('main a[href^="/articles/"]').first();
  22 |     await expect(firstArticle).toBeVisible();
  23 |     await firstArticle.click();
  24 |     await page.waitForLoadState('networkidle');
  25 |     await expect(page.locator('main')).toContainText('收藏文章');
  26 | 
  27 |     await page.goto('http://127.0.0.1:3000/search', { waitUntil: 'networkidle' });
  28 |     await expect(page.getByRole('heading', { name: '站内搜索' })).toBeVisible();
  29 |     await page.getByPlaceholder('输入关键词，搜索软件、文章和需求').fill('figma');
  30 |     await page.getByRole('button', { name: '搜索' }).click();
  31 |     await page.waitForLoadState('networkidle');
  32 |     await expect(page).toHaveURL(/\/search\?q=figma/);
  33 |     await expect(page.locator('main')).toContainText('figma');
  34 | 
  35 |     await page.goto('http://127.0.0.1:3000/requests', { waitUntil: 'networkidle' });
  36 |     await expect(page.getByRole('heading', { name: '需求墙' })).toBeVisible();
  37 |     await page.getByRole('button', { name: '发布新需求' }).click();
  38 |     await expect(page.getByRole('heading', { name: '发布需求' })).toBeVisible();
  39 |     await page.getByRole('button', { name: '取消' }).click();
  40 |     await expect(page.getByRole('button', { name: '发布新需求' })).toBeVisible();
  41 | 
  42 |     await page.goto('http://127.0.0.1:3000/register', { waitUntil: 'networkidle' });
  43 |     await expect(page.getByRole('heading', { name: '注册账号' })).toBeVisible();
  44 | 
  45 |     await page.goto('http://127.0.0.1:3000/login', { waitUntil: 'networkidle' });
  46 |     await expect(page.getByRole('heading', { name: '登录' })).toBeVisible();
  47 |     await page.getByPlaceholder('请输入用户名').fill('admin');
  48 |     await page.getByPlaceholder('请输入密码').fill('admin123');
  49 |     await page.getByRole('button', { name: '立即登录' }).click();
  50 |     await page.waitForURL('**/profile');
  51 |     await page.waitForLoadState('networkidle');
  52 |     await expect(page.locator('main')).toContainText('今日剩余下载');
  53 | 
  54 |     await page.getByRole('button', { name: '收藏' }).click();
  55 |     await expect(page.locator('main')).toContainText('我的收藏');
  56 |     await page.getByRole('button', { name: '需求' }).click();
  57 |     await expect(page.locator('main')).toContainText('我的需求');
  58 |     await page.getByRole('button', { name: '充值' }).click();
  59 |     await expect(page.locator('main')).toContainText('立即充值');
  60 | 
  61 |     await page.goto('http://127.0.0.1:3000/requests', { waitUntil: 'networkidle' });
  62 |     await page.getByRole('button', { name: '查看我的需求' }).click();
  63 |     await page.waitForLoadState('networkidle');
  64 |     await expect(page.locator('main')).toContainText('返回公开需求');
  65 |   });
  66 | });
  67 | 
```