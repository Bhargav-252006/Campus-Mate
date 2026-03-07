import React, {useState, useEffect} from 'react';
import {
    Calculator, Plus, Trash2, Edit2, Save, X, Target,
    TrendingUp, Award, AlertCircle, CheckCircle
} from 'lucide-react';
import {useToast} from '../context/ToastContext';

const GRADE_SCALES = {
    letter: {
        name: 'Letter Grade (A-F)',
        grades: [
            {letter: 'A+', min: 97, gpa: 4.0},
            {letter: 'A', min: 93, gpa: 4.0},
            {letter: 'A-', min: 90, gpa: 3.7},
            {letter: 'B+', min: 87, gpa: 3.3},
            {letter: 'B', min: 83, gpa: 3.0},
            {letter: 'B-', min: 80, gpa: 2.7},
            {letter: 'C+', min: 77, gpa: 2.3},
            {letter: 'C', min: 73, gpa: 2.0},
            {letter: 'C-', min: 70, gpa: 1.7},
            {letter: 'D+', min: 67, gpa: 1.3},
            {letter: 'D', min: 63, gpa: 1.0},
            {letter: 'D-', min: 60, gpa: 0.7},
            {letter: 'F', min: 0, gpa: 0.0}
        ]
    },
    percentage: {
        name: 'Percentage (0-100)',
        grades: []
    },
    gpa: {
        name: 'GPA (0-4.0)',
        grades: []
    }
};

