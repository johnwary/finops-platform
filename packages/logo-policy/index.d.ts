export const LOGO_MAX_BYTES: number
export const LOGO_DATA_URI_MAX_LENGTH: number
export const LOGO_URL_MAX_LENGTH: number
export const LOGO_ACCEPTED_TYPES: string[]

export function logoFileError(file: { type: string; size: number }): string | undefined
export function logoSourceError(source: string): string | undefined
