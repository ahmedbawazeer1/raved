# برومتات بناء المحتوى

استخدمها في جلسات Claude Code منفصلة عن جلسات البرمجة، على نفس المستودع. المحتوى يُحفظ في `content/<المسار>/units/` (مثل `content/english/units/A1-03.json`).

---

## 1. خريطة المنهج (مرة واحدة لكل مستويين)

```
Read CLAUDE.md, docs/PRD.md sections 3, 4 and 9.
Create content/english/curriculum-map.md for levels A1 (12 units) and A2 (16 units).
For each unit: code (A1-01 …), English title, topic from the daily life of a secondary student in Yemen (school, family, market, travel between cities, food, weather, mobile phones, community — respectful of local values), one grammar point, vocabulary domain (10–15 high-frequency words for the level), 2–3 CEFR can-do statements in Arabic, and the speaking + writing task idea.
Grammar must build progressively and match CEFR expectations. Then open a PR and summarise the map for me in Arabic in a short table.
```

لاحقاً كرر البرومت مع `B1 (20 units) and B2 (20 units)`.

---

## 2. بناء وحدة واحدة (جلسة لكل وحدة)

غيّر رمز الوحدة في السطر الأول فقط:

```
Unit to build: A1-01

Read CLAUDE.md, docs/PRD.md section 9, docs/OFFLINE.md (data saver), content/english/curriculum-map.md, content/schema/unit.schema.json and content/examples/A1-01.json.
Build content/english/units/<code>.json following the schema exactly:
- 7 lessons (vocab, grammar, listening, reading, speaking, writing, review/quiz).
- Every lesson must be fully understandable WITHOUT video. Grammar explanation in simple Modern Standard Arabic with English examples; exercises with Arabic explanations.
- Listening: write a short original dialogue/monologue in `text_en` (an audio block read by device TTS) + comprehension questions. Optionally add ONE short YouTube video (2–8 minutes, embeddable, from a well-known educational channel, English captions) as an optional block with approx_size_mb; if you cannot verify it, set needs_check: true.
- Original reading text at the unit level, set in Yemen when natural (names, cities, rial prices).
- 10–15 vocabulary items with Arabic meaning, IPA and example sentences.
- Speaking and writing tasks per schema.
- Unit quiz: 10 questions, exactly one correct answer each, each with an Arabic explanation.
- Never copy official exam questions or textbook content.
- Keep the package under 2MB.
Then run npm run content:check, fix all errors, open a PR, and tell me in Arabic: the unit summary, any needs_check videos, and what I should review.
```

---

## 3. تحسين وحدة من ملاحظات الطلاب أو المراجعة

```
Unit to improve: A1-03
Feedback (pasted from the admin unit review or reports):
<الصق الملاحظات هنا>

Read CLAUDE.md and content/english/units/A1-03.json. Improve what the feedback points to (clearer Arabic explanation, easier exercises, more local examples, replace broken videos), keep ids stable, bump "version", run npm run content:check, open a PR and explain the changes in Arabic.
```

---

## 4. خريطة منهج لمسار جديد (لاحقاً)

```
Read CLAUDE.md and docs/PRD.md section 3. Create content/web/curriculum-map.md for the path "أساسيات تطوير الويب": 3 levels (HTML, CSS, JavaScript basics), 8–10 units each, each with a can-do statement in Arabic, a mini project idea, and the key terms (used as the path's vocabulary). Lessons must work on a low-end phone and mostly offline. Summarise in Arabic.
```
