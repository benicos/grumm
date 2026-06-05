import { NextResponse, type NextRequest } from "next/server";
import { SITE_URL } from "@/config/app";
import {
  getDefaultRolePermissions,
  hasPermission,
  type PermissionKey,
} from "@/lib/roles";
import { ADMIN_AUTH_COOKIE_NAME } from "@/lib/supabase/adminAuthCookie";

const OFFICIAL_HOST = new URL(SITE_URL).host;
const VERCEL_PREVIEW_SUFFIX = ["vercel", "app"].join(".");

type SupabaseUserResponse = {
  id?: string;
};

type ProfileRow = {
  role: string | null;
};

type RoleRow = {
  permissions: unknown;
};

function redirectToLogin(request: NextRequest) {
  const targetUrl = new URL("/login", request.url);
  targetUrl.searchParams.set(
    "redirect",
    `${request.nextUrl.pathname}${request.nextUrl.search}`,
  );
  const response = NextResponse.redirect(targetUrl, 307);
  response.cookies.delete(ADMIN_AUTH_COOKIE_NAME);
  return response;
}

function redirectForbidden(request: NextRequest) {
  const targetUrl = new URL("/", request.url);
  targetUrl.searchParams.set("admin", "forbidden");
  return NextResponse.redirect(targetUrl, 307);
}

async function fetchSupabaseJson<T>(
  path: string,
  accessToken: string,
): Promise<T | null> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey || supabaseAnonKey.startsWith("sb_secret_")) {
    return null;
  }

  const response = await fetch(`${supabaseUrl}${path}`, {
    headers: {
      apikey: supabaseAnonKey,
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    return null;
  }

  return (await response.json()) as T;
}

function normalizePermissions(value: unknown): PermissionKey[] {
  return Array.isArray(value)
    ? (value.filter((permission): permission is PermissionKey =>
        typeof permission === "string",
      ) as PermissionKey[])
    : [];
}

async function canAccessAdminRoute(accessToken: string) {
  const user = await fetchSupabaseJson<SupabaseUserResponse>("/auth/v1/user", accessToken);

  if (!user?.id) {
    return { authenticated: false, authorized: false };
  }

  const profiles = await fetchSupabaseJson<ProfileRow[]>(
    `/rest/v1/profiles?select=role&id=eq.${encodeURIComponent(user.id)}&limit=1`,
    accessToken,
  );
  const role = profiles?.[0]?.role ?? "membre";
  let permissions = getDefaultRolePermissions(role) as PermissionKey[];

  const roles = await fetchSupabaseJson<RoleRow[]>(
    `/rest/v1/roles?select=permissions&slug=eq.${encodeURIComponent(role)}&limit=1`,
    accessToken,
  );

  const rolePermissions = normalizePermissions(roles?.[0]?.permissions);
  permissions = rolePermissions.length > 0 ? rolePermissions : permissions;

  return {
    authenticated: true,
    authorized: hasPermission({ permissions, role }, "admin.access"),
  };
}

export async function middleware(request: NextRequest) {
  const host = request.headers.get("host")?.toLowerCase();

  if (host && host !== OFFICIAL_HOST && host.endsWith(VERCEL_PREVIEW_SUFFIX)) {
    const targetUrl = new URL(request.nextUrl.pathname + request.nextUrl.search, SITE_URL);

    return NextResponse.redirect(targetUrl, 308);
  }

  if (request.nextUrl.pathname === "/admin" || request.nextUrl.pathname.startsWith("/admin/")) {
    const accessToken = request.cookies.get(ADMIN_AUTH_COOKIE_NAME)?.value;

    if (!accessToken) {
      return redirectToLogin(request);
    }

    const access = await canAccessAdminRoute(accessToken);

    if (!access.authenticated) {
      return redirectToLogin(request);
    }

    if (!access.authorized) {
      return redirectForbidden(request);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: "/:path*",
};
