"""Builds a test (prov) for one chapter. Python computes every answer, so they are always right.

The tutor module can afterwards rewrite word problems with Claude; the numbers and answers stay
the ones made here.
"""
import random
import uuid

from curriculum import CLK, MUL, step_of

CHAPTERS = {
    "mul": "Gångertabellen",
    "tab": "Tabellprov",
    "clock": "Klockan",
    "col": "Uppställning",
    "mix": "Blandat prov",
}

NUM = ["tolv", "ett", "två", "tre", "fyra", "fem", "sex", "sju", "åtta", "nio", "tio", "elva", "tolv"]
NAMES = ["Ella", "Omar", "Saga", "Noah", "Alva", "Liam", "Maja", "Elias", "Leo", "Selma", "Yusuf", "Ines"]
THINGS = [("påsar", "äpplen"), ("askar", "kritor"), ("burkar", "kulor"), ("ark", "klistermärken"), ("fat", "bullar"), ("lådor", "pennor")]


def wrap_h(h: int) -> int:
    return ((h - 1) % 12 + 12) % 12 + 1


def digital(h: int, m: int) -> str:
    return f"{wrap_h(h)}:{m:02d}"


def phrase(h: int, m: int) -> str:
    c, n = NUM[wrap_h(h)], NUM[wrap_h(h + 1)]
    p = {
        0: "klockan är " + c, 5: "fem över " + c, 10: "tio över " + c, 15: "kvart över " + c,
        20: "tio i halv " + n, 25: "fem i halv " + n, 30: "halv " + n, 35: "fem över halv " + n,
        40: "tio över halv " + n, 45: "kvart i " + n, 50: "tio i " + n, 55: "fem i " + n,
    }
    return p.get(m, digital(h, m))


def _id() -> str:
    return uuid.uuid4().hex[:10]


def number_q(topic: str, text: str, show: str, answer: int, story: str = "", pair=None) -> dict:
    q = dict(id=_id(), kind="number", topic=topic, text=text, show=show, story=story, answer=str(answer))
    if pair:
        q["pair"] = pair  # (a, b) for story rewriting
    return q


def choice_q(topic: str, text: str, show: str, answer: str, wrong: list, rng: random.Random, clock=None, story: str = "") -> dict:
    opts = [answer]
    for w in wrong:
        if w not in opts:
            opts.append(w)
        if len(opts) == 4:
            break
    rng.shuffle(opts)
    q = dict(id=_id(), kind="choice", topic=topic, text=text, show=show, story=story, answer=answer, choices=opts)
    if clock:
        q["clock"] = dict(h=clock[0], m=clock[1])
    return q


def mul_story(a: int, b: int, rng: random.Random) -> str:
    n = rng.choice(NAMES)
    if b == 4 and rng.random() < 0.3:
        return f"En hund har 4 ben. Hur många ben har {a} hundar?"
    box, thing = rng.choice(THINGS)
    return f"{n} har {a} {box}. I varje finns {b} {thing}. Hur många {thing} är det totalt?"


def mul_questions(s: int, n: int, rng: random.Random) -> list:
    st = MUL[s]
    pool = [(t, b) for t in st["t"] for b in range(1, st["max"] + 1)]
    picks = rng.sample(pool, n) if len(pool) >= n else [rng.choice(pool) for _ in range(n)]
    out = []
    for a, b in picks:
        r = rng.random()
        if st.get("two") and r < st["two"]:
            x, y = rng.randint(2, 9), 10 + rng.randint(1, 9)
            out.append(number_q("Tvåsiffrigt gånger ensiffrigt", f"Vad är {y} gånger {x}?", f"{y} × {x} = ?", x * y))
        elif st.get("tens") and r < st.get("two", 0) + st["tens"]:
            x, y = rng.randint(2, 9), rng.randint(2, 9) * 10
            out.append(number_q("Gånger med tiotal", f"Vad är {y} gånger {x}?", f"{y} × {x} = ?", x * y))
        elif s >= 4 and rng.random() < max(st.get("missing", 0), 0.2) and a > 1:
            out.append(number_q("Saknad faktor", f"{a} gånger vad blir {a * b}?", f"{a} × ? = {a * b}", b))
        elif s >= 2 and rng.random() < 0.25:
            story = mul_story(a, b, rng)
            out.append(number_q("Textuppgift med gånger", story, "", a * b, story=story, pair=(a, b)))
        else:
            if rng.random() < 0.5:
                a, b = b, a
            out.append(number_q("Gångertabellen", f"Vad är {a} gånger {b}?", f"{a} × {b} = ?", a * b))
    return out


def table_questions(t: int, n: int, rng: random.Random) -> list:
    t = max(1, min(10, int(t)))
    bs = list(range(1, 11))
    rng.shuffle(bs)
    out = []
    for i, b in enumerate(bs[:n]):
        if i % 4 == 3 and t > 1:
            out.append(number_q(f"{t}:ans tabell", f"{t} gånger vad blir {t * b}?", f"{t} × ? = {t * b}", b))
        elif rng.random() < 0.5:
            out.append(number_q(f"{t}:ans tabell", f"Vad är {b} gånger {t}?", f"{b} × {t} = ?", b * t))
        else:
            out.append(number_q(f"{t}:ans tabell", f"Vad är {t} gånger {b}?", f"{t} × {b} = ?", t * b))
    return out


