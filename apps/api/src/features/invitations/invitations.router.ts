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

// Public — validates an invite token before signup. Must be mounted before the
// requireAuth guard below.
invitationsRouter.post('/validate', validate(validateInviteTokenSchema), validateInviteController);

invitationsRouter.use(requireAuth);

invitationsRouter.post(
  '/',
  requireRole('admin'),
  validate(createInvitationSchema),
  createInvitationController,
);
invitationsRouter.get(
  '/',
  requireRole('admin'),
  validate(listInvitationsSchema, 'query'),
  listInvitationsController,
);
invitationsRouter.post(
  '/:id/revoke',
  requireRole('admin'),
  validate(invitationParamsSchema, 'params'),
  revokeInvitationController,
);
