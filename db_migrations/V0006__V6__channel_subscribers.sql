CREATE TABLE IF NOT EXISTS miku_channel_subscribers (
  id SERIAL PRIMARY KEY,
  channel_id INTEGER,
  user_id INTEGER,
  joined_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(channel_id, user_id)
);