// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from 'vitest';
import { focusableElements, wrapTabFocus } from './focus-trap';

function panelWith(html: string): HTMLElement {
  document.body.innerHTML = `<button id="outside">outside</button><div id="panel">${html}</div>`;
  return document.getElementById('panel')!;
}

function tab(shiftKey = false): KeyboardEvent {
  return new KeyboardEvent('keydown', { key: 'Tab', shiftKey, cancelable: true });
}

describe('focusableElements', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('returns tabbable controls in document order', () => {
    const panel = panelWith(
      '<button id="a"></button><input id="b" /><textarea id="c"></textarea><a id="d" href="#x"></a>',
    );
    expect(focusableElements(panel).map((el) => el.id)).toEqual(['a', 'b', 'c', 'd']);
  });

  it('skips disabled controls and anything removed from the tab order', () => {
    const panel = panelWith(
      '<button id="a"></button><button disabled></button><a id="skip" href="#x" tabindex="-1"></a><select id="b"></select>',
    );
    expect(focusableElements(panel).map((el) => el.id)).toEqual(['a', 'b']);
  });

  it('skips a hidden input, which cannot take focus', () => {
    const panel = panelWith(
      '<button id="a"></button><input type="hidden" name="next" value="/today" /><button id="b"></button>',
    );
    expect(focusableElements(panel).map((el) => el.id)).toEqual(['a', 'b']);
  });

  it('treats a missing panel as having nothing to focus', () => {
    expect(focusableElements(null)).toEqual([]);
    expect(focusableElements(undefined)).toEqual([]);
  });
});

describe('wrapTabFocus', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('ignores keys other than Tab', () => {
    const panel = panelWith('<button id="a"></button>');
    const event = new KeyboardEvent('keydown', { key: 'Enter', cancelable: true });
    expect(wrapTabFocus(event, panel)).toBe(false);
    expect(event.defaultPrevented).toBe(false);
  });

  it('wraps forward from the last control to the first', () => {
    const panel = panelWith('<button id="a"></button><button id="b"></button>');
    document.getElementById('b')!.focus();

    const event = tab();
    expect(wrapTabFocus(event, panel)).toBe(true);
    expect(event.defaultPrevented).toBe(true);
    expect(document.activeElement?.id).toBe('a');
  });

  it('wraps backward from the first control to the last', () => {
    const panel = panelWith('<button id="a"></button><button id="b"></button>');
    document.getElementById('a')!.focus();

    const event = tab(true);
    expect(wrapTabFocus(event, panel)).toBe(true);
    expect(document.activeElement?.id).toBe('b');
  });

  it('leaves interior Tab presses to the browser', () => {
    const panel = panelWith(
      '<button id="a"></button><button id="b"></button><button id="c"></button>',
    );
    document.getElementById('b')!.focus();

    const event = tab();
    expect(wrapTabFocus(event, panel)).toBe(false);
    expect(event.defaultPrevented).toBe(false);
    expect(document.activeElement?.id).toBe('b');
  });

  it('pulls focus back in when it has escaped the panel', () => {
    const panel = panelWith('<button id="a"></button><button id="b"></button>');
    document.getElementById('outside')!.focus();

    expect(wrapTabFocus(tab(), panel)).toBe(true);
    expect(document.activeElement?.id).toBe('a');

    document.getElementById('outside')!.focus();
    expect(wrapTabFocus(tab(true), panel)).toBe(true);
    expect(document.activeElement?.id).toBe('b');
  });

  it('wraps past a trailing hidden input instead of treating it as the edge', () => {
    const panel = panelWith(
      '<button id="a"></button><button id="b"></button><input type="hidden" name="next" value="/today" />',
    );
    document.getElementById('b')!.focus();

    const event = tab();
    expect(wrapTabFocus(event, panel)).toBe(true);
    expect(document.activeElement?.id).toBe('a');
  });

  it('does nothing when the panel holds no tabbable control', () => {
    const panel = panelWith('<p>nothing to focus</p>');
    const event = tab();
    expect(wrapTabFocus(event, panel)).toBe(false);
    expect(event.defaultPrevented).toBe(false);
  });
});
