"""Checks that every generated test has correct answers. Run: .venv/bin/python -m unittest test_ai"""
import os
import random
import re
import tempfile
import unittest

os.environ.pop("ANTHROPIC_API_KEY", None)
os.environ["DB_PATH"] = os.path.join(tempfile.mkdtemp(), "t.db")

import db  # noqa: E402
import exam_gen  # noqa: E402
import tutor  # noqa: E402

OPS = {"+": lambda a, b: a + b, "−": lambda a, b: a - b, "×": lambda a, b: a * b, "÷": lambda a, b: a // b}


class ExamTests(unittest.TestCase):
    def test_all_chapters_all_steps(self):
        for chapter in exam_gen.CHAPTERS:
            for grade in range(1, 5):
                for term in ("ht", "vt"):
                    for level in (1, 2, 3):
                        for seed in range(4):
                            e = exam_gen.build_exam(chapter, grade, term, level, table=random.Random(seed).randint(1, 10), seed=seed)
                            self.assertTrue(e["questions"])
                            for q in e["questions"]:
                                self.check(q)

    def check(self, q):
        if q["kind"] == "choice":
            self.assertIn(q["answer"], q["choices"])
            self.assertEqual(len(set(q["choices"])), len(q["choices"]))
            self.assertGreaterEqual(len(q["choices"]), 3)
            return
        ans = int(q["answer"])
        self.assertGreaterEqual(ans, 0)
        m = re.match(r"(\d+) ([+−×÷]) (\d+|\?) = (\?|\d+)", q["show"])
        if m:
            a, op, b, c = m.groups()
            if b == "?":
                self.assertEqual(int(a) * ans, int(c))
            else:
                self.assertEqual(OPS[op](int(a), int(b)), ans)
                if op == "÷":
                    self.assertEqual(int(a) % int(b), 0)
        else:
            self.assertEqual(q["pair"][0] * q["pair"][1], ans)

    def test_clock_phrase(self):
        self.assertEqual(exam_gen.phrase(3, 30), "halv fyra")
        self.assertEqual(exam_gen.phrase(12, 45), "kvart i ett")


class TutorTests(unittest.TestCase):
    def test_local_explainer(self):
        self.assertIn("56", tutor.chat([{"role": "user", "content": "vad är 7 × 8"}], {})["reply"])
        r = tutor.chat([{"role": "user", "content": "jag förstår inte"}], {"question": "45 + 38 = ?"})
        self.assertEqual(r["source"], "lokal")
        self.assertIn("83", r["reply"])
        self.assertIn("halv", tutor.chat([{"role": "user", "content": "vad betyder halv?"}], {})["reply"].lower())


class DbTests(unittest.TestCase):
    def test_roundtrip(self):
        db.init()
        e = exam_gen.build_exam("mul", 2, "ht", 2)
        db.save_exam(e)
        db.save_result(dict(examId=e["id"], chapter="mul", title=e["title"], score=9, total=12, seconds=200, answers=[]))
        self.assertEqual(db.history()[0]["score"], 9)


if __name__ == "__main__":
    unittest.main()
