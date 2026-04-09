import express from "express"
import { createFeedback, listFeedback } from "../controllers/feedbackController.js"

const router = express.Router()

router.post("/", createFeedback)
router.get("/", listFeedback)

export default router
