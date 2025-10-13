import React, { useEffect, useState } from "react";
import { db } from "../../firebase/client";
import { collection, addDoc, onSnapshot, deleteDoc, doc, serverTimestamp } from "firebase/firestore";
import { supabase } from "../../supabase/client";
import ToastStack from "../ToastStack";
import NavbarAdm from "./NavbarAdm.jsx";
import "./DOCSS/Admin.css";


export default function ProductosAdmin() {
  const [toasts, setToasts] = useState([]);
  const toast = (m, o = {}) => setToasts((t) => [...t, { id: crypto.randomUUID(), message: m, ...o }]);
  const closeToast = (id) => setToasts((t) => t.filter((x) => x.id !== id));

  const [nombre, setNombre] = useState("");
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState("");
  const [loading, setLoading] = useState(false);
  const [productos, setProductos] = useState([]);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "productos"), (snap) => {
      setProductos(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return unsub;
  }, []);

  const onFile = (e) => {
    const f = e.target.files?.[0] || null;
    setFile(f);
    setPreview(f ? URL.createObjectURL(f) : "");
  };

  const uploadToSupabase = async (file, nombre) => {
    const ext = file.name.split(".").pop() || "bin";
    const safe = nombre.trim().toLowerCase().replace(/\s+/g, "-");
    const path = `images/${Date.now()}_${safe}.${ext}`;
    const { error } = await supabase.storage.from("productos").upload(path, file, {
      cacheControl: "3600",
      contentType: file.type,
      upsert: false,
    });
    if (error) throw error;
    const { data } = supabase.storage.from("productos").getPublicUrl(path);
    return data.publicUrl;
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!nombre.trim()) return toast("El nombre es obligatorio", { variant: "error" });
    if (!file) return toast("Selecciona una imagen", { variant: "error" });
    try {
      setLoading(true);
      const url = await uploadToSupabase(file, nombre);
      await addDoc(collection(db, "productos"), { nombre: nombre.trim(), url, creadoEn: serverTimestamp() });
      toast("Producto creado", { variant: "success", icon: "✅" });
      setNombre("");
      setFile(null);
      setPreview("");
    } catch (err) {
      toast(err.message || "Error subiendo/guardando", { variant: "error" });
    } finally {
      setLoading(false);
    }
  };

  const eliminar = async (p) => {
    if (!confirm(`Eliminar "${p.nombre}"?`)) return;
    try {
      await deleteDoc(doc(db, "productos", p.id));
      toast("Eliminado", { variant: "warning" });
    } catch (e) {
      toast(e.message || "No se pudo eliminar", { variant: "error" });
    }
  };

  return (
    <div className="au-layout">
      <NavbarAdm />
      <section className="au-main">
        <ToastStack toasts={toasts} onClose={closeToast} />
        <header className="au-mainHead">
          <div>
            <h1 className="au-title">Gestión de Productos</h1>
            <p className="au-sub">Sube imágenes a Supabase y registra productos en Firestore.</p>
          </div>
        </header>

        <div className="au-card">
          <div className="au-cardHead">
            <div className="au-chip">{productos.length} productos</div>
          </div>
          <div className="au-tableWrap" style={{ padding: 16 }}>
            <form onSubmit={submit} style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 12, alignItems: "center" }}>
              <input
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Nombre*"
                className="au-search"
                style={{ minWidth: 0 }}
              />
              <input type="file" accept="image/*" onChange={onFile} className="au-filter" />
              {preview && (
                <div style={{ gridColumn: "1 / -1", display: "flex", gap: 12, alignItems: "center" }}>
                  <img src={preview} alt="preview" style={{ maxHeight: 140, borderRadius: 12, border: "1px solid var(--au-line)", background: "#fff" }} />
                </div>
              )}
              <button
                type="submit"
                disabled={loading}
                className="au-btnDanger"
                style={{ justifySelf: "start", background: "#111827", color: "#fff", borderColor: "#111827" }}
              >
                {loading ? "Guardando..." : "Guardar"}
              </button>
            </form>
          </div>
        </div>

        <div className="au-card">
          <div className="au-cardHead">
            <h3 className="au-title" style={{ fontSize: "1.1rem" }}>Registrados</h3>
          </div>
          <div className="au-tableWrap" style={{ padding: 16 }}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill,minmax(220px,1fr))",
                gap: 14,
              }}
            >
              {productos.map((p) => (
                <article key={p.id} className="au-row" style={{ display: "grid", gap: 8 }}>
                  <div
                    className="au-td"
                    style={{
                      height: 160,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      borderRadius: 14,
                      background: "var(--au-surface)",
                    }}
                  >
                    {p.url ? <img src={p.url} alt={p.nombre} style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} /> : "Sin imagen"}
                  </div>
                  <div className="au-td au-tdStrong" style={{ borderRadius: 14 }}>{p.nombre}</div>
                  <div className="au-td" style={{ display: "flex", gap: 8, justifyContent: "space-between", alignItems: "center", borderRadius: 14 }}>
                    {p.url ? (
                      <a
                        href={p.url}
                        target="_blank"
                        rel="noreferrer"
                        className="au-btnDanger"
                        style={{ background: "linear-gradient(180deg,#ffffff,#f8fafc)", color: "#0b0b0b", borderColor: "rgba(0,0,0,.06)" }}
                      >
                        Ver
                      </a>
                    ) : (
                      <span style={{ color: "var(--au-muted)", fontWeight: 800 }}>Sin URL</span>
                    )}
                    <button onClick={() => eliminar(p)} className="au-btnDanger">🗑 Eliminar</button>
                  </div>
                </article>
              ))}
              {!productos.length && (
                <div className="au-empty" style={{ gridColumn: "1 / -1" }}>No hay productos</div>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
