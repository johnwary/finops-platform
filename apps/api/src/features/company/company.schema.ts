import { z } from 'zod';
import { logoSourceError } from '@finops/logo-policy';

// A logo is either a link to an externally hosted image or an inline data URI.
// The upload path base64-encodes the file client-side and stores it in this same
// column, so there is no object store to provision. Data URIs are far longer than
// a link, hence the separate cap; keep it in step with LOGO_MAX_BYTES on the web
// side, which rejects oversized files before the request is ever sent. base64
// inflates 150 KB (LOGO_MAX_BYTES) to a 204,800-char body (ceil(n/3)*4) plus up
// to a 26-char "data:image/svg+xml;base64," prefix = 204,826 chars, so the cap
// must clear that with headroom.
const logoUrlSchema = z
  .string()
  .trim()
  .refine((v) => !logoSourceError(v), { message: 'Enter an image URL (http/https) or upload a PNG, JPG, WebP or SVG image under 150 KB.' });

export const updateCompanySchema = z.object({
  name: z.string().trim().min(1).max(200),
  address: z.string().trim().max(500).optional(),
  phone: z.string().trim().max(50).optional(),
  email: z.string().trim().email().max(200).optional().or(z.literal('')),
  website: z.string().trim().max(200).optional(),
  taxId: z.string().trim().max(100).optional(),
  logoUrl: logoUrlSchema.optional().or(z.literal('')),
});

export type UpdateCompanyInput = z.infer<typeof updateCompanySchema>;
