import { requireActiveStudent } from "@/lib/auth/session";

export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  await requireActiveStudent();
  return <div className="flex min-h-dvh flex-col bg-background">{children}</div>;
}
