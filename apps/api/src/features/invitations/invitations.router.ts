import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.middleware.js';
import { requireRole } from '../../middleware/rbac.middleware.js';
import { validate } from '../../middleware/validate.middleware.js';
import {
  createInvitationController,
  listInvitationsController,
  revokeInvitationController,
  validateInviteController,
} from './invitations.controller.js';
import {
  createInvitationSchema,
  invitationParamsSchema,
  listInvitationsSchema,
  validateInviteTokenSchema,
} from './invitations.schema.js';

export const invitationsRouter = Router();

invitationsRouter.post('/validate', validate(validateInviteTokenSchema), validateInviteController);
invitationsRouter.post(
  '/',
  requireAuth,
  requireRole('admin'),
  validate(createInvitationSchema),
  createInvitationController,
);
invitationsRouter.get(
  '/',
  requireAuth,
  requireRole('admin'),
  validate(listInvitationsSchema, 'query'),
  listInvitationsController,
);
invitationsRouter.post(
  '/:id/revoke',
  requireAuth,
  requireRole('admin'),
  validate(invitationParamsSchema, 'params'),
  revokeInvitationController,
);
