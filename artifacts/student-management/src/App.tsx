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
  Route,
  Switch,
  useLocation,
  Router as WouterRouter,
} from 'wouter';

const queryClient = new QueryClient();
const STORAGE_KEY = 'campus-students-v1';

type Student = {
  id: string;
  fullName: string;
  email: string;
  course: string;
  year: string;
};

type StudentForm = Omit<Student, 'id'>;
type FieldErrors = Partial<Record<keyof StudentForm, string>>;

const seededStudents: Student[] = [
  { id: 'st-101', fullName: 'Amara Bennett', email: 'amara.bennett@northfield.edu', course: 'Psychology', year: 'Year 2' },
  { id: 'st-102', fullName: 'Theo Mitchell', email: 'theo.mitchell@northfield.edu', course: 'Computer Science', year: 'Year 3' },
  { id: 'st-103', fullName: 'Priya Nair', email: 'priya.nair@northfield.edu', course: 'Biology', year: 'Year 1' },
  { id: 'st-104', fullName: 'Jasper Cole', email: 'jasper.cole@northfield.edu', course: 'Business', year: 'Year 4' },
  { id: 'st-105', fullName: 'Maya Thompson', email: 'maya.thompson@northfield.edu', course: 'English Literature', year: 'Year 2' },
  { id: 'st-106', fullName: 'Eli Navarro', email: 'eli.navarro@northfield.edu', course: 'Computer Science', year: 'Year 1' },
  { id: 'st-107', fullName: 'Sofia Kim', email: 'sofia.kim@northfield.edu', course: 'Psychology', year: 'Year 3' },
  { id: 'st-108', fullName: 'Noah Williams', email: 'noah.williams@northfield.edu', course: 'History', year: 'Year 4' },
  { id: 'st-109', fullName: 'Leila Hassan', email: 'leila.hassan@northfield.edu', course: 'Biology', year: 'Year 2' },
  { id: 'st-110', fullName: 'Oliver Reed', email: 'oliver.reed@northfield.edu', course: 'Business', year: 'Year 1' },
];

const courses = ['Biology', 'Business', 'Computer Science', 'English Literature', 'History', 'Psychology'];
const years = ['Year 1', 'Year 2', 'Year 3', 'Year 4'];
const emptyForm: StudentForm = { fullName: '', email: '', course: '', year: '' };

function readInitialStudents(): Student[] {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved !== null) {
      const parsed: unknown = JSON.parse(saved);
      if (Array.isArray(parsed)) return parsed as Student[];
    } else {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(seededStudents));
    }
  } catch {
    // Local storage can be unavailable in private browsing; keep the app usable in memory.
  }
  return seededStudents;
}

function initials(fullName: string) {
  return fullName.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase();
}

