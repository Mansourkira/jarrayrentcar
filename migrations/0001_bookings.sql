CREATE TABLE IF NOT EXISTS bookings (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  ref         TEXT NOT NULL UNIQUE,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  status      TEXT NOT NULL DEFAULT 'new',      -- new | confirmed | cancelled
  car_id      TEXT NOT NULL,
  car_name    TEXT NOT NULL,
  pickup_loc  TEXT NOT NULL,
  pickup_at   TEXT NOT NULL,
  return_loc  TEXT NOT NULL,
  return_at   TEXT NOT NULL,
  days        INTEGER NOT NULL,
  total       INTEGER NOT NULL,
  name        TEXT NOT NULL,
  phone       TEXT NOT NULL,
  email       TEXT,
  notes       TEXT,
  source      TEXT,
  lang        TEXT
);
CREATE INDEX IF NOT EXISTS idx_bookings_created ON bookings (created_at DESC);
