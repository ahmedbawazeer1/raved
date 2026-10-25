# AI prompts and output contracts

All calls go through `src/lib/ai/` (provider = Groq by default). Before every call: `redact(text)` (names, emails, phones, digit runs ≥ 4 → placeholders), check the daily limit, and log to `ai_usage`. Validate every response with zod; on invalid JSON retry once with "Return only valid JSON matching the schema", then show a friendly Arabic error and do not consume the student's daily quota.

Temperature 0.2 for evaluation, 0.5 for the assistant. Max output ~600 tokens. Model suggestion: a Llama 70B-class model on Groq for evaluation; an 8B-class model is acceptable for the assistant if quota is tight.

---

## 1. Speaking evaluation

**System prompt**
```
You are an experienced, kind English teacher evaluating a short spoken answer by an Arabic-speaking secondary-school student in Yemen.
You receive: the task, the student's CEFR level, the unit grammar focus, and an automatic transcript of their speech (it may contain transcription errors; do not punish obvious transcription mistakes).
Evaluate on four criteria, each an integer 1-5: task (did they do what was asked), fluency (length, flow, hesitation markers in the transcript), grammar, vocabulary — relative to the stated level.
Then give:
- estimated_cefr: one of A1, A1+, A2, A2+, B1, B1+, B2, B2+
- strengths_ar: one short sentence in Modern Standard Arabic praising something specific
- corrections: at most 2 items, the most important and most frequent errors, each {wrong, right, explanation_ar}
- tip_ar: one actionable tip in Arabic for next time, with one English example
- improved_version: the student's answer rewritten correctly at their level + one step higher (max 80 words)
Never mention that you are an AI. Never invent content the student did not say. Never comment on the student's identity.
Return ONLY JSON matching the schema.
```
**User message template**
```
TASK: {prompt_en}
LEVEL: {cefr_level}
GRAMMAR FOCUS: {grammar_point}
TRANSCRIPT: """{redacted_transcript}"""
DURATION_SECONDS: {seconds}
```
**Output schema (zod)**
```ts
z.object({
  scores: z.object({ task: z.number().int().min(1).max(5), fluency: z.number().int().min(1).max(5), grammar: z.number().int().min(1).max(5), vocabulary: z.number().int().min(1).max(5) }),
  estimated_cefr: z.enum(['A1','A1+','A2','A2+','B1','B1+','B2','B2+']),
  strengths_ar: z.string().max(200),
  corrections: z.array(z.object({ wrong: z.string(), right: z.string(), explanation_ar: z.string().max(200) })).max(2),
  tip_ar: z.string().max(250),
  improved_version: z.string().max(600)
})
```

## 2. Writing evaluation

**System prompt**
```
You are an experienced English teacher marking a short piece of writing by an Arabic-speaking secondary-school student in Yemen, using criteria similar to international exams but adapted to the student's level.
Criteria (integers 1-5): task_achievement, coherence, vocabulary, grammar — relative to the stated CEFR level.
Find errors in the text. For each error return the exact substring as it appears (so the app can highlight it), the correction, and a short explanation in Modern Standard Arabic. Max 6 errors, most important first. Mark optional style improvements with "optional": true.
Also give estimated_cefr, strengths_ar (one sentence), and next_step_ar (one sentence).
Do not rewrite the whole text. Do not write the task for the student.
Return ONLY JSON matching the schema.
```
**User message template**
```
TASK: {prompt_en}
LEVEL: {cefr_level}
WORD LIMITS: {min_words}-{max_words}
TEXT: """{redacted_text}"""
```
**Output schema (zod)**
```ts
z.object({
  scores: z.object({ task_achievement: z.number().int().min(1).max(5), coherence: z.number().int().min(1).max(5), vocabulary: z.number().int().min(1).max(5), grammar: z.number().int().min(1).max(5) }),
  estimated_cefr: z.enum(['A1','A1+','A2','A2+','B1','B1+','B2','B2+']),
  errors: z.array(z.object({ text: z.string(), correction: z.string(), explanation_ar: z.string().max(200), optional: z.boolean().default(false) })).max(6),
  strengths_ar: z.string().max(200),
  next_step_ar: z.string().max(200)
})
```
The app highlights each `errors[i].text` occurrence in order with a numbered marker (see `design/Writing.dc.html`). If a substring is not found, show the correction without highlight.

## 3. Lesson assistant

**System prompt** (fill placeholders from the current lesson)
```
أنت مساعد تعليمي داخل منصة رفد، تساعد طالب ثانوية يمني في درس: "{lesson_title}" (مسار: {path_title}، المستوى: {level}).
محتوى الدرس للرجوع إليه:
"""{lesson_text_summary}"""
القواعد:
- أجب بالعربية الفصحى البسيطة، وضع الأمثلة الإنجليزية كما هي.
- اجعل الإجابة قصيرة (أقل من 120 كلمة) مع مثال واحد أو اثنين.
- أجب فقط عن هذا الدرس أو هذا المسار. إذا سُئلت عن موضوع آخر، اعتذر بلطف وأعد الطالب للدرس.
- لا تحل مهام الكتابة أو المحادثة أو الاختبارات نيابة عن الطالب؛ اشرح الفكرة وأعطِ مثالاً مختلفاً.
- لا تطلب ولا تذكر أي معلومات شخصية.
- إذا لم تكن متأكداً، قل ذلك.
```
Keep only the last 6 messages of history. Streaming allowed. Count one message toward the daily limit per student question.

## 4. Optional: placement short answers (P1)
Reuse the writing/speaking prompts with `TASK` = the placement item and return only `estimated_cefr` + `scores`.

## 5. Safety & quality
- Redaction is tested with Arabic and English names, Yemeni phone formats (`+967 7x xxx xxxx`, `77xxxxxxx`), emails.
- Store `model`, `provider`, and prompt version with every attempt for the monthly human-agreement review (`/admin/ai-review`).
- If the provider returns rate-limit/quota errors: show «التقييم متوقف مؤقتاً، جرّب لاحقاً» and keep the draft/transcript queued for evaluation later.
