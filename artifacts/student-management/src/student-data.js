export const STORAGE_KEY = 'campus-students-v1';

export const DEPARTMENTS = [
  { code: 'AI', label: 'Artificial Intelligence' },
  { code: 'DS', label: 'Data Science' },
  { code: 'CS', label: 'Computer Science' },
  { code: 'IT', label: 'Information Technology' },
];

export const ACADEMIC_YEARS = [
  { code: 'FY', label: 'First Year' },
  { code: 'SY', label: 'Second Year' },
  { code: 'TY', label: 'Third Year' },
];

export const SEEDED_STUDENTS = [
  { id: 'st-101', studentId: 'CC-AI-2401', fullName: 'Aarav Sharma', email: 'aarav.sharma@example.edu', department: 'AI', year: 'FY' },
  { id: 'st-102', studentId: 'CC-DS-2402', fullName: 'Priya Patil', email: 'priya.patil@example.edu', department: 'DS', year: 'SY' },
  { id: 'st-103', studentId: 'CC-CS-2403', fullName: 'Rohan Verma', email: 'rohan.verma@example.edu', department: 'CS', year: 'TY' },
  { id: 'st-104', studentId: 'CC-IT-2404', fullName: 'Sneha Singh', email: 'sneha.singh@example.edu', department: 'IT', year: 'FY' },
  { id: 'st-105', studentId: 'CC-AI-2405', fullName: 'Aditya Joshi', email: 'aditya.joshi@example.edu', department: 'AI', year: 'SY' },
  { id: 'st-106', studentId: 'CC-DS-2406', fullName: 'Ananya Deshmukh', email: 'ananya.deshmukh@example.edu', department: 'DS', year: 'TY' },
  { id: 'st-107', studentId: 'CC-CS-2407', fullName: 'Rahul Gupta', email: 'rahul.gupta@example.edu', department: 'CS', year: 'FY' },
  { id: 'st-108', studentId: 'CC-IT-2408', fullName: 'Neha Kulkarni', email: 'neha.kulkarni@example.edu', department: 'IT', year: 'SY' },
  { id: 'st-109', studentId: 'CC-AI-2409', fullName: 'Arjun Mehta', email: 'arjun.mehta@example.edu', department: 'AI', year: 'TY' },
  { id: 'st-110', studentId: 'CC-DS-2410', fullName: 'Pooja Shah', email: 'pooja.shah@example.edu', department: 'DS', year: 'FY' },
];

const oldSeedIds = new Set(SEEDED_STUDENTS.map((student) => student.id));
const validDepartments = new Set(DEPARTMENTS.map((item) => item.code));
const validYears = new Set(ACADEMIC_YEARS.map((item) => item.code));

export function createInitialStudents() {
  return SEEDED_STUDENTS.map((student) => ({ ...student }));
}

function legacyStudentId(usedIds) {
  let index = 1;
  let candidate = '';
  do {
    candidate = `LEGACY-${String(index).padStart(4, '0')}`;
    index += 1;
  } while (usedIds.has(candidate.toLocaleLowerCase()));
  usedIds.add(candidate.toLocaleLowerCase());
  return candidate;
}

/**
 * Convert stored records to the current directory shape without mutating the source.
 * Old seeded records are replaced, while user-created records are retained.
 */
export function migrateStudents(value) {
  if (!Array.isArray(value)) return createInitialStudents();
  const customRows = value.filter((row) => row && typeof row === 'object' && !oldSeedIds.has(String(row.id)));
  const usedStudentIds = new Set(
    customRows
      .map((row) => typeof row.studentId === 'string' ? row.studentId.trim().toLocaleLowerCase() : '')
      .filter(Boolean),
  );
  const normalizedCustom = customRows.map((row, index) => {
    const hasStudentId = typeof row.studentId === 'string' && row.studentId.trim().length > 0;
    const hasDepartment = validDepartments.has(row.department);
    const hasYear = validYears.has(row.year);
    const legacy = !hasStudentId || !hasDepartment || !hasYear;
    const studentId = hasStudentId ? row.studentId.trim() : legacyStudentId(usedStudentIds);
    usedStudentIds.add(studentId.toLocaleLowerCase());
    return {
      id: typeof row.id === 'string' && row.id ? row.id : `legacy-record-${index + 1}`,
      studentId,
      fullName: typeof row.fullName === 'string' ? row.fullName : '',
      email: typeof row.email === 'string' ? row.email : '',
      department: hasDepartment ? row.department : '',
      year: hasYear ? row.year : '',
      ...(legacy ? { isLegacy: true } : {}),
    };
  });
  return [...createInitialStudents(), ...normalizedCustom];
}

export function parseStoredStudents(raw) {
  try {
    return { students: migrateStudents(JSON.parse(raw)), valid: Array.isArray(JSON.parse(raw)) };
  } catch {
    return { students: createInitialStudents(), valid: false };
  }
}

export function serializeStudents(students) {
  return JSON.stringify(students);
}

export function filterStudents(students, { query = '', department = '', year = '' } = {}) {
  const needle = query.trim().toLocaleLowerCase();
  return students.filter((student) => {
    const matchesQuery = !needle
      || (student.fullName || '').toLocaleLowerCase().includes(needle)
      || (student.studentId || '').toLocaleLowerCase().includes(needle);
    return matchesQuery
      && (!department || student.department === department)
      && (!year || student.year === year);
  });
}

export function countByDepartment(students) {
  return Object.fromEntries(DEPARTMENTS.map(({ code }) => [
    code,
    students.filter((student) => student.department === code).length,
  ]));
}

export function addStudent(students, data, id = `stu-${Date.now()}`) {
  assertUniqueStudentId(students, data.studentId);
  return [{ ...data, id, isLegacy: false }, ...students];
}

export function editStudent(students, id, data) {
  assertUniqueStudentId(students, data.studentId, id);
  return students.map((student) => student.id === id ? { ...data, id, isLegacy: false } : student);
}

export function deleteStudent(students, id) {
  return students.filter((student) => student.id !== id);
}

export function assertUniqueStudentId(students, studentId, exceptInternalId = '') {
  const normalized = String(studentId || '').trim().toLocaleLowerCase();
  if (!normalized) throw new Error('Enter a student ID.');
  if (students.some((student) => student.id !== exceptInternalId
    && String(student.studentId || '').trim().toLocaleLowerCase() === normalized)) {
    throw new Error('That student ID is already in use.');
  }
}
