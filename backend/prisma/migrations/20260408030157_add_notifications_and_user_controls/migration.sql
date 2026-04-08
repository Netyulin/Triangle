-- CreateTable
CREATE TABLE "NetdiskReport" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "appSlug" TEXT NOT NULL,
    "reporterId" INTEGER,
    "netdiskName" TEXT NOT NULL,
    "downloadUrl" TEXT,
    "reason" TEXT NOT NULL,
    "contact" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "adminNote" TEXT,
    "handledById" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "handledAt" DATETIME,
    CONSTRAINT "NetdiskReport_appSlug_fkey" FOREIGN KEY ("appSlug") REFERENCES "App" ("slug") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "NetdiskReport_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "NetdiskReport_handledById_fkey" FOREIGN KEY ("handledById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "senderId" INTEGER,
    "type" TEXT NOT NULL DEFAULT 'system',
    "templateKey" TEXT,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "data" JSONB,
    "link" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "readAt" DATETIME,
    "deletedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Notification_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "NotificationTemplate" (
    "key" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "description" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_App" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "subtitle" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "icon" TEXT,
    "version" TEXT NOT NULL,
    "size" TEXT NOT NULL,
    "rating" REAL NOT NULL DEFAULT 0,
    "downloads" TEXT NOT NULL,
    "updatedAt" TEXT NOT NULL,
    "compatibility" JSONB NOT NULL,
    "platforms" JSONB NOT NULL,
    "heroImage" TEXT,
    "displayMode" TEXT NOT NULL DEFAULT 'cover',
    "gallery" JSONB NOT NULL,
    "tags" JSONB NOT NULL,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "editorialScore" INTEGER NOT NULL DEFAULT 0,
    "pricing" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "highlights" JSONB NOT NULL,
    "requirements" JSONB NOT NULL,
    "review" TEXT,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'published',
    "accessLevel" TEXT NOT NULL DEFAULT 'free',
    "isDownloadable" BOOLEAN NOT NULL DEFAULT true,
    "downloadUrl" TEXT,
    "downloadLinks" JSONB,
    "seoTitle" TEXT,
    "seoDescription" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "authorId" INTEGER,
    CONSTRAINT "App_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_App" ("authorId", "category", "compatibility", "createdAt", "downloads", "editorialScore", "featured", "gallery", "heroImage", "highlights", "icon", "id", "name", "platforms", "pricing", "rating", "requirements", "review", "seoDescription", "seoTitle", "size", "slug", "status", "subtitle", "summary", "tags", "updatedAt", "verified", "version") SELECT "authorId", "category", "compatibility", "createdAt", "downloads", "editorialScore", "featured", "gallery", "heroImage", "highlights", "icon", "id", "name", "platforms", "pricing", "rating", "requirements", "review", "seoDescription", "seoTitle", "size", "slug", "status", "subtitle", "summary", "tags", "updatedAt", "verified", "version" FROM "App";
DROP TABLE "App";
ALTER TABLE "new_App" RENAME TO "App";
CREATE UNIQUE INDEX "App_slug_key" ON "App"("slug");
CREATE TABLE "new_Comment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "contentId" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "authorName" TEXT NOT NULL,
    "authorAvatar" TEXT,
    "content" TEXT NOT NULL,
    "parentId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "likes" INTEGER NOT NULL DEFAULT 0,
    "dislikes" INTEGER NOT NULL DEFAULT 0,
    "userId" INTEGER,
    "appSlug" TEXT,
    "postSlug" TEXT,
    CONSTRAINT "Comment_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Comment" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Comment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Comment_appSlug_fkey" FOREIGN KEY ("appSlug") REFERENCES "App" ("slug") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Comment_postSlug_fkey" FOREIGN KEY ("postSlug") REFERENCES "Post" ("slug") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Comment" ("appSlug", "authorAvatar", "authorName", "content", "contentId", "contentType", "createdAt", "dislikes", "id", "likes", "parentId", "postSlug") SELECT "appSlug", "authorAvatar", "authorName", "content", "contentId", "contentType", "createdAt", "dislikes", "id", "likes", "parentId", "postSlug" FROM "Comment";