const GradeCalculator = () => {
    const toast = useToast();
    const [courses, setCourses] = useState([]);
    const [showAddModal, setShowAddModal] = useState(false);
    const [editingCourse, setEditingCourse] = useState(null);
    const [targetGPA, setTargetGPA] = useState(3.5);

    const [newCourse, setNewCourse] = useState({
        name: '',
        credits: 3,
        categories: [
            {name: 'Assignments', weight: 30, grades: []},
            {name: 'Quizzes', weight: 20, grades: []},
            {name: 'Midterm', weight: 20, grades: []},
            {name: 'Final', weight: 30, grades: []}
        ]
    });

    // Load courses
    useEffect(() => {
        const saved = localStorage.getItem('gradeCourses');
        if (saved) {
            setCourses(JSON.parse(saved));
        }
        const savedTarget = localStorage.getItem('targetGPA');
        if (savedTarget) {
            setTargetGPA(parseFloat(savedTarget));
        }
    }, []);

    // Save courses
    const saveCourses = (newCourses) => {
        setCourses(newCourses);
        localStorage.setItem('gradeCourses', JSON.stringify(newCourses));
    };

    // Calculate letter grade from percentage
    const getLetterGrade = (percentage) => {
        for (const grade of GRADE_SCALES.letter.grades) {
            if (percentage >= grade.min) {
                return grade;
            }
        }
        return GRADE_SCALES.letter.grades[GRADE_SCALES.letter.grades.length - 1];
    };

    // Calculate course grade
    const calculateCourseGrade = (course) => {
        let totalWeight = 0;
        let weightedSum = 0;

        course.categories.forEach(cat => {
            if (cat.grades.length > 0) {
                const catAvg = cat.grades.reduce((sum, g) => sum + g.score, 0) / cat.grades.length;
                weightedSum += catAvg * (cat.weight / 100);
                totalWeight += cat.weight;
            }
        });

        if (totalWeight === 0) return null;

        // Scale to 100 if not all categories have grades
        const percentage = (weightedSum / (totalWeight / 100));
        return {
            percentage: percentage.toFixed(2),
            letter: getLetterGrade(percentage)
        };
    };

    // Calculate overall GPA
    const calculateGPA = () => {
        let totalCredits = 0;
        let totalPoints = 0;

        courses.forEach(course => {
            const grade = calculateCourseGrade(course);
            if (grade) {
                totalCredits += course.credits;
                totalPoints += grade.letter.gpa * course.credits;
            }
        });

        return totalCredits > 0 ? (totalPoints / totalCredits).toFixed(2) : 0;
    };

    // Calculate what's needed for target GPA
    const calculateNeededGrade = () => {
        const currentGPA = parseFloat(calculateGPA());
        const totalCredits = courses.reduce((sum, c) => sum + c.credits, 0);

        // If no grades yet
        if (totalCredits === 0 || currentGPA === 0) {
            return {needed: targetGPA.toFixed(2), achievable: true};
        }

        // Assume adding one more 3-credit course
        const futureCredits = 3;
        const needed = ((targetGPA * (totalCredits + futureCredits)) - (currentGPA * totalCredits)) / futureCredits;

        return {
            needed: needed.toFixed(2),
            achievable: needed <= 4.0 && needed >= 0
        };
    };

    // Add course
    const addCourse = () => {
        if (!newCourse.name.trim()) {
            toast.warning('Please enter a course name');
            return;
        }

        const totalWeight = newCourse.categories.reduce((sum, c) => sum + c.weight, 0);
        if (totalWeight !== 100) {
            toast.warning('Category weights must total 100%');
            return;
        }

        const course = {
            id: Date.now(),
            ...newCourse,
            createdAt: new Date().toISOString()
        };

        saveCourses([...courses, course]);
        setNewCourse({
            name: '',
            credits: 3,
            categories: [
                {name: 'Assignments', weight: 30, grades: []},
                {name: 'Quizzes', weight: 20, grades: []},
                {name: 'Midterm', weight: 20, grades: []},
                {name: 'Final', weight: 30, grades: []}
            ]
        });
        setShowAddModal(false);
        toast.success('Course added!');
    };

    // Add grade to category
    const addGrade = (courseId, categoryIndex, score) => {
        const updatedCourses = courses.map(c => {
            if (c.id !== courseId) return c;

            const newCategories = [...c.categories];
            newCategories[categoryIndex] = {
                ...newCategories[categoryIndex],
                grades: [
                    ...newCategories[categoryIndex].grades,
                    {id: Date.now(), score: parseFloat(score), date: new Date().toISOString()}
                ]
            };

            return {...c, categories: newCategories};
        });

        saveCourses(updatedCourses);
    };

    // Delete grade
    const deleteGrade = (courseId, categoryIndex, gradeId) => {
        const updatedCourses = courses.map(c => {
            if (c.id !== courseId) return c;

            const newCategories = [...c.categories];
            newCategories[categoryIndex] = {
                ...newCategories[categoryIndex],
                grades: newCategories[categoryIndex].grades.filter(g => g.id !== gradeId)
            };

            return {...c, categories: newCategories};
        });

        saveCourses(updatedCourses);
    };

    // Delete course
    const deleteCourse = (courseId) => {
        if (!window.confirm('Delete this course and all grades?')) return;
        saveCourses(courses.filter(c => c.id !== courseId));
        setEditingCourse(null);
        toast.info('Course deleted');
    };

    const gpa = calculateGPA();
    const neededGrade = calculateNeededGrade();

    return (
        <div className="grades-page grade-calculator">
            <div className="page-header">
                <div>
                    <h1><Calculator size={28} /> Grade Calculator</h1>
                    <p className="subtitle">Track your grades and predict your GPA</p>
                </div>
                <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
                    <Plus size={20} /> Add Course
                </button>
            </div>

            {/* GPA Overview */}
            <div className="gpa-overview">
                <div className="gpa-card main">
                    <div className="gpa-value">{gpa}</div>
                    <div className="gpa-label">Current GPA</div>
                    <div className="gpa-bar">
                        <div className="gpa-fill" style={{width: `${(gpa / 4) * 100}%`}} />
                    </div>
                </div>

                <div className="gpa-card target">
                    <div className="target-header">
                        <Target size={20} />
                        <span>Target GPA</span>
                    </div>
                    <input
                        type="number"
                        value={targetGPA}
                        onChange={e => {
                            const val = Math.min(4, Math.max(0, parseFloat(e.target.value) || 0));
                            setTargetGPA(val);
                            localStorage.setItem('targetGPA', val.toString());
                        }}
                        min="0"
                        max="4"
                        step="0.1"
                    />
                    <div className={`needed-grade ${neededGrade.achievable ? 'achievable' : 'not-achievable'}`}>
                        {neededGrade.achievable ? (
                            <>
                                <CheckCircle size={16} />
                                Need {neededGrade.needed} GPA in next course
                            </>
                        ) : (
                            <>
                                <AlertCircle size={16} />
                                Target may not be achievable
                            </>
                        )}
                    </div>
                </div>

                <div className="gpa-card stats">
                    <div className="stat-row">
                        <span>Total Courses</span>
                        <span>{courses.length}</span>
                    </div>
                    <div className="stat-row">
                        <span>Total Credits</span>
                        <span>{courses.reduce((sum, c) => sum + c.credits, 0)}</span>
                    </div>
                    <div className="stat-row">
                        <span>Best Course</span>
                        <span>
                            {courses.length > 0
                                ? courses
                                    .map(c => ({name: c.name, grade: calculateCourseGrade(c)}))
                                    .filter(c => c.grade)
                                    .sort((a, b) => b.grade.percentage - a.grade.percentage)[0]?.name || '-'
                                : '-'
                            }
                        </span>
                    </div>
                </div>
            </div>

            {/* Courses List */}
            {courses.length === 0 ? (
                <div className="empty-state">
                    <Calculator size={64} />
                    <h3>No courses yet</h3>
                    <p>Add your first course to start tracking grades!</p>
                    <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
                        <Plus size={20} /> Add Course
                    </button>
                </div>
            ) : (
                <div className="courses-list courses-grid">
                    {courses.map(course => {
                        const grade = calculateCourseGrade(course);
                        return (
                            <div key={course.id} className="course-card">
                                <div className="course-header">
                                    <div>
                                        <h3>{course.name}</h3>
                                        <span className="credits">{course.credits} credits</span>
                                    </div>
                                    <div className="course-grade">
                                        {grade ? (
                                            <>
                                                <span className="letter">{grade.letter.letter}</span>
                                                <span className="percentage">{grade.percentage}%</span>
                                            </>
                                        ) : (
                                            <span className="no-grades">No grades yet</span>
                                        )}
                                    </div>
                                </div>

                                <div className="categories-grid">
                                    {course.categories.map((cat, catIndex) => {
                                        const catAvg = cat.grades.length > 0
                                            ? (cat.grades.reduce((sum, g) => sum + g.score, 0) / cat.grades.length).toFixed(1)
                                            : null;

                                        return (
                                            <div key={catIndex} className="category-card">
                                                <div className="category-header">
                                                    <span className="cat-name">{cat.name}</span>
                                                    <span className="cat-weight">{cat.weight}%</span>
                                                </div>
                                                <div className="cat-avg">
                                                    {catAvg ? `${catAvg}%` : '-'}
                                                </div>
                                                <div className="grades-list">
                                                    {cat.grades.map(g => (
                                                        <div key={g.id} className="grade-item">
                                                            <span>{g.score}%</span>
                                                            <button onClick={() => deleteGrade(course.id, catIndex, g.id)}>
                                                                <X size={12} />
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>
                                                <div className="add-grade">
                                                    <input
                                                        type="number"
                                                        placeholder="Score"
                                                        min="0"
                                                        max="100"
                                                        onKeyPress={e => {
                                                            if (e.key === 'Enter' && e.target.value) {
                                                                addGrade(course.id, catIndex, e.target.value);
                                                                e.target.value = '';
                                                            }
                                                        }}
                                                    />
                                                    <button onClick={(e) => {
                                                        const input = e.target.parentElement.querySelector('input');
                                                        if (input.value) {
                                                            addGrade(course.id, catIndex, input.value);
                                                            input.value = '';
                                                        }
                                                    }}>
                                                        <Plus size={14} />
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                                <div className="course-actions">
                                    <button className="btn btn-ghost btn-sm" onClick={() => deleteCourse(course.id)}>
                                        <Trash2 size={16} /> Delete
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Add Course Modal */}
            {showAddModal && (
                <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
                    <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>Add New Course</h2>
                            <button className="close-btn" onClick={() => setShowAddModal(false)} aria-label="Close">
                                <X size={18} />
                            </button>
                        </div>

                        <div className="modal-body">

                            <div className="form-row">
                                <div className="form-group">
                                    <label>Course Name</label>
                                    <input
                                        type="text"
                                        value={newCourse.name}
                                        onChange={e => setNewCourse({...newCourse, name: e.target.value})}
                                        placeholder="e.g., Calculus I"
                                    />
                                </div>
                                <div className="form-group" style={{maxWidth: '120px'}}>
                                    <label>Credits</label>
                                    <input
                                        type="number"
                                        value={newCourse.credits}
                                        onChange={e => setNewCourse({...newCourse, credits: parseInt(e.target.value) || 0})}
                                        min="1"
                                        max="6"
                                    />
                                </div>
                            </div>

                            <div className="form-group">
                                <label>
                                    Grade Categories
                                    <span className="weight-total">
                                        (Total: {newCourse.categories.reduce((sum, c) => sum + c.weight, 0)}%)
                                    </span>
                                </label>
                                <div className="categories-editor">
                                    {newCourse.categories.map((cat, i) => (
                                        <div key={i} className="category-row">
                                            <input
                                                type="text"
                                                value={cat.name}
                                                onChange={e => {
                                                    const newCats = [...newCourse.categories];
                                                    newCats[i].name = e.target.value;
                                                    setNewCourse({...newCourse, categories: newCats});
                                                }}
                                                placeholder="Category name"
                                            />
                                            <div className="weight-input">
                                                <input
                                                    type="number"
                                                    value={cat.weight}
                                                    onChange={e => {
                                                        const newCats = [...newCourse.categories];
                                                        newCats[i].weight = parseInt(e.target.value) || 0;
                                                        setNewCourse({...newCourse, categories: newCats});
                                                    }}
                                                    min="0"
                                                    max="100"
                                                />
                                                <span>%</span>
                                            </div>
                                            <button
                                                className="btn-icon"
                                                onClick={() => {
                                                    const newCats = newCourse.categories.filter((_, idx) => idx !== i);
                                                    setNewCourse({...newCourse, categories: newCats});
                                                }}
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    ))}
                                    <button
                                        className="btn btn-ghost btn-sm"
                                        onClick={() => setNewCourse({
                                            ...newCourse,
                                            categories: [...newCourse.categories, {name: '', weight: 0, grades: []}]
                                        })}
                                    >
                                        <Plus size={16} /> Add Category
                                    </button>
                                </div>
                            </div>

                            <div className="modal-actions">
                                <button className="btn btn-ghost" onClick={() => setShowAddModal(false)}>
                                    Cancel
                                </button>
                                <button className="btn btn-primary" onClick={addCourse}>
                                    Add Course
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default GradeCalculator;
