import Ajv2020, { type ErrorObject } from "ajv/dist/2020";
import schema from "../../../content/schema/unit.schema.json";
import type { PackageQuestion, UnitPackage } from "./types";

/** Package size limit without video (docs/OFFLINE.md). */
export const MAX_PACKAGE_BYTES = 2 * 1024 * 1024;

export interface ValidationIssue {
  level: "error" | "warning";
  path: string;
  message: string;
}

export interface ValidationResult {
  ok: boolean;
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
  sizeBytes: number;
  pkg?: UnitPackage;
}

const ajv = new Ajv2020({ allErrors: true, strict: false });
ajv.addFormat("uri", /^https?:\/\/\S+$/);
const validateSchema = ajv.compile(schema);

const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/;
const PLACEHOLDER_ID = /^(.)\1{10}$/; // e.g. AAAAAAAAAAA

function schemaMessage(e: ErrorObject): string {
  switch (e.keyword) {
    case "required":
      return `حقل مطلوب ناقص: ${(e.params as { missingProperty: string }).missingProperty}`;
    case "additionalProperties":
      return `حقل غير معروف: ${(e.params as { additionalProperty: string }).additionalProperty}`;
    case "type":
      return `نوع القيمة خطأ (المطلوب ${(e.params as { type: string }).type})`;
    case "enum":
      return `قيمة غير مسموحة. المسموح: ${((e.params as { allowedValues: unknown[] }).allowedValues ?? []).join("، ")}`;
    case "minItems":
      return `العناصر أقل من المطلوب (الحد الأدنى ${(e.params as { limit: number }).limit})`;
    case "maxItems":
      return `العناصر أكثر من المسموح (الحد الأعلى ${(e.params as { limit: number }).limit})`;
    case "minimum":
      return `القيمة أصغر من ${(e.params as { limit: number }).limit}`;
    case "maximum":
      return `القيمة أكبر من ${(e.params as { limit: number }).limit}`;
    case "minLength":
      return "النص أقصر من المطلوب";
    case "pattern":
      return `الصيغة غير صحيحة (${(e.params as { pattern: string }).pattern})`;
    case "format":
      return `صيغة غير صحيحة (${(e.params as { format: string }).format})`;
    default:
      return e.message ?? "قيمة غير صالحة";
  }
}

function checkQuestion(q: PackageQuestion, path: string, add: (level: ValidationIssue["level"], path: string, message: string) => void) {
  const options = q.options ?? [];
  if (q.kind === "mcq" || q.kind === "true_false") {
    if (options.length < 2) add("error", `${path}.options`, "سؤال الاختيار يحتاج خيارين على الأقل.");
    if (q.kind === "true_false" && options.length !== 2) add("error", `${path}.options`, "سؤال صح أو خطأ يحتاج خيارين بالضبط.");
    if (!Number.isInteger(q.answer) || (q.answer as number) < 0 || (q.answer as number) >= options.length) {
      add("error", `${path}.answer`, "الإجابة يجب أن تكون رقم خيار موجود (يبدأ العد من 0).");
    }
    const normalized = options.map((o) => o.trim().toLowerCase());
    if (new Set(normalized).size !== normalized.length) {
      add("error", `${path}.options`, "خياران متطابقان: يجب أن تكون إجابة صحيحة واحدة فقط.");
    }
  } else if (q.kind === "fill_blank") {
    if (typeof q.answer !== "string" || !q.answer.trim()) add("error", `${path}.answer`, "إجابة الفراغ يجب أن تكون نصاً غير فارغ.");
  } else if (q.kind === "order_words") {
    if (!Array.isArray(q.answer) || q.answer.length < 2 || q.answer.some((w) => typeof w !== "string" || !w.trim())) {
      add("error", `${path}.answer`, "ترتيب الكلمات يحتاج قائمة كلمات (كلمتان على الأقل).");
    }
  }
  if (!q.explanation_ar?.trim()) add("error", `${path}.explanation_ar`, "الشرح بالعربية مطلوب لكل سؤال.");
}

