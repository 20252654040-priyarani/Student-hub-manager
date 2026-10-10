import { type FormEvent, type ReactNode, useEffect, useMemo, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import {
  BookOpen,
  Check,
  ChevronRight,
  GraduationCap,
  LayoutDashboard,
  Plus,
  Search,
  SquarePen,
  Trash2,
  UsersRound,
  X,
} from 'lucide-react';
import {
  ACADEMIC_YEARS,
  addStudent,
  countByDepartment,
  createInitialStudents,
  deleteStudent,
  DEPARTMENTS,
  editStudent,
  filterStudents,
  parseStoredStudents,
  serializeStudents,
  STORAGE_KEY,
  type Student,
  type StudentFormData,
} from './student-data.js';
import {
  Route,
  Switch,
  useLocation,
  Router as WouterRouter,
} from 'wouter';

const queryClient = new QueryClient();

function readInitialStudents(): Student[] {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === null) {
      const initial = createInitialStudents();
      window.localStorage.setItem(STORAGE_KEY, serializeStudents(initial));
      return initial;
    }
    const result = parseStoredStudents(stored);
    if (result.valid && serializeStudents(result.students) !== stored) {
      window.localStorage.setItem(STORAGE_KEY, serializeStudents(result.students));
    }
    return result.students;
  } catch {
    return createInitialStudents();
  }
}

function initials(fullName: string) {
  return fullName.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase();
}

