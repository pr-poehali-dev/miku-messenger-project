CREATE TABLE IF NOT EXISTS miku_groups (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  avatar_url TEXT,
  owner_id INTEGER,
  invite_code VARCHAR(20) UNIQUE,
  is_public BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW()
);