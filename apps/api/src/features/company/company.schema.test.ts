import { describe, expect, it } from 'vitest';
import { LOGO_DATA_URI_MAX_LENGTH, updateCompanySchema } from './company.schema.js';

// logoUrl accepts two shapes (hosted link, inline data URI) at a trust
// boundary, so the allowlist is asserted directly rather than through a form.
describe('company.schema', () => {
  const parse = (logoUrl: string) => updateCompanySchema.safeParse({ name: 'Acme', logoUrl });

  it('accepts an https link and an empty value', () => {
    expect(parse('https://company.com/logo.png').success).toBe(true);
    expect(parse('').success).toBe(true);
  });

  it('accepts an image data URI within the size cap', () => {
    expect(parse('data:image/png;base64,iVBORw0KGgo=').success).toBe(true);
    expect(parse('data:image/svg+xml;base64,PHN2Zy8+').success).toBe(true);
  });

  it('rejects a data URI over the size cap', () => {
    const oversized = `data:image/png;base64,${'A'.repeat(LOGO_DATA_URI_MAX_LENGTH)}`;
    expect(parse(oversized).success).toBe(false);
  });

  it('rejects non-image data URIs and other schemes', () => {
    expect(parse('data:text/html;base64,PHNjcmlwdD4=').success).toBe(false);
    expect(parse('javascript:alert(1)').success).toBe(false);
    expect(parse('file:///etc/passwd').success).toBe(false);
  });

  it('rejects a base64 body with invalid padding', () => {
    // 'QQ===' has 3 padding chars - valid base64 padding is only 0-2 '=' chars.
    expect(parse('data:image/png;base64,QQ===').success).toBe(false);
  });

  it('accepts a validly-padded base64 body', () => {
    // 'QQ==' decodes to a single byte - correctly padded.
    expect(parse('data:image/png;base64,QQ==').success).toBe(true);
  });
});
