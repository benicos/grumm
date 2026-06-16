type LogContext = {
  component?: string;
  operation?: string;
  payload?: unknown;
  route?: string;
  source?: string;
  table?: string;
};

const SENSITIVE_KEY_PATTERN =
  /(password|token|jwt|secret|apikey|api_key|anonkey|authorization|refresh|access|supabase.*key)/i;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object");
}

function sanitizeForLog(value: unknown, depth = 0): unknown {
  if (depth > 5) {
    return "[MaxDepth]";
  }

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeForLog(item, depth + 1));
  }

  if (!isRecord(value)) {
    return value;
  }

  return Object.fromEntries(
    Object.entries(value).map(([key, entry]) => [
      key,
      SENSITIVE_KEY_PATTERN.test(key)
        ? "[REDACTED]"
        : sanitizeForLog(entry, depth + 1),
    ]),
  );
}

function getErrorField(error: unknown, key: string) {
  return isRecord(error) && key in error ? error[key] : undefined;
}

export function logStructuredError(error: unknown, context: LogContext = {}) {
  if (!__DEV__) {
    return;
  }

  console.error(
    "[ERROR]",
    sanitizeForLog({
      ...context,
      code: getErrorField(error, "code"),
      details: getErrorField(error, "details"),
      hint: getErrorField(error, "hint"),
      message:
        error instanceof Error
          ? error.message
          : String(getErrorField(error, "message") ?? error),
      stack: error instanceof Error ? error.stack : getErrorField(error, "stack"),
      timestamp: new Date().toISOString(),
    }),
  );
}

export function logSupabaseError(
  error: unknown,
  context: Omit<LogContext, "source"> = {},
) {
  logStructuredError(error, { ...context, source: "Supabase" });
}
