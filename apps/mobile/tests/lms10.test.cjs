const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { createServer } = require('node:http');
const fs = require('node:fs');
const ts = require('typescript');
// Exercise real TS modules with the installed compiler; no application test dependency.
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }, fileName: filename,
}).outputText, filename);
let base, server;
before(async () => {
  server = createServer(async (req, res) => {
    const chunks = []; for await (const chunk of req) chunks.push(chunk);
    const body = chunks.length ? JSON.parse(Buffer.concat(chunks)) : undefined;
    res.setHeader('Content-Type', 'application/json');
    if (req.url === '/denied') { res.writeHead(403); res.end(JSON.stringify({error:'Forbidden',code:'FORBIDDEN'})); return; }
    if (req.headers.authorization !== 'Bearer teacher-token') { res.writeHead(401); res.end('{}'); return; }
    if (req.url === '/classes/teaching') {
      res.end(JSON.stringify({classes:[{_id:'class-a',name:'Teaching class',code:'ABC123',teacherId:'teacher-a'}]})); return;
    }
    if (req.url === '/classes/class-a/exercises' && req.method === 'POST') {
      assert.deepEqual(body, {title:'Exercise',description:'Details',dueAt:'2030-01-01T00:00:00.000Z'});
      res.writeHead(201); res.end(JSON.stringify({exercise:{_id:'exercise-a',...body}})); return;
    }
    if (req.url === '/classes/class-a/exercises/exercise-a/submissions/submission-a/grade' && req.method === 'PUT') {
      assert.deepEqual(body, {score:0,feedback:'Revise'});
      res.end(JSON.stringify({grade:{_id:'grade-a',submissionId:'submission-a',...body}})); return;
    }
    if (req.url === '/classes/class-a/exercises/exercise-a/submissions/submission-a' && req.method === 'GET') {
      res.end(JSON.stringify({submission:{_id:'submission-a',studentId:'student-a',content:'Answer',url:'',exerciseId:'exercise-a',submittedAt:'2026-01-01T00:00:00Z'},grade:null})); return;
    }
    res.writeHead(404); res.end('{}');
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  base = `http://127.0.0.1:${server.address().port}`;
  process.env.EXPO_PUBLIC_CORE_URL = base;
});
after(() => new Promise(resolve => server.close(resolve)));

test('HTTP permission errors retain machine-readable code and status', async () => {
  const {http} = require('../src/lib/http.ts');
  await assert.rejects(http(`${base}/denied`), e => e.status === 403 && e.code === 'FORBIDDEN');
});
test('deadline rejects impossible dates, malformed times, and nonfuture dates', () => {
  const {validateExercise} = require('../src/features/exercises/validation.ts');
  for (const [date,time] of [['2030-02-30','12:00'],['2030-13-01','12:00'],['2030-01-01','24:00'],['2030-01-01','12:60'],['2020-01-01','12:00']]) {
    assert.ok(validateExercise({title:'Title',description:'',date,time},new Date('2026-01-01').getTime()).errors.deadline);
  }
});
test('deadline represents local wall time exactly and trims title', () => {
  const {validateExercise} = require('../src/features/exercises/validation.ts');
  const result = validateExercise({title:'  Title  ',description:'text',date:'2030-02-28',time:'14:30'},0);
  assert.deepEqual(result.errors, {});
  assert.equal(result.value.title,'Title');
  const date = new Date(result.value.dueAt);
  assert.deepEqual([date.getFullYear(),date.getMonth(),date.getDate(),date.getHours(),date.getMinutes()],[2030,1,28,14,30]);
});
test('Exercise rejects empty/oversized title and oversized description', () => {
  const {validateExercise} = require('../src/features/exercises/validation.ts');
  for (const title of ['  ','x'.repeat(201)]) assert.ok(validateExercise({title,description:'',date:'2030-01-01',time:'12:00'},0).errors.title);
  assert.ok(validateExercise({title:'OK',description:'x'.repeat(10001),date:'2030-01-01',time:'12:00'},0).errors.description);
});
test('Grade distinguishes blank from zero and accepts decimal endpoints', () => {
  const {validateGrade} = require('../src/features/exercises/validation.ts');
  for (const score of ['',' ','-1','10.1','NaN','Infinity','1e1','0xA','8abc']) assert.ok(validateGrade(score,'').errors.score, score);
  for (const [text,score] of [['0',0],['10',10],['8.5',8.5],['8,5',8.5]]) assert.deepEqual(validateGrade(text,'Good').value,{score,feedback:'Good'});
  assert.ok(validateGrade('8','x'.repeat(10001)).errors.feedback);
});
test('Only safe HTTP(S) submission links can be opened', () => {
  const {safeSubmissionUrl} = require('../src/features/exercises/validation.ts');
  for (const value of ['javascript:alert(1)','file:///secret','not a url','']) assert.equal(safeSubmissionUrl(value),null);
  assert.equal(safeSubmissionUrl('https://example.com/work'),'https://example.com/work');
});
test('Mobile client sends correct teacher create/grade bodies and unwraps responses', async () => {
  const api = require('../src/features/exercises/api.ts');
  const exercise = await api.createExercise('teacher-token','class-a',{title:'Exercise',description:'Details',dueAt:'2030-01-01T00:00:00.000Z'});
  assert.equal(exercise._id,'exercise-a');
  const grade = await api.saveGrade('teacher-token','class-a','exercise-a','submission-a',{score:0,feedback:'Revise'});
  assert.equal(grade.score,0);
  const detail = await api.getSubmission('teacher-token','class-a','exercise-a','submission-a');
  assert.equal(detail.submission.content,'Answer'); assert.equal(detail.grade,null);
});

test('Transient refetch errors preserve authorized drafts; access errors always block', () => {
  const { blocksScreen } = require('../src/features/exercises/query-errors.ts');
  const { HttpError } = require('../src/lib/http.ts');
  assert.equal(blocksScreen(new Error('offline'), true), false);
  assert.equal(blocksScreen(new HttpError('down',503), true), false);
  assert.equal(blocksScreen(new Error('offline'), false), true);
  for (const status of [400,401,403,404,422]) assert.equal(blocksScreen(new HttpError('denied',status), true), true);
});

test('Teacher class discovery uses the existing teaching endpoint and normalizes IDs', async () => {
  const {listTeachingClasses} = require('../src/lib/classes-api.ts');
  assert.deepEqual(await listTeachingClasses('teacher-token'), [{id:'class-a',name:'Teaching class',code:'ABC123',teacherId:'teacher-a',createdAt:undefined}]);
});
