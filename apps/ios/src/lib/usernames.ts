import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "../../../../src/types/database";
import { withSupabaseTimeout } from "./supabase";

const USERNAME_CHECK_ERROR =
  "Impossible de vérifier ce pseudo pour le moment. Réessaie dans quelques instants.";

function getErrorField(error: unknown, key: string) {
  return error !== null && typeof error === "object" && key in error
    ? (error as Record<string, unknown>)[key]
    : undefined;
}

function getErrorMessage(error: unknown) {
  return error instanceof Error
    ? error.message.toLowerCase()
    : String(getErrorField(error, "message") ?? error).toLowerCase();
}

function getUsernameCheckFailureKind(error: unknown) {
  const code = String(getErrorField(error, "code") ?? "");
  const message = getErrorMessage(error);

  if (message.includes("network") || message.includes("fetch")) {
    return "network";
  }

  if (code === "42501" || message.includes("permission") || message.includes("rls")) {
    return "rls";
  }

  return "supabase";
}

function logUsernameCheck(
  status: "available" | "error" | "taken",
  payload: Record<string, unknown>,
) {
  if (!__DEV__) {
    return;
  }

  console.info("[Username check]", { status, ...payload });
}

export async function checkUsernameAvailability(
  supabase: SupabaseClient<Database>,
  username: string,
) {
  try {
    const { data, error } = await withSupabaseTimeout(
      supabase.rpc("is_username_available", {
        p_username: username,
      }),
      USERNAME_CHECK_ERROR,
      undefined,
      "rpc.is_username_available",
    );

    if (error) {
      logUsernameCheck("error", {
        code: getErrorField(error, "code"),
        kind: getUsernameCheckFailureKind(error),
      });
      throw new Error(USERNAME_CHECK_ERROR);
    }

    if (typeof data !== "boolean") {
      logUsernameCheck("error", { kind: "invalid_response" });
      throw new Error(USERNAME_CHECK_ERROR);
    }

    const isAvailable = data;

    logUsernameCheck(isAvailable ? "available" : "taken", {
      usernameLength: username.length,
    });

    return isAvailable;
  } catch (error) {
    logUsernameCheck("error", {
      kind: getUsernameCheckFailureKind(error),
      message: error instanceof Error ? error.message : String(error),
    });

    throw new Error(USERNAME_CHECK_ERROR);
  }
}
