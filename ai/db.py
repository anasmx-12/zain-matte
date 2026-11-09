"""SQLite storage for exams, results and the chat log (zain_matte.db next to this file)."""
import json
import os
import sqlite3
import threading

HERE = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.environ.get("DB_PATH", os.path.join(HERE, "zain_matte.db"))
_lock = threading.Lock()


def _conn() -> sqlite3.Connection:
    c = sqlite3.connect(DB_PATH)
    c.row_factory = sqlite3.Row
    return c


def init() -> None:
    with open(os.path.join(HERE, "schema.sql"), encoding="utf-8") as f, _lock, _conn() as c:
        c.executescript(f.read())


def save_exam(e: dict) -> None:
    with _lock, _conn() as c:
        c.execute("INSERT OR REPLACE INTO exams (id, chapter, title, grade, term, level, source, questions) VALUES (?,?,?,?,?,?,?,?)",
                  (e["id"], e["chapter"], e["title"], e.get("grade"), e.get("term"), e.get("level"), e["source"], json.dumps(e["questions"], ensure_ascii=False)))


def save_result(r: dict) -> int:
    with _lock, _conn() as c:
        cur = c.execute("INSERT INTO exam_results (exam_id, chapter, title, score, total, seconds, answers) VALUES (?,?,?,?,?,?,?)",
                        (str(r.get("examId", ""))[:40], str(r.get("chapter", ""))[:20], str(r.get("title", ""))[:80],
                         int(r.get("score", 0)), int(r.get("total", 0)), int(r.get("seconds", 0)),
                         json.dumps(r.get("answers", [])[:50], ensure_ascii=False)))
        return cur.lastrowid


def history(limit: int = 30) -> list:
    with _lock, _conn() as c:
        rows = c.execute("SELECT finished_at, chapter, title, score, total, seconds FROM exam_results ORDER BY id DESC LIMIT ?", (limit,))
        return [dict(r) for r in rows]


def log_chat(question: str, reply: str, source: str) -> None:
    with _lock, _conn() as c:
        c.execute("INSERT INTO chat_log (question, reply, source) VALUES (?,?,?)", (question[:800], reply[:2000], source))
