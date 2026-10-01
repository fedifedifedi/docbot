export const ADMIN_HOME = "/admin";
export const ADMIN_LOGIN = "/admin/login";

/**
 * Proxy decision for /admin/* requests (optimistic cookie check only).
 * Returns the path to redirect to, or null to let the request through.
 */
export function adminRedirect(pathname: string, isAuthenticated: boolean): string | null {
  const isLogin = pathname === ADMIN_LOGIN || pathname.startsWith(`${ADMIN_LOGIN}/`);
  if (isLogin) return isAuthenticated ? ADMIN_HOME : null;
  return isAuthenticated ? null : ADMIN_LOGIN;
}
