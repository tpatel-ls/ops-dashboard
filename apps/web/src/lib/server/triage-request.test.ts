import { describe, expect, it } from 'vitest';
import { triageRequest } from './triage-request';
import { normalizeTriageResult } from './triage-result';

describe('triageRequest', () => {
  it('forces one route_capture call for the raw capture', () => {
    const request = triageRequest('call mom tomorrow', 'triage-test');

    expect(request.model).toBe('triage-test');
    expect(request.tool_choice).toEqual({ type: 'tool', name: 'route_capture' });
    expect(request.tools?.map((tool) => tool.name)).toEqual(['route_capture']);
    expect(request.messages).toEqual([{ role: 'user', content: 'call mom tomorrow' }]);
  });

  it('offers only kinds that normalizeTriageResult keeps', () => {
    const tool = triageRequest('x', 'm').tools?.[0] as {
      input_schema: { properties: { kind: { enum: string[] } } };
    };
    const kinds = tool.input_schema.properties.kind.enum;

    expect(kinds.length).toBeGreaterThan(0);
    for (const kind of kinds) {
      expect(normalizeTriageResult({ kind, title: 'Item' })?.kind).toBe(kind);
    }
  });
});
