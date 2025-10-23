import { createInvitationController, acceptInvitation, verifyInvitationController } from '../../controllers/invitationController.js';
import Invitation from '../../models/Invitation.js';
import * as invitationService from '../../services/invitationService.js';
import { publishEvent } from '../../rabbitmq/publisher.js';

jest.mock('../../services/invitationService.js', () => ({
  createInvitation: jest.fn(),
  validateInvitation: jest.fn(),
  generateAndSendEmailOtp: jest.fn(),
  verifyInvitationOtp: jest.fn(),
  markUsed: jest.fn(),
}));

jest.mock('../../models/Invitation.js', () => ({
  findOne: jest.fn(),
}));

jest.mock('../../rabbitmq/publisher.js', () => ({
  publishEvent: jest.fn(),
}));

describe('Invitation Controller', () => {
  let req, res;

  beforeEach(() => {
    req = {
      body: {},
      user: { sub: '123', role: 'super_admin', email: 'admin@example.com' },
      query: {}
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    jest.clearAllMocks();
  });

  // -----------------------
  // createInvitationController
  // -----------------------
  test('createInvitationController: success', async () => {
    req.body = { email: 'test@example.com', role: 'client_user' };

    Invitation.findOne.mockResolvedValue(null);
    invitationService.createInvitation.mockResolvedValue({
      invitationId: 'inv123',
      code: 'code123',
      role: 'client_user',
      organization: null,
      expiresAt: new Date()
    });
    publishEvent.mockResolvedValue(true);

    await createInvitationController(req, res);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      message: expect.any(String),
      invitation: expect.objectContaining({
        invitationId: 'inv123',
        code: 'code123'
      })
    }));
  });

  test('createInvitationController: forbidden for role', async () => {
    req.user.role = 'client_admin';
    req.body.role = 'super_admin';

    await createInvitationController(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      message: expect.any(String)
    }));
  });

  test('createInvitationController: existing pending invitation', async () => {
    req.body = { email: 'test@example.com', role: 'client_user' };
    const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000);
    Invitation.findOne.mockResolvedValue({ expiresAt: futureDate });

    await createInvitationController(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      message: expect.stringContaining('Invitation already sent')
    }));
  });

  // -----------------------
  // acceptInvitation
  // -----------------------
  test('acceptInvitation: valid invitation', async () => {
    req.query = { invitationId: 'inv123', code: 'code123' };
    const invitationMock = { expiresAt: new Date(Date.now() + 1000 * 60), used: false, email: 'test@example.com', role: 'client_user', organization: null };
    Invitation.findOne.mockResolvedValue(invitationMock);

    await acceptInvitation(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      message: expect.any(String),
      email: 'test@example.com'
    }));
  });

  test('acceptInvitation: expired invitation', async () => {
    req.query = { invitationId: 'inv123', code: 'code123' };
    const invitationMock = { expiresAt: new Date(Date.now() - 1000), used: false };
    Invitation.findOne.mockResolvedValue(invitationMock);

    await acceptInvitation(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'Invitation expired' }));
  });

  test('acceptInvitation: invitation not found', async () => {
    req.query = { invitationId: 'inv123', code: 'code123' };
    Invitation.findOne.mockResolvedValue(null);

    await acceptInvitation(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'Invitation not found' }));
  });

  // -----------------------
  // verifyInvitationController
  // -----------------------
  test('verifyInvitationController: valid invitation', async () => {
    req.query = { invitationId: 'inv123', code: 'code123' };
    const invitationMock = { status: 'pending', expiresAt: new Date(Date.now() + 1000 * 60), email: 'test@example.com', role: 'client_user', save: jest.fn() };
    Invitation.findOne.mockResolvedValue(invitationMock);

    await verifyInvitationController(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      message: 'Invitation verified successfully',
      email: 'test@example.com'
    }));
  });

  test('verifyInvitationController: expired invitation', async () => {
    req.query = { invitationId: 'inv123', code: 'code123' };
    const invitationMock = { status: 'pending', expiresAt: new Date(Date.now() - 1000), save: jest.fn() };
    Invitation.findOne.mockResolvedValue(invitationMock);

    await verifyInvitationController(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'Invitation expired' }));
    expect(invitationMock.save).toHaveBeenCalled();
  });

  test('verifyInvitationController: already used invitation', async () => {
    req.query = { invitationId: 'inv123', code: 'code123' };
    const invitationMock = { status: 'used', expiresAt: new Date(Date.now() + 1000 * 60) };
    Invitation.findOne.mockResolvedValue(invitationMock);

    await verifyInvitationController(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'Invitation already used or expired' }));
  });

});
