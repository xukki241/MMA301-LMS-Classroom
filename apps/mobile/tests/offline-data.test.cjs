const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { test, afterEach } = require('node:test');
const Module = require('node:module');
const ts = require('typescript');
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText, filename);
const values = new Map();
const storage = { getItem: async key => values.get(key) ?? null, setItem: async (key, value) => { values.set(key, value); } };
const originalLoad = Module._load;
Module._load = function(name, parent, isMain) {
  if (name === '@react-native-async-storage/async-storage') return { __esModule: true, default: storage };
  return originalLoad.call(this, name, parent, isMain);
};
const data = require('../src/lib/offline-data.ts');
Module._load = originalLoad;
const { classCacheKey, postCacheKey } = require('../src/lib/offline-cache-core.ts');
const { networkState } = require('../src/lib/network-state.ts');
const originalFetch = global.fetch;
afterEach(() => { values.clear(); networkState.setOnline(true); global.fetch = originalFetch; });
const cls = { _id: 'class-a', name: 'MMA301', code: 'A8K92Z', teacherId: 'teacher', createdAt: '2026-09-21', updatedAt: '2026-09-21' };
const post = { _id: 'post-a', classId: 'class-a', authorId: 'teacher', content: 'Thông báo', createdAt: '2026-09-21T01:00:00.000Z' };

test('fetched Class list and feed survive offline restart path with no HTTP request', async () => {
  networkState.setOnline(true);
  global.fetch = async url => new Response(JSON.stringify(url.endsWith('/posts') ? { posts: [post] } : { classes: [cls] }));
  assert.equal((await data.cachedClasses('token', 'teacher', 'teacher')).length, 1);
  assert.equal((await data.cachedPosts('token', 'teacher', 'class-a')).length, 1);
  assert.ok(values.has(classCacheKey('teacher', 'teacher')));
  assert.ok(values.has(postCacheKey('teacher', 'class-a')));
  networkState.setOnline(false);
  global.fetch = () => { throw Error('offline request'); };
  assert.equal((await data.cachedClasses('token', 'teacher', 'teacher'))[0].id, 'class-a');
  assert.equal((await data.cachedPosts('token', 'teacher', 'class-a'))[0].id, 'post-a');
  assert.equal((await data.cachedClassDetail('token', 'teacher', 'teacher', 'class-a')).roleInClass, 'teacher');
});

test('other user and class cannot see cached data; corrupted feed is rejected', async () => {
  values.set(postCacheKey('a', 'class-a'), JSON.stringify([{ id: 'x', classId: 'wrong', authorId: 'a', content: 'x', createdAt: '2026-09-21' }]));
  networkState.setOnline(false);
  await assert.rejects(data.cachedPosts('token', 'a', 'class-a'), e => e.code === 'OFFLINE_NO_CACHE');
  await assert.rejects(data.cachedPosts('token', 'b', 'class-a'), e => e.code === 'OFFLINE_NO_CACHE');
  await assert.rejects(data.cachedPosts('token', 'a', 'class-b'), e => e.code === 'OFFLINE_NO_CACHE');
  await assert.rejects(data.cachedClasses('token', 'b', 'student'), e => e.code === 'OFFLINE_NO_CACHE');
});

test('business permission errors do not read old Class cache', async () => {
  values.set(classCacheKey('teacher', 'teacher'), JSON.stringify([{ id: 'class-a', name: 'MMA301', code: 'A8K92Z', teacherId: 'teacher', createdAt: '2026-09-21', updatedAt: '2026-09-21' }]));
  networkState.setOnline(true);
  global.fetch = async () => new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 });
  await assert.rejects(data.cachedClasses('token', 'teacher', 'teacher'), e => e.status === 403);
});
