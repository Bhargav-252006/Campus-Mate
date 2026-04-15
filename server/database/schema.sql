-- Campus Mate PostgreSQL Schema
-- Replaces JSON file storage with proper relational database

-- ============ USERS & PROFILES ============
CREATE TABLE IF NOT EXISTS student_profiles (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(255),
  email VARCHAR(255),
  program VARCHAR(100),
  semester INTEGER,
  gpa DECIMAL(3,2),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============ TIMETABLE ============
CREATE TABLE IF NOT EXISTS timetable (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(50) NOT NULL,
  subject VARCHAR(100),
  code VARCHAR(20),
  instructor VARCHAR(100),
  classroom VARCHAR(50),
  day_of_week VARCHAR(10),
  start_time TIME,
  end_time TIME,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES student_profiles(user_id) ON DELETE CASCADE,
  UNIQUE(user_id, subject, day_of_week, start_time)
);

-- ============ EXAMS ============
CREATE TABLE IF NOT EXISTS exams (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(50) NOT NULL,
  subject VARCHAR(100),
  date DATE,
  time TIME,
  duration INTEGER,
  room_number VARCHAR(50),
  seat_number VARCHAR(20),
  exam_type VARCHAR(50),  -- midterm, final, quiz, etc.
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES student_profiles(user_id) ON DELETE CASCADE
);

-- ============ SCHEDULE (DEADLINES) ============
CREATE TABLE IF NOT EXISTS schedule (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(50) NOT NULL,
  task_name VARCHAR(255),
  subject VARCHAR(100),
  due_date DATE,
  due_time TIME,
  priority VARCHAR(20),  -- low, medium, high, critical
  status VARCHAR(50),  -- pending, in_progress, completed, overdue
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES student_profiles(user_id) ON DELETE CASCADE
);

-- ============ MOODS ============
CREATE TABLE IF NOT EXISTS moods (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(50) NOT NULL,
  mood_label VARCHAR(50),  -- happy, sad, stressed, tired, focused, etc.
  energy_level INTEGER,  -- 1-10
  stress_level INTEGER,  -- 1-10
  notes TEXT,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES student_profiles(user_id) ON DELETE CASCADE
);

-- ============ STATISTICS ============
CREATE TABLE IF NOT EXISTS stats (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(50) NOT NULL,
  study_hours_today DECIMAL(5,2),
  study_hours_week DECIMAL(5,2),
  study_hours_month DECIMAL(5,2),
  assignments_completed INTEGER,
  exams_passed INTEGER,
  average_gpa DECIMAL(3,2),
  streak_days INTEGER,
  last_study_session TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES student_profiles(user_id) ON DELETE CASCADE,
  UNIQUE(user_id)
);

-- ============ POMODORO SESSIONS ============
CREATE TABLE IF NOT EXISTS pomodoro_sessions (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(50) NOT NULL,
  subject VARCHAR(100),
  duration_minutes INTEGER,
  breaks_taken INTEGER,
  completed BOOLEAN DEFAULT FALSE,
  started_at TIMESTAMP,
  ended_at TIMESTAMP,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES student_profiles(user_id) ON DELETE CASCADE
);

-- ============ CHAT HISTORY ============
CREATE TABLE IF NOT EXISTS chat_messages (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(50) NOT NULL,
  conversation_id VARCHAR(50),
  role VARCHAR(20),  -- user, assistant, system
  content TEXT,
  agent_type VARCHAR(50),  -- which agent processed this
  tool_calls JSONB,  -- JSON array of tool calls made
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES student_profiles(user_id) ON DELETE CASCADE,
  INDEX idx_user_conversation (user_id, conversation_id, timestamp)
);

-- ============ MEMORY TIERS ============
CREATE TABLE IF NOT EXISTS memory_working (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(50) NOT NULL,
  content JSONB,  -- Current conversation context
  token_count INTEGER,
  last_accessed TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES student_profiles(user_id) ON DELETE CASCADE,
  UNIQUE(user_id)
);

CREATE TABLE IF NOT EXISTS memory_short_term (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(50) NOT NULL,
  content JSONB,  -- Recent interactions
  summary TEXT,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES student_profiles(user_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS memory_episodic (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(50) NOT NULL,
  event_description TEXT,
  context JSONB,
  importance_score INTEGER,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES student_profiles(user_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS memory_semantic (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(50) NOT NULL,
  knowledge_key VARCHAR(255),
  knowledge_value JSONB,
  frequency INTEGER,  -- how often referenced
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES student_profiles(user_id) ON DELETE CASCADE,
  UNIQUE(user_id, knowledge_key)
);

CREATE TABLE IF NOT EXISTS memory_profile (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(50) NOT NULL,
  learning_style VARCHAR(50),
  study_preferences JSONB,
  goals JSONB,
  strengths JSONB,
  weaknesses JSONB,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES student_profiles(user_id) ON DELETE CASCADE,
  UNIQUE(user_id)
);

-- ============ PREFERENCES ============
CREATE TABLE IF NOT EXISTS preferences (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(50) NOT NULL,
  theme VARCHAR(50),  -- light, dark, auto
  language VARCHAR(20),  -- en, es, fr, etc.
  notifications_enabled BOOLEAN DEFAULT TRUE,
  email_reminders BOOLEAN DEFAULT TRUE,
  study_mode VARCHAR(50),  -- focused, balanced, relaxed
  settings JSONB,  -- Additional settings as JSON
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES student_profiles(user_id) ON DELETE CASCADE,
  UNIQUE(user_id)
);

-- ============ NOTES ============
CREATE TABLE IF NOT EXISTS notes (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(50) NOT NULL,
  subject VARCHAR(100),
  title VARCHAR(255),
  content TEXT,
  tags TEXT[],  -- PostgreSQL array
  is_pinned BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES student_profiles(user_id) ON DELETE CASCADE
);

-- ============ SESSION TOKENS ============
CREATE TABLE IF NOT EXISTS auth_tokens (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(50) NOT NULL,
  token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES student_profiles(user_id) ON DELETE CASCADE
);

-- ============ INDEXES FOR PERFORMANCE ============
CREATE INDEX IF NOT EXISTS idx_timetable_user_day ON timetable(user_id, day_of_week);
CREATE INDEX IF NOT EXISTS idx_exams_user_date ON exams(user_id, date);
CREATE INDEX IF NOT EXISTS idx_schedule_user_status ON schedule(user_id, status);
CREATE INDEX IF NOT EXISTS idx_moods_user_timestamp ON moods(user_id, timestamp);
CREATE INDEX IF NOT EXISTS idx_chat_timestamp ON chat_messages(user_id, timestamp);
CREATE INDEX IF NOT EXISTS idx_auth_tokens_expire ON auth_tokens(expires_at);

-- ============ AUDIT LOG (Optional) ============
CREATE TABLE IF NOT EXISTS audit_log (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(50),
  action VARCHAR(50),
  entity_type VARCHAR(50),
  entity_id INTEGER,
  old_value JSONB,
  new_value JSONB,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON audit_log(timestamp);
