import { redirect } from "next/navigation";
import { Factory } from "lucide-react";
import { Empty, PageHead, Panel } from "@/components/console/ui";
import { requireStaff } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

/** «خط الإنتاج» in the menu: opens the line of the level the factory is working on now. */
export default async function LineShortcut() {
  await requireStaff();
  const supabase = await createClient();
  const [{ data: maps }, { data: units }, { data: levels }] = await Promise.all([
    supabase.from("curriculum_levels").select("level_id, status").eq("status", "approved"),
    supabase.from("curriculum_units").select("level_id, build_status"),
    supabase.from("levels").select("id, position, path_id, paths(position)"),
  ]);
  const order = (id: string) => {
    const l = (levels ?? []).find((x) => x.id === id);
    return ((l?.paths as unknown as { position: number } | null)?.position ?? 0) * 1000 + (l?.position ?? 0);
  };
  const approved = (maps ?? []).map((m) => m.level_id).sort((a, b) => order(a) - order(b));
  const busy = approved.find((id) => (units ?? []).some((u) => u.level_id === id && u.build_status !== "approved"));
  const target = busy ?? approved.at(-1);
  if (target) redirect(`/studio/levels/${target}?tab=line`);
  return (
    <div className="flex flex-col gap-5">
      <PageHead title="خط الإنتاج" />
      <Panel>
        <Empty icon={Factory} tone="gold" title="الخط فارغ">
          يبدأ بعد اعتماد أول خريطة مستوى. من الاستوديو افتح المستوى واطلب خريطته.
        </Empty>
      </Panel>
    </div>
  );
}
