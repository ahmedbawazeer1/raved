import { requireActiveStudent } from "@/lib/auth/session";
import { getPrimaryPath } from "@/lib/student/queries";
import { StudentNav } from "@/components/student/student-nav";
import { ArtDefs } from "@/components/art/art-defs";
import { Splash } from "@/components/student/splash";
import { OfflineBanner } from "@/components/student/offline-banner";

export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  const { userId } = await requireActiveStudent();
  const path = await getPrimaryPath(userId);
  return (
    <div className="flex min-h-dvh bg-background">
      <ArtDefs />
      <Splash />
      <StudentNav learnHref={path ? `/student/${path.slug}` : "/paths"} />
      <div className="flex min-w-0 flex-1 flex-col pb-[var(--bn)] md:pb-0">
        <OfflineBanner />
        {children}
      </div>
    </div>
  );
}
