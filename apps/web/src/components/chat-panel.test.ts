// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { createElement } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ChatPanel } from './chat-panel';

afterEach(cleanup);

function renderPanel() {
  const onSubmit = vi.fn();
  render(
    createElement(ChatPanel, {
      messages: [],
      input: '会議の準備',
      onInputChange: vi.fn(),
      onSubmit,
      loading: false,
    }),
  );
  return { onSubmit, field: screen.getByPlaceholderText('Ask about your work') };
}

describe('ChatPanel', () => {
  it('sends the question on Enter', () => {
    const { onSubmit, field } = renderPanel();

    fireEvent.keyDown(field, { key: 'Enter', keyCode: 13 });

    expect(onSubmit).toHaveBeenCalledOnce();
  });

  it('leaves the Enter that confirms an IME conversion to the input method', () => {
    const { onSubmit, field } = renderPanel();

    fireEvent.keyDown(field, { key: 'Enter', keyCode: 13, isComposing: true });
    fireEvent.keyDown(field, { key: 'Enter', keyCode: 229 });

    expect(onSubmit).not.toHaveBeenCalled();
  });
});
