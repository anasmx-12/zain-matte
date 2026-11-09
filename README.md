# Zain Matte

Mattespel för åk 1–4, byggt med TypeScript + Vite. Fungerar i webbläsaren på iPad, iPhone och dator.

## Kör
```
npm install
npm run dev      # utvecklingsserver, öppna länken (även från iPad på samma wifi)
npm run build    # bygger dist/index.html – en enda fil som kan öppnas direkt eller läggas upp på en webbserver
```

## Kod (src/)
- `main.ts` – start, profil, startsida, vuxensidan, navigering
- `round.ts` – omgångar, poäng, stjärnor, feedback
- `mul.ts`, `clock.ts`, `table.ts`, `column.ts` – övningstyperna
- `timer.ts` – 30 min matte låser upp 20 min spel
- `shop.ts`, `catalog.ts`, `room.ts` – butik och eget rum (dra och släpp)
- `game.ts` – belöningsspelet Stjärnfångaren
- `core.ts` – lagring, ljud, maskoten, hjälpfunktioner
- `heroes.ts` – Sonic, Shadow, Amy och Knuckles (SVG) och sakerna i Matte Dash
- `runner.ts`, `garage.ts` – springspelet Matte Dash och garaget där man köper för matte-stjärnor
- `exam.ts` – prov per kapitel utan stöd (AI-genererade)
- `chat.ts`, `ai.ts` – chatten "Fråga Sonic" med uppläsning, och anropen till Sonic-AI

## Sonic-AI (mappen ai/, Python)
```
./ai/start.sh    # bygger appen vid behov och startar AI:n på http://localhost:8787
```
- `exam_gen.py` gör prov, `tutor.py` förklarar i chatten, `db.py` + `schema.sql` sparar prov i SQLite.
- Lägg `ANTHROPIC_API_KEY=...` i `ai/.env` för att chatten ska svara fritt och skriva nya textuppgifter med Claude. Utan nyckel används en inbyggd förklarare.
- Öppna `http://<datorns-ip>:8787` på iPaden så hittar appen AI:n automatiskt.

Allt sparas i webbläsaren (localStorage).

## Publicera på GitHub Pages
Varje gång du pushar till `main` bygger GitHub appen och publicerar den automatiskt (`.github/workflows/deploy.yml`).

Första gången:
1. Skapa ett nytt tomt repo på github.com (t.ex. `zain-matte`).
2. Kör i den här mappen:
   ```
   git init -b main
   git add .
   git commit -m "Första versionen"
   git remote add origin https://github.com/DITT-NAMN/zain-matte.git
   git push -u origin main
   ```
3. På GitHub: **Settings → Pages → Source: GitHub Actions**.
4. Efter någon minut finns appen på `https://DITT-NAMN.github.io/zain-matte/`.

`node_modules/` och `dist/` laddas inte upp – de skapas automatiskt.
