import type { Request, Response } from 'express';
import { success, successList } from '../../lib/response.js';
import type {
  CreateInvitationInput,
  InvitationParamsInput,
  ListInvitationsInput,
  ValidateInviteTokenInput,
} from './invitations.schema.js';
import {
  createInvitation,
  listInvitations,
  revokeInvitation,
  validateAndStageInvite,
} from './invitations.service.js';

export async function createInvitationController(req: Request, res: Response) {
  const body = req.validatedBody as CreateInvitationInput;
  const invitation = await createInvitation(body, {
    id: req.user!.id,
    name: req.user!.name,
  });
  res.status(201).json(success(invitation));
}

export async function validateInviteController(req: Request, res: Response) {
  const body = req.validatedBody as ValidateInviteTokenInput;
  const stagedInvite = await validateAndStageInvite(body.token);
  res.json(success(stagedInvite));
}

export async function listInvitationsController(req: Request, res: Response) {
  const query = req.validatedQuery as ListInvitationsInput;
  const { data, meta } = await listInvitations(query);
  res.json(successList(data, meta));
}

export async function revokeInvitationController(req: Request, res: Response) {
  const params = req.validatedParams as InvitationParamsInput;
  const invitation = await revokeInvitation(params.id, {
    id: req.user!.id,
    name: req.user!.name,
  });
  res.json(success(invitation));
}
