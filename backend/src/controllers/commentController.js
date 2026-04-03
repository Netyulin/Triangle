import { body, param, query } from 'express-validator';
import prisma from '../utils/prisma.js';
import { ErrorCodes, sendError, sendSuccess } from '../utils/response.js';
import { validate } from '../middleware/validate.js';
import { normalizeString, serializeComment } from '../utils/serializers.js';
import { buildDefaultAvatar, ensureUserFeatureTables, getCommentReactionSummary } from '../utils/userFeatures.js';

const listValidation = validate([
  query('contentId').notEmpty().withMessage('contentId is required'),
  query('contentType').optional().isIn(['app', 'post']).withMessage('contentType must be app or post'),
  query('type').optional().isIn(['app', 'post']).withMessage('type must be app or post')
]);

const createValidation = validate([
  body('contentId').notEmpty().withMessage('contentId is required'),
  body('contentType').optional().isIn(['app', 'post']).withMessage('contentType must be app or post'),
  body('type').optional().isIn(['app', 'post']).withMessage('type must be app or post'),
  body('authorName').optional().trim().notEmpty().withMessage('authorName is required'),
  body('content').trim().isLength({ min: 1, max: 1000 }).withMessage('content length must be between 1 and 1000')
]);

const actionValidation = validate([param('id').notEmpty().withMessage('comment id is required')]);

function buildTree(comments, parentId = null) {
  return comments
    .filter((comment) => comment.parentId === parentId)
    .map((comment) => ({
      ...comment,
      replies: buildTree(comments, comment.id)
    }));
}

function markCommentTree(comments, reactionSummary, user) {
  return comments.map((comment) => {
    const reaction = reactionSummary.get(comment.id) || { userLiked: false, userDisliked: false };
    return serializeComment({
      ...comment,
      authorAvatar: comment.authorAvatar || buildDefaultAvatar(comment.authorName),
      canDelete: Boolean(user && (user.role === 'admin' || comment.userId === user.id)),
      userLiked: reaction.userLiked,
      userDisliked: reaction.userDisliked,
      replies: markCommentTree(comment.replies || [], reactionSummary, user)
    });
  });
}

function resolveContentType(queryOrBody) {
  return queryOrBody.contentType || queryOrBody.type;
}

export { listValidation, createValidation, actionValidation };

export async function list(req, res) {
  await ensureUserFeatureTables();
  const contentId = normalizeString(req.query.contentId).trim();
  const contentType = resolveContentType(req.query);

  if (!contentType) {
    return sendError(res, ErrorCodes.PARAM_ERROR, 'contentType or type is required');
  }

  const comments = await prisma.comment.findMany({
    where: {
      contentId,
      ...(contentType ? { contentType } : {})
    },
    orderBy: [{ createdAt: 'asc' }]
  });

  const reactionSummary = await getCommentReactionSummary(
    comments.map((comment) => comment.id),
    req.user?.id
  );

  return sendSuccess(res, markCommentTree(buildTree(comments), reactionSummary, req.user));
}

export async function create(req, res) {
  await ensureUserFeatureTables();
  const contentType = resolveContentType(req.body);
  const contentId = normalizeString(req.body.contentId).trim();
  const parentId = req.body.parentId ? normalizeString(req.body.parentId).trim() : null;
  const user = req.user
    ? await prisma.user.findUnique({
        where: { id: req.user.id }
      })
    : null;

  if (!contentType) {
    return sendError(res, ErrorCodes.PARAM_ERROR, 'contentType or type is required');
  }

  if (user && !user.canComment) {
    return sendError(res, ErrorCodes.FORBIDDEN, 'comment permission denied');
  }

  const authorName = user ? normalizeString(user.name || user.username).trim() : normalizeString(req.body.authorName).trim();
  if (!authorName) {
    return sendError(res, ErrorCodes.PARAM_ERROR, 'authorName is required');
  }

  if (contentType === 'app') {
    const app = await prisma.app.findUnique({
      where: { slug: contentId },
      select: { slug: true }
    });
    if (!app) {
      return sendError(res, ErrorCodes.APP_NOT_FOUND, 'app not found');
    }
  } else if (contentType === 'post') {
    const post = await prisma.post.findUnique({
      where: { slug: contentId },
      select: { slug: true }
    });
    if (!post) {
      return sendError(res, ErrorCodes.POST_NOT_FOUND, 'post not found');
    }
  } else {
    return sendError(res, ErrorCodes.PARAM_ERROR, 'contentType must be app or post');
  }

  if (parentId) {
    const parent = await prisma.comment.findUnique({
      where: { id: parentId }
    });

    if (!parent) {
      return sendError(res, ErrorCodes.COMMENT_NOT_FOUND, 'parent comment not found');
    }

    if (parent.contentId !== contentId || parent.contentType !== contentType) {
      return sendError(res, ErrorCodes.PARAM_ERROR, 'parent comment must belong to the same content');
    }
  }

  const comment = await prisma.comment.create({
    data: {
      contentId,
      contentType,
      authorName,
      authorAvatar: user
        ? user.avatar || buildDefaultAvatar(user.name || user.username, user.gender)
        : req.body.authorAvatar
          ? normalizeString(req.body.authorAvatar).trim()
          : buildDefaultAvatar(authorName),
      content: normalizeString(req.body.content).trim(),
      parentId,
      likes: 0,
      dislikes: 0,
      userId: user?.id ?? null,
      appSlug: contentType === 'app' ? contentId : null,
      postSlug: contentType === 'post' ? contentId : null
    }
  });

  return sendSuccess(res, comment, 'comment created', 201);
}

