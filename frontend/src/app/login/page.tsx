"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

const BRAND_STATS = [
  { value: "2.4k", label: "Tasks tracked" },
  { value: "18", label: "Active teams" },
  { value: "94%", label: "On-time rate" },
];

const FULL_HEADLINE = "Every task, every team — in perfect sync.";

export default function LoginPage() {
  const router = useRouter();
  const { user, loading, login } = useAuth();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [typed, setTyped] = useState(FULL_HEADLINE);

  const heroRef = useRef<HTMLDivElement>(null);
  const markRef = useRef<HTMLDivElement>(null);
  const typeTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!loading && user) router.replace("/dashboard");
  }, [loading, user, router]);

  useEffect(() => {
    return () => {
      if (typeTimer.current) clearInterval(typeTimer.current);
    };
  }, []);

  function startTyping() {
    let i = 0;
    setTyped("");
    if (typeTimer.current) clearInterval(typeTimer.current);
    typeTimer.current = setInterval(() => {
      i++;
      setTyped(FULL_HEADLINE.slice(0, i));
      if (i >= FULL_HEADLINE.length && typeTimer.current) clearInterval(typeTimer.current);
    }, 55);
  }

  function onHeroMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    const hero = heroRef.current;
    if (!hero) return;
    const r = hero.getBoundingClientRect();
    const mx = ((e.clientX - r.left) / r.width) * 100;
    const my = ((e.clientY - r.top) / r.height) * 100;
    hero.style.setProperty("--mx", `${mx}%`);
    hero.style.setProperty("--my", `${my}%`);
    if (markRef.current) {
      const dx = ((e.clientX - r.left) / r.width - 0.5) * -22;
      const dy = ((e.clientY - r.top) / r.height - 0.5) * -18;
      markRef.current.style.transform = `translate(${dx}px, ${dy}px)`;
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(identifier, password, remember);
      router.replace("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign in failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-[1.05fr_0.95fr]" style={{ background: "#f4f7fb" }}>
      <div
        ref={heroRef}
        onMouseMove={onHeroMouseMove}
        className="hero-panel relative overflow-hidden text-white flex flex-col justify-between p-10 lg:p-14"
        style={{
          background: "radial-gradient(120% 120% at 15% 10%, #1e3a8a 0%, #152a63 45%, #0f1f45 100%)",
        }}
      >
        <div
          className="hero-spotlight absolute inset-0"
          style={{
            background: "radial-gradient(340px circle at var(--mx,50%) var(--my,50%), rgba(96,165,250,.35), transparent 65%)",
          }}
        />
        <div
          className="hero-grid absolute inset-0 pointer-events-none"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,.05) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.05) 1px,transparent 1px)",
            backgroundSize: "44px 44px",
          }}
        />
        <div
          className="hero-orb-a absolute rounded-full pointer-events-none"
          style={{
            width: 340,
            height: 340,
            top: -70,
            right: -60,
            background: "radial-gradient(circle,rgba(96,165,250,.45),transparent 68%)",
            filter: "blur(6px)",
          }}
        />
        <div
          className="hero-orb-b absolute rounded-full pointer-events-none"
          style={{
            width: 260,
            height: 260,
            bottom: -40,
            left: -40,
            background: "radial-gradient(circle,rgba(37,99,235,.4),transparent 70%)",
          }}
        />
        <div ref={markRef} className="hero-mark absolute pointer-events-none" style={{ right: -30, bottom: 40, width: 420, opacity: 0.07, transition: "transform .2s ease" }}>
          <Image src="/bjc-logo.png" alt="" aria-hidden width={420} height={420} style={{ filter: "brightness(0) invert(1)", width: "100%", height: "auto" }} />
        </div>

        <div className="hero-logo relative z-10 flex items-center gap-3.5 cursor-pointer" onMouseEnter={startTyping}>
          <div
            className="w-13 h-13 rounded-2xl flex items-center justify-center shadow-lg"
            style={{ width: 52, height: 52, background: "linear-gradient(135deg,#2563eb,#60a5fa)", boxShadow: "0 10px 26px rgba(37,99,235,.5)" }}
          >
            <svg width="30" height="30" viewBox="0 0 36 36" fill="none">
              <circle cx="18" cy="18" r="13" stroke="rgba(255,255,255,.28)" strokeWidth="3.4" />
              <circle className="hero-ring" cx="18" cy="18" r="13" stroke="#fff" strokeWidth="3.4" strokeLinecap="round" strokeDasharray="81.6" strokeDashoffset="26" transform="rotate(-90 18 18)" />
              <path d="M12.5 18.4l3.6 3.6 7-7.4" stroke="#fff" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            </svg>
          </div>
          <div>
            <div className="font-bold text-[22px] tracking-tight">BJC Trackline</div>
            <div className="font-mono text-[10.5px] tracking-[.14em] uppercase text-white/60 mt-0.5">Job Tracking System</div>
          </div>
        </div>

        <div className="relative z-10 max-w-[460px]">
          <div className="hero-in-1 font-mono text-[11px] tracking-[.2em] uppercase text-[#93c5fd] mb-5">Welcome back</div>
          <h1 className="hero-in-1 text-[40px] leading-[1.14] font-bold tracking-tight text-balance" style={{ minHeight: "2.28em" }}>
            {typed}
            {typed.length < FULL_HEADLINE.length && <span className="typing-caret">|</span>}
          </h1>
          <p className="hero-in-2 mt-5 text-[15px] leading-relaxed text-white/72">
            Assign work, track progress through review, and keep your whole organization moving from a single
            dashboard.
          </p>

          <div className="hero-in-3 flex gap-3.5 mt-10">
            {BRAND_STATS.map((s) => (
              <div
                key={s.label}
                className="flex-1 rounded-2xl px-4.5 py-4"
                style={{ background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.12)" }}
              >
                <div className="font-mono text-[26px] font-semibold text-white">{s.value}</div>
                <div className="text-[11.5px] text-white/62 mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="hero-in-4 relative z-10 flex items-center gap-2.5 text-xs text-white/50">
          <span>&copy; 2026 BJC Trackline</span>
          <span className="opacity-40">&bull;</span>
          <a href="#" className="text-white/65 hover:text-white/90">Privacy</a>
          <span className="opacity-40">&bull;</span>
          <a href="#" className="text-white/65 hover:text-white/90">Terms</a>
        </div>
      </div>

      <div className="flex items-center justify-center p-10">
        <div className="w-full max-w-[394px]">
          <div className="hero-in-1 mb-7">
            <h2 className="text-[27px] font-bold tracking-tight" style={{ color: "#10201d" }}>
              Sign in to your account
            </h2>
            <p className="mt-2 text-sm" style={{ color: "#5c6a67" }}>
              Sign in to your BJC Trackline account.
            </p>
          </div>

          <form onSubmit={onSubmit} className="hero-in-2 flex flex-col gap-4">
            <div>
              <label className="block text-[12.5px] font-semibold mb-1.5" style={{ color: "#3d4a47" }}>
                Username or email
              </label>
              <div className="lg-field flex items-center gap-2.5 h-[50px] px-4 rounded-xl border" style={{ borderColor: "#dde3ec", background: "#f8fafd" }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9aa6a2" strokeWidth="1.7" className="flex-none">
                  <path d="M20 21a8 8 0 1 0-16 0" />
                  <circle cx="12" cy="8" r="4" />
                </svg>
                <input
                  className="border-none outline-none bg-transparent text-[14.5px] w-full"
                  placeholder="you@company.com"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  autoComplete="username"
                  required
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-baseline mb-1.5">
                <label className="text-[12.5px] font-semibold" style={{ color: "#3d4a47" }}>Password</label>
                <a href="#" className="text-xs font-medium" style={{ color: "#2563eb" }}>Forgot password?</a>
              </div>
              <div className="lg-field flex items-center gap-2.5 h-[50px] px-4 rounded-xl border" style={{ borderColor: "#dde3ec", background: "#f8fafd" }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9aa6a2" strokeWidth="1.7" className="flex-none">
                  <rect x="4" y="11" width="16" height="10" rx="2" />
                  <path d="M8 11V7a4 4 0 0 1 8 0v4" />
                </svg>
                <input
                  className="border-none outline-none bg-transparent text-[14.5px] w-full"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label="Toggle password"
                  className="flex-none bg-transparent border-none cursor-pointer p-1"
                  style={{ color: "#9aa6a2" }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                    <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
                    {showPassword && <circle cx="12" cy="12" r="3" />}
                  </svg>
                </button>
              </div>
            </div>

            <label className="flex items-center gap-2 cursor-pointer select-none mt-0.5">
              <span
                onClick={() => setRemember((v) => !v)}
                className="w-[19px] h-[19px] rounded-md flex items-center justify-center flex-none"
                style={{ border: `1.5px solid ${remember ? "#2563eb" : "#c3ccda"}`, background: remember ? "#2563eb" : "#fff", transition: "border-color .15s ease, background .15s ease" }}
              >
                {remember && (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3">
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                )}
              </span>
              <span className="text-[13px]" style={{ color: "#3d4a47" }} onClick={() => setRemember((v) => !v)}>
                Keep me signed in
              </span>
            </label>

            {error && (
              <div className="text-sm rounded-lg px-3 py-2" style={{ background: "#fee2e2", color: "#b91c1c", border: "1px solid #fca5a5" }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="btn btn-primary h-[52px] mt-1.5 text-[15px] group"
              style={{ boxShadow: "0 8px 20px rgba(37,99,235,.32)" }}
            >
              {submitting ? "Signing in…" : "Sign in"}
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ transition: "transform .2s ease" }} className="group-hover:translate-x-1">
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </button>
          </form>

          <div className="hero-in-3 text-center mt-7 text-[13.5px]" style={{ color: "#5c6a67" }}>
            Don&apos;t have an account? <a href="#" className="font-semibold" style={{ color: "#2563eb" }}>Contact your admin</a>
          </div>
        </div>
      </div>
    </div>
  );
}
