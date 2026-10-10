import test from 'node:test';
import assert from 'node:assert/strict';
import {
  addStudent, countByDepartment, createInitialStudents, deleteStudent, editStudent,
  filterStudents, migrateStudents, parseStoredStudents, serializeStudents,
} from '../src/student-data.js';

const sample = { studentId: 'CC-NEW-1', fullName: 'Test Student', email: 'test@example.edu', department: 'AI', year: 'FY' };

test('add, edit and delete records with duplicate-safe IDs', () => {
  const initial = createInitialStudents();
  const added = addStudent(initial, sample, 'custom-1');
  assert.equal(added[0].id, 'custom-1');
  assert.throws(() => addStudent(added, { ...sample, studentId: 'cc-ai-2401' }), /already in use/);
  const changed = editStudent(added, 'custom-1', { ...sample, fullName: 'Updated Student' });
  assert.equal(changed[0].fullName, 'Updated Student');
  assert.throws(() => editStudent(changed, 'custom-1', { ...sample, studentId: 'CC-DS-2402' }), /already in use/);
  assert.equal(deleteStudent(changed, 'custom-1').length, initial.length);
});

test('search matches names and student IDs without case sensitivity', () => {
  const students = createInitialStudents();
  assert.equal(filterStudents(students, { query: 'aARAV' })[0].fullName, 'Aarav Sharma');
  assert.equal(filterStudents(students, { query: 'cc-it-2408' })[0].fullName, 'Neha Kulkarni');
});

test('department and year filters compose and department counts cover exact choices', () => {
  const students = createInitialStudents();
  assert.deepEqual(filterStudents(students, { department: 'AI', year: 'TY' }).map((s) => s.fullName), ['Arjun Mehta']);
  assert.deepEqual(countByDepartment(students), { AI: 3, DS: 3, CS: 2, IT: 2 });
});

test('migration replaces old seeds and preserves custom legacy records without guessing courses or years', () => {
  const old = [
    { id: 'st-101', fullName: 'Old seeded name', email: 'old@example.edu', course: 'Psychology', year: 'Year 2' },
    { id: 'user-1', fullName: 'Custom Learner', email: 'custom@example.edu', course: 'Biology', year: 'Year 4' },
  ];
  const migrated = migrateStudents(old);
  assert.equal(migrated.length, 11);
  assert.equal(migrated[0].fullName, 'Aarav Sharma');
  assert.equal(migrated[10].fullName, 'Custom Learner');
  assert.match(migrated[10].studentId, /^LEGACY-/);
  assert.equal(migrated[10].department, '');
  assert.equal(migrated[10].year, '');
  assert.equal(migrated[10].isLegacy, true);
});

test('serialized data can be loaded again after refresh', () => {
  const fakeStorage = new Map();
  const firstLoad = parseStoredStudents(fakeStorage.get('campus-students-v1') ?? '[]');
  fakeStorage.set('campus-students-v1', serializeStudents(addStudent(firstLoad.students, sample, 'persisted-1')));
  const refresh = parseStoredStudents(fakeStorage.get('campus-students-v1'));
  assert.equal(refresh.valid, true);
  assert.equal(refresh.students.find((s) => s.id === 'persisted-1').studentId, sample.studentId);
});
