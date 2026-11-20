"use client";

import { useEffect, useRef, useState } from "react";
import { Send, MessageSquare, Loader2, User } from "lucide-react";
import { Avatar, Btn, Card, PageHeader } from "@/components/ui";
import { useToast } from "@/components/interactive";
import { cn } from "@/lib/cn";

interface MessageItem {
  id: number;
  threadId: string;
  senderId: number;
  senderRole: string;
  senderName: string;
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

export default function EmployeeMessagesPage() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [threads, setThreads] = useState<ThreadSummary[]>([]);
  const [activeThread, setActiveThread] = useState<string>("emp_4:hr");
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [userId, setUserId] = useState<number>(4);

  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const recipients = [
    { id: `emp_${userId}:hr`, label: "HR Department · Priya Deshmukh" },
    { id: `emp_${userId}:admin`, label: "Company Admin · Aarav Sharma" },
  ];

  const fetchMessages = async (threadId?: string) => {
    try {
      const meRes = await fetch("/api/auth/me");
      const meJson = await meRes.json();
      const currentId = meJson?.user?.id || 4;
      setUserId(currentId);

      const targetThread = threadId || (activeThread.startsWith(`emp_${currentId}`) ? activeThread : `emp_${currentId}:hr`);
      const url = `/api/hr/messages?threadId=${encodeURIComponent(targetThread)}`;
      const res = await fetch(url);
      const json = await res.json();
      if (json?.success) {
        setThreads(json.threads || []);
        setActiveThread(targetThread);
        setMessages(json.messages || []);
      }
    } catch (err) {
      console.error("Failed to load employee messages:", err);
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
          isNote: false,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to send");

      setText("");
      await fetchMessages(activeThread);
    } catch (err: any) {
      toast(err.message || "Failed to send message");
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <PageHeader
        title="Messages"
        sub="Direct and confidential messaging with HR and Company Administration."
      />

      <Card flush>
        <div className="grid min-h-[520px] md:grid-cols-[260px_1fr]">
          {/* Thread list */}
          <div className="border-b border-line md:border-b-0 md:border-r">
            <div className="border-b border-line p-3 text-xs font-semibold uppercase tracking-wider text-mute">
              Conversations
            </div>
            <ul className="divide-y divide-line">
              {recipients.map((r) => {
                const isActive = r.id === activeThread;
                return (
                  <li key={r.id}>
                    <button
                      onClick={() => handleSelectThread(r.id)}
                      className={cn(
                        "block w-full p-3.5 text-left transition",
                        isActive ? "bg-pine-soft border-l-4 border-pine" : "hover:bg-canvas"
                      )}
                    >
                      <b className="text-sm font-semibold text-slate-900">{r.label}</b>
                      <span className="block mt-0.5 text-xs text-mute">Click to message</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Conversation stream */}
          <div className="flex flex-col min-w-0">
            <div className="flex items-center justify-between border-b border-line px-5 py-3 bg-white">
              <h3 className="font-semibold text-slate-900">
                {recipients.find((r) => r.id === activeThread)?.label || "HR Support"}
              </h3>
            </div>

            <div className="flex-1 space-y-3 overflow-y-auto p-5 bg-slate-50/50 max-h-[380px]">
              {messages.length === 0 ? (
                <p className="m-auto text-center text-xs text-mute py-12">
                  Say hello to HR or ask any workplace questions.
                </p>
              ) : (
                messages.map((m) => {
                  const isMe = m.senderId === userId || m.senderRole === "employee";
                  return (
                    <div
                      key={m.id}
                      className={cn("flex flex-col", isMe ? "items-end" : "items-start")}
                    >
                      {!isMe && (
                        <span className="mb-1 text-xs font-medium text-mute">
                          {m.senderName} ({m.senderRole.toUpperCase()})
                        </span>
                      )}
                      <div
                        className={cn(
                          "max-w-[78%] rounded-2xl px-4 py-2.5 text-sm shadow-sm",
                          isMe
                            ? "bg-pine text-white"
                            : "bg-white border border-line text-slate-900"
                        )}
                      >
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

            {/* Input bar */}
            <div className="border-t border-line p-3 bg-white">
              <div className="flex items-end gap-2">
                <textarea
                  rows={2}
                  className="field flex-1 text-sm"
                  placeholder="Write a message..."
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
          </div>
        </div>
      </Card>
    </>
  );
}
