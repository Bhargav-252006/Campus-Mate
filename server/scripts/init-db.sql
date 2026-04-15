-- Campus Mate PostgreSQL Database Schema
-- Compatible with PostgreSQL / Supabase

-- ============ AUTH TABLES ============

CREATE TABLE IF NOT EXISTS auth_tokens (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    token TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    revoked BOOLEAN DEFAULT FALSE
);

-- ============ CHAT & CONVERSATION ============

CREATE TABLE IF NOT EXISTS chat_messages (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    conversation_id VARCHAR(255) NOT NULL,
    role VARCHAR(50),
    content TEXT NOT NULL,
    agent_type VARCHAR(100),
    tool_calls JSONB,
    timestamp TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ============ STUDENT PROFILE ============

CREATE TABLE IF NOT EXISTS student_profiles (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL UNIQUE,
    name VARCHAR(255),
    email VARCHAR(255),
    program VARCHAR(255),
    semester INT,
    gpa NUMERIC(3, 2),
    major VARCHAR(255),
    learning_style VARCHAR(50),
    study_preferences JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ============ TIMETABLE ============

CREATE TABLE IF NOT EXISTS timetable (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    subject VARCHAR(255) NOT NULL,
    code VARCHAR(50),
    instructor VARCHAR(255),
    classroom VARCHAR(50),
    day_of_week INT,
    start_time TIME,
    end_time TIME,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE (user_id, subject, day_of_week, start_time)
);

-- ============ EXAMS ============

CREATE TABLE IF NOT EXISTS exams (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    subject VARCHAR(255) NOT NULL,
    date DATE NOT NULL,
    time TIME,
    duration INT,
    room_number VARCHAR(50),
    seat_number VARCHAR(50),
    exam_type VARCHAR(50),
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ============ SCHEDULE / DEADLINES ============

CREATE TABLE IF NOT EXISTS schedule (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    task_name VARCHAR(255) NOT NULL,
    subject VARCHAR(255),
    due_date DATE NOT NULL,
    due_time TIME,
    priority VARCHAR(20),
    status VARCHAR(50),
    description TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    completed_at TIMESTAMP
);

-- ============ DEADLINES ============

CREATE TABLE IF NOT EXISTS deadlines (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    title VARCHAR(255) NOT NULL,
    subject VARCHAR(255),
    due_date DATE NOT NULL,
    due_time TIME,
    description TEXT,
    priority VARCHAR(20),
    completed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ============ NOTES ============

CREATE TABLE IF NOT EXISTS notes (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    subject VARCHAR(255),
    title VARCHAR(255) NOT NULL,
    content TEXT,
    tags JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ============ MOODS & EMOTIONAL STATE ============

CREATE TABLE IF NOT EXISTS moods (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    mood_label VARCHAR(50),
    energy_level INT,
    stress_level INT,
    focus_level INT,
    notes TEXT,
    timestamp TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW()
);

-- ============ POMODORO SESSIONS ============

CREATE TABLE IF NOT EXISTS pomodoro_sessions (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    subject VARCHAR(255),
    duration_minutes INT,
    breaks_taken INT,
    completed BOOLEAN DEFAULT FALSE,
    started_at TIMESTAMP,
    ended_at TIMESTAMP,
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- ============ STUDY STATS ============

CREATE TABLE IF NOT EXISTS stats (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL UNIQUE,
    study_hours_today NUMERIC(8, 2) DEFAULT 0,
    study_hours_week NUMERIC(8, 2) DEFAULT 0,
    study_hours_month NUMERIC(8, 2) DEFAULT 0,
    assignments_completed INT DEFAULT 0,
    exams_passed INT DEFAULT 0,
    average_gpa NUMERIC(3, 2) DEFAULT 0,
    streak_days INT DEFAULT 0,
    last_study_session TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ============ PREFERENCES ============

CREATE TABLE IF NOT EXISTS preferences (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL UNIQUE,
    theme VARCHAR(50),
    language VARCHAR(10),
    notifications_enabled BOOLEAN DEFAULT TRUE,
    email_reminders BOOLEAN DEFAULT FALSE,
    study_mode VARCHAR(50),
    settings JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ============ MEMORY SYSTEM ============

CREATE TABLE IF NOT EXISTS memory_working (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL UNIQUE,
    content JSONB,
    token_count INT DEFAULT 0,
    last_accessed TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS memory_short_term (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    content JSONB,
    summary TEXT,
    timestamp TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW(),
    lifetime_hours INT DEFAULT 24
);

CREATE TABLE IF NOT EXISTS memory_episodic (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    event_description TEXT,
    context JSONB,
    importance_score INT DEFAULT 5,
    timestamp TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS memory_semantic (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    knowledge_key VARCHAR(255) NOT NULL,
    knowledge_value JSONB,
    frequency INT DEFAULT 1,
    last_accessed TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE (user_id, knowledge_key)
);

CREATE TABLE IF NOT EXISTS memory_profile (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL UNIQUE,
    learning_style VARCHAR(50),
    study_preferences JSONB,
    goals JSONB,
    strengths TEXT[],
    weaknesses TEXT[],
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ============ QUIZ & ASSESSMENTS ============

CREATE TABLE IF NOT EXISTS quiz_attempts (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    quiz_id VARCHAR(255),
    score NUMERIC(3, 2),
    total_questions INT,
    correct_answers INT,
    time_taken_seconds INT,
    attempted_at TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW()
);

-- ============ LLM TRACES & DEBUGGING ============

CREATE TABLE IF NOT EXISTS llm_traces (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    conversation_id VARCHAR(255),
    request_type VARCHAR(100),
    model_used VARCHAR(255),
    provider VARCHAR(100),
    tokens_used INT,
    response_time_ms INT,
    success BOOLEAN DEFAULT TRUE,
    error_message TEXT,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

-- ============ INDEXES (PostgreSQL syntax — must be outside CREATE TABLE) ============

CREATE INDEX IF NOT EXISTS idx_auth_user        ON auth_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_user_conv   ON chat_messages(user_id, conversation_id);
CREATE INDEX IF NOT EXISTS idx_chat_timestamp   ON chat_messages(timestamp);
CREATE INDEX IF NOT EXISTS idx_profile_user     ON student_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_timetable_user   ON timetable(user_id);
CREATE INDEX IF NOT EXISTS idx_timetable_day    ON timetable(day_of_week);
CREATE INDEX IF NOT EXISTS idx_exams_user       ON exams(user_id);
CREATE INDEX IF NOT EXISTS idx_exams_date       ON exams(date);
CREATE INDEX IF NOT EXISTS idx_schedule_user    ON schedule(user_id, status);
CREATE INDEX IF NOT EXISTS idx_deadlines_user   ON deadlines(user_id);
CREATE INDEX IF NOT EXISTS idx_deadlines_date   ON deadlines(due_date);
CREATE INDEX IF NOT EXISTS idx_notes_user       ON notes(user_id);
CREATE INDEX IF NOT EXISTS idx_moods_user_time  ON moods(user_id, timestamp);
CREATE INDEX IF NOT EXISTS idx_pomodoro_user    ON pomodoro_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_stats_user       ON stats(user_id);
CREATE INDEX IF NOT EXISTS idx_memory_st_user   ON memory_short_term(user_id);
CREATE INDEX IF NOT EXISTS idx_memory_ep_user   ON memory_episodic(user_id, importance_score);
CREATE INDEX IF NOT EXISTS idx_memory_sem_user  ON memory_semantic(user_id);
CREATE INDEX IF NOT EXISTS idx_quiz_user        ON quiz_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_llm_user_time    ON llm_traces(user_id, created_at);

-- ============ END OF SCHEMA ============
