const express = require('express');
const router = express.Router();
const invitationController = require('../controllers/invitationController');
const { authenticate } = require('../middleware/authMiddleware');
router.post('/create', authenticate, invitationController.createInvitationController);
router.get('/accept', invitationController.acceptInvitation);
router.post("/verify", invitationController.verifyInvitationController);
module.exports = router;
