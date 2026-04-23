import { Router } from 'express';
import { toNodeHandler } from 'better-auth/node';
import { auth } from '../../lib/auth';

export const authRouter = Router();

authRouter.all('/*splat', toNodeHandler(auth));