/** Validates a unit package against the JSON schema and the content rules. Messages are in Arabic. */
export function validateUnitPackage(input: unknown, opts: { fileName?: string } = {}): ValidationResult {
  const errors: ValidationIssue[] = [];
  const warnings: ValidationIssue[] = [];
  const add = (level: ValidationIssue["level"], path: string, message: string) =>
    (level === "error" ? errors : warnings).push({ level, path, message });
  const sizeBytes = new TextEncoder().encode(JSON.stringify(input)).length;

  if (!validateSchema(input)) {
    for (const e of validateSchema.errors ?? []) add("error", e.instancePath || "/", schemaMessage(e));
    return { ok: false, errors, warnings, sizeBytes };
  }
  const pkg = input as unknown as UnitPackage;

  if (opts.fileName && opts.fileName !== `${pkg.code}.json`) {
    add("error", "code", `اسم الملف يجب أن يكون ${pkg.code}.json`);
  }
  if (!pkg.code.startsWith(`${pkg.level}-`)) add("warning", "code", `رمز الوحدة لا يبدأ بالمستوى ${pkg.level}.`);
  if (Number(pkg.code.split("-")[1]) !== pkg.position) add("warning", "position", "ترتيب الوحدة لا يطابق رقمها في الرمز.");

  // Unique ids across the whole package.
  const ids = new Map<string, string>();
  const seen = (id: string, path: string) => {
    if (ids.has(id)) add("error", path, `المعرّف «${id}» مكرر (موجود أيضاً في ${ids.get(id)}).`);
    else ids.set(id, path);
  };
  pkg.vocab.forEach((v, i) => seen(v.id, `vocab[${i}]`));

  const positions = new Set<number>();
  pkg.lessons.forEach((lesson, li) => {
    const lp = `lessons[${li}]`;
    seen(lesson.id, lp);
    if (positions.has(lesson.position)) add("error", `${lp}.position`, `ترتيب الدرس ${lesson.position} مكرر.`);
    positions.add(lesson.position);

    const hasContent = lesson.blocks.some((b) => b.type !== "video");
    if (!hasContent) add("error", lp, "الدرس يجب أن يكون مفهوماً بدون فيديو: أضف شرحاً أو نصاً.");

    lesson.blocks.forEach((block, bi) => {
      const bp = `${lp}.blocks[${bi}]`;
      switch (block.type) {
        case "video":
          if (!block.youtube_id || !YOUTUBE_ID.test(block.youtube_id)) add("error", `${bp}.youtube_id`, "معرّف فيديو يوتيوب غير صالح (11 حرفاً).");
          else if (PLACEHOLDER_ID.test(block.youtube_id) || block.needs_check) add("warning", bp, "فيديو يحتاج تحققاً قبل النشر (needs_check).");
          if (block.optional !== true) add("error", `${bp}.optional`, "الفيديو يجب أن يكون اختيارياً (optional: true).");
          if (!block.approx_size_mb) add("warning", `${bp}.approx_size_mb`, "أضف حجم الفيديو التقريبي ليعرفه الطالب.");
          break;
        case "text":
          if (!block.markdown_ar?.trim()) add("error", `${bp}.markdown_ar`, "كتلة الشرح فارغة.");
          break;
        case "reading":
        case "audio":
          if (!block.text_en?.trim()) add("error", `${bp}.text_en`, "النص الإنجليزي مطلوب.");
          break;
        case "table":
          if (!block.headers?.length || !block.rows?.length) add("error", bp, "الجدول يحتاج عناوين وصفوفاً.");
          else if (block.rows.some((r) => r.length !== block.headers!.length)) add("error", bp, "عدد خانات كل صف يجب أن يساوي عدد العناوين.");
          break;
        case "game":
          if (!block.id) add("error", `${bp}.id`, "اللعبة تحتاج معرّفاً ثابتاً (مثل A1-01-g1).");
          else seen(block.id, bp);
          if (!block.game) add("error", `${bp}.game`, "اختر نوع اللعبة.");
          if (pkg.vocab.length < 4) add("warning", bp, "الألعاب تحتاج 4 كلمات على الأقل في الوحدة.");
          break;
        case "exercise":
          if (!block.exercise) add("error", `${bp}.exercise`, "كتلة التمرين بلا سؤال.");
          else {
            seen(block.exercise.id, `${bp}.exercise`);
            checkQuestion(block.exercise, `${bp}.exercise`, add);
          }
          break;
      }
    });
  });

  pkg.quiz.questions.forEach((q, qi) => {
    seen(q.id, `quiz.questions[${qi}]`);
    checkQuestion(q, `quiz.questions[${qi}]`, add);
  });
  if (pkg.quiz.questions.length < 10) add("warning", "quiz.questions", `الاختبار فيه ${pkg.quiz.questions.length} أسئلة، والمعتاد 10.`);
  if (pkg.lessons.length !== 7) add("warning", "lessons", `الوحدة فيها ${pkg.lessons.length} دروس، والمعتاد 7.`);

  if (sizeBytes > MAX_PACKAGE_BYTES) add("error", "/", `حجم الحزمة ${(sizeBytes / 1048576).toFixed(2)}MB أكبر من 2MB.`);

  return { ok: errors.length === 0, errors, warnings, sizeBytes, pkg };
}
