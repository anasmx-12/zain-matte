"""The same 10-step curriculum as src/curriculum.ts, so exams match what the child practises.

Each (årskurs, termin, nivå) maps to one step 0..9 via step_of().
"""

MUL = [
    dict(n="Lika stora grupper", t=[2], max=5),
    dict(n="2:an och 10:an", t=[2, 10], max=5),
    dict(n="2:an, 5:an och 10:an", t=[2, 5, 10], max=10),
    dict(n="… och 3:an", t=[2, 3, 5, 10], max=10),
    dict(n="… och 1:an och 4:an", t=[1, 2, 3, 4, 5, 10], max=10, missing=0.1),
    dict(n="… och 6:an", t=[1, 2, 3, 4, 5, 6, 10], max=10, missing=0.15),
    dict(n="… och 7:an och 8:an", t=[1, 2, 3, 4, 5, 6, 7, 8, 10], max=10, missing=0.2),
    dict(n="Hela gångertabellen", t=list(range(1, 11)), max=10, missing=0.3),
    dict(n="Gånger med tiotal", t=list(range(1, 11)), max=10, missing=0.3, tens=0.35),
    dict(n="Tvåsiffrigt × ensiffrigt", t=list(range(1, 11)), max=10, missing=0.2, tens=0.25, two=0.35),
]

FIVES = list(range(0, 60, 5))
CLK = [
    dict(n="Hela timmar", mins=[0], f="w"),
    dict(n="Hel och halv timme", mins=[0, 30, 30], f="w"),
    dict(n="Halv och kvart över", mins=[30, 15, 15, 0], f="w"),
    dict(n="Kvart över och kvart i", mins=[15, 45, 45, 30], f="w"),
    dict(n="Fem och tio över och i", mins=[5, 10, 50, 55, 15, 45], f="w"),
    dict(n="Fem i halv, fem över halv", mins=[20, 25, 35, 40, 5, 55], f="w"),
    dict(n="Digital tid", mins=FIVES, f="d"),
    dict(n="Exakta minuter", mins=None, f="d"),
    dict(n="24-timmarsklockan", mins=FIVES, f="24"),
    dict(n="Hur lång tid?", mins=FIVES, f="diff"),
]


def step_of(grade: int, term: str, level: int) -> int:
    grade = max(1, min(4, int(grade)))
    level = max(1, min(3, int(level)))
    return min(9, (grade - 1) * 2 + (1 if term == "vt" else 0) + (level - 1))
