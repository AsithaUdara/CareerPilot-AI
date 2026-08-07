import type { PageId } from "@/types";

export const PAGE_PATHS: Record<PageId, string> = {
  landing: "/",
  dashboard: "/dashboard",
  upload: "/upload",
  readiness: "/readiness",
  gaps: "/gaps",
  plan: "/plan",
  reports: "/reports",
  mentor: "/mentor",
  analytics: "/analytics",
  insights: "/insights"
};

const PATH_TO_PAGE = Object.fromEntries(
  Object.entries(PAGE_PATHS).map(([page, path]) => [path, page as PageId])
) as Record<string, PageId>;

export function pathForPage(page: PageId): string {
  return PAGE_PATHS[page];
}

export function pageFromPath(pathname: string): PageId | null {
  const normalized = pathname.replace(/\/+$/, "") || "/";
  return PATH_TO_PAGE[normalized] ?? null;
}

/** Current browser path → known page, or null if unknown. */
export function pageFromLocation(): PageId | null {
  return pageFromPath(window.location.pathname);
}

/** Update the URL without a full reload. */
export function navigateToPage(page: PageId, replace = false): void {
  const path = pathForPage(page);
  if (window.location.pathname === path) return;
  if (replace) {
    window.history.replaceState({ page }, "", path);
  } else {
    window.history.pushState({ page }, "", path);
  }
}
