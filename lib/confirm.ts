/** Confirm account deletion by typing the account email, or SLET when there is no email. */
export function confirmationMatches(accountEmail: string | null | undefined, typed: string): boolean {
  const value = typed.trim();
  const email = accountEmail?.trim() ?? '';
  if (email.includes('@')) return value.toLowerCase() === email.toLowerCase();
  return value === 'SLET';
}

export function confirmationHint(accountEmail: string | null | undefined): string {
  const email = accountEmail?.trim() ?? '';
  if (email.includes('@')) return email;
  return 'SLET';
}
