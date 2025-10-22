import express from "express";
import { authenticate } from "../middleware/authMiddleware.js";
import * as authController from "../controllers/authController.js";

const router = express.Router();

router.post("/signup", authController.signup);
router.post("/signin", authController.signin);
router.post("/login-totp", authController.loginTOTP);
router.post("/refresh", authController.refresh);
router.post("/logout", authenticate, authController.logout);
router.post("/totp/verify", authController.verifyTotp);
router.post("/totp/setup", authController.totpSetup);
router.get("/profile", authenticate, authController.getProfile);
router.put("/profile", authenticate, authController.updateProfile);
router.post("/assign-role", authenticate, authController.assignRole);
router.post("/send-otp", authController.sendOTP);
router.post("/verify-otp", authController.verifyOTP);

export default router;
