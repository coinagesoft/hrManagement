"use client";

import { useEffect, useRef, useState } from "react";
import { Send, User, Shield, MessageSquare, Loader2, StickyNote } from "lucide-react";
import { Avatar, Badge, Btn, Card, PageHeader } from "@/components/ui";
import { useToast } from "@/components/interactive";
import { cn } from "@/lib/cn";

interface MessageItem {
  id: number;
  threadId: string;
  senderId: number;
  senderRole: string;
  senderName: string;
  employeeCode?: string;
  text: string;
  isNote: boolean;
  createdAt: string;
}

interface ThreadSummary {
  threadId: string;
  senderName: string;
  lastText: string;
  createdAt: string;
}

interface UserOption {
  id: number;
  employee_code: string;
  name: string;
  role: string;
  department: string;
  title: string;
}

export default function MessagesPage() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [threads, setThreads] = useState<ThreadSummary[]>([]);
  const [activeThread, setActiveThread] = useState<string>("");
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [currentUserId, setCurrentUserId] = useState<number>(3); // HR default

  // New message draft
  const [text, setText] = useState("");
  const [isNote, setIsNote] = useState(false);
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const fetchMessages = async (threadId?: string) => {
    try {
      const url = threadId
        ? `/api/hr/messages?threadId=${encodeURIComponent(threadId)}`
        : "/api/hr/messages";
      const res = await fetch(url);
      const json = await res.json();
      if (json?.success) {
        setUsers(json.users || []);
        setThreads(json.threads || []);
        if (json.currentUser?.id) setCurrentUserId(json.currentUser.id);

        const currentActive = threadId || json.activeThread || (json.threads[0]?.threadId ?? "");
        setActiveThread(currentActive);
        setMessages(json.messages || []);
      }
    } catch (err) {
      console.error("Failed to load messages:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMessages();
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const handleSelectThread = (threadId: string) => {
    setActiveThread(threadId);
    fetchMessages(threadId);
  };

  const handleStartConversation = (targetUserId: string) => {
    if (!targetUserId) return;
    const target = users.find((u) => String(u.id) === targetUserId);
    if (!target) return;

    let threadId = "";
    if (target.role === "admin") {
      threadId = "emp_3:admin";
    } else {
      threadId = `emp_${target.id}:hr`;
    }
    setActiveThread(threadId);
    fetchMessages(threadId);
  };

  const handleSend = async () => {
    if (!text.trim() || !activeThread) return;
    setSending(true);
    try {
      const res = await fetch("/api/hr/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          threadId: activeThread,
          text: text.trim(),
          isNote,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to send");

      setText("");
      setIsNote(false);
      await fetchMessages(activeThread);
    } catch (err: any) {
      toast(err.message || "Failed to send message");
    } finally {
      setSending(false);
    }
  };

  // Helper to resolve thread participant label
  const getThreadTitle = (threadId: string) => {
    if (threadId.includes("admin")) return "Admin · Aarav Sharma";
    const match = threadId.match(/emp_(\d+)/);
    if (match) {
      const u = users.find((x) => x.id === Number(match[1]));
      if (u) return `${u.name} (${u.employee_code})`;
    }
    return threadId;
  };

  return (
    <>
      <PageHeader
        title="Messages"
        sub="Direct and staff conversations, employee inquiries, and internal HR notes."
      />

      <Card flush>
        <div className="grid min-h-[560px] md:grid-cols-[280px_1fr]">
          {/* Thread List Sidebar */}
          <div className="border-b border-line md:border-b-0 md:border-r">
            <div className="border-b border-line p-3">
              <label className="label text-xs" htmlFor="start-chat">
                Start conversation with
              </label>
              <select
                id="start-chat"
                className="field text-xs"
                value=""
                onChange={(e) => handleStartConversation(e.target.value)}
              >
                <option value="">Choose employee or admin…</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} — {u.role === "admin" ? "Admin" : u.department}
                  </option>
                ))}
              </select>
            </div>

            <ul className="max-h-[460px] overflow-y-auto divide-y divide-line">
              {threads.length === 0 ? (
                <li className="p-4 text-center text-xs text-mute">No conversations yet.</li>
              ) : (
                threads.map((t) => {
                  const isActive = t.threadId === activeThread;
                  const title = getThreadTitle(t.threadId);
                  return (
                    <li key={t.threadId}>
                      <button
                        onClick={() => handleSelectThread(t.threadId)}
                        className={cn(
                          "block w-full p-3.5 text-left transition",
                          isActive ? "bg-pine-soft border-l-4 border-pine" : "hover:bg-canvas"
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <b className="truncate text-sm font-semibold text-slate-900">{title}</b>
                        </div>
                        <p className="mt-1 truncate text-xs text-mute">
                          {t.lastText || "Start of conversation"}
                        </p>
                      </button>
                    </li>
                  );
                })
              )}
            </ul>
          </div>

          {/* Active Chat Conversation Pane */}
          <div className="flex flex-col min-w-0">
            {!activeThread ? (
              <div className="m-auto flex flex-col items-center justify-center p-8 text-center text-mute">
                <MessageSquare className="h-10 w-10 stroke-1 text-slate-300 mb-2" />
                <p className="text-sm font-medium">Select or start a conversation</p>
                <p className="text-xs">Choose a team member from the dropdown on the left.</p>
              </div>
            ) : (
              <>
                {/* Header */}
                <div className="flex items-center justify-between border-b border-line px-5 py-3 bg-white">
                  <div>
                    <h3 className="font-semibold text-slate-900">{getThreadTitle(activeThread)}</h3>
                    <p className="text-xs text-mute">
                      Internal encrypted messaging · {messages.length} message{messages.length === 1 ? "" : "s"}
                    </p>
                  </div>
                </div>

                {/* Message stream */}
                <div className="flex-1 space-y-3 overflow-y-auto p-5 bg-slate-50/50 max-h-[380px]">
                  {messages.length === 0 ? (
                    <p className="m-auto text-center text-xs text-mute py-8">
                      Say hello or add an internal note to this thread.
                    </p>
                  ) : (
                    messages.map((m) => {
                      const isMe = m.senderId === currentUserId;
                      return (
                        <div
                          key={m.id}
                          className={cn("flex flex-col", isMe ? "items-end" : "items-start")}
                        >
                          {!isMe && (
                            <span className="mb-1 text-xs font-medium text-mute">
                              {m.senderName} · {m.senderRole.toUpperCase()}
                            </span>
                          )}
                          <div
                            className={cn(
                              "max-w-[78%] rounded-2xl px-4 py-2.5 text-sm shadow-sm",
                              m.isNote
                                ? "border border-amber-300 bg-amber-50 text-amber-900"
                                : isMe
                                ? "bg-pine text-white"
                                : "bg-white border border-line text-slate-900"
                            )}
                          >
                            {m.isNote && (
                              <div className="mb-1 flex items-center gap-1 text-[11px] font-semibold text-amber-700">
                                <StickyNote className="h-3 w-3" /> Internal HR Note
                              </div>
                            )}
                            <p className="whitespace-pre-wrap">{m.text}</p>
                          </div>
                          <span className="mt-1 text-[10px] text-mute">
                            {new Date(m.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>
                      );
                    })
                  )}
                  <div ref={scrollRef} />
                </div>

                {/* Input area */}
                <div className="border-t border-line p-3 bg-white">
                  <div className="mb-2 flex items-center justify-between">
                    <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isNote}
                        onChange={(e) => setIsNote(e.target.checked)}
                        className="rounded accent-pine"
                      />
                      <span>Mark as internal note (visible to HR & Admins only)</span>
                    </label>
                  </div>
                  <div className="flex items-end gap-2">
                    <textarea
                      rows={2}
                      className="field flex-1 text-sm"
                      placeholder={isNote ? "Write an internal note..." : "Write a message..."}
                      value={text}
                      onChange={(e) => setText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          handleSend();
                        }
                      }}
                    />
                    <Btn
                      disabled={sending || !text.trim()}
                      icon={sending ? Loader2 : Send}
                      onClick={handleSend}
                    >
                      Send
                    </Btn>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </Card>
    </>
  );
}