def _near_times(h: int, m: int, step: int) -> list:
    cands = [(h, (m + step) % 60), (h, (m - step) % 60), (h + 1, m), (h - 1, m), (h, (m + 30) % 60), (m // 5 if m else 12, h * 5 % 60)]
    return [(wrap_h(a), b) for a, b in cands if not (wrap_h(a) == wrap_h(h) and b == m)]


def clock_questions(s: int, n: int, rng: random.Random) -> list:
    levels = [x for x in (s, s - 1, s - 2) if x >= 0]
    out = []
    for i in range(n):
        L = levels[0] if i < n * 0.6 or len(levels) == 1 else rng.choice(levels[1:])
        c = CLK[L]
        h = rng.randint(1, 12)
        m = rng.choice(c["mins"]) if c["mins"] else rng.randint(0, 59)
        if c["f"] == "24":
            part = rng.choice(["morgon", "eftermiddag", "eftermiddag", "kväll"])
            hh = rng.randint(6, 11) if part == "morgon" else rng.randint(1, 5) if part == "eftermiddag" else rng.randint(6, 10)
            H = hh if part == "morgon" else hh + 12
            f24 = lambda X, mm: f"{X % 24:02d}:{mm:02d}"
            pt = {"morgon": "på morgonen", "eftermiddag": "på eftermiddagen", "kväll": "på kvällen"}[part]
            text = f"Det är {pt}. Vad är klockan med 24-timmarsklockan?"
            wrong = [f24(H - 12 if H > 12 else H + 12, m), f24(H + 1, m), f24(H - 1, m), f24(H, (m + 5) % 60)]
            out.append(choice_q("24-timmarsklockan", text, "", f24(H, m), wrong, rng, clock=(hh, m), story=text))
        elif c["f"] == "diff":
            add = rng.choice([15, 30, 45, 60, 20] if m % 15 == 0 else [10, 15, 20, 30, 60])
            tot = h * 60 + m + add
            eh, em = wrap_h(tot // 60), tot % 60
            add_txt = "en timme" if add == 60 else f"{add} minuter"
            text = f"Klockan är {digital(h, m)}. Vad är klockan om {add_txt}?"
            wrong = [digital(eh, (em + 5) % 60), digital(eh + 1, em), digital(eh - 1, em), digital(h, (m + add) % 60)]
            out.append(choice_q("Hur lång tid?", text, "", digital(eh, em), wrong, rng, clock=(h, m), story=text))
        else:
            words = c["f"] == "w"
            label = (lambda a, b: phrase(a, b)) if words else (lambda a, b: digital(a, b))
            wrong = [label(a, b) for a, b in _near_times(h, m, 5 if m % 15 else 15)]
            out.append(choice_q(c["n"], "Vad är klockan?", "", label(h, m), wrong, rng, clock=(h, m)))
    return out


def _num(length: int, rng: random.Random) -> int:
    return rng.randint(10 ** (length - 1), 10 ** length - 1)


def col_gen(op: str, s: int, rng: random.Random):
    L = 2 if s <= 1 else 3 if s <= 5 else 4
    if op == "add":
        return _num(L, rng), _num(max(2, L - (1 if rng.random() < 0.4 else 0)), rng)
    if op == "sub":
        a, b = _num(L, rng), _num(max(2, L - (1 if rng.random() < 0.4 else 0)), rng)
        if b > a:
            a, b = b, a
        if a == b:
            a += 1
        return a, b
    if op == "mul":
        a = rng.randint(11, 49) if s <= 1 else rng.randint(12, 99) if s <= 3 else rng.randint(102, 999)
        return a, rng.randint(2, 5) if s <= 1 else rng.randint(2, 9)
    d = rng.randint(2, 5) if s <= 1 else rng.randint(2, 9)
    lo, hi = (10, 99) if s <= 1 else (20, 299) if s <= 3 else (100, 999) if s <= 6 else (300, 4999)
    q = rng.randint(max(2, -(-lo // d)), hi // d)
    return q * d, d


SYM = {"add": ("+", "plus"), "sub": ("−", "minus"), "mul": ("×", "gånger"), "div": ("÷", "delat med")}


def col_questions(s: int, n: int, rng: random.Random) -> list:
    ops = ["add", "sub", "mul", "div"]
    out = []
    for i in range(n):
        op = ops[i % 4] if i < 4 else rng.choice(ops)
        a, b = col_gen(op, s, rng)
        ans = {"add": a + b, "sub": a - b, "mul": a * b, "div": a // b}[op]
        sym, word = SYM[op]
        out.append(number_q("Uppställning: " + {"add": "addition", "sub": "subtraktion", "mul": "multiplikation", "div": "division"}[op],
                            f"Vad är {a} {word} {b}?", f"{a} {sym} {b} = ?", ans))
    rng.shuffle(out)
    return out


def build_exam(chapter: str, grade: int, term: str, level: int, table: int = 0, seed=None) -> dict:
    if chapter not in CHAPTERS:
        chapter = "mix"
    rng = random.Random(seed)
    s = step_of(grade, term, level)
    if chapter == "mul":
        qs = mul_questions(s, 12, rng)
    elif chapter == "tab":
        qs = table_questions(table or 2, 10, rng)
    elif chapter == "clock":
        qs = clock_questions(s, 10, rng)
    elif chapter == "col":
        qs = col_questions(s, 6, rng)
    else:
        qs = mul_questions(s, 5, rng) + clock_questions(s, 3, rng) + col_questions(s, 3, rng)
        rng.shuffle(qs)
    title = CHAPTERS[chapter] + (f": {table}:ans tabell" if chapter == "tab" else "")
    return dict(id=_id(), chapter=chapter, title=title, grade=grade, term=term, level=level, step=s, questions=qs, source="python")
