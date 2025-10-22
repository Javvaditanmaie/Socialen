// controllers/invitationController.js
import invitationService from '../services/invitationService.js';
import authService from '../services/authService.js';
import User from '../models/User.js';
import Invitation from '../models/Invitation.js';
import { sanitizeUser } from "../utils/sanitizeUser.js"; 
import speakeasy from 'speakeasy';
import qrcode from 'qrcode';
import { canSendInvitation } from '../utils/permissions.js';
import { publishEvent } from "../rabbitmq/publisher.js";
async function createInvitationController(req, res) {
  try {
    const { email, role, method, expiresInDays,organization } = req.body;
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
      organization:organization||null,
      expiresInDays: expiresInDays || 7
    });

    
    const payload = {
      type: "invite.created",
      data: {
        invitationId: inv.invitationId,
        code: inv.code,
        email: inv.email,
        role: inv.role,
        organization: inv.organization||organization,
        expiresAt: inv.expiresAt,
        inviter: { id: req.user.sub, email: req.user.email }
      }
    };
    await publishEvent(process.env.RABBITMQ_ROUTE_INVITE, payload);

    res.status(201).json({
      message: "Invitation created and queued for email",
      invitation: { invitationId: inv.invitationId, code: inv.code,role: inv.role,organization: inv.organization, expiresAt: inv.expiresAt }
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
      organization: invitation.organization,
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

export { createInvitationController, acceptInvitation,verifyInvitationController,};
