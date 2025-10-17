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
                .sort(
                  (a, b) =>
                    (b.createdAt?.toMillis?.() ?? 0) - (a.createdAt?.toMillis?.() ?? 0)
                ).reverse();
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
        setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
      },
      (err) => setError(err.message || "Error al leer mensajes")
    );
    return unsub;
  }, [conversationId]);

  const normalizedMessages = useMemo(
    () => messages.map((m) => ({ ...m, normalized: tidyMarkdown(m.content || "") })),
    [messages]
  );

  const currentTitle = useMemo(() => {
    const c = convos.find((c) => c.id === conversationId);
    return c?.title || "Nueva conversación";
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
    inputRef.current?.focus();
  };

  const changeConversation = (id) => {
    localStorage.setItem("convId", id);
    setConversationId(id);
    setSidebarOpen(false);
    setError("");
  };

  const getBearer = async () => {
    const u = getAuth().currentUser;
    if (!u) throw new Error("Debes iniciar sesión.");
    return await u.getIdToken();
  };

  const autoResize = () => {
    const el = textRef.current;
    if (!el) return;
    const MAX = 180;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, MAX) + "px";
    el.style.overflowY = el.scrollHeight > MAX ? "auto" : "hidden";
  };
  useEffect(() => { autoResize(); }, [text]);

  const send = async () => {
    if (!text.trim() || sending) return;
    setSending(true);
    setError("");
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
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    } catch (e) {
      setError(e.message || "Error enviando mensaje");
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
      {/* Header superior */}
      <header className="chatia__top">
        <button
          className="chatia__burger"
          onClick={() => setSidebarOpen((v) => !v)}
          aria-label="Abrir historial"
        >
          ☰
        </button>
        <div className="chatia__brand">
          <span className="chatia__logo" aria-hidden>🌱</span>
          <div>
            <h2 className="chatia__title">Mi Agro IA</h2>
            <p className="chatia__subtitle">Recomendaciones claras para ti</p>
          </div>
        </div>
      </header>

      <div className={`chatia__layout ${sidebarOpen ? "is-open" : ""}`}>
        {/* Sidebar */}
        <aside className="chatia__sidebar">
          <div className="chatia__sidebarHead">
            <h3>Historial</h3>
            {/* 🔥 Botón eliminado del Historial */}
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

        {/* Main */}
        <main className="chatia__main">
          <div className="chatia__headerMain">
            <div className="chatia__current">{currentTitle}</div>
            {/* ✅ Botón “+ Nuevo chat” ahora aquí */}
            <button className="chatia__headerBtn" onClick={newChat}>+ Nuevo chat</button>
          </div>

          <div className="chatia__thread" aria-live="polite">
            {normalizedMessages.length === 0 ? (
              <div className="chatia__placeholder">
                {conversationId ? "Cargando conversación…" : "Envía tu primera pregunta para comenzar."}
              </div>
            ) : (
              normalizedMessages.map((m) => {
                const isUser = m.role === "user";
                const handleCopy = async () => {
                  try { await navigator.clipboard.writeText(m.normalized || ""); } catch {}
                };
                return (
                  <div key={m.id} className={`bubble ${isUser ? "bubble--user" : "bubble--ai"}`}>
                    {!isUser && (
                      <div className="bubble__head">
                        <span className="bubble__avatar" aria-hidden>🤖</span>
                        <span className="bubble__who">MiAgro IA</span>
                        <button className="bubble__copy" onClick={handleCopy} title="Copiar respuesta">
                          Copiar
                        </button>
                      </div>
                    )}
                    <div className="bubble__content md">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {m.normalized}
                      </ReactMarkdown>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={bottomRef} />
          </div>

          {error && <div className="chatia__error">{error}</div>}

          <form onSubmit={onSubmit} className="chatia__composer">
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
            <button type="submit" className="chatia__send" disabled={sending || !text.trim()}>
              {sending ? "Enviando…" : "Enviar"}
            </button>
          </form>
        </main>
      </div>

      {/* Toast */}
      {toast.open && (
        <div
          className={`toast ${toast.status === "loading" ? "toast--loading" : ""} ${
            toast.status === "success" ? "toast--success" : ""
          } ${toast.status === "error" ? "toast--error" : ""}`}
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

      {/* Modal de confirmación */}
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
