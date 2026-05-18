CREATE TABLE IF NOT EXISTS miku_group_members (
  id SERIAL PRIMARY KEY,
  group_id INTEGER,
  user_id INTEGER,
  role VARCHAR(20) DEFAULT 'member',
  joined_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(group_id, user_id)
);