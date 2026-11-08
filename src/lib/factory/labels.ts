/** Arabic labels for the content studio. */
export const MAP_STATUS: Record<string, { label: string; tone: "success" | "warning" | "muted" | "info" | "ai" }> = {
  none: { label: "لم يُخطط", tone: "muted" },
  draft: { label: "مسودة", tone: "muted" },
  planning: { label: "الوكيل يخطط", tone: "ai" },
  review: { label: "بانتظار المراجعة", tone: "warning" },
  approved: { label: "معتمدة", tone: "success" },
};

export const BUILD_STATUS: Record<string, { label: string; tone: "success" | "warning" | "muted" | "info" | "ai" | "destructive" }> = {
  planned: { label: "مخططة", tone: "muted" },
  building: { label: "يبنيها المصنع", tone: "ai" },
  review: { label: "بانتظار المراجعة", tone: "warning" },
  approved: { label: "منشورة", tone: "success" },
  failed: { label: "تعثر البناء", tone: "destructive" },
};