DROP TABLE "Comment";
ALTER TABLE "new_Comment" RENAME TO "Comment";
CREATE TABLE "new_Post" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "excerpt" TEXT NOT NULL,
    "content" TEXT,
    "category" TEXT NOT NULL,
    "author" TEXT NOT NULL,
    "authorId" INTEGER,
    "coverImage" TEXT NOT NULL,
    "icon" TEXT,
    "displayMode" TEXT NOT NULL DEFAULT 'cover',
    "relatedAppSlug" TEXT,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "readingTime" TEXT NOT NULL,
    "dateLabel" TEXT NOT NULL,
    "publishedAt" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'hidden',
    "seoTitle" TEXT,
    "seoDescription" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Post_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Post_relatedAppSlug_fkey" FOREIGN KEY ("relatedAppSlug") REFERENCES "App" ("slug") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Post" ("author", "authorId", "category", "content", "coverImage", "createdAt", "dateLabel", "excerpt", "featured", "id", "publishedAt", "readingTime", "relatedAppSlug", "seoDescription", "seoTitle", "slug", "status", "title") SELECT "author", "authorId", "category", "content", "coverImage", "createdAt", "dateLabel", "excerpt", "featured", "id", "publishedAt", "readingTime", "relatedAppSlug", "seoDescription", "seoTitle", "slug", "status", "title" FROM "Post";
DROP TABLE "Post";
ALTER TABLE "new_Post" RENAME TO "Post";
CREATE UNIQUE INDEX "Post_slug_key" ON "Post"("slug");
CREATE TABLE "new_SoftwareRequest" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "authorName" TEXT NOT NULL,
    "authorEmail" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "adminReply" TEXT,
    "repliedAt" DATETIME,
    "userId" INTEGER,
    CONSTRAINT "SoftwareRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_SoftwareRequest" ("adminReply", "authorEmail", "authorName", "createdAt", "description", "id", "repliedAt", "status", "title") SELECT "adminReply", "authorEmail", "authorName", "createdAt", "description", "id", "repliedAt", "status", "title" FROM "SoftwareRequest";
DROP TABLE "SoftwareRequest";
ALTER TABLE "new_SoftwareRequest" RENAME TO "SoftwareRequest";
CREATE TABLE "new_Topic" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "coverImage" TEXT,
    "status" TEXT NOT NULL DEFAULT 'hidden',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Topic" ("coverImage", "createdAt", "description", "id", "slug", "status", "title", "updatedAt") SELECT "coverImage", "createdAt", "description", "id", "slug", "status", "title", "updatedAt" FROM "Topic";
DROP TABLE "Topic";
ALTER TABLE "new_Topic" RENAME TO "Topic";
CREATE UNIQUE INDEX "Topic_slug_key" ON "Topic"("slug");
CREATE TABLE "new_User" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "username" TEXT NOT NULL,
    "email" TEXT,
    "password" TEXT NOT NULL,
    "name" TEXT,
    "avatar" TEXT,
    "gender" TEXT NOT NULL DEFAULT 'other',
    "phone" TEXT,
    "wechatOpenId" TEXT,
    "role" TEXT NOT NULL DEFAULT 'reader',
    "status" TEXT NOT NULL DEFAULT 'active',
    "membershipLevel" TEXT NOT NULL DEFAULT 'free',
    "membershipExpireAt" DATETIME,
    "bannedUntil" DATETIME,
    "banReason" TEXT,
    "downloadQuotaDaily" INTEGER NOT NULL DEFAULT 3,
    "downloadCountDaily" INTEGER NOT NULL DEFAULT 0,
    "canComment" BOOLEAN NOT NULL DEFAULT true,
    "canReply" BOOLEAN NOT NULL DEFAULT true,
    "canSubmitRequest" BOOLEAN NOT NULL DEFAULT true,
    "lastLoginAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_User" ("avatar", "createdAt", "email", "gender", "id", "name", "password", "role", "updatedAt", "username") SELECT "avatar", "createdAt", "email", "gender", "id", "name", "password", "role", "updatedAt", "username" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "User_wechatOpenId_key" ON "User"("wechatOpenId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "Notification_userId_createdAt_idx" ON "Notification"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "Notification_userId_isRead_deletedAt_idx" ON "Notification"("userId", "isRead", "deletedAt");
