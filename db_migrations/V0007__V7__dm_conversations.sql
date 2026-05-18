CREATE TABLE IF NOT EXISTS miku_dm_conversations (
  id SERIAL PRIMARY KEY,
  user1_id INTEGER,
  user2_id INTEGER,
  user1_blocked BOOLEAN DEFAULT FALSE,
  user2_blocked BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user1_id, user2_id)
);