export async function like(req, res) {
  await ensureUserFeatureTables();
  const existingComment = await prisma.comment.findUnique({
    where: { id: req.params.id },
    select: { id: true }
  });

  if (!existingComment) {
    return sendError(res, ErrorCodes.COMMENT_NOT_FOUND, 'comment not found');
  }

  const { updated, toggledOn } = await prisma.$transaction(async (tx) => {
    const existing = await tx.$queryRawUnsafe(
      'SELECT reaction FROM comment_reactions WHERE userId = ? AND commentId = ? LIMIT 1',
      req.user.id,
      req.params.id
    );

    if (existing[0]?.reaction === 'like') {
      await tx.$executeRawUnsafe('DELETE FROM comment_reactions WHERE userId = ? AND commentId = ?', req.user.id, req.params.id);
      const updatedComment = await tx.comment.update({
        where: { id: req.params.id },
        data: {
          likes: { decrement: 1 }
        }
      });
      return { updated: updatedComment, toggledOn: false };
    }

    if (existing[0]?.reaction === 'dislike') {
      await tx.$executeRawUnsafe(
        'UPDATE comment_reactions SET reaction = ? WHERE userId = ? AND commentId = ?',
        'like',
        req.user.id,
        req.params.id
      );
      const updatedComment = await tx.comment.update({
        where: { id: req.params.id },
        data: {
          likes: { increment: 1 },
          dislikes: { decrement: 1 }
        }
      });
      return { updated: updatedComment, toggledOn: true };
    }

    await tx.$executeRawUnsafe(
      'INSERT INTO comment_reactions (userId, commentId, reaction, createdAt) VALUES (?, ?, ?, CURRENT_TIMESTAMP)',
      req.user.id,
      req.params.id,
      'like'
    );
    const updatedComment = await tx.comment.update({
      where: { id: req.params.id },
      data: {
        likes: { increment: 1 }
      }
    });
    return { updated: updatedComment, toggledOn: true };
  });

  return sendSuccess(
    res,
    {
      likes: updated.likes,
      dislikes: updated.dislikes,
      userLiked: toggledOn,
      userDisliked: false
    },
    'liked'
  );
}

export async function dislike(req, res) {
  await ensureUserFeatureTables();
  const existingComment = await prisma.comment.findUnique({
    where: { id: req.params.id },
    select: { id: true }
  });

  if (!existingComment) {
    return sendError(res, ErrorCodes.COMMENT_NOT_FOUND, 'comment not found');
  }

  const { updated, toggledOn } = await prisma.$transaction(async (tx) => {
    const existing = await tx.$queryRawUnsafe(
      'SELECT reaction FROM comment_reactions WHERE userId = ? AND commentId = ? LIMIT 1',
      req.user.id,
      req.params.id
    );

    if (existing[0]?.reaction === 'dislike') {
      await tx.$executeRawUnsafe('DELETE FROM comment_reactions WHERE userId = ? AND commentId = ?', req.user.id, req.params.id);
      const updatedComment = await tx.comment.update({
        where: { id: req.params.id },
        data: {
          dislikes: { decrement: 1 }
        }
      });
      return { updated: updatedComment, toggledOn: false };
    }

    if (existing[0]?.reaction === 'like') {
      await tx.$executeRawUnsafe(
        'UPDATE comment_reactions SET reaction = ? WHERE userId = ? AND commentId = ?',
        'dislike',
        req.user.id,
        req.params.id
      );
      const updatedComment = await tx.comment.update({
        where: { id: req.params.id },
        data: {
          likes: { decrement: 1 },
          dislikes: { increment: 1 }
        }
      });
      return { updated: updatedComment, toggledOn: true };
    }

    await tx.$executeRawUnsafe(
      'INSERT INTO comment_reactions (userId, commentId, reaction, createdAt) VALUES (?, ?, ?, CURRENT_TIMESTAMP)',
      req.user.id,
      req.params.id,
      'dislike'
    );
    const updatedComment = await tx.comment.update({
      where: { id: req.params.id },
      data: {
        dislikes: { increment: 1 }
      }
    });
    return { updated: updatedComment, toggledOn: true };
  });

  return sendSuccess(
    res,
    {
      likes: updated.likes,
      dislikes: updated.dislikes,
      userLiked: false,
      userDisliked: toggledOn
    },
    'disliked'
  );
}

export async function remove(req, res) {
  const comment = await prisma.comment.findUnique({
    where: { id: req.params.id }
  });

  if (!comment) {
    return sendError(res, ErrorCodes.COMMENT_NOT_FOUND, 'comment not found');
  }

  if (req.user.role !== 'admin' && comment.userId !== req.user.id) {
    return sendError(res, ErrorCodes.PERMISSION_DENIED, 'comment permission denied');
  }

  await prisma.comment.delete({
    where: { id: req.params.id }
  });

  return sendSuccess(res, null, 'deleted');
}
