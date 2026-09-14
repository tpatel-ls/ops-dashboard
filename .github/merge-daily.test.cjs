const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { test } = require('node:test');

// Execute the actual workflow script; only GitHub's network boundary is replaced.
const workflow = readFileSync(`${__dirname}/workflows/ci.yml`, 'utf8');
const script = workflow.split('          script: |\n')[1];
const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
const run = new AsyncFunction('github', 'context', 'core', script || '');

function fixture() {
  const pr = {
    number: 39,
    state: 'open',
    draft: false,
    user: { id: 214253472 },
    head: {
      sha: 'tested-head',
      ref: 'automation/daily-improvements-2026-09-13',
      repo: { full_name: 'tpatel-ls/ops-dashboard' },
    },
    base: { sha: 'tested-base', ref: 'main' },
  };
  return {
    pr,
    context: {
      eventName: 'pull_request',
      repo: { owner: 'tpatel-ls', repo: 'ops-dashboard' },
      payload: { pull_request: structuredClone(pr) },
    },
    mainSha: 'tested-base',
    merges: [],
    failures: [],
    merged: true,
  };
}

async function execute(f) {
  await run(
    {
      rest: {
        pulls: {
          get: async () => ({ data: f.pr }),
          merge: async (request) => {
            f.merges.push(request);
            return { data: { merged: f.merged, sha: 'merged-sha', message: 'Merge rejected' } };
          },
        },
        repos: { getBranch: async () => ({ data: { commit: { sha: f.mainSha } } }) },
      },
    },
    f.context,
    { info() {}, setFailed: (message) => f.failures.push(message) },
  );
}

test('merges the verified daily head into main without squashing its commits', async () => {
  const f = fixture();
  await execute(f);
  assert.deepEqual(f.merges, [
    {
      owner: 'tpatel-ls',
      repo: 'ops-dashboard',
      pull_number: 39,
      sha: 'tested-head',
      merge_method: 'rebase',
    },
  ]);
  assert.equal(f.failures.length, 0);
});

for (const [name, change] of [
  [
    'push event',
    (f) => {
      f.context.eventName = 'push';
    },
  ],
  [
    'closed PR',
    (f) => {
      f.pr.state = 'closed';
    },
  ],
  [
    'draft PR',
    (f) => {
      f.pr.draft = true;
    },
  ],
  [
    'different author',
    (f) => {
      f.pr.user.id = 123;
    },
  ],
  [
    'fork',
    (f) => {
      f.pr.head.repo.full_name = 'someone/ops-dashboard';
    },
  ],
  [
    'different base branch',
    (f) => {
      f.pr.base.ref = 'release';
    },
  ],
  [
    'unrelated automation branch',
    (f) => {
      f.pr.head.ref = 'automation/pipeline-verification-2026-09-11';
    },
  ],
  [
    'daily branch with extra suffix',
    (f) => {
      f.pr.head.ref += '-other';
    },
  ],
  [
    'new untested head',
    (f) => {
      f.pr.head.sha = 'new-head';
    },
  ],
  [
    'base advanced after verification',
    (f) => {
      f.mainSha = 'new-base';
    },
  ],
]) {
  test(`does not merge: ${name}`, async () => {
    const f = fixture();
    change(f);
    await execute(f);
    assert.equal(f.merges.length, 0);
  });
}

test('reports a rejected merge as failure', async () => {
  const f = fixture();
  f.merged = false;
  await execute(f);
  assert.equal(f.failures.length, 1);
});
