import React, { useEffect, useMemo, useRef, useState } from "react";
import { db } from "../../firebase/client";
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  where,
  getDocs,
  deleteDoc,
  doc,
  documentId,
} from "firebase/firestore";
import { getAuth } from "firebase/auth";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import "./DOCSS/ChatIA.css";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

function tidyMarkdown(input = "") {
  let s = input.replace(/\r\n?/g, "\n");
  s = s.replace(/(^|\n)\s*(\d+)\s*[\.\)]\s*(?:\n\s*)+(?=\S)/g, (_, p1, n) => `${p1}${n}. `);
  s = s.replace(/(^|\n)\s*(\d+)\s*\)\s+(?=\S)/g, (_, p1, n) => `${p1}${n}. `);
  s = s.replace(/(^|\n)\s*(\d+)\s*\.\s+(?=\S)/g, (_, p1, n) => `${p1}${n}. `);
  s = s.replace(/\n{3,}/g, "\n\n");
  return s.trim();
}

function ConfirmDialog({ open, title = "Confirmar", message, onConfirm, onCancel }) {
  if (!open) return null;
  return (
    <div className="cdlg__backdrop" role="dialog" aria-modal="true" aria-labelledby="cdlg-title">
      <div className="cdlg">
        <h4 id="cdlg-title" className="cdlg__title">{title}</h4>
        <p className="cdlg__msg">{message}</p>
        <div className="cdlg__actions">
          <button className="cdlg__btn cdlg__btn--ghost" onClick={onCancel}>Cancelar</button>
          <button className="cdlg__btn cdlg__btn--primary" onClick={onConfirm}>Aceptar</button>
        </div>
      </div>
    </div>
  );
}

function TypingDots() {
  return (
    <div className="typing">
      <span className="dot" />
      <span className="dot" />
      <span className="dot" />
    </div>
  );
}

