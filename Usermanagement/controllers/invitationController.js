import invitationService from "../services/invitationService.js";
import Invitation from "../models/Invitation.js";
import { canSendInvitation } from "../utils/permissions.js";
import { publishEvent } from "../rabbitmq/publisher.js";
import { getIO } from "../socket/socketServer.js";
import dbAdapter from "../db/dbAdapter.js";


// --------------------------------------------------------
// CREATE INVITATION
// --------------------------------------------------------
async function createInvitationController(req, res) {
  try {
    const { email, role, method, expiresInDays, organization } = req.body;

    const senderRole = req.user.role;
    const targetRole = role || "client_user";

    // Role Permission Check
    if (!canSendInvitation(senderRole, targetRole)) {
      return res.status(403).json({
        message: "You are not allowed to send invitation to this role.",
      });
    }

    // Check existing pending invitation
    const existingInvite = await dbAdapter.findOne(Invitation, {
      email,
      status: "pending",
      expiresAt: { $gt: new Date() },
    });

    if (existingInvite) {
      const diffDays = Math.ceil(
        (existingInvite.expiresAt - Date.now()) /
          (1000 * 60 * 60 * 24)
      );

      return res.status(400).json({
        message: `Invitation already sent. Wait ${diffDays} day(s).`,
      });
    }

    // Create invitation through service
    const inv = await invitationService.createInvitation({
      email,
      role: targetRole,
      method: method || "TOTP",
      createdBy: req.user.sub,
      organization: organization || null,
      expiresInDays: expiresInDays || 7,
    });

    // Publish event for email queue
    await publishEvent(process.env.RABBITMQ_ROUTE_INVITE, {
      type: "invite.created",
      data: {
        invitationId: inv.invitationId,
        code: inv.code,
        email: inv.email,
        role: inv.role,
        organization: inv.organization,
        expiresAt: inv.expiresAt,
        inviter: { id: req.user.sub, email: req.user.email },
      },
    });

    // Emit WebSocket event
    try {
      const io = getIO();
      io.emit("newInvitation", {
        message: `New invitation sent to ${inv.email}`,
        data: {
          invitationId: inv.invitationId,
          role: inv.role,
          organization: inv.organization,
          expiresAt: inv.expiresAt,
        },
      });
    } catch (socketErr) {
      console.warn("WebSocket not initialized. Skipping emit.");
    }

    return res.status(201).json({
      message: "Invitation created and queued for email",
      invitation: {
        invitationId: inv.invitationId,
        code: inv.code,
        role: inv.role,
        organization: inv.organization,
        expiresAt: inv.expiresAt,
      },
    });
  } catch (err) {
    console.error("createInvitation error:", err);
    return res
      .status(err.status || 500)
      .json({ message: err.message || "Server error" });
  }
}



// --------------------------------------------------------
// ACCEPT INVITATION
// --------------------------------------------------------
async function acceptInvitation(req, res) {
  try {
    const { invitationId, code } = req.query;

    if (!invitationId || !code) {
      return res
        .status(400)
        .json({ error: "Invitation ID and code are required" });
    }

    // Fetch invitation using adapter
    const invitation = await dbAdapter.findOne(Invitation, {
      invitationId,
      code,
    });

    if (!invitation) {
      return res.status(404).json({ message: "Invitation not found" });
    }

    // Expired?
    if (invitation.expiresAt < new Date()) {
      await publishEvent("invitation.expired", {
        type: "invitation_expired",
        email: invitation.email,
        sender: invitation.createdBy,
        message: `Invitation for ${invitation.email} has expired.`,
      });

      return res.status(400).json({ message: "Invitation expired" });
    }

    if (invitation.used) {
      return res.status(400).json({ message: "Invitation already used" });
    }

    // Mark as accepted using adapter
    await dbAdapter.updateOne(
      Invitation,
      { invitationId },
      {
        used: true,
        status: "accepted",
        acceptedAt: new Date(),
      }
    );

    // Emit event
    await publishEvent("invitation.accepted", {
      type: "invitation_accepted",
      email: invitation.email,
      sender: invitation.createdBy,
      message: `${invitation.email} accepted your invitation`,
      invitationId: invitation.invitationId,
    });

    // WebSocket notification
    try {
      const io = getIO();
      io.emit("invitationAccepted", {
        message: `${invitation.email} accepted the invitation.`,
        invitationId: invitation.invitationId,
      });
    } catch (socketErr) {
      console.warn("WebSocket not initialized. Skipping emit.");
    }

    return res.status(200).json({
      message: "Invitation is valid",
      email: invitation.email,
      role: invitation.role,
      organization: invitation.organization,
      expiresAt: invitation.expiresAt,
    });
  } catch (err) {
    console.error("acceptInvitation error:", err);
    return res.status(500).json({ error: err.message });
  }
}



// --------------------------------------------------------
// VERIFY INVITATION (Before Signup)
// --------------------------------------------------------
async function verifyInvitationController(req, res) {
  try {
    const { invitationId, code } = req.query;

    if (!invitationId || !code) {
      return res
        .status(400)
        .json({ error: "Invitation ID and code are required" });
    }

    const invitation = await dbAdapter.findOne(Invitation, {
      invitationId,
      code,
    });

    if (!invitation) {
      return res
        .status(404)
        .json({ error: "Invalid or broken invitation link" });
    }

    if (invitation.status !== "pending") {
      return res
        .status(400)
        .json({ error: "Invitation already used or expired" });
    }

    if (invitation.expiresAt < new Date()) {
      await dbAdapter.updateOne(
        Invitation,
        { invitationId },
        { status: "expired" }
      );

      return res.status(400).json({ error: "Invitation expired" });
    }

    return res.status(200).json({
      message: "Invitation verified successfully",
      email: invitation.email,
      role: invitation.role,
      organization: invitation.organization,
    });
  } catch (err) {
    console.error("verifyInvitation error:", err);
    return res.status(500).json({ error: "Server error" });
  }
}


export {
  createInvitationController,
  acceptInvitation,
  verifyInvitationController,
};
