/**
 * Password strength as a single line of monospace text — not a color bar
 * (brief §Signup). "Weak" / "Fair" / "Strong".
 */
export function scorePassword(p: string): 0 | 1 | 2 | 3 {
  if (!p) return 0;
  let score = 0;
  if (p.length >= 8) score++;
  if (/[A-Z]/.test(p) && /[a-z]/.test(p)) score++;
  if (/[0-9]/.test(p)) score++;
  if (/[^A-Za-z0-9]/.test(p)) score++;
  if (score <= 1) return 1; // Weak
  if (score <= 3) return 2; // Fair
  return 3; // Strong
}

const LABELS = ["", "Weak", "Fair", "Strong"] as const;
const COLORS = ["", "text-status-dnd", "text-status-idle", "text-status-online"] as const;

export function PasswordStrength({ password }: { password: string }) {
  if (!password) return null;
  const s = scorePassword(password);
  return (
    <p className={`mt-1.5 font-mono text-[11px] ${COLORS[s]}`}>{LABELS[s]}</p>
  );
}
