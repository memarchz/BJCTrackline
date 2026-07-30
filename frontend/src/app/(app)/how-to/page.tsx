"use client";

import { useState } from "react";

const STEPS = [
  { n: 1, title: "Create & assign a task", body: "Open a team and hit New Task. Set the title, team, assignees, priority, impact, and due date — add subtasks with their own owners.", bg: "#fef3c7", fg: "#b45309", icon: "M12 5v14M5 12h14" },
  { n: 2, title: "Start work & upload", body: "Assignees read the brief in the task drawer, mark it started, then upload their deliverable and submit it for review.", bg: "#e0f2fe", fg: "#0284c7", icon: "M12 7v5l3 2" },
  { n: 3, title: "Review & decide", body: "Reviewers see submitted work in Pending Review — approve to complete it, or reject with a comment to send it back for rework.", bg: "#ede9fe", fg: "#7c3aed", icon: "M5 12l4 4 10-10" },
  { n: 4, title: "Track performance", body: "Watch progress on the Dashboard, Calendar, and Team Performance — pin key tasks with the star to keep them front and center.", bg: "#dcfce7", fg: "#15803d", icon: "M4 19V5m5 14V9m5 10V4m5 15v-8" },
];

const FAQS = [
  { q: "How do I pin a task so it's easy to find?", a: "Tap the star icon on any task row in Current Tasks or Pending Review. Pinned tasks collect on the Starred page and show a live count in the sidebar." },
  { q: "What happens when I reject a submission?", a: "The task returns to the assignee with your comment attached and a red Rejected badge, so they know exactly what to fix before resubmitting." },
  { q: "Who can create teams and manage members?", a: "Admins manage everything under Manage Users — add or remove teams, move members between them, and create user accounts with passwords." },
  { q: "How is the TOR request lifecycle tracked?", a: "Each request moves through TOR, Bidding, PTA, PR, PO, and Completed. The TOR Request page shows a progress bar and stepper for every project." },
];

const LINKS = [
  { label: "Keyboard shortcuts", icon: "M4 7h16v10H4zM8 11h.01M12 11h.01M16 11h.01M8 15h8" },
  { label: "Release notes", icon: "M8 3h8l3 3v15H5V3zM9 11h6M9 15h6" },
  { label: "Privacy & data policy", icon: "M12 3l8 4v5c0 5-3.5 8-8 9-4.5-1-8-4-8-9V7z" },
];

export default function HowToPage() {
  const [openFaq, setOpenFaq] = useState(0);

  return (
    <div className="flex flex-col gap-6.5" style={{ maxWidth: 1120 }}>
      <div className="relative overflow-hidden rounded-[22px] text-white p-9" style={{ background: "radial-gradient(120% 140% at 12% 0%,#1e3a8a,#152a63 55%,#0f1f45)" }}>
        <div
          className="ht-grid absolute inset-0 pointer-events-none"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,.06) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.06) 1px,transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />
        <div
          className="ht-orb absolute rounded-full pointer-events-none"
          style={{ width: 280, height: 280, top: -90, right: -40, background: "radial-gradient(circle,rgba(96,165,250,.4),transparent 68%)" }}
        />
        <div className="relative z-10" style={{ maxWidth: 620 }}>
          <div className="font-mono uppercase mb-3.5" style={{ fontSize: 11, letterSpacing: ".2em", color: "#93c5fd" }}>Support · How to use</div>
          <h1 className="m-0 font-bold text-[34px] tracking-tight leading-tight">Get up and running with BJC Trackline</h1>
          <p className="mt-3.5 text-[15px] leading-relaxed" style={{ color: "rgba(255,255,255,.74)" }}>
            A quick guide to assigning work, tracking it through review, and keeping every team in sync — plus answers to common questions.
          </p>
        </div>
      </div>

      <div>
        <div className="font-bold text-[17px] mb-1">Getting started in 4 steps</div>
        <div className="text-[13px] mb-4.5" style={{ color: "#8a968f" }}>Follow the flow from creating a task to completion.</div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {STEPS.map((s) => (
            <div key={s.n} className="ht-step rounded-2xl bg-white border flex gap-4 p-5.5" style={{ borderColor: "#e3e8ef" }}>
              <div className="ht-num w-[46px] h-[46px] flex-none rounded-[13px] flex items-center justify-center" style={{ background: s.bg, color: s.fg }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}><path d={s.icon} /></svg>
              </div>
              <div className="min-w-0">
                <div className="font-mono text-[11px] font-semibold mb-1.5" style={{ color: s.fg }}>STEP {s.n}</div>
                <div className="font-bold text-[15.5px] mb-1.5">{s.title}</div>
                <div className="text-[13px] leading-relaxed" style={{ color: "#5c6a67" }}>{s.body}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-4">
        <div className="rounded-2xl bg-white border overflow-hidden" style={{ borderColor: "#e3e8ef" }}>
          <div className="px-5.5 py-4.5 border-b font-bold text-base" style={{ borderColor: "#f0f3f2" }}>Frequently asked questions</div>
          <div>
            {FAQS.map((f, i) => (
              <div key={f.q} onClick={() => setOpenFaq(openFaq === i ? -1 : i)} className="px-5.5 py-4 border-b cursor-pointer hover:bg-[#f8faff]" style={{ borderColor: "#f4f6f5" }}>
                <div className="flex items-center gap-3">
                  <div className="min-w-0 flex-1 font-semibold text-[13.8px]">{f.q}</div>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#8a968f" strokeWidth={2} className="flex-none" style={{ transform: openFaq === i ? "rotate(180deg)" : "rotate(0deg)", transition: "transform .22s ease" }}>
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                </div>
                {openFaq === i && <div className="text-[13px] leading-relaxed mt-2.5 pr-6.5" style={{ color: "#5c6a67" }}>{f.a}</div>}
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <div className="rounded-2xl border p-6" style={{ borderColor: "#e3e8ef", background: "linear-gradient(135deg,#eff6ff,#dbeafe)" }}>
            <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-3.5 text-white" style={{ background: "#2563eb" }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}><path d="M4 5h16v11H8l-4 4V5z" /></svg>
            </div>
            <div className="font-bold text-base mb-1.5">Still need help?</div>
            <div className="text-[13px] leading-relaxed mb-4" style={{ color: "#3d4a47" }}>Reach our support team — we usually reply within a few hours on business days.</div>
            <a href="mailto:support@bjctrackline.test" className="inline-flex items-center gap-2 text-white font-semibold text-[13.5px] px-4.5 py-2.5 rounded-[11px] no-underline hover:-translate-y-0.5" style={{ background: "#2563eb", boxShadow: "0 6px 16px rgba(37,99,235,.28)" }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9}><path d="M4 6h16v12H4zM4 7l8 6 8-6" /></svg>
              Contact support
            </a>
          </div>
          <div className="rounded-2xl bg-white border p-5.5" style={{ borderColor: "#e3e8ef" }}>
            <div className="font-bold text-[15px] mb-3.5">Quick links</div>
            <div className="flex flex-col">
              {LINKS.map((l) => (
                <a key={l.label} href="#" className="quick-link flex items-center gap-2.5 px-2 py-2.5 rounded-lg no-underline" style={{ fontSize: 13.5, fontWeight: 500 }}>
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth={1.7} className="flex-none"><path d={l.icon} /></svg>
                  {l.label}
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#c3ccda" strokeWidth={2} className="ml-auto flex-none"><path d="M9 6l6 6-6 6" /></svg>
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
