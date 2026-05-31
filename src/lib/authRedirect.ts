const AUTH_REDIRECT_KEY = "grumm:authRedirect";

function isSafePath(path: string | null): path is string {
  return Boolean(path && path.startsWith("/") && !path.startsWith("//"));
}

function isAuthPath(path: string) {
  return ["/login", "/register"].includes(path);
}

export function rememberAuthRedirect(path: string) {
  if (typeof window === "undefined" || !isSafePath(path)) {
    return;
  }

  window.sessionStorage.setItem(AUTH_REDIRECT_KEY, path);
}

export function consumeAuthRedirect(fallback = "/profil") {
  if (typeof window === "undefined") {
    return fallback;
  }

  const storedPath = window.sessionStorage.getItem(AUTH_REDIRECT_KEY);
  window.sessionStorage.removeItem(AUTH_REDIRECT_KEY);

  if (!isSafePath(storedPath) || isAuthPath(storedPath)) {
    return fallback;
  }

  return storedPath;
}

export function getLegacyNextParam() {
  if (typeof window === "undefined") {
    return null;
  }

  const next = new URLSearchParams(window.location.search).get("next");

  if (!isSafePath(next) || isAuthPath(next)) {
    return null;
  }

  return next;
}

export function getCurrentPathForRedirect() {
  if (typeof window === "undefined") {
    return "/";
  }

  return `${window.location.pathname}${window.location.hash}`;
}

export function redirectToLogin(path = getCurrentPathForRedirect()) {
  rememberAuthRedirect(path);

  if (typeof window !== "undefined") {
    window.location.assign("/login");
  }
}
