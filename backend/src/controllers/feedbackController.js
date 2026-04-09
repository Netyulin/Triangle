import prisma from "../utils/prisma.js"

export async function createFeedback(req, res) {
  try {
    const { type, title, description, contact, userId } = req.body

    if (!title?.trim() || !description?.trim()) {
      return res.status(400).json({ error: "标题和内容不能为空" })
    }

    const feedback = await prisma.feedback.create({
      data: {
        type: type || "other",
        title: title.trim(),
        description: description.trim(),
        contact: contact?.trim() || null,
        userId: userId ? parseInt(userId) : null,
      },
    })

    res.status(201).json({ success: true, data: feedback })
  } catch (error) {
    console.error("Feedback error:", error)
    res.status(500).json({ error: "服务器错误" })
  }
}

export async function listFeedback(req, res) {
  try {
    const page = parseInt(req.query.page) || 1
    const limit = parseInt(req.query.limit) || 20
    const skip = (page - 1) * limit

    const [feedbacks, total] = await Promise.all([
      prisma.feedback.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: { user: { select: { id: true, name: true, username: true } } },
      }),
      prisma.feedback.count(),
    ])

    res.json({ data: feedbacks, total, page, limit })
  } catch (error) {
    console.error("List feedback error:", error)
    res.status(500).json({ error: "服务器错误" })
  }
}
