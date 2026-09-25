/**
 * Whether a nav entry should render as the current page.
 *
 * The sidebar and the mobile tab bar had grown byte-identical copies of this
 * predicate, and the sidebar's Settings link open-coded a third variant, so the
 * three could disagree about which tab is current on the same route.
 *
 * The shared rule also fixes what a bare `pathname.startsWith(path)` gets
 * wrong: it matches on raw characters rather than path segments, so `/tasks`
 * would also claim `/tasks-archive` while `/task` would claim nothing. Compare
 * segment boundaries instead, so a nav path matches its own route and anything
 * nested beneath it (`/calendar` covers `/calendar/2026-09`) and nothing that
 * merely shares a prefix.
 */
export function navPathActive(pathname: string, paths: readonly string[]): boolean {
  return paths.some((path) => {
    if (!path || !pathname) return false;
    if (pathname === path) return true;
    // Nested route: the next character has to start a new segment.
    const boundary = path.endsWith('/') ? path : `${path}/`;
    return pathname.startsWith(boundary);
  });
}
