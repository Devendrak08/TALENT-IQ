import express from "express";
import { protectedRoute } from "../middleware/protectedRoute.js";
import {
  createSession,
  endSession,
  getActiveSessions,
  getMyRecentSessions,
  getSessionById,
  joinSession
} from "../controllers/sessionController.js";

const router = express.Router();

router.post("/", protectedRoute, createSession);
router.get("/active", protectedRoute, getActiveSessions);
router.get("/my-recent", protectedRoute, getMyRecentSessions);

router.get("/:id", protectedRoute, getSessionById);
router.post("/:id/join", protectedRoute, joinSession);
router.post("/:id/end", protectedRoute, endSession);


export default router;