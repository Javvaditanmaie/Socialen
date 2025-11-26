import express from "express";
import sendMail from "../services/emailService.js";

const router = express.Router();

router.post("/send-otp", async (req, res) => {
  const { email, otp } = req.body;
  
  const message = `Your OTP for Socialen login is: ${otp}. It is valid for 5 minutes.`;

  await sendMail(email, "Your Socialen OTP", message);

  res.json({ success: true });
});

export default router;
