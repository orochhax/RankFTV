export function isEmailRecipientAllowed(
  recipient: string,
  rawAllowlist: string | undefined,
): boolean {
  if (!rawAllowlist?.trim()) return true;

  const normalizedRecipient = recipient.trim().toLowerCase();
  const allowedRecipients = new Set(
    rawAllowlist
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean),
  );

  return allowedRecipients.has(normalizedRecipient);
}
