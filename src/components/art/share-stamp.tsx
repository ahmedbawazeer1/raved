"use client";

import { useState } from "react";
import { Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ART_DEFS } from "@/lib/art/defs";

function stampSvg(name: string, position: number): string {
  // Fixed layout; the only text is the stop name from our own content.
  const safe = name.replace(/[<>&"]/g, "");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1350" viewBox="0 0 1080 1350"><defs>${ART_DEFS}</defs>
<rect width="1080" height="1350" fill="#0E6E5C"/><circle cx="900" cy="160" r="320" fill="#18A383" opacity=".5"/>
<rect x="190" y="210" width="700" height="860" rx="18" fill="#fff"/><rect x="225" y="245" width="630" height="790" rx="10" fill="url(#art-gold)"/>
<path d="M540 330C540 330 380 520 380 610a160 160 0 0 0 320 0C700 520 540 330 540 330Z" fill="#2E9BD6"/><ellipse cx="480" cy="600" rx="24" ry="44" fill="#fff" opacity=".55"/><text x="540" y="670" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-size="140" font-weight="800" fill="#fff">${position}</text>
<text x="540" y="850" text-anchor="middle" font-family="IBM Plex Sans Arabic, Tahoma, sans-serif" font-size="96" font-weight="700" fill="#12201D">${safe}</text>
<text x="540" y="940" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-size="40" font-weight="700" fill="#3A2400">UNIT ${position}</text>
<text x="540" y="1180" text-anchor="middle" font-family="IBM Plex Sans Arabic, Tahoma, sans-serif" font-size="58" font-weight="700" fill="#fff">أنهيت ${safe} في رحلة النهر</text>
<text x="540" y="1260" text-anchor="middle" font-family="IBM Plex Sans Arabic, Tahoma, sans-serif" font-size="44" fill="#FFE38F">رفد · منصة تعليمية مجانية</text></svg>`;
}

async function stampPng(name: string, position: number): Promise<Blob | null> {
  const url = URL.createObjectURL(new Blob([stampSvg(name, position)], { type: "image/svg+xml" }));
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    const canvas = document.createElement("canvas");
    canvas.width = 1080;
    canvas.height = 1350;
    canvas.getContext("2d")?.drawImage(img, 0, 0);
    return await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
  } catch {
    return null;
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Shares the stamp as an image (WhatsApp etc.), or downloads it when sharing is not available. */
export function ShareStamp({ name, position }: { name: string; position: number }) {
  const [busy, setBusy] = useState(false);
  const share = async () => {
    setBusy(true);
    const blob = await stampPng(name, position);
    setBusy(false);
    if (!blob) return;
    const file = new File([blob], `raved-${position}.png`, { type: "image/png" });
    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], text: `أنهيت ${name} في رحلة النهر على منصة رفد` }).catch(() => {});
      return;
    }
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = file.name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  };
  return (
    <Button type="button" variant="secondary" onClick={share} disabled={busy}>
      <Share2 className="size-4" aria-hidden="true" />
      {busy ? "جارٍ التجهيز…" : "شارك الطابع"}
    </Button>
  );
}