function Home() {
  const [students, setStudents] = useState<Student[]>(readInitialStudents);
  const [query, setQuery] = useState('');
  const [courseFilter, setCourseFilter] = useState('');
  const [yearFilter, setYearFilter] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Student | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Student | null>(null);

  const persistStudents = (nextStudents: Student[]) => {
    setStudents(nextStudents);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextStudents));
    } catch {
      // Keep edits in the current session when browser storage is unavailable.
    }
  };

  const filteredStudents = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    return students.filter((student) => {
      const matchesName = !normalizedQuery || student.fullName.toLocaleLowerCase().includes(normalizedQuery);
      const matchesCourse = !courseFilter || student.course === courseFilter;
      const matchesYear = !yearFilter || student.year === yearFilter;
      return matchesName && matchesCourse && matchesYear;
    });
  }, [students, query, courseFilter, yearFilter]);

  const showForm = (student?: Student) => {
    setEditing(student ?? null);
    setFormOpen(true);
  };

  const handleSave = (form: StudentForm) => {
    const next = editing
      ? students.map((student) => student.id === editing.id ? { ...student, ...form } : student)
      : [{ ...form, id: `stu-${Date.now()}` }, ...students];
    persistStudents(next);
    setFormOpen(false);
    setEditing(null);
  };

  const confirmDelete = () => {
    if (!pendingDelete) return;
    persistStudents(students.filter((student) => student.id !== pendingDelete.id));
    setPendingDelete(null);
  };

  const hasActiveFilters = Boolean(query || courseFilter || yearFilter);
  const clearFilters = () => {
    setQuery('');
    setCourseFilter('');
    setYearFilter('');
  };

  return (
    <div className="app-shell">
      <aside className="side-rail" aria-label="Main navigation">
        <div className="brand">
          <div className="brand-mark" aria-hidden="true"><GraduationCap size={21} strokeWidth={1.8} /></div>
          <div>
            <div className="brand-name">Northfield</div>
            <div className="brand-caption">COLLEGE RECORDS</div>
          </div>
        </div>
        <div className="rail-label">Workspace</div>
        <div className="rail-link" aria-label="Dashboard">
          <LayoutDashboard aria-hidden="true" /><span>Dashboard</span>
        </div>
        <div className="rail-link active" aria-current="page" aria-label="Students">
          <UsersRound aria-hidden="true" /><span>Students</span>
        </div>
        <div className="rail-note">
          <strong>Student records</strong>
          A simple home for the people who make Northfield.
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
              <p>Keep student details close and easy to find.</p>
            </div>
            <button className="primary-button" onClick={() => showForm()} data-testid="button-add-student">
              <Plus aria-hidden="true" /> Add student
            </button>
          </div>

          <div className="overview-row">
            <div className="welcome-panel">
              <div className="welcome-copy">
                <span>Northfield College</span>
                <h2>A little more organized.</h2>
                <p>All the details you need, right where you need them.</p>
              </div>
              <div className="welcome-decoration" aria-hidden="true"><BookOpen /></div>
            </div>
            <div className="count-card" data-testid="card-total-students">
              <div className="count-top"><span>Total students</span><span className="count-icon"><UsersRound aria-hidden="true" /></span></div>
              <div className="count-number" data-testid="text-student-count">{students.length.toString().padStart(2, '0')}</div>
              <div className="count-caption">student records in your directory</div>
            </div>
          </div>

          <section className="directory-panel" aria-label="Student directory">
            <div className="directory-head">
              <div className="directory-title">
                <h2>Student directory</h2>
                <p>Search and manage your college records</p>
              </div>
              <div className="filters">
                <label className="search-wrap">
                  <span className="sr-only">Search students by name</span>
                  <Search aria-hidden="true" />
                  <input
                    className="search-input"
                    type="search"
                    placeholder="Search by name..."
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    data-testid="input-search-students"
                  />
                </label>
                <label>
                  <span className="sr-only">Filter by course</span>
                  <select className="filter-select" value={courseFilter} onChange={(event) => setCourseFilter(event.target.value)} data-testid="select-course-filter">
                    <option value="">All courses</option>
                    {courses.map((course) => <option key={course} value={course}>{course}</option>)}
                  </select>
                </label>
                <label>
                  <span className="sr-only">Filter by year</span>
                  <select className="filter-select" value={yearFilter} onChange={(event) => setYearFilter(event.target.value)} data-testid="select-year-filter">
                    <option value="">All years</option>
                    {years.map((year) => <option key={year} value={year}>{year}</option>)}
                  </select>
                </label>
              </div>
            </div>

            {filteredStudents.length > 0 ? (
              <>
                <div className="table-wrap">
                  <table className="student-table">
                    <thead>
                      <tr><th scope="col">Student</th><th scope="col">Email</th><th scope="col">Course</th><th scope="col">Year</th><th scope="col"><span className="sr-only">Actions</span></th></tr>
                    </thead>
                    <tbody>
                      {filteredStudents.map((student) => (
                        <tr key={student.id} data-testid={`row-student-${student.id}`}>
                          <td>
                            <div className="student-name" data-testid={`text-student-${student.id}`}>
                              <span className="student-initials" aria-hidden="true">{initials(student.fullName)}</span>
                              <span><strong>{student.fullName}</strong><small>Student ID · {student.id}</small></span>
                            </div>
                          </td>
                          <td className="email-cell">{student.email}</td>
                          <td><span className="course-pill">{student.course}</span></td>
                          <td className="year-cell">{student.year}</td>
                          <td>
                            <div className="actions">
                              <button className="icon-button" aria-label={`Edit ${student.fullName}`} title="Edit student" onClick={() => showForm(student)} data-testid={`button-edit-${student.id}`}><SquarePen aria-hidden="true" /></button>
                              <button className="icon-button delete" aria-label={`Delete ${student.fullName}`} title="Delete student" onClick={() => setPendingDelete(student)} data-testid={`button-delete-${student.id}`}><Trash2 aria-hidden="true" /></button>
                            </div>
                          </td>
                        </tr>
                      ))}
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
                <h3>{students.length === 0 ? 'Your directory is ready' : 'No students found'}</h3>
                <p>{students.length === 0 ? 'Add your first student to start building the college directory.' : 'Try another name or adjust your filters to find a student.'}</p>
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

      {formOpen && <StudentModal student={editing} onClose={() => { setFormOpen(false); setEditing(null); }} onSave={handleSave} />}
      {pendingDelete && <DeleteConfirmation student={pendingDelete} onCancel={() => setPendingDelete(null)} onConfirm={confirmDelete} />}
    </div>
  );
}

function StudentModal({ student, onClose, onSave }: { student: Student | null; onClose: () => void; onSave: (form: StudentForm) => void }) {
  const [form, setForm] = useState<StudentForm>(student ? { fullName: student.fullName, email: student.email, course: student.course, year: student.year } : emptyForm);
  const [errors, setErrors] = useState<FieldErrors>({});

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const updateField = (field: keyof StudentForm, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextErrors: FieldErrors = {};
    if (!form.fullName.trim()) nextErrors.fullName = 'Enter the student’s full name.';
    if (!form.email.trim()) nextErrors.email = 'Enter an email address.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) nextErrors.email = 'Enter a valid email address.';
    if (!form.course) nextErrors.course = 'Choose a course.';
    if (!form.year) nextErrors.year = 'Choose a year.';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length === 0) {
      onSave({ fullName: form.fullName.trim(), email: form.email.trim(), course: form.course, year: form.year });
    }
  };

  return (
    <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="modal-card" role="dialog" aria-modal="true" aria-labelledby="student-modal-title">
        <div className="modal-head">
          <div><h2 id="student-modal-title">{student ? 'Edit student' : 'Add a student'}</h2><p>Enter the details for this student record.</p></div>
          <button className="close-button" onClick={onClose} aria-label="Close form" data-testid="button-close-student-form"><X aria-hidden="true" /></button>
        </div>
        <form className="student-form" onSubmit={submit} noValidate>
          <div className="form-grid">
            <div className="form-field full">
              <label htmlFor="student-name">Full name</label>
              <input id="student-name" className="form-input" value={form.fullName} onChange={(event) => updateField('fullName', event.target.value)} placeholder="e.g. Alex Morgan" aria-invalid={Boolean(errors.fullName)} aria-describedby={errors.fullName ? 'error-name' : undefined} data-testid="input-student-name" autoFocus />
              {errors.fullName && <span className="field-error" id="error-name">{errors.fullName}</span>}
            </div>
            <div className="form-field full">
              <label htmlFor="student-email">Email address</label>
              <input id="student-email" type="email" className="form-input" value={form.email} onChange={(event) => updateField('email', event.target.value)} placeholder="alex.morgan@northfield.edu" aria-invalid={Boolean(errors.email)} aria-describedby={errors.email ? 'error-email' : undefined} data-testid="input-student-email" />
              {errors.email && <span className="field-error" id="error-email">{errors.email}</span>}
            </div>
            <div className="form-field">
              <label htmlFor="student-course">Course</label>
              <select id="student-course" className="form-input" value={form.course} onChange={(event) => updateField('course', event.target.value)} aria-invalid={Boolean(errors.course)} aria-describedby={errors.course ? 'error-course' : undefined} data-testid="select-student-course">
                <option value="">Select course</option>
                {courses.map((course) => <option value={course} key={course}>{course}</option>)}
              </select>
              {errors.course && <span className="field-error" id="error-course">{errors.course}</span>}
            </div>
            <div className="form-field">
              <label htmlFor="student-year">Year</label>
              <select id="student-year" className="form-input" value={form.year} onChange={(event) => updateField('year', event.target.value)} aria-invalid={Boolean(errors.year)} aria-describedby={errors.year ? 'error-year' : undefined} data-testid="select-student-year">
                <option value="">Select year</option>
                {years.map((year) => <option value={year} key={year}>{year}</option>)}
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
        <p className="confirm-copy" id="delete-description">This record will be removed from your student directory and saved changes.</p>
        <div className="confirm-student">{student.fullName}<br /><span style={{ fontWeight: 400, color: '#8c8494' }}>{student.email}</span></div>
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
