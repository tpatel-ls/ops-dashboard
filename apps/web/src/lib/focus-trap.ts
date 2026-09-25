/**
 * Shared Tab containment for the app's modal overlays.
 *
 * Every overlay that sets `aria-modal="true"` promises assistive technology
 * that the rest of the page is inert, so Tab must not walk out of the panel.
 * Six overlays each grew their own copy of this loop, and the copies had
 * already drifted: most query the full focusable set, while the daily review
 * queries `button` alone, so a non-button control added to that dialog would
 * silently fall outside its own trap.
 */
const FOCUSABLE_SELECTOR = [
  'button:not([disabled])',
  'a[href]',
  // `input[type="hidden"]` carries no `disabled` attribute and is never
  // focusable, but it is still an `input`, so the bare selector matched it and
  // left the trap relying on the browser reporting `tabIndex === -1` for it.
  // jsdom reports 0, and a hidden input as the first or last match becomes an
  // edge of the trap: Tab at that edge then "focuses" an element that cannot
  // take focus, so focus stays put or escapes the dialog entirely.
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

/** Tabbable descendants of `panel`, in document order. */
export function focusableElements(panel: HTMLElement | null | undefined): HTMLElement[] {
  if (!panel) return [];
  return Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    // `tabindex="-1"` is reachable by script but not by Tab, and an
    // `<a href>` carrying it would otherwise be treated as an edge of the
    // trap and swallow the wrap.
    (element) => element.tabIndex >= 0,
  );
}

/**
 * Wrap Tab and Shift+Tab at the edges of `panel`.
 *
 * Returns true when the event was handled, so a caller can keep the rest of
 * its key handling in one place. Focus that has escaped the panel entirely
 * (the user clicked the backdrop, or the previously focused control
 * unmounted) is pulled back to an edge rather than left outside.
 */
export function wrapTabFocus(event: KeyboardEvent, panel: HTMLElement | null | undefined): boolean {
  if (event.key !== 'Tab') return false;
  const focusable = focusableElements(panel);
  const first = focusable[0];
  const last = focusable.at(-1);
  if (!first || !last) return false;

  const active = panel?.ownerDocument.activeElement ?? null;
  if (!active || !panel?.contains(active)) {
    event.preventDefault();
    (event.shiftKey ? last : first).focus();
    return true;
  }
  if (event.shiftKey && active === first) {
    event.preventDefault();
    last.focus();
    return true;
  }
  if (!event.shiftKey && active === last) {
    event.preventDefault();
    first.focus();
    return true;
  }
  return false;
}
