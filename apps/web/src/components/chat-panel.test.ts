// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { createElement } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MAX_CHAT_QUESTION_LENGTH } from '@/lib/ask-context';
import { ChatPanel } from './chat-panel';

afterEach(cleanup);

function panelProps(loading: boolean, onSubmit = vi.fn()) {
  return {
    messages: [],
    input: '会議の準備',
    onInputChange: vi.fn(),
    onSubmit,
    loading,
  };
}

function renderPanel() {
  const onSubmit = vi.fn();
  const view = render(createElement(ChatPanel, panelProps(false, onSubmit)));
  return { onSubmit, view, field: screen.getByPlaceholderText('Ask about your work') };
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

  it('stops the question at the length the chat route reads', () => {
    const { field } = renderPanel();

    expect((field as HTMLTextAreaElement).maxLength).toBe(MAX_CHAT_QUESTION_LENGTH);
  });

  it('returns focus to the input once the answer settles', () => {
    const { onSubmit, view, field } = renderPanel();
    field.focus();

    fireEvent.keyDown(field, { key: 'Enter', keyCode: 13 });
    view.rerender(createElement(ChatPanel, panelProps(true, onSubmit)));
    field.blur();
    view.rerender(createElement(ChatPanel, panelProps(false, onSubmit)));

    expect(document.activeElement).toBe(field);
  });

  it('returns focus to the input after sending with the button', () => {
    const { onSubmit, view, field } = renderPanel();

    fireEvent.click(screen.getByRole('button', { name: 'Send message' }));
    view.rerender(createElement(ChatPanel, panelProps(true, onSubmit)));
    view.rerender(createElement(ChatPanel, panelProps(false, onSubmit)));

    expect(document.activeElement).toBe(field);
  });

  it('leaves focus alone if the user moved it while the answer loaded', () => {
    const { onSubmit, view, field } = renderPanel();
    const elsewhere = document.createElement('button');
    document.body.append(elsewhere);

    fireEvent.keyDown(field, { key: 'Enter', keyCode: 13 });
    view.rerender(createElement(ChatPanel, panelProps(true, onSubmit)));
    elsewhere.focus();
    view.rerender(createElement(ChatPanel, panelProps(false, onSubmit)));

    expect(document.activeElement).toBe(elsewhere);
    elsewhere.remove();
  });
});
