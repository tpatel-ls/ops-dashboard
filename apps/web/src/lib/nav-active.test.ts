import { describe, expect, it } from 'vitest';
import { navPathActive } from './nav-active';

describe('navPathActive', () => {
  it('matches the entry for its own route', () => {
    expect(navPathActive('/tasks', ['/tasks'])).toBe(true);
    expect(navPathActive('/projects', ['/tasks'])).toBe(false);
  });

  it('matches a route nested under the entry', () => {
    expect(navPathActive('/whiteboards/abc123', ['/whiteboards'])).toBe(true);
    expect(navPathActive('/calendar/2026-09', ['/calendar'])).toBe(true);
  });

  it('does not claim a route that merely shares a character prefix', () => {
    // A bare `startsWith` matched both of these.
    expect(navPathActive('/tasks-archive', ['/tasks'])).toBe(false);
    expect(navPathActive('/projectsfoo', ['/projects'])).toBe(false);
  });

  it('matches any of an entry several routes roll up', () => {
    const calendar = ['/calendar', '/week', '/month'];
    expect(navPathActive('/week', calendar)).toBe(true);
    expect(navPathActive('/month', calendar)).toBe(true);
    expect(navPathActive('/inbox', calendar)).toBe(false);
  });

  it('treats empty paths as no match', () => {
    expect(navPathActive('/tasks', [])).toBe(false);
    expect(navPathActive('/tasks', [''])).toBe(false);
    expect(navPathActive('', ['/tasks'])).toBe(false);
  });

  it('tolerates an entry written with a trailing slash', () => {
    expect(navPathActive('/tasks', ['/tasks/'])).toBe(false);
    expect(navPathActive('/tasks/1', ['/tasks/'])).toBe(true);
  });
});
