export const ADMIN_AUTH_COOKIE_NAME = "grumm_admin_access";

const COOKIE_MAX_AGE_SECONDS = 60 * 60;

function isSecureContextCookie() {
  return typeof window !== "undefined" && window.location.protocol === "https:";
}

export function setAdminAuthCookie(accessToken: string | null | undefined) {
  if (typeof document === "undefined") {
    return;
  }

  if (!accessToken) {
    clearAdminAuthCookie();
    return;
  }

  const secure = isSecureContextCookie() ? "; Secure" : "";
  document.cookie = `${ADMIN_AUTH_COOKIE_NAME}=${encodeURIComponent(
    accessToken,
  )}; Path=/; Max-Age=${COOKIE_MAX_AGE_SECONDS}; SameSite=Lax${secure}`;
}

export function clearAdminAuthCookie() {
  if (typeof document === "undefined") {
    return;
  }

  const secure = isSecureContextCookie() ? "; Secure" : "";
  document.cookie = `${ADMIN_AUTH_COOKIE_NAME}=; Path=/; Max-Age=0; SameSite=Lax${secure}`;
}
