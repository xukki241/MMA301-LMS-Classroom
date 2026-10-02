const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { test } = require('node:test');
const ts = require('typescript');
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText, filename);
const { createOfflineCache, readThroughCache, classCacheKey, postCacheKey } = require('../src/lib/offline-cache-core.ts');
const { networkState } = require('../src/lib/network-state.ts');
const { HttpError } = require('../src/lib/http.ts');
const { http } = require('../src/lib/http.ts');

function storage() {
  const values = new Map();
  return { values, getItem: async key => values.get(key) ?? null, setItem: async (key, value) => { values.set(key, value); } };
}
const valid = value => Array.isArray(value) && value.every(item => typeof item.id === 'string');

test('successful fetch persists data, offline and transport failure load it', async () => {
  const backend = storage();
  const cache = createOfflineCache(backend);
  const key = classCacheKey('user-a', 'student');
  assert.deepEqual(await readThroughCache(() => Promise.resolve([{ id: 'a' }]), cache, key, valid, false), [{ id: 'a' }]);
  assert.deepEqual(await readThroughCache(() => { throw Error('called'); }, cache, key, valid, true), [{ id: 'a' }]);
  assert.deepEqual(await readThroughCache(() => Promise.reject(new HttpError('network', 0, 'NETWORK_ERROR')), cache, key, valid, false), [{ id: 'a' }]);
  await assert.rejects(readThroughCache(() => Promise.reject(new HttpError('forbidden', 403)), cache, key, valid, false), e => e.status === 403);
});

test('cache keys isolate users, roles and classes', async () => {
  const cache = createOfflineCache(storage());
  await cache.write(postCacheKey('a', 'class-1'), [{ id: 'post' }]);
  assert.equal(await cache.read(postCacheKey('b', 'class-1'), valid), null);
  assert.equal(await cache.read(postCacheKey('a', 'class-2'), valid), null);
  assert.notEqual(classCacheKey('a', 'student'), classCacheKey('a', 'teacher'));
});

test('missing, corrupt and unavailable storage never crashes', async () => {
  const backend = storage();
  const cache = createOfflineCache(backend);
  const key = classCacheKey('a', 'student');
  await assert.rejects(readThroughCache(() => { throw Error('called'); }, cache, key, valid, true), e => e.code === 'OFFLINE_NO_CACHE');
  backend.values.set(key, '{bad json');
  assert.equal(await cache.read(key, valid), null);
  backend.values.set(key, JSON.stringify([{ wrong: true }]));
  assert.equal(await cache.read(key, valid), null);
  const broken = createOfflineCache({ getItem: async () => { throw Error('read'); }, setItem: async () => { throw Error('write'); } });
  assert.equal(await broken.read(key, valid), null);
  assert.deepEqual(await readThroughCache(() => Promise.resolve([]), broken, key, valid, false), []);
});

test('HTTP prevents every non-GET request while offline', async () => {
  const originalFetch = global.fetch;
  let calls = 0;
  global.fetch = async () => { calls++; throw Error('unexpected request'); };
  networkState.setOnline(false);
  try {
    for (const method of ['POST', 'PUT', 'PATCH', 'DELETE']) {
      await assert.rejects(http('/example', { method }), e => e.code === 'OFFLINE_WRITE');
    }
    assert.equal(calls, 0);
  } finally {
    networkState.setOnline(true);
    global.fetch = originalFetch;
  }
});
