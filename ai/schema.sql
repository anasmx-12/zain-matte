-- Zain Matte: what the AI server remembers (SQLite).

CREATE TABLE IF NOT EXISTS exams (
  id          TEXT PRIMARY KEY,
  created_at  TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
  chapter     TEXT NOT NULL,
  title       TEXT NOT NULL,
  grade       INTEGER,
  term        TEXT,
  level       INTEGER,
  source      TEXT NOT NULL,          -- 'python' or 'python+claude'
  questions   TEXT NOT NULL           -- JSON
);

CREATE TABLE IF NOT EXISTS exam_results (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  exam_id      TEXT NOT NULL,
  finished_at  TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
  chapter      TEXT NOT NULL,
  title        TEXT NOT NULL,
  score        INTEGER NOT NULL,
  total        INTEGER NOT NULL,
  seconds      INTEGER NOT NULL,
  answers      TEXT NOT NULL          -- JSON: [{id, given, ok}]
);
CREATE INDEX IF NOT EXISTS exam_results_time ON exam_results (finished_at DESC);

CREATE TABLE IF NOT EXISTS chat_log (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  at        TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
  question  TEXT NOT NULL,
  reply     TEXT NOT NULL,
  source    TEXT NOT NULL             -- 'claude' or 'lokal'
);
