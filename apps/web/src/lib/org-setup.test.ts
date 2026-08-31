import { describe, expect, it } from 'vitest';
import { isDefaultOrganizationName, isLsgProjectName } from './org-setup';

describe('organization setup name matching', () => {
  it('recognizes canonically equivalent portfolio project names', () => {
    expect(isLsgProjectName('Ｐｏｗｅｒ Dialer')).toBe(true);
    expect(isLsgProjectName('Blue Text')).toBe(true);
    expect(isLsgProjectName('Unrelated')).toBe(false);
  });

  it('recognizes canonically equivalent default organization names', () => {
    expect(isDefaultOrganizationName('ＬＳ Global Group')).toBe(true);
    expect(isDefaultOrganizationName('Other Organization')).toBe(false);
  });
});
