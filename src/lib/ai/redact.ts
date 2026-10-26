/**
 * Removes personal data from student text before any AI call (CLAUDE.md privacy rules).
 * Emails, phone numbers, runs of 4+ digits and names (the student's own, and names the
 * text introduces: "my name is …", «اسمي …») become placeholders. Unit tested.
 */
export const PLACEHOLDERS = { name: "[NAME]", email: "[EMAIL]", phone: "[PHONE]", number: "[NUMBER]", link: "[LINK]" } as const;

const EMAIL = /[\p{L}\p{N}._%+-]+@[\p{L}\p{N}.-]+\.[\p{L}]{2,}/gu;
const LINK = /\bhttps?:\/\/\S+|\bwww\.\S+/giu;
// Yemen: +967 / 00967 / 967 then 7x xxx xxxx (mobile) or landlines; spaces, dots or dashes between groups.
const YEMEN_PHONE = /(?:\+|00)?967[\s.-]*\d(?:[\s.-]*\d){7,8}\b|\b7[01378](?:[\s.-]*\d){7}\b/g;
// Any other phone-looking sequence: + then 8–15 digits with separators.
const INTL_PHONE = /\+\d(?:[\s.-]*\d){7,14}/g;
// Arabic-Indic digits count as digits too.
const DIGIT_RUN = /[\d٠-٩۰-۹](?:[\s.-]?[\d٠-٩۰-۹]){3,}/g;

// A Latin-script name starts with a capital letter.
const NAME_WORD = "[\\p{Lu}][\\p{L}'’-]*";
// Only the first letter of an intro may be capitalised; names must be (no "i" flag, so
// "My name is Ali and …" stops before "and").
const INTROS = ["my name is", "my name's", "i am called", "i'm called", "call me", "my (?:father|mother|brother|sister|friend|teacher|cousin)(?:'s name)? is"];
const INTRO_EN = new RegExp(
  `(?<![\\p{L}])(${INTROS.map((p) => `[${p[0]}${p[0].toUpperCase()}]${p.slice(1)}`).join("|")})\\s+(${NAME_WORD}(?:\\s+${NAME_WORD}){0,2})`,
  "gu",
);
// Arabic has no capitals: take the first name and the father's name (two words).
const INTRO_AR = /(اسمي|أنا اسمي|انا اسمي|يُدعى|يدعى|تُدعى|تدعى|اسمه|اسمها)\s+([ء-ي]+(?:\s+[ء-ي]+)?)/gu;

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export interface RedactOptions {
  /** Names known to belong to the student (full name and its parts). */
  knownNames?: (string | null | undefined)[];
}

export function redact(input: string, options: RedactOptions = {}): string {
  let text = input;
  text = text.replace(EMAIL, PLACEHOLDERS.email);
  text = text.replace(LINK, PLACEHOLDERS.link);
  text = text.replace(YEMEN_PHONE, PLACEHOLDERS.phone);
  text = text.replace(INTL_PHONE, PLACEHOLDERS.phone);
  text = text.replace(DIGIT_RUN, PLACEHOLDERS.number);

  // The student's own names, in Arabic or Latin letters, as whole words.
  const parts = (options.knownNames ?? [])
    .flatMap((n) => (n ?? "").split(/\s+/))
    .map((p) => p.trim())
    .filter((p) => p.length >= 2);
  for (const part of [...new Set(parts)].sort((a, b) => b.length - a.length)) {
    text = text.replace(new RegExp(`(?<![\\p{L}])${escapeRegExp(part)}(?![\\p{L}])`, "giu"), PLACEHOLDERS.name);
  }

  text = text.replace(INTRO_EN, (_m, intro: string) => `${intro} ${PLACEHOLDERS.name}`);
  text = text.replace(INTRO_AR, (_m, intro: string) => `${intro} ${PLACEHOLDERS.name}`);
  return text;
}
