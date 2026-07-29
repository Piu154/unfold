import { useEffect, useRef } from "react";

/**
 * Animated "universe" backdrop: drifting stars + slow parallax nebula.
 * Purely decorative, respects reduced-motion, and never blocks pointer events.
 */
export function StarField({ density = 90 }: { density?: number }) {
  const ref = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0;
    let w = 0;
    let h = 0;

    type Star = { x: number; y: number; r: number; s: number; a: number; t: number };
    let stars: Star[] = [];

    const build = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = Math.round((w * h) / 16000) + density;
      stars = Array.from({ length: count }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        r: Math.random() * 1.35 + 0.25,
        s: Math.random() * 0.14 + 0.02,
        a: Math.random() * 0.6 + 0.2,
        t: Math.random() * Math.PI * 2,
      }));
    };

    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      for (const st of stars) {
        st.t += 0.02;
        st.y -= st.s;
        if (st.y < -2) st.y = h + 2;
        const twinkle = st.a * (0.65 + 0.35 * Math.sin(st.t));
        ctx.beginPath();
        ctx.arc(st.x, st.y, st.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${st.r > 1 ? "160,190,255" : "255,255,255"},${twinkle})`;
        ctx.fill();
      }
      raf = requestAnimationFrame(draw);
    };

    build();
    if (reduced) {
      ctx.clearRect(0, 0, w, h);
      for (const st of stars) {
        ctx.beginPath();
        ctx.arc(st.x, st.y, st.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${st.a})`;
        ctx.fill();
      }
    } else {
      raf = requestAnimationFrame(draw);
    }

    const onResize = () => build();
    window.addEventListener("resize", onResize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
    };
  }, [density]);

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <canvas ref={ref} className="h-full w-full opacity-70" />
      <div className="absolute -left-40 top-[-10%] h-[520px] w-[520px] rounded-full bg-violet/20 blur-[140px] animate-float" />
      <div
        className="absolute -right-32 top-[30%] h-[460px] w-[460px] rounded-full bg-gold/15 blur-[150px] animate-float"
        style={{ animationDelay: "2.5s" }}
      />
    </div>
  );
}
