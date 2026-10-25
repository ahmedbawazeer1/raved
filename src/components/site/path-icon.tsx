import { BookOpen, Code, Database, PenTool, type LucideProps } from "lucide-react";
import type { PathIcon as PathIconName } from "@/lib/paths/catalog";

const icons = { book: BookOpen, code: Code, database: Database, pen: PenTool } as const;

export function PathIcon({ name, ...props }: { name: PathIconName } & LucideProps) {
  const Icon = icons[name];
  return <Icon aria-hidden="true" {...props} />;
}
