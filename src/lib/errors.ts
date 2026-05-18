type ErrorLike = {
  code?: string | number;
  details?: string;
  hint?: string;
  message?: string;
  name?: string;
  status?: string | number;
};

export type ErrorContext = {
  operation?: string;
  route?: string;
  source?: string;
  table?: string;
};

const DEFAULT_PROD_MESSAGE = "Une erreur est survenue. Réessaie dans quelques instants.";

export function isDebugErrorsEnabled() {
  return (
    process.env.NODE_ENV !== "production" ||
    process.env.NEXT_PUBLIC_ERROR_MODE === "debug"
  );
}

function isErrorLike(error: unknown): error is ErrorLike {
  return Boolean(error && typeof error === "object");
}

function getErrorValue(error: unknown, key: keyof ErrorLike) {
  if (!isErrorLike(error) || !(key in error)) {
    return null;
  }

  const value = error[key];
  return value === undefined || value === null ? null : String(value);
}

function getRawMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  if (isErrorLike(error) && error.message) {
    return String(error.message);
  }

  if (typeof error === "string") {
    return error;
  }

  return "Erreur inconnue";
}

function formatContext(context?: ErrorContext) {
  if (!context) {
    return null;
  }

  return [
    context.source ? `source=${context.source}` : null,
    context.table ? `table=${context.table}` : null,
    context.operation ? `operation=${context.operation}` : null,
    context.route ? `route=${context.route}` : null,
  ]
    .filter(Boolean)
    .join(" ");
}

export function formatAppError(
  error: unknown,
  {
    context,
    prodMessage = DEFAULT_PROD_MESSAGE,
  }: {
    context?: ErrorContext;
    prodMessage?: string;
  } = {},
) {
  if (!isDebugErrorsEnabled()) {
    return prodMessage;
  }

  const details = [
    formatContext(context),
    `message=${getRawMessage(error)}`,
    getErrorValue(error, "code") ? `code=${getErrorValue(error, "code")}` : null,
    getErrorValue(error, "status")
      ? `status=${getErrorValue(error, "status")}`
      : null,
    getErrorValue(error, "details")
      ? `details=${getErrorValue(error, "details")}`
      : null,
    getErrorValue(error, "hint") ? `hint=${getErrorValue(error, "hint")}` : null,
  ].filter(Boolean);

  return details.join(" | ");
}

export function logAppError(error: unknown, context?: ErrorContext) {
  if (!isDebugErrorsEnabled()) {
    return;
  }

  console.warn("[Velora]", formatAppError(error, { context }), error);
}

export function getConfiguredErrorMessage() {
  return formatAppError("Supabase is not configured", {
    context: { source: "Supabase", operation: "configuration" },
    prodMessage: DEFAULT_PROD_MESSAGE,
  });
}
