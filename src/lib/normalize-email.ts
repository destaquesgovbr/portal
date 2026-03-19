/** Normalize email to lowercase for case-insensitive matching across providers. */
export function normalizeEmail(email: string): string {
  return email.toLowerCase().trim()
}
