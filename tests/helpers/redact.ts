export function redactSecrets(input: unknown, secrets: Array<string | undefined>): string {
  let s = typeof input === "string" ? input : (input instanceof Error ? (input.stack ?? input.message) : JSON.stringify(input));
  for (const secret of secrets) {
    if (!secret) continue;
    if (secret.length < 8) continue;
    s = s.split(secret).join("<redacted>");
  }
  // also redact common Authorization header patterns
  s = s.replace(/Authorization:\s*Bearer\s+[^\s"']+/gi, "Authorization: Bearer <redacted>");
  return s;
}
