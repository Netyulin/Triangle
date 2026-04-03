import { randomUUID } from 'node:crypto';
import { request, assertApiSuccess, assertApiError, createInviteCode, loginAsAdmin } from './test-helpers.mjs';
import prisma from '../src/utils/prisma.js';

const tempSuffix = randomUUID().slice(0, 8);
const tempAppSlug = `temp-app-${tempSuffix}`;
const tempPostSlug = `temp-post-${tempSuffix}`;
const tempTopicSlug = `temp-topic-${tempSuffix}`;
const tempReaderUsername = `reader_${tempSuffix}`;
const tempReaderPassword = 'Pass12345';

async function main() {
  const token = await loginAsAdmin();
  const inviteCode = await createInviteCode(token, 'regression-test');
  const originalSettingsResult = await request('/api/admin/settings', {
    headers: {
      authorization: `Bearer ${token}`
    }
  });
  assertApiSuccess(originalSettingsResult, 'load original settings failed');
  const originalSettings = originalSettingsResult.body.data;

  const importFromPaste = await request('/api/posts/import-from-url', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${token}`
    },
    body: JSON.stringify({
      rawContent: '<article><h1>Imported Post</h1><p>This is the first paragraph.</p><p>This is the second paragraph.</p></article>'
    })
  });
  assertApiSuccess(importFromPaste, 'import from pasted content failed');
  const imported = importFromPaste.body.data || {};
  const hasTitle = typeof imported.title === 'string' && imported.title.includes('Imported Post');
  const hasContent = typeof imported.contentHtml === 'string' && imported.contentHtml.includes('Imported Post');
  if (!hasTitle || !hasContent) {
    throw new Error(`expected imported result to include title/content, got ${JSON.stringify(imported)}`);
  }

  const blockedImport = await request('/api/posts/import-from-url', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${token}`
    },
    body: JSON.stringify({
      url: 'http://127.0.0.1/internal'
    })
  });
  assertApiError(blockedImport, 40000);

  const badApp = await request('/api/apps', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${token}`
    },
    body: JSON.stringify({
      slug: tempAppSlug
    })
  });
  assertApiError(badApp, 40000);

  const createApp = await request('/api/apps', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${token}`
    },
    body: JSON.stringify({
      slug: tempAppSlug,
      name: 'Temp App',
      subtitle: 'Temp subtitle',
      category: 'test',
      version: '1.0.0',
      size: '10 MB',
      pricing: 'free',
      summary: 'Temporary app for regression testing',
      compatibility: ['Apple Silicon'],
      platforms: ['macOS'],
      gallery: [],
      tags: ['test'],
      highlights: ['alpha'],
      requirements: ['macOS 13+']
    })
  });
  assertApiSuccess(createApp, 'create app failed');

  const publicCategories = await request('/api/apps/categories');
  assertApiSuccess(publicCategories, 'public categories failed');
  if (!publicCategories.body.data?.some((item) => item.name === 'test')) {
    throw new Error(`expected new category to appear in public list, got ${JSON.stringify(publicCategories.body.data)}`);
  }

  const renameCategory = await request('/api/admin/app-categories/test', {
    method: 'PUT',
    headers: {
      authorization: `Bearer ${token}`
    },
    body: JSON.stringify({
      name: 'test-renamed'
    })
  });
  assertApiSuccess(renameCategory, 'rename category failed');

  const renamedAppDetail = await request(`/api/apps/${tempAppSlug}`, {
    headers: {
      authorization: `Bearer ${token}`
    }
  });
  assertApiSuccess(renamedAppDetail, 'renamed app detail failed');
  if (renamedAppDetail.body.data?.category !== 'test-renamed') {
    throw new Error(`expected app category to be renamed, got ${renamedAppDetail.body.data?.category}`);
  }
  if (!Array.isArray(renamedAppDetail.body.data?.tags) || !renamedAppDetail.body.data.tags.includes('test-renamed')) {
    throw new Error(`expected app tags to include renamed category, got ${JSON.stringify(renamedAppDetail.body.data?.tags)}`);
  }

  const registerReader = await request('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      username: tempReaderUsername,
      email: `${tempReaderUsername}@example.com`,
      password: 'Pass1234',
      name: 'Regression Reader',
      gender: 'female',
      inviteCode
    })
  });
  assertApiSuccess(registerReader, 'reader register failed');
  const readerToken = registerReader.body.data.token;

  const readerProfile = await request('/api/auth/profile', {
    headers: {
      authorization: `Bearer ${readerToken}`
    }
  });
  assertApiSuccess(readerProfile, 'reader profile failed');
  if (!readerProfile.body.data?.user?.avatar) {
    throw new Error('reader should receive a default avatar');
  }

  const updateReaderProfile = await request('/api/auth/profile', {
    method: 'PUT',
    headers: {
      authorization: `Bearer ${readerToken}`
    },
    body: JSON.stringify({
      name: 'Regression Reader 2',
      currentPassword: 'Pass1234',
      newPassword: tempReaderPassword
    })
  });
  assertApiSuccess(updateReaderProfile, 'reader profile update failed');

  const readerLogin = await request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      username: tempReaderUsername,
      password: tempReaderPassword
    })
  });
  assertApiSuccess(readerLogin, 'reader login with new password failed');
  const nextReaderToken = readerLogin.body.data.token;

  const anonymousDraftList = await request('/api/apps?status=draft&pageSize=20');
  assertApiSuccess(anonymousDraftList, 'anonymous apps list failed');
  if (anonymousDraftList.body.data.list.some((item) => item.slug === tempAppSlug)) {
    throw new Error('anonymous user should not see draft apps in list results');
  }

  const anonymousDraftDetail = await request(`/api/apps/${tempAppSlug}`);
  assertApiError(anonymousDraftDetail, 20002);

  const updateApp = await request(`/api/apps/${tempAppSlug}`, {
    method: 'PUT',
    headers: {
      authorization: `Bearer ${token}`
    },
    body: JSON.stringify({
      name: 'Temp App Updated',
      subtitle: 'Temp subtitle updated',
      category: 'test',
      version: '1.0.1',
      size: '11 MB',
      pricing: 'free',
      summary: 'Temporary app for regression testing',
      status: 'archived'
    })
  });
  assertApiSuccess(updateApp, 'update app failed');

  const createPost = await request('/api/posts', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${token}`
    },
    body: JSON.stringify({
      slug: tempPostSlug,
      title: 'Temp Post',
      excerpt: 'Temp excerpt',
      content: '<p>Temp content</p>',
      category: 'test',
      author: 'Regression Bot',
      coverImage: 'https://placehold.co/1200x800/111827/ffffff?text=Temp',
      relatedAppSlug: tempAppSlug,
      readingTime: '3 min',
      dateLabel: '2026-03',
      publishedAt: '2026-03-29',
      status: 'archived'
    })
  });
  assertApiSuccess(createPost, 'create post failed');

  const favoriteApp = await request('/api/auth/favorites', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${nextReaderToken}`
    },
    body: JSON.stringify({
      contentType: 'app',
      contentId: tempAppSlug
    })
  });
  assertApiSuccess(favoriteApp, 'favorite app failed');

  const favoritePost = await request('/api/auth/favorites', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${nextReaderToken}`
    },
    body: JSON.stringify({
      contentType: 'post',
      contentId: tempPostSlug
    })
  });
  assertApiSuccess(favoritePost, 'favorite post failed');

  const favorites = await request('/api/auth/favorites', {
    headers: {
      authorization: `Bearer ${nextReaderToken}`
    }
  });
  assertApiSuccess(favorites, 'favorites list failed');
  if (favorites.body.data?.apps?.[0]?.slug !== tempAppSlug || favorites.body.data?.posts?.[0]?.slug !== tempPostSlug) {
    throw new Error(`favorites should include app and post, got ${JSON.stringify(favorites.body.data)}`);
  }

  const badRelatedPost = await request('/api/posts', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${token}`
    },
    body: JSON.stringify({
      slug: `bad-related-${tempSuffix}`,
      title: 'Bad Related Post',
      excerpt: 'Temp excerpt',
      content: '<p>Temp content</p>',
      category: 'test',
      author: 'Regression Bot',
      coverImage: 'https://placehold.co/1200x800/111827/ffffff?text=Temp',
      relatedAppSlug: 'missing-related-app',
      readingTime: '3 min',
      dateLabel: '2026-03-29',
      publishedAt: '2026-03-29',
      status: 'archived'
    })
  });
  assertApiError(badRelatedPost, 20002);

  const createTopic = await request('/api/topics', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${token}`
    },
    body: JSON.stringify({
      slug: tempTopicSlug,
      title: 'Temp Topic',
      description: 'Temp topic for regression testing',
      status: 'draft',
      relatedAppSlugs: [tempAppSlug],
      relatedPostSlugs: [tempPostSlug]
    })
  });
  assertApiSuccess(createTopic, 'create topic failed');

  const anonymousArchivedPostList = await request('/api/posts?status=archived&pageSize=20');
  assertApiSuccess(anonymousArchivedPostList, 'anonymous posts list failed');
  if (anonymousArchivedPostList.body.data.list.some((item) => item.slug === tempPostSlug)) {
    throw new Error('anonymous user should not see archived posts in list results');
  }

  const anonymousArchivedPostDetail = await request(`/api/posts/${tempPostSlug}`);
  assertApiError(anonymousArchivedPostDetail, 20003);

  const anonymousDraftTopicList = await request('/api/topics?status=draft');
  assertApiSuccess(anonymousDraftTopicList, 'anonymous topics list failed');
  if (anonymousDraftTopicList.body.data.some((item) => item.slug === tempTopicSlug)) {
    throw new Error('anonymous user should not see draft topics in list results');
  }

  const anonymousDraftTopicDetail = await request(`/api/topics/${tempTopicSlug}`);
  assertApiError(anonymousDraftTopicDetail, 20004);

  const badComment = await request('/api/comments', {
    method: 'POST',
    body: JSON.stringify({
      contentId: 'missing-app',
      contentType: 'app',
      authorName: 'Regression Bot',
      content: 'Should fail'
    })
  });
  assertApiError(badComment, 20002);

  const adminStats = await request('/api/admin/stats', {
    headers: {
      authorization: `Bearer ${token}`
    }
  });
  assertApiSuccess(adminStats, 'admin stats failed');

  const publicSettings = await request('/api/settings');
  assertApiSuccess(publicSettings, 'public settings failed');
  if (!Array.isArray(publicSettings.body.data?.supportedLocales) || !publicSettings.body.data?.defaultLocale) {
    throw new Error(`public settings should include locale config, got ${JSON.stringify(publicSettings.body.data)}`);
  }

  const homeBeforeSettingsUpdate = await request('/api/home');
  assertApiSuccess(homeBeforeSettingsUpdate, 'home summary before settings update failed');
  if (!Array.isArray(homeBeforeSettingsUpdate.body.data?.site?.languageOptions)) {
    throw new Error(`home summary should include language options, got ${JSON.stringify(homeBeforeSettingsUpdate.body.data)}`);
  }

  const updatedSettings = await request('/api/admin/settings', {
    method: 'PUT',
    headers: {
      authorization: `Bearer ${token}`
    },
    body: JSON.stringify({
      siteName: 'Triangle QA',
      siteDescription: 'Regression test settings',
      homeFeaturedPostCount: 4,
      registrationEnabled: false,
      registrationRequiresInvite: true,
      defaultLocale: 'en',
      supportedLocales: ['zh-CN', 'en']
    })
  });
  assertApiSuccess(updatedSettings, 'update settings failed');

  const adminSettings = await request('/api/admin/settings', {
    headers: {
      authorization: `Bearer ${token}`
    }
  });
  assertApiSuccess(adminSettings, 'admin settings failed');
  if (adminSettings.body.data?.siteName !== 'Triangle QA' || adminSettings.body.data?.defaultLocale !== 'en') {
    throw new Error(`expected updated site settings, got ${JSON.stringify(adminSettings.body.data)}`);
  }

  const homeAfterSettingsUpdate = await request('/api/home');
  assertApiSuccess(homeAfterSettingsUpdate, 'home summary after settings update failed');
  if (homeAfterSettingsUpdate.body.data?.site?.defaultLocale !== 'en') {
    throw new Error(`home summary should reflect updated locale settings, got ${JSON.stringify(homeAfterSettingsUpdate.body.data)}`);
  }

  await request('/api/admin/settings', {
    method: 'PUT',
    headers: {
      authorization: `Bearer ${token}`
    },
    body: JSON.stringify({
      siteName: originalSettings.siteName,
      siteDescription: originalSettings.siteDescription,
      homeFeaturedPostCount: originalSettings.homeFeaturedPostCount,
      registrationEnabled: originalSettings.registrationEnabled,
      registrationRequiresInvite: originalSettings.registrationRequiresInvite,
      defaultLocale: originalSettings.defaultLocale,
      supportedLocales: originalSettings.supportedLocales
    })
  });

  const adminRequests = await request('/api/requests/admin/list', {
    headers: {
      authorization: `Bearer ${token}`
    }
  });
  assertApiSuccess(adminRequests, 'admin requests failed');

  const createRequest = await request('/api/requests', {
    method: 'POST',
    body: JSON.stringify({
      title: 'Regression request',
      description: 'Created by automated regression test.',
      authorName: 'Regression Bot',
      authorEmail: 'bot@example.com'
    })
  });
  assertApiSuccess(createRequest, 'create request failed');

  const requestId = createRequest.body.data.id;

  const requestSearch = await request('/api/search?q=Regression request&type=request&page=1&pageSize=5', {
    headers: {
      authorization: `Bearer ${nextReaderToken}`
    }
  });
  assertApiSuccess(requestSearch, 'request-only search failed');
  if (requestSearch.body.data?.requests?.[0]?.id !== requestId) {
    throw new Error(`expected request search to include created request, got ${JSON.stringify(requestSearch.body.data)}`);
  }

  const mixedSearch = await request('/api/search?q=Regression&type=all&page=1&pageSize=6', {
    headers: {
      authorization: `Bearer ${nextReaderToken}`
    }
  });
  assertApiSuccess(mixedSearch, 'mixed search failed');
  if (!Array.isArray(mixedSearch.body.data?.requests)) {
    throw new Error(`expected mixed search to include requests array, got ${JSON.stringify(mixedSearch.body.data)}`);
  }

  const voteRequest = await request(`/api/requests/${requestId}/vote`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${nextReaderToken}`
    }
  });
  assertApiSuccess(voteRequest, 'request vote failed');
  if (voteRequest.body.data?.voteCount !== 1 || voteRequest.body.data?.userVoted !== true) {
    throw new Error(`request vote summary is invalid: ${JSON.stringify(voteRequest.body.data)}`);
  }

  const unvoteRequest = await request(`/api/requests/${requestId}/vote`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${nextReaderToken}`
    }
  });
  assertApiSuccess(unvoteRequest, 'request unvote failed');
  if (unvoteRequest.body.data?.voteCount !== 0 || unvoteRequest.body.data?.userVoted !== false) {
    throw new Error(`request unvote summary is invalid: ${JSON.stringify(unvoteRequest.body.data)}`);
  }

  const createReaderComment = await request('/api/comments', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${nextReaderToken}`
    },
    body: JSON.stringify({
      contentId: tempAppSlug,
      contentType: 'app',
      content: 'Regression comment'
    })
  });
  assertApiSuccess(createReaderComment, 'reader comment failed');
  const commentId = createReaderComment.body.data.id;

  const likeComment = await request(`/api/comments/${commentId}/like`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${nextReaderToken}`
    }
  });
  assertApiSuccess(likeComment, 'comment like failed');

  const unlikeComment = await request(`/api/comments/${commentId}/like`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${nextReaderToken}`
    }
  });
  assertApiSuccess(unlikeComment, 'comment unlike failed');

  const dislikeComment = await request(`/api/comments/${commentId}/dislike`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${nextReaderToken}`
    }
  });
  assertApiSuccess(dislikeComment, 'comment dislike failed');

  const deleteComment = await request(`/api/comments/${commentId}`, {
    method: 'DELETE',
    headers: {
      authorization: `Bearer ${nextReaderToken}`
    }
  });
  assertApiSuccess(deleteComment, 'reader comment delete failed');

  const recharge = await request('/api/auth/recharge', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${nextReaderToken}`
    },
    body: JSON.stringify({
      amount: 18
    })
  });
  assertApiSuccess(recharge, 'recharge failed');

  const updateRequest = await request(`/api/requests/admin/${requestId}`, {
    method: 'PUT',
    headers: {
      authorization: `Bearer ${token}`
    },
    body: JSON.stringify({
      status: 'done',
      adminReply: 'Handled in regression test'
    })
  });
  assertApiSuccess(updateRequest, 'update request failed');

  const deleteRequest = await request(`/api/requests/admin/${requestId}`, {
    method: 'DELETE',
    headers: {
      authorization: `Bearer ${token}`
    }
  });
  assertApiSuccess(deleteRequest, 'delete request failed');

  const deleteTopic = await request(`/api/topics/${tempTopicSlug}`, {
    method: 'DELETE',
    headers: {
      authorization: `Bearer ${token}`
    }
  });
  assertApiSuccess(deleteTopic, 'delete topic failed');

  const deletePost = await request(`/api/posts/${tempPostSlug}`, {
    method: 'DELETE',
    headers: {
      authorization: `Bearer ${token}`
    }
  });
  assertApiSuccess(deletePost, 'delete post failed');

  const deleteApp = await request(`/api/apps/${tempAppSlug}`, {
    method: 'DELETE',
    headers: {
      authorization: `Bearer ${token}`
    }
  });
  assertApiSuccess(deleteApp, 'delete app failed');

  const deleteCategory = await request('/api/admin/app-categories/test-renamed', {
    method: 'DELETE',
    headers: {
      authorization: `Bearer ${token}`
    }
  });
  assertApiSuccess(deleteCategory, 'delete category failed');

  await prisma.user.deleteMany({
    where: {
      username: tempReaderUsername
    }
  });

  console.log('regression passed');
}

main()
  .catch((error) => {
    console.error('regression failed');
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
