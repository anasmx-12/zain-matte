"""Sonic, the maths coach. Uses Claude when ANTHROPIC_API_KEY is set, otherwise a built-in explainer.

Both paths answer in simple Swedish for children aged 7-10.
"""
import json
import os
import re

MODEL = os.environ.get("AI_MODEL", "claude-haiku-5-5")

SYSTEM = """Du är Sonic, den snabba blå igelkotten, och en snäll och glad mattecoach i appen Zain Matte, för barn i årskurs 1–4 (7–10 år).

Så svarar du:
- Enkel svenska med korta meningar. Högst 6 meningar.
- Förklara steg för steg med saker barnet kan föreställa sig: äpplen, kulor, fingrar, klockans visare, pengar.
- Skriv vanlig text. Inga markdown-tecken som * eller #, inga tabeller. Siffror och tecknen + − × ÷ = går bra.
- Svaret läses upp högt, så skriv så att det låter bra när det läses.
- Var uppmuntrande. Det är bra att fråga! Avsluta gärna med en liten följdfråga som barnet kan testa själv.

Regler:
- Prata bara om matte och skolarbete. Om barnet frågar om något annat, säg vänligt att du är en mattecoach och att en vuxen kan hjälpa till med det.
- Fråga aldrig efter namn, adress, skola eller annan personlig information.
- Om barnet verkar ledset eller säger något oroande, säg att det är bra att prata med en vuxen de litar på."""


def _context_text(ctx: dict) -> str:
    if not ctx:
        return ""
    parts = []
    if ctx.get("grade"):
        parts.append(f"Barnet går i årskurs {ctx['grade']}.")
    if ctx.get("question"):
        parts.append(f"Uppgiften: {ctx['question']}")
    if ctx.get("childAnswer"):
        parts.append(f"Barnet svarade: {ctx['childAnswer']}")
    if ctx.get("correct"):
        parts.append(f"Rätt svar: {ctx['correct']}")
    return "\n".join(parts)


def _clean_messages(messages: list) -> list:
    out = []
    for m in messages[-12:]:
        role = m.get("role")
        text = str(m.get("content", "")).strip()[:800]
        if role not in ("user", "assistant") or not text:
            continue
        if out and out[-1]["role"] == role:
            out[-1]["content"] += "\n" + text
        else:
            out.append({"role": role, "content": text})
    while out and out[0]["role"] != "user":
        out.pop(0)
    return out


def _client():
    if not os.environ.get("ANTHROPIC_API_KEY"):
        return None
    try:
        import anthropic
        return anthropic.Anthropic(timeout=25.0, max_retries=1)
    except Exception:
        return None


def claude_ready() -> bool:
    return _client() is not None


def _strip_markdown(t: str) -> str:
    t = re.sub(r"[*#`_]+", "", t)
    return re.sub(r"\n{3,}", "\n\n", t).strip()


def chat(messages: list, ctx: dict) -> dict:
    msgs = _clean_messages(messages)
    if not msgs:
        return dict(reply="Hej! Skriv vad du undrar över, så förklarar jag.", source="lokal")
    client = _client()
    if client:
        try:
            system = SYSTEM + ("\n\nOm uppgiften barnet tittar på:\n" + _context_text(ctx) if ctx else "")
            r = client.messages.create(model=MODEL, max_tokens=450, system=system, messages=msgs)
            text = "".join(b.text for b in r.content if getattr(b, "type", "") == "text")
            if text.strip():
                return dict(reply=_strip_markdown(text), source="claude")
        except Exception as e:  # network down, bad key, ...: fall back to the built-in explainer
            print("Claude-fel, använder lokal förklaring:", type(e).__name__, e)
    return dict(reply=local_explain(msgs[-1]["content"], ctx), source="lokal")


# ---------- built-in explainer (works offline) ----------
OP_RE = re.compile(r"(\d+)\s*([+\-−×x*÷/:])\s*(\?|\d+)")


def _mul_text(a: int, b: int) -> str:
    if a <= 6 and b <= 12:
        return f"{a} × {b} betyder {a} grupper med {b} i varje. Lägg ihop dem: {' + '.join([str(b)] * a)} = {a * b}."
    if b <= 6:
        return f"{a} × {b} är samma som {b} × {a}. Det blir {' + '.join([str(a)] * b)} = {a * b}."
    if a >= 10:
        t, o = a // 10 * 10, a % 10
        return f"Dela upp {a} i {t} och {o}. {t} × {b} = {t * b} och {o} × {b} = {o * b}. Lägg ihop: {t * b} + {o * b} = {a * b}."
    return f"Tips: {a - 1} × {b} = {(a - 1) * b}. Lägg till en {b} till, så blir det {a * b}."


