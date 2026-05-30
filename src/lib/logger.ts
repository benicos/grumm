type LogLevel = "error" | "warn" | "info";

type ErrorLike = {
  code?: string | number;
  details?: unknown;
  hint?: unknown;
  message?: string;
  name?: string;
  stack?: string;
  status?: string | number;
  statusText?: string;
};

export type LogContext = {
  component?: string;
  method?: string;
  operation?: string;
  payload?: unknown;
  props?: unknown;
  response?: unknown;
  route?: string;
  source?: string;
  status?: string | number;
  statusText?: string;
  table?: string;
  url?: string;
};

const SENSITIVE_KEY_PATTERN =
  /(password|token|jwt|secret|apikey|api_key|anonkey|authorization|refresh|access|supabase.*key)/i;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object");
}

export function sanitizeForLog(value: unknown, depth = 0): unknown {
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

function getErrorField(error: unknown, key: keyof ErrorLike) {
  if (!isRecord(error) || !(key in error)) {
    return undefined;
  }

  return error[key];
}

export function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  const message = getErrorField(error, "message");

  if (message) {
    return String(message);
  }

  if (typeof error === "string") {
    return error;
  }

  return "Unknown error";
}

export function serializeError(error: unknown) {
  return sanitizeForLog({
    message: getErrorMessage(error),
    name: error instanceof Error ? error.name : getErrorField(error, "name"),
    code: getErrorField(error, "code"),
    details: getErrorField(error, "details"),
    hint: getErrorField(error, "hint"),
    status: getErrorField(error, "status"),
    statusText: getErrorField(error, "statusText"),
    stack: error instanceof Error ? error.stack : getErrorField(error, "stack"),
  });
}

export function logStructuredError(
  error: unknown,
  context: LogContext = {},
  level: LogLevel = "error",
) {
  const errorPayload = serializeError(error) as Record<string, unknown>;
  const payload = sanitizeForLog({
    ...context,
    ...errorPayload,
    timestamp: new Date().toISOString(),
  });

  const logger = level === "error" ? console.error : level === "warn" ? console.warn : console.info;
  logger("[ERROR]", payload);
}

export function logSupabaseError(
  error: unknown,
  context: Omit<LogContext, "source">,
) {
  // Supabase errors often include Postgres/RLS diagnostics in code/details/hint.
  logStructuredError(error, { ...context, source: "Supabase" });
}

export function logNetworkError(
  error: unknown,
  context: Omit<LogContext, "source">,
) {
  logStructuredError(error, { ...context, source: "Network" });
}

export function logReactError(
  error: unknown,
  context: Omit<LogContext, "source">,
) {
  logStructuredError(error, { ...context, source: "React" });
}
