import React, { useEffect, useState } from "react";
import { db } from "../firebase/client";
import { collection, addDoc, onSnapshot, deleteDoc, doc, serverTimestamp } from "firebase/firestore";
import { supabase } from "../supabase/client";
import ToastStack from "./ToastStack";

export default function ProductosAdmin() {
  const [toasts, setToasts] = useState([]);
  const toast = (m, o={}) => setToasts(t => [...t, { id: crypto.randomUUID(), message: m, ...o }]);
  const closeToast = id => setToasts(t => t.filter(x => x.id !== id));

  const [nombre, setNombre] = useState("");
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState("");
  const [loading, setLoading] = useState(false);
  const [productos, setProductos] = useState([]);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "productos"), snap => {
      setProductos(snap.docs.map(d => ({ id: d.id, ...d.data() })));
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
      setNombre(""); setFile(null); setPreview("");
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
    <div className="padm">
      <ToastStack toasts={toasts} onClose={closeToast} />
      <h1>Productos (Supabase Storage + Firestore)</h1>

      <form onSubmit={submit} className="card">
        <input value={nombre} onChange={e=>setNombre(e.target.value)} placeholder="Nombre*" />
        <input type="file" accept="image/*" onChange={onFile} />
        {preview && <img src={preview} alt="preview" style={{maxHeight:180,display:"block"}}/>}
        <button disabled={loading}>{loading ? "Guardando..." : "Guardar"}</button>
      </form>

      <div className="card">
        <h2>Registrados</h2>
        <div className="grid">
          {productos.map(p => (
            <article key={p.id} className="item">
              <div className="thumb">{p.url ? <img src={p.url} alt={p.nombre}/> : "Sin imagen"}</div>
              <strong>{p.nombre}</strong>
              <div className="row">
                {p.url && <a href={p.url} target="_blank" rel="noreferrer">Ver</a>}
                <button onClick={()=>eliminar(p)} className="danger">Eliminar</button>
              </div>
            </article>
          ))}
        </div>
      </div>

      <style>{`
        .padm{max-width:900px;margin:0 auto;padding:20px}
        .card{background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:14px;margin:12px 0;box-shadow:0 6px 14px rgba(0,0,0,.04)}
        .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:12px}
        .item{border:1px solid #eee;border-radius:10px;padding:10px}
        .thumb{height:140px;display:flex;align-items:center;justify-content:center;background:#f8fafc;margin-bottom:8px}
        img{max-width:100%;max-height:100%;object-fit:contain}
        .row{display:flex;justify-content:space-between;gap:8px}
        .danger{background:#fff;color:#dc2626;border:1px solid #dc2626;border-radius:8px;padding:6px 10px}
      `}</style>
    </div>
  );
}