def local_explain(text: str, ctx: dict) -> str:
    question = str((ctx or {}).get("question", ""))
    m = OP_RE.search(text) or OP_RE.search(question)
    low = (text + " " + question).lower()
    if m and m.group(3) != "?":
        a, op, b = int(m.group(1)), m.group(2), int(m.group(3))
        if op in "×x*":
            return _mul_text(a, b) + " Testa själv: vad är " + f"{a} × {b + 1}? Det är {a} mer!"
        if op == "+":
            if a >= 10 or b >= 10:
                return (f"Dela upp talen i tiotal och ental. Tiotalen: {a // 10 * 10} + {b // 10 * 10} = {a // 10 * 10 + b // 10 * 10}. "
                        f"Entalen: {a % 10} + {b % 10} = {a % 10 + b % 10}. Lägg ihop allt: {a + b}.")
            return f"Börja på {max(a, b)} och räkna uppåt {min(a, b)} steg. Då landar du på {a + b}."
        if op in "-−":
            return (f"{a} − {b} betyder: hur mycket är kvar om du tar bort {b} från {a}? "
                    f"Du kan också räkna uppåt från {b} till {a}. Det är {a - b} steg, så svaret är {a - b}.")
        if op in "÷/:" and b:
            return (f"{a} ÷ {b} betyder: om du delar {a} saker lika i {b} högar, hur många blir det i varje? "
                    f"Tänk på gångertabellen: {b} × ? = {a}. Eftersom {b} × {a // b} = {b * (a // b)} blir svaret {a // b}"
                    + (f" och {a % b} blir över." if a % b else "."))
    if m and m.group(3) == "?":
        a = int(m.group(1))
        return f"Här saknas ett tal. Gå igenom {a}:ans tabell: {a}, {a * 2}, {a * 3} … Räkna hur många steg det tar att nå talet efter likhetstecknet."
    if "halv" in low:
        return "Halv betyder halvvägs till nästa timme. När stora visaren pekar på 6 är det halv. Halv fyra är alltså klockan 3:30."
    if "kvart" in low:
        return "En kvart är 15 minuter. Kvart över betyder att stora visaren pekar på 3. Kvart i betyder att den pekar på 9, och då är det snart nästa timme."
    if "klock" in low or "visare" in low or re.search(r"\d{1,2}:\d{2}", low):
        return ("Lilla visaren visar timmen och stora visaren visar minuterna. Varje siffra som stora visaren pekar på är 5 minuter. "
                "Pekar den på 4 är det 4 × 5 = 20 minuter.")
    if "gånger" in low or "multipl" in low:
        return "Gånger är ett snabbt sätt att räkna plus många gånger. 3 × 4 är 4 + 4 + 4 = 12. Vilket gångertal vill du att jag förklarar?"
    return ("Det där kan jag hjälpa dig med! Skriv uppgiften med siffror, till exempel 7 × 8 eller 45 + 38, "
            "så förklarar jag steg för steg.")


# ---------- AI word problems for exams ----------
def rewrite_stories(questions: list) -> int:
    """Let Claude write fresh word problems for the story questions. Returns how many were changed.

    Each new text must contain both numbers and must not give away the answer; otherwise the
    Python-made story is kept.
    """
    todo = [q for q in questions if q.get("pair")]
    client = _client()
    if not todo or not client:
        return 0
    pairs = [q["pair"] for q in todo]
    prompt = ("Skriv en kort, rolig textuppgift på svenska för barn 7–10 år för varje talpar nedan. "
              "Uppgiften ska lösas med a gånger b. Använd båda talen skrivna med siffror. Skriv inte svaret. "
              "Max 2 meningar, sluta med en fråga. Svara bara med en JSON-lista med strängar, i samma ordning.\n"
              + json.dumps([{"a": a, "b": b} for a, b in pairs]))
    try:
        r = client.messages.create(model=MODEL, max_tokens=800, messages=[{"role": "user", "content": prompt}])
        text = "".join(b.text for b in r.content if getattr(b, "type", "") == "text")
        stories = json.loads(text[text.index("["): text.rindex("]") + 1])
    except Exception as e:
        print("Kunde inte skriva textuppgifter med Claude:", type(e).__name__, e)
        return 0
    changed = 0
    for q, s in zip(todo, stories):
        a, b = q["pair"]
        if not isinstance(s, str) or len(s) > 240 or not s.strip().endswith("?"):
            continue
        nums = set(re.findall(r"\d+", s))
        if str(a) not in nums or str(b) not in nums or (str(a * b) in nums and a * b not in (a, b)):
            continue
        q["story"] = q["text"] = s.strip()
        changed += 1
    return changed