function Home() {
  const [students, setStudents] = useState<Student[]>(readInitialStudents);
  const [query, setQuery] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [yearFilter, setYearFilter] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Student | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Student | null>(null);
  const [feedback, setFeedback] = useState('');

  const persistStudents = (nextStudents: Student[]) => {
    setStudents(nextStudents);
    try {
      window.localStorage.setItem(STORAGE_KEY, serializeStudents(nextStudents));
    } catch {
      // Keep the current session usable if browser storage is unavailable.
    }
  };

  const filteredStudents = useMemo(
    () => filterStudents(students, { query, department: departmentFilter, year: yearFilter }),
    [students, query, departmentFilter, yearFilter],
  );
  const departmentCounts = useMemo(() => countByDepartment(students), [students]);

  const showForm = (student?: Student) => {
    setEditing(student ?? null);
    setFormOpen(true);
  };

  const handleSave = (form: StudentFormData) => {
    try {
      const next = editing
        ? editStudent(students, editing.id, form)
        : addStudent(students, form);
      persistStudents(next);
      setFormOpen(false);
      setEditing(null);
      setFeedback(editing ? 'Student record updated.' : 'Student added to the directory.');
      window.setTimeout(() => setFeedback(''), 3200);
    } catch (error) {
      throw error;
    }
  };

  const confirmDelete = () => {
    if (!pendingDelete) return;
    persistStudents(deleteStudent(students, pendingDelete.id));
    setPendingDelete(null);
    setFeedback('Student record deleted.');
    window.setTimeout(() => setFeedback(''), 3200);
  };

  const hasActiveFilters = Boolean(query.trim() || departmentFilter || yearFilter);
  const clearFilters = () => {
    setQuery('');
    setDepartmentFilter('');
    setYearFilter('');
  };

  return (
    <div className="app-shell">
      <aside className="side-rail" aria-label="Main navigation">
        <div className="brand">
          <div className="brand-mark" aria-hidden="true"><GraduationCap size={21} strokeWidth={1.8} /></div>
          <div>
            <div className="brand-name">CampusConnect</div>
            <div className="brand-caption">COLLEGE DIRECTORY</div>
          </div>
        </div>
        <div className="rail-label">Workspace</div>
        <div className="rail-link" aria-label="Dashboard">
          <LayoutDashboard aria-hidden="true" /><span>Overview</span>
        </div>
        <div className="rail-link active" aria-current="page" aria-label="Students">
          <UsersRound aria-hidden="true" /><span>Students</span>
        </div>
        <div className="rail-note">
          <strong>Staff directory</strong>
          Accurate student records, ready when you need them.
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <div className="breadcrumb"><span>Workspace</span><ChevronRight size={13} aria-hidden="true" /><strong>Students</strong></div>
          <div className="staff-chip"><span>College staff</span><div className="staff-avatar" aria-label="College staff">CS</div></div>
        </header>

        <section className="content">
          <div className="page-heading">
            <div>
              <div className="eyebrow">People directory</div>
              <h1>Students</h1>
              <p>Find and maintain accurate student records.</p>
            </div>
            <button className="primary-button" onClick={() => showForm()} data-testid="button-add-student">
              <Plus aria-hidden="true" /> Add student
            </button>
          </div>

          <div className="overview-row">
            <div className="welcome-panel">
              <div className="welcome-copy">
                <span>CampusConnect directory</span>
                <h2>Every record, in its place.</h2>
                <p>Keep student details current and easy to find.</p>
              </div>
              <div className="welcome-decoration" aria-hidden="true"><BookOpen /></div>
            </div>
            <div className="count-card" data-testid="card-total-students">
              <div className="count-top"><span>Total students</span><span className="count-icon"><UsersRound aria-hidden="true" /></span></div>
              <div className="count-number" data-testid="text-student-count">{students.length.toString().padStart(2, '0')}</div>
              <div className="count-caption">student records in your directory</div>
            </div>
          </div>

          <div className="department-summary" aria-label="Students by department">
            {DEPARTMENTS.map(({ code, label }) => (
              <div className="department-count" key={code} data-testid={`count-department-${code}`}>
                <span>{code} · {label}</span><strong>{departmentCounts[code]}</strong>
              </div>
            ))}
          </div>

          <section className="directory-panel" aria-label="Student directory">
            <div className="directory-head">
              <div className="directory-title">
                <h2>Student directory</h2>
                <p>Search by name or student ID, then refine the list</p>
              </div>
              <div className="filters">
                <label className="search-wrap">
                  <span className="sr-only">Search students by name or student ID</span>
                  <Search aria-hidden="true" />
                  <input
                    className="search-input"
                    type="search"
                    placeholder="Name or student ID"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    data-testid="input-search-students"
                  />
                </label>
                <label>
                  <span className="sr-only">Filter by department</span>
                  <select className="filter-select" value={departmentFilter} onChange={(event) => setDepartmentFilter(event.target.value)} data-testid="select-department-filter">
                    <option value="">All departments</option>
                    {DEPARTMENTS.map(({ code, label }) => <option key={code} value={code}>{code} · {label}</option>)}
                  </select>
                </label>
                <label>
                  <span className="sr-only">Filter by academic year</span>
                  <select className="filter-select" value={yearFilter} onChange={(event) => setYearFilter(event.target.value)} data-testid="select-year-filter">
                    <option value="">All years</option>
                    {ACADEMIC_YEARS.map(({ code, label }) => <option key={code} value={code}>{code} · {label}</option>)}
                  </select>
                </label>
              </div>
            </div>

            {filteredStudents.length > 0 ? (
              <>
                <div className="table-wrap">
                  <table className="student-table">
                    <thead>
                      <tr><th scope="col">Student</th><th scope="col">Email</th><th scope="col">Department</th><th scope="col">Year</th><th scope="col"><span className="sr-only">Actions</span></th></tr>
                    </thead>
                    <tbody>
                      {filteredStudents.map((student) => {
                        const department = DEPARTMENTS.find((item) => item.code === student.department);
                        const academicYear = ACADEMIC_YEARS.find((item) => item.code === student.year);
                        return (
                          <tr key={student.id} data-testid={`row-student-${student.id}`}>
                            <td>
                              <div className="student-name" data-testid={`text-student-${student.id}`}>
                                <span className="student-initials" aria-hidden="true">{initials(student.fullName)}</span>
                                <span>
                                  <strong>{student.fullName}</strong>
                                  <small>Student ID · {student.studentId}</small>
                                  {student.isLegacy && <span className="legacy-warning">Assignment needed</span>}
                                </span>
                              </div>
                            </td>
                            <td className="email-cell">{student.email}</td>
                            <td>{department ? <span className="department-pill">{department.code} · {department.label}</span> : <span className="year-cell">Not assigned</span>}</td>
                            <td className="year-cell">{academicYear ? `${academicYear.code} · ${academicYear.label}` : 'Not assigned'}</td>
                            <td>
                              <div className="actions">
                                <button className="icon-button" aria-label={`Edit ${student.fullName}`} title="Edit student" onClick={() => showForm(student)} data-testid={`button-edit-${student.id}`}><SquarePen aria-hidden="true" /></button>
                                <button className="icon-button delete" aria-label={`Delete ${student.fullName}`} title="Delete student" onClick={() => setPendingDelete(student)} data-testid={`button-delete-${student.id}`}><Trash2 aria-hidden="true" /></button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <div className="table-footer">
                  <span data-testid="text-results-count">Showing {filteredStudents.length} of {students.length} students</span>
                  <span>Records are saved on this device</span>
                </div>
              </>
            ) : (
              <div className="empty-state" data-testid="status-no-students">
                <div className="empty-mark"><UsersRound aria-hidden="true" /></div>
                <h3>{students.length === 0 ? 'Your directory is ready' : 'No matching students'}</h3>
                <p>{students.length === 0 ? 'Add your first student to start building the college directory.' : 'No record matches those details. Try another name or ID, or adjust the department and year.'}</p>
                {students.length === 0 ? (
                  <button className="primary-button" onClick={() => showForm()} data-testid="button-empty-add"><Plus aria-hidden="true" /> Add your first student</button>
                ) : hasActiveFilters ? (
                  <button className="text-button" onClick={clearFilters} data-testid="button-clear-filters">Clear search and filters</button>
                ) : null}
              </div>
            )}
          </section>
        </section>
      </main>

      {feedback && <div className="feedback" role="status" data-testid="status-feedback">{feedback}</div>}
      {formOpen && <StudentModal student={editing} students={students} onClose={() => { setFormOpen(false); setEditing(null); }} onSave={handleSave} />}
      {pendingDelete && <DeleteConfirmation student={pendingDelete} onCancel={() => setPendingDelete(null)} onConfirm={confirmDelete} />}
    </div>
  );
}

type ModalProps = {
  student: Student | null;
  students: Student[];
  onClose: () => void;
  onSave: (form: StudentFormData) => void;
};

function StudentModal({ student, students, onClose, onSave }: ModalProps) {
  const [form, setForm] = useState<StudentFormData>(student ? {
    studentId: student.studentId,
    fullName: student.fullName,
    email: student.email,
    department: student.department,
    year: student.year,
  } : { studentId: '', fullName: '', email: '', department: '', year: '' });
  const [errors, setErrors] = useState<Partial<Record<keyof StudentFormData, string>>>({});

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const updateField = (field: keyof StudentFormData, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextErrors: Partial<Record<keyof StudentFormData, string>> = {};
    const normalizedId = form.studentId.trim().toLocaleLowerCase();
    if (!form.studentId.trim()) nextErrors.studentId = 'Enter a student ID.';
    else if (students.some((existing) => existing.id !== student?.id && existing.studentId.toLocaleLowerCase() === normalizedId)) {
      nextErrors.studentId = 'That student ID is already in use.';
    }
    if (!form.fullName.trim()) nextErrors.fullName = 'Enter the student’s full name.';
    if (!form.email.trim()) nextErrors.email = 'Enter an email address.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) nextErrors.email = 'Enter a valid email address.';
    if (!DEPARTMENTS.some((item) => item.code === form.department)) nextErrors.department = 'Choose a department.';
    if (!ACADEMIC_YEARS.some((item) => item.code === form.year)) nextErrors.year = 'Choose an academic year.';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length === 0) {
      onSave({
        studentId: form.studentId.trim(),
        fullName: form.fullName.trim(),
        email: form.email.trim(),
        department: form.department,
        year: form.year,
      });
    }
  };

  return (
    <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="modal-card" role="dialog" aria-modal="true" aria-labelledby="student-modal-title">
        <div className="modal-head">
          <div><h2 id="student-modal-title">{student ? 'Edit student' : 'Add a student'}</h2><p>Keep the directory details accurate and complete.</p></div>
          <button className="close-button" onClick={onClose} aria-label="Close form" data-testid="button-close-student-form"><X aria-hidden="true" /></button>
        </div>
        <form className="student-form" onSubmit={submit} noValidate>
          <div className="form-grid">
            <div className="form-field">
              <label htmlFor="student-id">Student ID</label>
              <input id="student-id" className="form-input" value={form.studentId} onChange={(event) => updateField('studentId', event.target.value)} placeholder="e.g. CC-AI-2411" aria-invalid={Boolean(errors.studentId)} aria-describedby={errors.studentId ? 'error-student-id' : undefined} data-testid="input-student-id" autoFocus={!student} />
              {errors.studentId && <span className="field-error" id="error-student-id">{errors.studentId}</span>}
            </div>
            <div className="form-field">
              <label htmlFor="student-name">Full name</label>
              <input id="student-name" className="form-input" value={form.fullName} onChange={(event) => updateField('fullName', event.target.value)} placeholder="e.g. Kavya Rao" aria-invalid={Boolean(errors.fullName)} aria-describedby={errors.fullName ? 'error-name' : undefined} data-testid="input-student-name" />
              {errors.fullName && <span className="field-error" id="error-name">{errors.fullName}</span>}
            </div>
            <div className="form-field full">
              <label htmlFor="student-email">Email address</label>
              <input id="student-email" type="email" className="form-input" value={form.email} onChange={(event) => updateField('email', event.target.value)} placeholder="kavya.rao@example.edu" aria-invalid={Boolean(errors.email)} aria-describedby={errors.email ? 'error-email' : undefined} data-testid="input-student-email" />
              {errors.email && <span className="field-error" id="error-email">{errors.email}</span>}
            </div>
            <div className="form-field">
              <label htmlFor="student-department">Department</label>
              <select id="student-department" className="form-input" value={form.department} onChange={(event) => updateField('department', event.target.value)} aria-invalid={Boolean(errors.department)} aria-describedby={errors.department ? 'error-department' : undefined} data-testid="select-student-department">
                <option value="">Select department</option>
                {DEPARTMENTS.map(({ code, label }) => <option value={code} key={code}>{code} · {label}</option>)}
              </select>
              {errors.department && <span className="field-error" id="error-department">{errors.department}</span>}
            </div>
            <div className="form-field">
              <label htmlFor="student-year">Academic year</label>
              <select id="student-year" className="form-input" value={form.year} onChange={(event) => updateField('year', event.target.value)} aria-invalid={Boolean(errors.year)} aria-describedby={errors.year ? 'error-year' : undefined} data-testid="select-student-year">
                <option value="">Select year</option>
                {ACADEMIC_YEARS.map(({ code, label }) => <option value={code} key={code}>{code} · {label}</option>)}
              </select>
              {errors.year && <span className="field-error" id="error-year">{errors.year}</span>}
            </div>
          </div>
          <div className="modal-actions">
            <button type="button" className="secondary-button" onClick={onClose} data-testid="button-cancel-student">Cancel</button>
            <button type="submit" className="primary-button" data-testid="button-save-student"><Check aria-hidden="true" /> {student ? 'Save changes' : 'Add student'}</button>
          </div>
        </form>
      </section>
    </div>
  );
}

function DeleteConfirmation({ student, onCancel, onConfirm }: { student: Student; onCancel: () => void; onConfirm: () => void }) {
  return (
    <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onCancel(); }}>
      <section className="modal-card" role="alertdialog" aria-modal="true" aria-labelledby="delete-title" aria-describedby="delete-description">
        <div className="modal-head">
          <div><h2 id="delete-title">Delete this student?</h2><p>This action cannot be undone.</p></div>
          <button className="close-button" onClick={onCancel} aria-label="Close confirmation" data-testid="button-close-delete"><X aria-hidden="true" /></button>
        </div>
        <p className="confirm-copy" id="delete-description">This record will be removed from the student directory on this device.</p>
        <div className="confirm-student">{student.fullName}<br /><span style={{ fontWeight: 400, color: '#8c8494' }}>{student.studentId} · {student.email}</span></div>
        <div className="confirm-actions">
          <button className="secondary-button" onClick={onCancel} data-testid="button-cancel-delete">Keep student</button>
          <button className="danger-button" onClick={onConfirm} data-testid="button-confirm-delete">Delete student</button>
        </div>
      </section>
    </div>
  );
}

function Router() {
  return (
    <RoutedErrorBoundary>
      <Switch>
        <Route path="/" component={Home} />
        <Route component={NotFound} />
      </Switch>
    </RoutedErrorBoundary>
  );
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
