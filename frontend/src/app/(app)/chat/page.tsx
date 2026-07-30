"use client";

import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { relativeTime } from "@/lib/format";
import type { ConversationSummary, Message, UserSummary } from "@/lib/types";

const AVATAR_PALETTE: [string, string][] = [
  ["#dbeafe", "#1e3a8a"],
  ["#dcfce7", "#14532d"],
  ["#fef3c7", "#92400e"],
  ["#fee2e2", "#7f1d1d"],
  ["#e0f2fe", "#075985"],
  ["#ede9fe", "#5b21b6"],
];

function pickAvatar(seed: string): [string, string] {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) % AVATAR_PALETTE.length;
  return AVATAR_PALETTE[h];
}

function initials(name: string) {
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

function UnreadBadge({ count }: { count: number }) {
  return (
    <span
      className="flex-none min-w-[18px] h-[18px] px-1 rounded-full text-white font-mono flex items-center justify-center"
      style={{ background: "#b91c1c", fontSize: 10, fontWeight: 700 }}
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}

export default function ChatPage() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [otherReadAt, setOtherReadAt] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [directory, setDirectory] = useState<UserSummary[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  async function loadConversations() {
    const res = await api.get<{ conversations: ConversationSummary[] }>("/conversations");
    setConversations(res.data.conversations);
    return res.data.conversations;
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch-on-mount, see React docs "Fetching data with Effects"
    loadConversations().then((convos) => {
      if (convos.length > 0) setActiveId(convos[0].id);
    });
  }, []);

  useEffect(() => {
    if (!activeId) return;
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch-on-mount/conversation-change, see React docs "Fetching data with Effects"
    setMessages([]);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- see above
    setOtherReadAt(null);
    function fetchMessages() {
      api.get<{ messages: Message[]; otherReadAt: string | null }>(`/conversations/${activeId}/messages`).then((res) => {
        if (cancelled) return;
        setMessages(res.data.messages);
        setOtherReadAt(res.data.otherReadAt);
      });
      // The viewer is actively looking at this conversation — anything in it
      // counts as read, including whatever just arrived on this poll.
      api.post(`/conversations/${activeId}/read`).then(() => {
        if (cancelled) return;
        setConversations((prev) => prev.map((c) => (c.id === activeId ? { ...c, unreadCount: 0 } : c)));
      });
    }
    fetchMessages();
    // Polling, not a websocket — simple and good enough for this app's scale,
    // and it means messages from the other person actually show up without
    // the viewer having to switch away and back or reload the page.
    const interval = setInterval(fetchMessages, 4000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [activeId]);

  useEffect(() => {
    const interval = setInterval(() => {
      loadConversations();
    }, 8000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- polling loop started once on mount, not re-created per render
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages]);

  async function send() {
    if (!activeId || !draft.trim() || sending) return;
    const text = draft.trim();
    setDraft("");
    setSending(true);
    try {
      const res = await api.post(`/conversations/${activeId}/messages`, { text });
      setMessages((prev) => [...prev, res.data.message]);
      loadConversations();
    } catch {
      setDraft(text);
    } finally {
      setSending(false);
    }
  }

  async function openPicker() {
    if (directory.length === 0) {
      const res = await api.get<{ users: UserSummary[] }>("/users");
      setDirectory(res.data.users.filter((u) => u.id !== user?.id));
    }
    setShowPicker(true);
  }

  async function startDm(userId: string) {
    const res = await api.post(`/conversations/dm/${userId}`);
    setShowPicker(false);
    const convos = await loadConversations();
    const target = convos.find((c) => c.id === res.data.conversationId);
    if (target) setActiveId(target.id);
  }

  const teamConvs = conversations.filter((c) => c.kind === "team");
  const dmConvs = conversations.filter((c) => c.kind === "dm");
  const active = conversations.find((c) => c.id === activeId);
  const lastMyMessageId = [...messages].reverse().find((m) => m.from.id === user?.id)?.id;
  const seen = active?.kind === "dm" && !!otherReadAt && messages.length > 0
    ? messages.find((m) => m.id === lastMyMessageId && new Date(m.ts) <= new Date(otherReadAt!))
    : undefined;

  return (
    <div className="card flex overflow-hidden" style={{ height: "calc(100vh - 158px)" }}>
      <div className="w-[264px] flex-none overflow-y-auto border-r" style={{ borderColor: "#eef1f0", background: "#fbfcfc" }}>
        <div className="px-4.5 pt-4 pb-2 font-mono uppercase" style={{ fontSize: 10.5, fontWeight: 600, letterSpacing: ".08em", color: "#96a19d" }}>Team channels</div>
        {teamConvs.map((c) => {
          const isActive = c.id === activeId;
          const [avBg, avColor] = pickAvatar(c.name);
          return (
            <div
              key={c.id}
              onClick={() => setActiveId(c.id)}
              className="flex items-center gap-2.5 px-4 py-2.5 cursor-pointer"
              style={{ background: isActive ? "#eff6ff" : "transparent", borderLeft: `3px solid ${isActive ? "#2563eb" : "transparent"}` }}
            >
              <div className="w-[34px] h-[34px] flex-none rounded-[10px] flex items-center justify-center font-mono font-semibold text-sm" style={{ background: isActive ? "#2563eb" : avBg, color: isActive ? "#fff" : avColor }}>#</div>
              <div className="min-w-0 flex-1">
                <div className="text-[13px] whitespace-nowrap overflow-hidden text-ellipsis" style={{ fontWeight: isActive ? 600 : 500, color: "#10201d" }}>{c.name}</div>
                <div className="text-[11px] whitespace-nowrap overflow-hidden text-ellipsis" style={{ color: "#96a19d" }}>{c.lastMessage?.text ?? "No messages yet"}</div>
              </div>
              {c.unreadCount > 0 && <UnreadBadge count={c.unreadCount} />}
            </div>
          );
        })}

        <div className="flex items-center px-4.5 pt-4 pb-2">
          <span className="font-mono uppercase" style={{ fontSize: 10.5, fontWeight: 600, letterSpacing: ".08em", color: "#96a19d" }}>Direct messages</span>
          <button onClick={openPicker} className="ml-auto bg-transparent border-none cursor-pointer font-semibold text-xs" style={{ color: "#2563eb" }}>+ New</button>
        </div>
        {dmConvs.map((c) => {
          const isActive = c.id === activeId;
          const [avBg, avColor] = pickAvatar(c.name);
          return (
            <div
              key={c.id}
              onClick={() => setActiveId(c.id)}
              className="flex items-center gap-2.5 px-4 py-2.5 cursor-pointer"
              style={{ background: isActive ? "#eff6ff" : "transparent", borderLeft: `3px solid ${isActive ? "#2563eb" : "transparent"}` }}
            >
              <div className="w-[34px] h-[34px] flex-none rounded-full flex items-center justify-center font-mono font-semibold text-xs" style={{ background: isActive ? "#2563eb" : avBg, color: isActive ? "#fff" : avColor }}>{initials(c.name)}</div>
              <div className="min-w-0 flex-1">
                <div className="text-[13px] whitespace-nowrap overflow-hidden text-ellipsis" style={{ fontWeight: isActive ? 600 : 500, color: "#10201d" }}>{c.name}</div>
                <div className="text-[11px] whitespace-nowrap overflow-hidden text-ellipsis" style={{ color: "#96a19d" }}>{c.lastMessage?.text ?? "No messages yet"}</div>
              </div>
              {c.unreadCount > 0 && <UnreadBadge count={c.unreadCount} />}
            </div>
          );
        })}
        {conversations.length === 0 && <div className="px-4.5 py-4 text-xs" style={{ color: "#96a19d" }}>No conversations yet.</div>}
      </div>

      <div className="flex-1 flex flex-col min-w-0">
        {active ? (
          <>
            <div className="flex items-center gap-2.5 px-5 py-3.5 border-b" style={{ borderColor: "#eef1f0" }}>
              <div className="w-[38px] h-[38px] flex-none rounded-[10px] flex items-center justify-center font-mono font-semibold text-sm" style={{ background: "#dbeafe", color: "#1e3a8a" }}>
                {active.kind === "team" ? "#" : initials(active.name)}
              </div>
              <div>
                <div className="font-bold text-[15px]">{active.kind === "team" ? `#${active.name}` : active.name}</div>
                <div className="text-[11px]" style={{ color: "#96a19d" }}>{active.kind === "team" ? "Team channel" : "Direct message"}</div>
              </div>
            </div>
            <div ref={scrollRef} className="flex-1 overflow-y-auto px-5.5 py-5 flex flex-col gap-4" style={{ background: "#fbfcfc" }}>
              {messages.map((m) => {
                const isMe = m.from.id === user?.id;
                const [avBg, avColor] = pickAvatar(m.from.name);
                return (
                  <div key={m.id} className="flex gap-2.5 items-end" style={{ flexDirection: isMe ? "row-reverse" : "row" }}>
                    <div className="w-[30px] h-[30px] flex-none rounded-full flex items-center justify-center font-mono font-semibold" style={{ fontSize: 10.5, background: isMe ? "#2563eb" : avBg, color: isMe ? "#fff" : avColor }}>
                      {initials(m.from.name)}
                    </div>
                    <div className="flex flex-col" style={{ alignItems: isMe ? "flex-end" : "flex-start", maxWidth: "70%" }}>
                      <div className="px-1 mb-1" style={{ fontSize: 10.5, color: "#96a19d" }}>{m.from.name} · {relativeTime(m.ts)}</div>
                      <div
                        className="px-3.5 py-2.5 text-[13px] leading-relaxed"
                        style={{
                          background: isMe ? "#2563eb" : "#fff",
                          color: isMe ? "#fff" : "#10201d",
                          borderRadius: isMe ? "14px 14px 4px 14px" : "14px 14px 14px 4px",
                          border: isMe ? "none" : "1px solid #e3e8e6",
                        }}
                      >
                        {m.text}
                      </div>
                      {seen?.id === m.id && (
                        <div className="px-1 mt-1 flex items-center gap-1" style={{ fontSize: 10, color: "#96a19d" }}>
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth={2.2}><path d="M20 6L9 17l-5-5" /></svg>
                          Seen
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
              {messages.length === 0 && <div className="text-center text-sm py-8" style={{ color: "#96a19d" }}>No messages yet — say hello.</div>}
            </div>
            <div className="flex gap-2.5 px-4.5 py-3.5 border-t bg-white" style={{ borderColor: "#eef1f0" }}>
              <input
                className="flex-1 rounded-full px-4.5 py-2.5 text-[13px] border"
                style={{ borderColor: "#d7dedb", background: "#f8faf9" }}
                placeholder="Write a message…"
                value={draft}
                disabled={sending}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") send();
                }}
              />
              <button
                onClick={send}
                disabled={sending || !draft.trim()}
                className="w-11 h-11 flex-none rounded-full border-none text-white cursor-pointer flex items-center justify-center disabled:opacity-50 disabled:cursor-default"
                style={{ background: "#2563eb", boxShadow: "0 4px 12px rgba(37,99,235,.3)" }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" /></svg>
              </button>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-sm" style={{ color: "#96a19d" }}>Select a conversation.</div>
        )}
      </div>

      {showPicker && (
        <div className="backdrop-anim fixed inset-0 z-50 flex items-center justify-center p-6" style={{ background: "rgba(9,20,17,.5)" }} onClick={() => setShowPicker(false)}>
          <div className="dialog-anim w-[360px] max-w-full max-h-[70vh] bg-white rounded-2xl flex flex-col overflow-hidden" style={{ boxShadow: "0 30px 70px rgba(9,20,17,.35)" }} onClick={(e) => e.stopPropagation()}>
            <div className="px-5 py-4 border-b font-bold text-sm" style={{ borderColor: "#eef1f0" }}>Start a conversation</div>
            <div className="overflow-y-auto p-2">
              {directory.map((u) => (
                <button key={u.id} onClick={() => startDm(u.id)} className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-[10px] border-none bg-transparent cursor-pointer hover:bg-[#f8faf9] text-left">
                  <div className="w-8 h-8 flex-none rounded-full flex items-center justify-center font-mono font-semibold text-xs" style={{ background: "#eef1f0", color: "#5c6a67" }}>{initials(u.name)}</div>
                  <div className="min-w-0">
                    <div className="text-[13px] font-medium">{u.name}</div>
                    <div className="text-[11px]" style={{ color: "#96a19d" }}>{u.title}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
