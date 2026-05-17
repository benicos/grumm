const AUTH_REDIRECT_KEY = "velora:authRedirect";

function isSafePath(path: string | null): path is string {
  return Boolean(path && path.startsWith("/") && !path.startsWith("//"));
}

function normalizeLegacyPath(path: string) {
  if (path === "/faits") {
    return "/discover";
  }

  if (path.startsWith("/faits/theme/")) {
    return path.replace("/faits/theme/", "/discover/theme/");
  }

  if (path.startsWith("/fait/")) {
    return path.replace("/fait/", "/fact/");
  }

  if (path === "/profil") {
    return "/profile";
  }

  if (path === "/connexion") {
    return "/login";
  }

  if (path === "/inscription") {
    return "/register";
  }

  return path;
}

function isAuthPath(path: string) {
  return ["/login", "/register", "/connexion", "/inscription"].includes(path);
}

export function rememberAuthRedirect(path: string) {
  if (typeof window === "undefined" || !isSafePath(path)) {
    return;
  }

  window.sessionStorage.setItem(AUTH_REDIRECT_KEY, normalizeLegacyPath(path));
}

export function consumeAuthRedirect(fallback = "/profile") {
  if (typeof window === "undefined") {
    return fallback;
  }

  const storedPath = window.sessionStorage.getItem(AUTH_REDIRECT_KEY);
  window.sessionStorage.removeItem(AUTH_REDIRECT_KEY);

  if (!isSafePath(storedPath) || isAuthPath(storedPath)) {
    return fallback;
  }

  return normalizeLegacyPath(storedPath);
}

export function getLegacyNextParam() {
  if (typeof window === "undefined") {
    return null;
  }

  const next = new URLSearchParams(window.location.search).get("next");

  if (!isSafePath(next) || isAuthPath(next)) {
    return null;
  }

  return normalizeLegacyPath(next);
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
