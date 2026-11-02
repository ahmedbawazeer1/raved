/** A short burst of confetti over the page (canvas, no library). Skipped when the student prefers less motion. */
export function confetti(count = 120): void {
  if (typeof window === "undefined" || window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
  const canvas = document.createElement("canvas");
  canvas.setAttribute("aria-hidden", "true");
  Object.assign(canvas.style, { position: "fixed", inset: "0", width: "100%", height: "100%", pointerEvents: "none", zIndex: "60" });
  document.body.appendChild(canvas);
  const w = (canvas.width = window.innerWidth * 2);
  const h = (canvas.height = window.innerHeight * 2);
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    canvas.remove();
    return;
  }
  const colors = ["#0E6E5C", "#F5A524", "#FF7A1A", "#4DABF7", "#9775FA", "#12B886", "#FA5252"];
  const parts = Array.from({ length: count }, () => ({
    x: w / 2 + (Math.random() - 0.5) * 200,
    y: h * 0.45,
    vx: (Math.random() - 0.5) * 34,
    vy: -Math.random() * 38 - 10,
    r: Math.random() * 6.28,
    vr: (Math.random() - 0.5) * 0.4,
    s: 12 + Math.random() * 14,
    c: colors[Math.floor(Math.random() * colors.length)],
    round: Math.random() < 0.3,
  }));
  let frame = 0;
  const tick = () => {
    ctx.clearRect(0, 0, w, h);
    for (const p of parts) {
      p.vy += 1;
      p.x += p.vx;
      p.y += p.vy;
      p.vx *= 0.985;
      p.r += p.vr;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.r);
      ctx.fillStyle = p.c;
      if (p.round) {
        ctx.beginPath();
        ctx.arc(0, 0, p.s / 3, 0, 6.28);
        ctx.fill();
      } else ctx.fillRect(-p.s / 2, -p.s / 4, p.s, (p.s / 2) * Math.abs(Math.cos(frame / 6 + p.r)));
      ctx.restore();
    }
    if (++frame < 130) requestAnimationFrame(tick);
    else canvas.remove();
  };
  requestAnimationFrame(tick);
}
