import { BookA, BookOpen, ClipboardCheck, Headphones, Languages, Mic, PenLine, Repeat } from "lucide-react";

const ICONS = {
  vocab: Languages,
  grammar: BookA,
  listening: Headphones,
  reading: BookOpen,
  speaking: Mic,
  writing: PenLine,
  review: Repeat,
  quiz: ClipboardCheck,
} as const;

export function LessonIcon({ skill, className }: { skill: string; className?: string }) {
  const Icon = ICONS[skill as keyof typeof ICONS] ?? BookOpen;
  return <Icon className={className} aria-hidden="true" />;
}