export default function ChatIA() {
  const auth = getAuth();
  const user = auth.currentUser;

  const [conversationId, setConversationId] = useState(
    () => localStorage.getItem("convId") || null
  );
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [convos, setConvos] = useState([]);
  const [loadingConvos, setLoadingConvos] = useState(true);

  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const textRef = useRef(null);

  const [toast, setToast] = useState({ open: false, status: "idle", msg: "" });
  const toastTimerRef = useRef(null);
  const showToast = (status, msg, autoHideMs = 2000) => {
    setToast({ open: true, status, msg });
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    if (autoHideMs && status !== "loading") {
      toastTimerRef.current = setTimeout(() => setToast((t) => ({ ...t, open: false })), autoHideMs);
    }
  };

  const [confirmState, setConfirmState] = useState({ open: false, convoId: null });
  useEffect(() => () => toastTimerRef.current && clearTimeout(toastTimerRef.current), []);

  const [aiTyping, setAiTyping] = useState(false);
  const [reveal, setReveal] = useState({});
  const revealTimers = useRef({});

  useEffect(() => {
    if (!user?.uid) return;
    let unsub = () => {};
    const base = collection(db, "conversations");
    try {
      const q1 = query(base, where("owner", "==", user.uid), orderBy("createdAt", "desc"));
      unsub = onSnapshot(
        q1,
        (snap) => {
          setConvos(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
          setLoadingConvos(false);
        },
        () => {
          const q2 = query(base, where("owner", "==", user.uid));
          unsub = onSnapshot(
            q2,
            (snap2) => {
              const rows = snap2.docs
                .map((d) => ({ id: d.id, ...d.data() }))
                .sort((a, b) => (b.createdAt?.toMillis?.() ?? 0) - (a.createdAt?.toMillis?.() ?? 0))
                .reverse();
              setConvos(rows);
              setLoadingConvos(false);
            },
            () => setLoadingConvos(false)
          );
        }
      );
    } catch {
      setLoadingConvos(false);
    }
    return () => unsub && unsub();
  }, [user?.uid]);

  useEffect(() => {
    if (!conversationId) { setMessages([]); return; }
    const msgsRef = collection(db, "conversations", conversationId, "messages");
    const q = query(msgsRef, orderBy("createdAt", "asc"), orderBy(documentId()));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        rows.sort((a, b) => {
          const ta = a.createdAt?.toMillis?.() ?? 0;
          const tb = b.createdAt?.toMillis?.() ?? 0;
          if (ta !== tb) return ta - tb;
          const wa = a.role === "user" ? 0 : 1;
          const wb = b.role === "user" ? 0 : 1;
          if (wa !== wb) return wa - wb;
          return a.id.localeCompare(b.id);
        });
        setMessages(rows);
        setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "instant" }), 10);
      },
      (err) => setError(err.message || "Error al leer mensajes")
    );
    return unsub;
  }, [conversationId]);

  const normalizedMessages = useMemo(
    () => messages.map((m) => ({ ...m, normalized: tidyMarkdown(m.content || "") })),
    [messages]
  );

  useEffect(() => {
    const last = normalizedMessages[normalizedMessages.length - 1];
    if (!last) return;
    if (last.role === "user") setAiTyping(true);
    else setAiTyping(false);
    normalizedMessages.forEach((m) => {
      if (m.role === "assistant" && !reveal[m.id]) {
        const full = m.normalized;
        let i = 0;
        revealTimers.current[m.id] && clearInterval(revealTimers.current[m.id]);
        revealTimers.current[m.id] = setInterval(() => {
          i += Math.max(1, Math.floor(full.length / 200));
          const slice = full.slice(0, i);
          setReveal((r) => ({ ...r, [m.id]: slice }));
          if (slice.length >= full.length) clearInterval(revealTimers.current[m.id]);
        }, 16);
      }
    });
  }, [normalizedMessages]);

  const currentTitle = useMemo(() => {
    const c = convos.find((c) => c.id === conversationId);
    return c?.title || "Listo para Ayudarte";
  }, [convos, conversationId]);

  const formatDate = (ts) => {
    try {
      if (!ts) return "";
      const d = ts.toDate ? ts.toDate() : new Date(ts);
      return d.toLocaleString();
    } catch { return ""; }
  };

  const newChat = () => {
    localStorage.removeItem("convId");
    setConversationId(null);
    setMessages([]);
    setText("");
    setSidebarOpen(false);
    setError("");
    setReveal({});
    inputRef.current?.focus();
  };

  const changeConversation = (id) => {
    localStorage.setItem("convId", id);
    setConversationId(id);
    setSidebarOpen(false);
    setError("");
    setReveal({});
  };

  const getBearer = async () => {
    const u = getAuth().currentUser;
    if (!u) throw new Error("Debes iniciar sesión.");
    return await u.getIdToken();
  };

  const autoResize = () => {
    const el = textRef.current;
    if (!el) return;
    const MAX = 120;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, MAX) + "px";
    el.style.overflowY = el.scrollHeight > MAX ? "auto" : "hidden";
  };
  useEffect(() => { autoResize(); }, [text]);

  const send = async () => {
    if (!text.trim() || sending) return;
    setSending(true);
    setError("");
    setAiTyping(true);
    try {
      const token = await getBearer();
      const res = await fetch(`${API_URL}/api/ai/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        credentials: "include",
        body: JSON.stringify({ text, conversationId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
      if (!conversationId && data?.conversationId) {
        localStorage.setItem("convId", data.conversationId);
        setConversationId(data.conversationId);
      }
      setText("");
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "instant" }), 10);
    } catch (e) {
      setError(e.message || "Error enviando mensaje");
      setAiTyping(false);
    } finally {
      setSending(false);
    }
  };

  const onSubmit = (e) => { e.preventDefault(); send(); };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const requestDeleteConversation = (id) => {
    setConfirmState({ open: true, convoId: id });
  };

  const actuallyDeleteConversation = async () => {
    const id = confirmState.convoId;
    setConfirmState({ open: false, convoId: null });
    showToast("loading", "Eliminando conversación…", 0);
    try {
      const snaps = await getDocs(collection(db, "conversations", id, "messages"));
      await Promise.allSettled(
        snaps.docs.map((d) => deleteDoc(doc(db, "conversations", id, "messages", d.id)))
      );
      await deleteDoc(doc(db, "conversations", id));
      if (id === conversationId) newChat();
      showToast("success", "Conversación eliminada", 1500);
    } catch (e) {
      showToast("error", e.message || "No se pudo eliminar la conversación", 3000);
    }
  };

  return (
    <div className="chatia">
      <div className={`chatia__layout ${sidebarOpen ? "is-open" : ""}`}>
        <aside className="chatia__sidebar">
          <div className="chatia__sidebarIntro">
            <div className="intro__badge">MiAgro IA</div>
            <h3 className="intro__title">inteligencia para sembrar mejor</h3>
            <p className="intro__desc">Asistente que te ayuda a consultar datos, analizar precios, generar ideas y documentar procesos agrícolas.</p>
          </div>
          <div className="chatia__sidebarHead">
            <h4 className="hist__title">Historial</h4>
            <button className="hist__new" onClick={newChat}>+ Nuevo</button>
          </div>
          <div className="chatia__convos">
            {loadingConvos ? (
              <div className="chatia__empty small">Cargando…</div>
            ) : convos.length ? (
              convos.map((c) => (
                <div
                  key={c.id}
                  className={`chatia__convoItem ${c.id === conversationId ? "is-active" : ""}`}
                  onClick={() => changeConversation(c.id)}
                >
                  <div className="chatia__convoMain">
                    <div className="chatia__convoTitle">{c.title || "Conversación"}</div>
                    <div className="chatia__convoDate">{formatDate(c.createdAt)}</div>
                  </div>
                  <button
                    className="chatia__deleteBtn"
                    title="Eliminar"
                    onClick={(e) => { e.stopPropagation(); requestDeleteConversation(c.id); }}
                  >
                    🗑
                  </button>
                </div>
              ))
            ) : (
              <div className="chatia__empty">No hay conversaciones</div>
            )}
          </div>
        </aside>

        <main className="chatia__main">
          <div className="chatia__headerMain">
            <div className="chatia__current">{currentTitle}</div>

          </div>

          <div className="chatia__thread" aria-live="polite">
            {normalizedMessages.length === 0 ? (
              <div className="chatia__emptyState">
                <img src="/chat.png" alt="MiAgro IA" className="empty__img" />
                <div className="empty__title">{currentTitle}</div>
                <div className="empty__hint">Escribe tu primera pregunta para comenzar</div>
              </div>
            ) : (
              normalizedMessages.map((m) => {
                const isUser = m.role === "user";
                const textShown = isUser ? m.normalized : (reveal[m.id] ?? "");
                const handleCopy = async () => {
                  try { await navigator.clipboard.writeText(m.normalized || ""); } catch {}
                };
                return (
                  <div key={m.id} className={`bubble ${isUser ? "bubble--user" : "bubble--ai"} anim-pop`}>
                    {!isUser && (
                      <div className="bubble__head">
                        <span className="bubble__avatar" aria-hidden>🤖</span>
                        <span className="bubble__who">MiAgro IA</span>
                        <button className="bubble__copy" onClick={handleCopy} title="Copiar respuesta">Copiar</button>
                      </div>
                    )}
                    <div className="bubble__content md">
                      {isUser ? (
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {textShown}
                        </ReactMarkdown>
                      ) : textShown ? (
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {textShown}
                        </ReactMarkdown>
                      ) : (
                        <TypingDots />
                      )}
                    </div>
                  </div>
                );
              })
            )}
            {aiTyping && normalizedMessages.length > 0 && normalizedMessages.at(-1)?.role === "user" && (
              <div className="bubble bubble--ai anim-pop">
                <div className="bubble__head">
                  <span className="bubble__avatar" aria-hidden>🤖</span>
                  <span className="bubble__who">MiAgro IA</span>
                </div>
                <div className="bubble__content">
                  <TypingDots />
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {error && <div className="chatia__error">{error}</div>}

          <form onSubmit={onSubmit} className="chatia__composer">
            <div className="chatia__inputWrap">
              <textarea
                ref={(el) => { textRef.current = el; inputRef.current = el; }}
                value={text}
                onChange={(e) => setText(e.target.value)}
                onInput={autoResize}
                onKeyDown={handleKeyDown}
                placeholder="Escribe tu pregunta"
                rows={2}
                className="chatia__textarea"
              />
              <div className={`chatia__hint ${text ? "is-hidden" : ""}`}>
                Enter para enviar • Shift+Enter para nueva línea
              </div>
            </div>
            <button type="submit" className="chatia__send" disabled={sending || !text.trim()}>
              <span className="chatia__sendIcon" aria-hidden>➤</span>
              <span className="chatia__sendLabel">{sending ? "Enviando…" : "Enviar"}</span>
            </button>
          </form>
        </main>
      </div>

      {toast.open && (
        <div
          className={`toast ${toast.status === "loading" ? "toast--loading" : ""} ${toast.status === "success" ? "toast--success" : ""} ${toast.status === "error" ? "toast--error" : ""}`}
          role="status"
          aria-live="polite"
        >
          {toast.status === "loading" && <span className="toast__spinner" aria-hidden />}
          <span className="toast__msg">{toast.msg}</span>
          {toast.status !== "loading" && (
            <button
              className="toast__close"
              onClick={() => setToast((t) => ({ ...t, open: false }))}
              aria-label="Cerrar notificación"
              title="Cerrar"
            >
              ✕
            </button>
          )}
        </div>
      )}

      <ConfirmDialog
        open={confirmState.open}
        title="Eliminar conversación"
        message="¿Seguro que quieres eliminar esta conversación? Esta acción no se puede deshacer."
        onCancel={() => setConfirmState({ open: false, convoId: null })}
        onConfirm={actuallyDeleteConversation}
      />
    </div>
  );
}
