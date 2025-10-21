// controllers/invitationController.js
const invitationService = require('../services/invitationService');
const authService = require('../services/authService');
const User = require('../models/User');
const Invitation = require('../models/Invitation');
const { sanitizeUser } = require("../utils/sanitizeUser"); 
const speakeasy = require('speakeasy');
const qrcode = require('qrcode');
const {sendMail}=require('../services/emailService')
const { canSendInvitation } = require('../utils/permissions');
const { publishEvent } = require("../rabbitmq/publisher");
async function createInvitationController(req, res) {
  try {
    const { email, role, method, expiresInDays } = req.body;
    const senderRole = req.user.role;
    const targetRole = role || 'client_user';

    if (!canSendInvitation(senderRole, targetRole)) {
      return res.status(403).json({ message: "You are not allowed to send invitation to this role." });
    }

    const existingInvite = await Invitation.findOne({
      email,
      status: "pending",
      expiresAt: { $gt: new Date() }
    });
    if (existingInvite) {
      const diffDays = Math.ceil((existingInvite.expiresAt - Date.now()) / (1000 * 60 * 60 * 24));
      return res.status(400).json({ message: `Invitation already sent. Wait ${diffDays} day(s).` });
    }

    const inv = await invitationService.createInvitation({
      email,
      role: targetRole,
      method: method || 'TOTP',
      createdBy: req.user.sub,
      expiresInDays: expiresInDays || 7
    });

    
    const payload = {
      type: "invite.created",
      data: {
        invitationId: inv.invitationId,
        code: inv.code,
        email: inv.email,
        role: inv.role,
        expiresAt: inv.expiresAt,
        inviter: { id: req.user.sub, email: req.user.email }
      }
    };
    await publishEvent(process.env.RABBITMQ_ROUTE_INVITE, payload);

    res.status(201).json({
      message: "Invitation created and queued for email",
      invitation: { invitationId: inv.invitationId, code: inv.code, expiresAt: inv.expiresAt }
    });

  } catch (err) {
    console.error("createInvitation error:", err);
    res.status(err.status || 500).json({ message: err.message || "Server error" });
  }
}

async function acceptInvitation(req, res) {
 try {
    const { invitationId, code } = req.query;

    if (!invitationId || !code) {
      return res.status(400).json({ error: "Invitation ID and code are required" });
    }

    
    const invitation = await Invitation.findOne({ invitationId, code });

    if (!invitation) {
      return res.status(404).json({ message: "Invitation not found" });
    }

    if (invitation.expiresAt < new Date()) {
      return res.status(400).json({ message: "Invitation expired" });
    }

    if (invitation.used) {
      return res.status(400).json({ message: "Invitation already used" });
    }

    res.status(200).json({
      message: "Invitation is valid",
      email: invitation.email,
      role: invitation.role,
      expiresAt: invitation.expiresAt
    });

  } catch (err) {
    console.error("acceptInvitation error:", err);
    res.status(500).json({ error: err.message });
  }
};

async function verifyInvitationController(req, res) {
  try {
    const { invitationId, code } = req.query; 
    if (!invitationId || !code) {
      return res.status(400).json({ error: "Invitation ID and code are required" });
    }

    const invitation = await Invitation.findOne({ invitationId, code });
    if (!invitation) {
      return res.status(404).json({ error: "Invalid or broken invitation link" });
    }

    if (invitation.status !== "pending") {
      return res.status(400).json({ error: "Invitation already used or expired" });
    }

    if (invitation.expiresAt < new Date()) {
      invitation.status = "expired";
      await invitation.save();
      return res.status(400).json({ error: "Invitation expired" });
    }

 
    res.status(200).json({
      message: "Invitation verified successfully",
      email: invitation.email,
      role: invitation.role
    });

  } catch (err) {
    console.error("verifyInvitation error:", err);
    res.status(500).json({ error: "Server error" });
  }
}

module.exports = { createInvitationController, acceptInvitation,verifyInvitationController,};
