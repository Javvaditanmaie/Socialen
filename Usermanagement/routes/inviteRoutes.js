// routes/inviteRoutes.js
const express = require("express");
const router = express.Router();
const { authenticate } = require("../middleware/authMiddleware");
const { createInvitation } = require("../services/invitationService");

router.post("/create", authenticate, async (req, res) => {
  try {
    const { email } = req.body;
    const invitation = await createInvitation(email, req.user.sub);
    res.json({ message: "Invitation created", invitation });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create invitation" });
  }
});

module.exports = router;
