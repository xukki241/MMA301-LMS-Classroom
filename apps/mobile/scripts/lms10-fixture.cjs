// Local test data only. Fixed database names prevent touching normal app data.
const path = require('node:path');
const { createRequire } = require('node:module');
const root = path.resolve(__dirname, '../../..');
const coreRequire = createRequire(path.join(root, 'services/core-api/package.json'));
const authRequire = createRequire(path.join(root, 'services/auth-service/package.json'));
const mongoose = coreRequire('mongoose');
const bcrypt = authRequire('bcryptjs');
const id = value => new mongoose.Types.ObjectId(value);
const ids = {
  teacher: '100000000000000000000010', student: '100000000000000000000011', otherTeacher: '100000000000000000000012',
  class: '200000000000000000000010', exercise: '300000000000000000000010',
  future: '300000000000000000000011', empty: '300000000000000000000012',
  submission: '400000000000000000000010', futureSubmission: '400000000000000000000011',
};

async function seed() {
  const core = await mongoose.createConnection('mongodb://127.0.0.1:27018/lms10_test_core').asPromise();
  const auth = await mongoose.createConnection('mongodb://127.0.0.1:27018/lms10_test_auth').asPromise();
  try {
    const now = new Date();
    const passwordHash = await bcrypt.hash('Lms10Demo!', 12);
    for (const [key, role] of [['teacher','teacher'],['student','student'],['otherTeacher','teacher']]) {
      await auth.collection('users').updateOne({_id:id(ids[key])}, {$set:{email:`${key.toLowerCase()}@lms10.local`,passwordHash,displayName:`LMS10 ${key}`,role,createdAt:now,updatedAt:now}}, {upsert:true});
    }
    await core.collection('classes').updateOne({_id:id(ids.class)}, {$set:{name:'LMS-10 · Lớp kiểm thử',code:'LMS10TEST',teacherId:ids.teacher,createdAt:now,updatedAt:now}}, {upsert:true});
    for (const key of ['teacher','student']) await core.collection('classmembers').updateOne({classId:id(ids.class),userId:ids[key]}, {$set:{roleInClass:key,createdAt:now,updatedAt:now}}, {upsert:true});
    for (const [key,title,dueAt] of [
      ['exercise','Bài tập đã hết hạn',new Date(now.getTime()-3600000)],
      ['future','Bài tập chưa đến hạn',new Date(now.getTime()+86400000)],
      ['empty','Bài tập chưa có bài nộp',new Date(now.getTime()-3600000)],
    ]) await core.collection('exercises').updateOne({_id:id(ids[key])}, {$set:{classId:id(ids.class),title,description:'Đọc nội dung bài nộp và đánh giá kết quả.',dueAt,createdBy:ids.teacher,createdAt:now,updatedAt:now}}, {upsert:true});
    for (const [key, exerciseKey] of [['submission','exercise'],['futureSubmission','future']]) {
      await core.collection('submissions').updateOne({_id:id(ids[key])}, {$set:{exerciseId:id(ids[exerciseKey]),studentId:ids.student,content:'Bài làm kiểm thử: giải thích cách tổ chức dữ liệu trong lớp học.',url:'https://example.com/submission',submittedAt:new Date(now.getTime()-7200000),createdAt:now,updatedAt:now}}, {upsert:true});
    }
    console.log('Seeded isolated LMS-10 fixtures. Login: teacher@lms10.local / Lms10Demo!');
    console.log(JSON.stringify(ids,null,2));
  } finally { await core.close(); await auth.close(); }
}
seed().catch(error => { console.error(error); process.exitCode=1; });
