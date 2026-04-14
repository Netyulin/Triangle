import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { request, assertApiSuccess, assertApiError, createInviteCode, loginAsAdmin } from './test-helpers.mjs';
import prisma from '../src/utils/prisma.js';

const tempSuffix = randomUUID().slice(0, 8);
const tempAppSlug = `temp-app-${tempSuffix}`;
const tempPostSlug = `temp-post-${tempSuffix}`;
const tempTopicSlug = `temp-topic-${tempSuffix}`;
const tempReaderUsername = `reader_${tempSuffix}`;
const tempReaderPassword = 'Pass12345';
const tempAppCategory = `test-app-${tempSuffix}`;
const tempPostCategory = `test-post-${tempSuffix}`;
const INTERSTITIAL_TITLE = '下载前确认';
const INTERSTITIAL_DESCRIPTION = '基础会员下载前会短暂停留，高等级会员将自动跳过。';
const INTERSTITIAL_BUTTON_TEXT = '继续下载';

function expect(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function cleanupTempData(readerId) {
  await prisma.notification.deleteMany({
    where: {
      OR: [
        { title: '自动化站内信' },
        { templateKey: 'netdisk_report_handled' },
        { templateKey: 'request_status_updated' },
      ],
    },
  }).catch(() => null);

  await prisma.comment.deleteMany({
    where: {
      OR: [{ appSlug: tempAppSlug }, { postSlug: tempPostSlug }],
    },
  }).catch(() => null);

  await prisma.netdiskReport.deleteMany({
    where: { appSlug: tempAppSlug },
  }).catch(() => null);

  await prisma.topicPost.deleteMany({
    where: { postSlug: tempPostSlug },
  }).catch(() => null);

  await prisma.topicApp.deleteMany({
    where: { appSlug: tempAppSlug },
  }).catch(() => null);

  await prisma.topic.deleteMany({
    where: { slug: tempTopicSlug },
  }).catch(() => null);

  await prisma.softwareRequest.deleteMany({
    where: {
      OR: [
        { title: 'Regression request' },
        { title: 'Blocked request' },
      ],
    },
  }).catch(() => null);

  await prisma.post.deleteMany({
    where: { slug: tempPostSlug },
  }).catch(() => null);

  await prisma.app.deleteMany({
    where: { slug: tempAppSlug },
  }).catch(() => null);

  await prisma.$executeRawUnsafe(`DELETE FROM app_categories WHERE name IN ($1, $2)`, tempAppCategory, `${tempAppCategory}-renamed`).catch(() => null);
  await prisma.$executeRawUnsafe(`DELETE FROM post_categories WHERE name IN ($1, $2)`, tempPostCategory, '????').catch(() => null);

  if (readerId) {
    await prisma.user.deleteMany({
      where: { id: readerId },
    }).catch(() => null);
  }
}

async function restoreSettings(token, originalSettings) {
  if (!originalSettings) {
    return;
  }

  const restoreResult = await request('/api/admin/settings', {
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
      siteAnnouncementEnabled: originalSettings.siteAnnouncementEnabled,
      siteAnnouncementTitle: originalSettings.siteAnnouncementTitle,
      siteAnnouncementContent: originalSettings.siteAnnouncementContent,
      siteAnnouncementLink: originalSettings.siteAnnouncementLink,
      downloadInterstitialEnabled: originalSettings.downloadInterstitialEnabled,
      downloadInterstitialTitle: originalSettings.downloadInterstitialTitle,
      downloadInterstitialDescription: originalSettings.downloadInterstitialDescription,
      downloadInterstitialButtonText: originalSettings.downloadInterstitialButtonText,
      downloadInterstitialBuyUrl: originalSettings.downloadInterstitialBuyUrl
    })
  });

  assertApiSuccess(restoreResult, 'restore settings failed');
}

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

  try {
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
    expect(
      typeof importFromPaste.body.data?.title === 'string' && importFromPaste.body.data.title.includes('Imported Post'),
      `expected imported title, got ${JSON.stringify(importFromPaste.body.data)}`
    );
    expect(
      typeof importFromPaste.body.data?.contentHtml === 'string' && importFromPaste.body.data.contentHtml.includes('Imported Post'),
      `expected imported contentHtml, got ${JSON.stringify(importFromPaste.body.data)}`
    );

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

    const updatedSettings = await request('/api/admin/settings', {
      method: 'PUT',
      headers: {
        authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        siteName: 'Triangle QA',
        siteDescription: 'Regression test settings',
        homeFeaturedPostCount: 4,
        registrationEnabled: true,
        registrationRequiresInvite: true,
        siteAnnouncementEnabled: true,
        siteAnnouncementTitle: '自动化公告',
        siteAnnouncementContent: '这里是自动化回归生成的公告',
        siteAnnouncementLink: '/announcements/regression',
        downloadInterstitialEnabled: true,
        downloadInterstitialTitle: '自动化下载确认',
        downloadInterstitialDescription: '基础会员进入下载前需要停留。',
        downloadInterstitialButtonText: '继续下载',
        downloadInterstitialBuyUrl: '/pricing'
      })
    });
    assertApiSuccess(updatedSettings, 'update settings failed');

    const publicSettings = await request('/api/settings');
    assertApiSuccess(publicSettings, 'public settings failed');
    expect(publicSettings.body.data?.siteName === 'Triangle QA', `expected updated siteName, got ${JSON.stringify(publicSettings.body.data)}`);

    const homeAfterSettingsUpdate = await request('/api/home');
    assertApiSuccess(homeAfterSettingsUpdate, 'home summary failed after settings update');
    expect(
      homeAfterSettingsUpdate.body.data?.announcements?.[0]?.title === '自动化公告',
      `expected announcement in home payload, got ${JSON.stringify(homeAfterSettingsUpdate.body.data?.announcements)}`
    );

    const createApp = await request('/api/apps', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        slug: tempAppSlug,
        name: 'Temp App',
        subtitle: 'Temp subtitle',
        category: tempAppCategory,
        icon: 'https://placehold.co/256x256/111827/ffffff?text=A',
        version: '1.0.0',
        size: '10 MB',
        pricing: 'free',
        summary: 'Temporary app for regression testing',
        status: 'published',
        accessLevel: 'sponsor',
        downloads: '1.2K',
        updatedAt: '2026-04-08',
        compatibility: ['Apple Silicon'],
        platforms: ['macOS'],
        gallery: [],
        tags: ['test'],
        highlights: ['alpha'],
        requirements: ['macOS 13+'],
        downloadUrl: 'https://example.com/download/temp-app',
        isDownloadable: true,
        featured: true
      })
    });
    assertApiSuccess(createApp, 'create app failed');

    const publicAppCategories = await request('/api/apps/categories');
    assertApiSuccess(publicAppCategories, 'public app categories failed');
    expect(
      publicAppCategories.body.data?.some((item) => item.name === tempAppCategory),
      `expected published app category in public list, got ${JSON.stringify(publicAppCategories.body.data)}`
    );

    const adminRenameAppCategory = await request(`/api/admin/app-categories/${tempAppCategory}`, {
      method: 'PUT',
      headers: {
        authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        name: `${tempAppCategory}-renamed`
      })
    });
    assertApiSuccess(adminRenameAppCategory, 'rename app category failed');

    const renamedAppDetail = await request(`/api/apps/${tempAppSlug}`, {
      headers: {
        authorization: `Bearer ${token}`
      }
    });
    assertApiSuccess(renamedAppDetail, 'load renamed app detail failed');
    expect(
      renamedAppDetail.body.data?.category === `${tempAppCategory}-renamed`,
      `expected renamed app category, got ${JSON.stringify(renamedAppDetail.body.data)}`
    );

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
        category: tempPostCategory,
        author: 'Regression Bot',
        coverImage: 'https://placehold.co/1200x800/111827/ffffff?text=Temp',
        icon: 'https://placehold.co/256x256/111827/ffffff?text=P',
        relatedAppSlug: tempAppSlug,
        readingTime: '3 min',
        dateLabel: '2026-04',
        publishedAt: '2026-04-08',
        status: 'published',
        featured: true
      })
    });
    assertApiSuccess(createPost, 'create post failed');

    const publicPostCategories = await request('/api/posts/categories');
    assertApiSuccess(publicPostCategories, 'public post categories failed');
    expect(
      publicPostCategories.body.data?.some((item) => item.name === tempPostCategory),
      `expected published post category in public list, got ${JSON.stringify(publicPostCategories.body.data)}`
    );

    const adminPostCategories = await request('/api/admin/post-categories', {
      headers: {
        authorization: `Bearer ${token}`
      }
    });
    assertApiSuccess(adminPostCategories, 'admin post categories failed');
    expect(
      adminPostCategories.body.data?.some((item) => item.name === tempPostCategory),
      `expected post category in admin list, got ${JSON.stringify(adminPostCategories.body.data)}`
    );

    const createHiddenTopic = await request('/api/topics', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        slug: tempTopicSlug,
        title: 'Temp Topic',
        description: 'Temp topic for regression testing',
        status: 'hidden',
        relatedAppSlugs: [tempAppSlug],
        relatedPostSlugs: [tempPostSlug]
      })
    });
    assertApiSuccess(createHiddenTopic, 'create hidden topic failed');

    const anonymousTopicList = await request('/api/topics');
    assertApiSuccess(anonymousTopicList, 'anonymous topic list failed');
    expect(
      !anonymousTopicList.body.data.some((item) => item.slug === tempTopicSlug),
      'anonymous user should not see hidden topic'
    );

    const anonymousTopicDetail = await request(`/api/topics/${tempTopicSlug}`);
    assertApiError(anonymousTopicDetail, 20004);

    const registerReader = await request('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        username: tempReaderUsername,
        email: `${tempReaderUsername}@example.com`,
        password: 'Pass1234',
        name: 'Regression Reader',
        gender: 'female',
        phone: '13900139000',
        inviteCode
      })
    });
    assertApiSuccess(registerReader, 'reader register failed');
    const readerToken = registerReader.body.data.token;
    const readerId = registerReader.body.data.user?.id;
    expect(readerId, `expected registered user id, got ${JSON.stringify(registerReader.body.data)}`);

    const readerProfile = await request('/api/auth/profile', {
      headers: {
        authorization: `Bearer ${readerToken}`
      }
    });
    assertApiSuccess(readerProfile, 'reader profile failed');
    expect(
      typeof readerProfile.body.data?.user?.avatar === 'string' &&
        (
          readerProfile.body.data.user.avatar.includes('/uploads/avatars/generated/') ||
          readerProfile.body.data.user.avatar.includes('/avatars/avatar-gen-defaults/')
        ),
      `expected localized avatar path, got ${JSON.stringify(readerProfile.body.data?.user)}`
    );

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

    const deniedAccess = await request(`/api/apps/${tempAppSlug}/access`, {
      headers: {
        authorization: `Bearer ${nextReaderToken}`
      }
    });
    assertApiSuccess(deniedAccess, 'app access check failed for free user');
    expect(deniedAccess.body.data?.downloadPermission?.allowed === false, 'free user should not be allowed to download sponsor app');
    expect(deniedAccess.body.data?.showInterstitial === true, 'free user should see download interstitial');
    expect(
      deniedAccess.body.data?.downloadInterstitial?.title === '自动化下载确认',
      `expected customized interstitial title, got ${JSON.stringify(deniedAccess.body.data)}`
    );

    const updateReaderPermissions = await request(`/api/admin/users/${readerId}`, {
      method: 'PATCH',
      headers: {
        authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        membershipLevel: 'sponsor',
        canComment: false,
        canReply: false,
        canSubmitRequest: false
      })
    });
    assertApiSuccess(updateReaderPermissions, 'update reader permissions failed');
    expect(updateReaderPermissions.body.data?.membershipLevel === 'sponsor', 'expected sponsor membership after user update');

    const allowedAccess = await request(`/api/apps/${tempAppSlug}/access`, {
      headers: {
        authorization: `Bearer ${nextReaderToken}`
      }
    });
    assertApiSuccess(allowedAccess, 'app access check failed for sponsor user');
    expect(allowedAccess.body.data?.downloadPermission?.allowed === true, 'sponsor user should be allowed to download sponsor app');

    const blockedComment = await request('/api/comments', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${nextReaderToken}`
      },
      body: JSON.stringify({
        contentId: tempAppSlug,
        contentType: 'app',
        content: 'Should fail'
      })
    });
    assertApiError(blockedComment, 40300);

    const blockedRequest = await request('/api/requests', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${nextReaderToken}`
      },
      body: JSON.stringify({
        title: 'Blocked request',
        description: 'This should be blocked by permissions.'
      })
    });
    assertApiError(blockedRequest, 40300);

    const enableCommentOnly = await request(`/api/admin/users/${readerId}`, {
      method: 'PATCH',
      headers: {
        authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        canComment: true,
        canReply: false,
        canSubmitRequest: true
      })
    });
    assertApiSuccess(enableCommentOnly, 'enable comment permission failed');

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

    const blockedReply = await request('/api/comments', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${nextReaderToken}`
      },
      body: JSON.stringify({
        contentId: tempAppSlug,
        contentType: 'app',
        parentId: commentId,
        content: 'Regression reply'
      })
    });
    assertApiError(blockedReply, 40300);

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
    expect(
      requestSearch.body.data?.requests?.some((item) => item.id === requestId),
      `expected request search to include created request, got ${JSON.stringify(requestSearch.body.data)}`
    );

    const voteRequest = await request(`/api/requests/${requestId}/vote`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${nextReaderToken}`
      }
    });
    assertApiSuccess(voteRequest, 'request vote failed');
    expect(voteRequest.body.data?.voteCount === 1 && voteRequest.body.data?.userVoted === true, 'expected voted summary');

    const unvoteRequest = await request(`/api/requests/${requestId}/vote`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${nextReaderToken}`
      }
    });
    assertApiSuccess(unvoteRequest, 'request unvote failed');
    expect(unvoteRequest.body.data?.voteCount === 0 && unvoteRequest.body.data?.userVoted === false, 'expected unvoted summary');

    const sendNotification = await request('/api/admin/notifications/send', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        userIds: [readerId],
        title: '自动化站内信',
        content: '这是一条自动化回归消息。',
        link: `/profile?tab=notifications&run=${tempSuffix}`
      })
    });
    assertApiSuccess(sendNotification, 'admin send notification failed');

    const readerNotifications = await request('/api/notifications', {
      headers: {
        authorization: `Bearer ${nextReaderToken}`
      }
    });
    assertApiSuccess(readerNotifications, 'reader notifications list failed');
    const manualNotification = readerNotifications.body.data?.list?.find((item) => item.title === '自动化站内信');
    expect(manualNotification, `expected manual notification, got ${JSON.stringify(readerNotifications.body.data)}`);

    const readerUnreadCount = await request('/api/notifications/unread-count', {
      headers: {
        authorization: `Bearer ${nextReaderToken}`
      }
    });
    assertApiSuccess(readerUnreadCount, 'unread count failed');
    expect(readerUnreadCount.body.data?.unreadCount >= 1, `expected unread count >= 1, got ${JSON.stringify(readerUnreadCount.body.data)}`);

    const markNotificationRead = await request(`/api/notifications/${manualNotification.id}/read`, {
      method: 'PATCH',
      headers: {
        authorization: `Bearer ${nextReaderToken}`
      }
    });
    assertApiSuccess(markNotificationRead, 'mark notification read failed');

    const deleteNotification = await request(`/api/notifications/${manualNotification.id}`, {
      method: 'DELETE',
      headers: {
        authorization: `Bearer ${nextReaderToken}`
      }
    });
    assertApiSuccess(deleteNotification, 'delete notification failed');

    const netdiskReport = await request(`/api/apps/${tempAppSlug}/netdisk-reports`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${nextReaderToken}`
      },
      body: JSON.stringify({
        netdiskName: '百度网盘',
        reason: '链接失效',
        downloadUrl: 'https://example.com/broken',
        contact: 'reader@example.com'
      })
    });
    assertApiSuccess(netdiskReport, 'create netdisk report failed');
    const reportId = netdiskReport.body.data?.id;

    const handleNetdiskReport = await request(`/api/admin/netdisk-reports/${reportId}`, {
      method: 'PATCH',
      headers: {
        authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        status: 'handled',
        adminNote: '已处理完成'
      })
    });
    assertApiSuccess(handleNetdiskReport, 'handle netdisk report failed');
    expect(handleNetdiskReport.body.data?.status === 'handled', 'expected handled netdisk report status');

    const readerNotificationsAfterHandle = await request('/api/notifications', {
      headers: {
        authorization: `Bearer ${nextReaderToken}`
      }
    });
    assertApiSuccess(readerNotificationsAfterHandle, 'reader notifications list after handling failed');
    expect(
      readerNotificationsAfterHandle.body.data?.list?.some((item) => item.templateKey === 'netdisk_report_handled'),
      `expected handled report notification, got ${JSON.stringify(readerNotificationsAfterHandle.body.data)}`
    );

    const appPicker = await request(`/api/admin/content-picker/apps?keyword=${tempSuffix}`, {
      headers: {
        authorization: `Bearer ${token}`
      }
    });
    assertApiSuccess(appPicker, 'content picker apps failed');
    expect(
      appPicker.body.data?.list?.some((item) => item.slug === tempAppSlug),
      `expected app in content picker, got ${JSON.stringify(appPicker.body.data)}`
    );

    const postPicker = await request(`/api/admin/content-picker/posts?keyword=${tempSuffix}`, {
      headers: {
        authorization: `Bearer ${token}`
      }
    });
    assertApiSuccess(postPicker, 'content picker posts failed');
    expect(
      postPicker.body.data?.list?.some((item) => item.slug === tempPostSlug),
      `expected post in content picker, got ${JSON.stringify(postPicker.body.data)}`
    );

    const adminLevels = await request('/api/admin/users/levels', {
      headers: {
        authorization: `Bearer ${token}`
      }
    });
    assertApiSuccess(adminLevels, 'admin user levels failed');
    expect(
      adminLevels.body.data?.some((item) => item.value === 'supreme'),
      `expected new membership levels, got ${JSON.stringify(adminLevels.body.data)}`
    );

    const updateReaderPassword = await request(`/api/admin/users/${readerId}/password`, {
      method: 'PATCH',
      headers: {
        authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        password: 'Pass67890'
      })
    });
    assertApiSuccess(updateReaderPassword, 'admin update password failed');

    const disabledReader = await request(`/api/admin/users/${readerId}`, {
      method: 'PATCH',
      headers: {
        authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        status: 'disabled'
      })
    });
    assertApiSuccess(disabledReader, 'disable reader failed');

    const disabledReaderLoginCheck = await request('/api/auth/permissions', {
      headers: {
        authorization: `Bearer ${nextReaderToken}`
      }
    });
    assertApiError(disabledReaderLoginCheck, 40300);

    const reenableReader = await request(`/api/admin/users/${readerId}`, {
      method: 'PATCH',
      headers: {
        authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        status: 'active'
      })
    });
    assertApiSuccess(reenableReader, 'reenable reader failed');

    const adminRequests = await request('/api/admin/requests', {
      headers: {
        authorization: `Bearer ${token}`
      }
    });
    assertApiSuccess(adminRequests, 'admin requests failed');

    const updateRequest = await request(`/api/admin/requests/${requestId}`, {
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

    const deleteRequest = await request(`/api/admin/requests/${requestId}`, {
      method: 'DELETE',
      headers: {
        authorization: `Bearer ${token}`
      }
    });
    assertApiSuccess(deleteRequest, 'delete request failed');

    const deleteComment = await request(`/api/comments/${commentId}`, {
      method: 'DELETE',
      headers: {
        authorization: `Bearer ${nextReaderToken}`
      }
    });
    assertApiSuccess(deleteComment, 'reader comment delete failed');

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

    const deleteAppCategory = await request(`/api/admin/app-categories/${tempAppCategory}-renamed`, {
      method: 'DELETE',
      headers: {
        authorization: `Bearer ${token}`
      }
    });
    assertApiSuccess(deleteAppCategory, 'delete app category failed');

    const deletePostCategory = await request(`/api/admin/post-categories/${tempPostCategory}`, {
      method: 'DELETE',
      headers: {
        authorization: `Bearer ${token}`
      }
    });
    assertApiSuccess(deletePostCategory, 'delete post category failed');

    const deleteUser = await request(`/api/admin/users/${readerId}`, {
      method: 'DELETE',
      headers: {
        authorization: `Bearer ${token}`
      }
    });
    assertApiSuccess(deleteUser, 'delete user failed');

    console.log('regression passed');
  } finally {
    await restoreSettings(token, originalSettings);
  }
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
