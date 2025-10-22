import express from "express";
import { authenticate } from "../middleware/authMiddleware.js";
import * as invitationController from "../controllers/invitationController.js";

const router = express.Router();

router.post("/create", authenticate, invitationController.createInvitationController);
router.get("/accept", invitationController.acceptInvitation);
router.post("/verify", invitationController.verifyInvitationController);

export default router;
