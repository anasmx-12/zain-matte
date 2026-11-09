"""Sonic-AI: the dedicated AI server for Zain Matte.

    GET  /api/health          -> is the server up, is Claude connected
    POST /api/exam            -> a new AI-generated test for one chapter
    POST /api/exam/result     -> save a finished test (SQLite)
    GET  /api/exam/history    -> latest results for the grown-up page
    POST /api/chat            -> Sonic explains a question

It also serves the built web app from ../dist, so http://<this-computer>:8787 opens the whole app.
"""
import json
import mimetypes
import os
import sys
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlparse

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)


def load_env(path: str) -> None:
    if not os.path.exists(path):
        return
    for line in open(path, encoding="utf-8"):
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            k, v = line.split("=", 1)
            os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))


load_env(os.path.join(HERE, ".env"))

import db  # noqa: E402
import exam_gen  # noqa: E402
import tutor  # noqa: E402

DIST = os.path.realpath(os.path.join(HERE, "..", "dist"))
PORT = int(os.environ.get("PORT", "8787"))
MAX_BODY = 64 * 1024


class Handler(BaseHTTPRequestHandler):
    server_version = "SonicAI/1.0"

    def _send(self, code: int, body: bytes, ctype: str) -> None:
        self.send_response(code)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Private-Network", "true")
        self.end_headers()
        self.wfile.write(body)

    def _json(self, data, code: int = 200) -> None:
        self._send(code, json.dumps(data, ensure_ascii=False).encode("utf-8"), "application/json; charset=utf-8")

    def _body(self) -> dict:
        n = int(self.headers.get("Content-Length") or 0)
        if n > MAX_BODY:
            raise ValueError("för stor fråga")
        raw = self.rfile.read(n) if n else b"{}"
        data = json.loads(raw or b"{}")
        if not isinstance(data, dict):
            raise ValueError("fel format")
        return data

    def do_OPTIONS(self) -> None:
        self._send(204, b"", "text/plain")

    def do_GET(self) -> None:
        path = urlparse(self.path).path
        if path == "/api/health":
            return self._json(dict(ok=True, name="Sonic-AI", claude=tutor.claude_ready(), model=tutor.MODEL))
        if path == "/api/exam/history":
            return self._json(dict(results=db.history()))
        self._static(path)

    def do_POST(self) -> None:
        path = urlparse(self.path).path
        try:
            body = self._body()
        except Exception as e:
            return self._json(dict(error=str(e)), 400)
        try:
            if path == "/api/exam":
                exam = exam_gen.build_exam(str(body.get("chapter", "mix")), int(body.get("grade", 2)),
                                           str(body.get("term", "ht")), int(body.get("level", 2)), int(body.get("table", 0) or 0))
                if tutor.rewrite_stories(exam["questions"]):
                    exam["source"] = "python+claude"
                for q in exam["questions"]:
                    q.pop("pair", None)
                db.save_exam(exam)
                return self._json(exam)
            if path == "/api/exam/result":
                return self._json(dict(ok=True, id=db.save_result(body)))
            if path == "/api/chat":
                msgs = body.get("messages") or []
                out = tutor.chat(msgs if isinstance(msgs, list) else [], body.get("context") or {})
                last = next((m.get("content", "") for m in reversed(msgs) if isinstance(m, dict) and m.get("role") == "user"), "")
                db.log_chat(str(last), out["reply"], out["source"])
                return self._json(out)
        except Exception as e:
            print("Fel i", path, type(e).__name__, e)
            return self._json(dict(error="Något gick fel i AI:n."), 500)
        self._json(dict(error="finns inte"), 404)

    def _static(self, path: str) -> None:
        rel = path.lstrip("/") or "index.html"
        full = os.path.realpath(os.path.join(DIST, rel))
        if not full.startswith(DIST + os.sep) or not os.path.isfile(full):
            full = os.path.join(DIST, "index.html")
        if not os.path.isfile(full):
            return self._send(404, "Bygg appen först: npm run build".encode("utf-8"), "text/plain; charset=utf-8")
        with open(full, "rb") as f:
            self._send(200, f.read(), mimetypes.guess_type(full)[0] or "application/octet-stream")

    def log_message(self, fmt, *args) -> None:
        if "/api/" in (args[0] if args else ""):
            sys.stderr.write("%s %s\n" % (self.log_date_time_string(), fmt % args))


def main() -> None:
    db.init()
    srv = ThreadingHTTPServer(("0.0.0.0", PORT), Handler)
    print(f"Sonic-AI kör på http://localhost:{PORT}  (Claude: {'på, ' + tutor.MODEL if tutor.claude_ready() else 'av, lokal förklarare'})")
    try:
        srv.serve_forever()
    except KeyboardInterrupt:
        pass


if __name__ == "__main__":
    main()
