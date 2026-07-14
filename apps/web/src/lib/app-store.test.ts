import { beforeEach, describe, expect, it } from 'vitest';
import { useAppStore } from './app-store';

describe('work logger launch state', () => {
  beforeEach(() => {
    useAppStore.setState({
      workLoggerOpen: false,
      workLoggerMode: 'task',
      workLoggerProjectId: null,
    });
  });

  it('opens progress mode with a preselected project', () => {
    useAppStore.getState().openWorkLogger('progress', 'project-1');

    expect(useAppStore.getState()).toMatchObject({
      workLoggerOpen: true,
      workLoggerMode: 'progress',
      workLoggerProjectId: 'project-1',
    });
  });

  it('keeps quick add as a task-mode compatibility action', () => {
    useAppStore.getState().openWorkLogger('progress', 'project-1');
    useAppStore.getState().openQuickAdd();

    expect(useAppStore.getState()).toMatchObject({
      workLoggerOpen: true,
      workLoggerMode: 'task',
      workLoggerProjectId: null,
    });
  });

  it('resets launch context when the logger closes', () => {
    useAppStore.getState().openWorkLogger('project');
    useAppStore.getState().closeWorkLogger();

    expect(useAppStore.getState()).toMatchObject({
      workLoggerOpen: false,
      workLoggerMode: 'task',
      workLoggerProjectId: null,
    });
  });
});
