"use client";

import { useEffect } from "react";
import { confetti } from "@/lib/confetti";
import { fx } from "@/lib/fx";

/** Confetti and a sound once per event id (e.g. a passed quiz attempt). */
export function Celebrate({ id }: { id: string }) {
  useEffect(() => {
    const key = `raved:celebrated:${id}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
    } catch {
      // storage unavailable: celebrate anyway
    }
    confetti(160);
    fx("coin");
  }, [id]);
  return null;
}
