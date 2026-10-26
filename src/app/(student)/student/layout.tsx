import { requireActiveStudent } from "@/lib/auth/session";
import { getPrimaryPath } from "@/lib/student/queries";
import { StudentNav } from "@/components/student/student-nav";

export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  const { userId } = await requireActiveStudent();
  const path = await getPrimaryPath(userId);
  return (
    <div className="flex min-h-dvh bg-background">
      <StudentNav learnHref={path ? `/student/${path.slug}` : "/paths"} />
      <div className="flex min-w-0 flex-1 flex-col pb-[76px] md:pb-0">{children}</div>
    </div>
  );
}
