import React, { useEffect, useState, useMemo } from "react";
import { db } from "../../firebase/client";
import { collection, addDoc, onSnapshot, deleteDoc, doc, serverTimestamp } from "firebase/firestore";
import { supabase } from "../../supabase/client";
import ToastStack from "../ToastStack";
import NavbarAdm from "./NavbarAdm.jsx";
import "./DOCSS/Admin.css";

export default function MunicipiosAdm() {
  const [toasts, setToasts] = useState([]);
  const toast = (m, o = {}) => setToasts((t) => [...t, { id: crypto.randomUUID(), message: m, ...o }]);
  const closeToast = (id) => setToasts((t) => t.filter((x) => x.id !== id));

  const [departamentos, setDepartamentos] = useState([]);
  const [municipiosApi, setMunicipiosApi] = useState([]);
  const [depSel, setDepSel] = useState("");
  const [munSel, setMunSel] = useState("");
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState("");
  const [loading, setLoading] = useState(false);
  const [municipios, setMunicipios] = useState([]);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "municipios"), (snap) => {
      setMunicipios(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return unsub;
  }, []);

  useEffect(() => {
    const cargarDeps = async () => {
      try {
        const r = await fetch("https://api-colombia.com/api/v1/Department");
        const j = await r.json();
        const orden = j.sort((a, b) => a.name.localeCompare(b.name, "es"));
        setDepartamentos(orden);
      } catch (e) {
        toast("No se pudieron cargar departamentos", { variant: "error" });
      }
    };
    cargarDeps();
  }, []);

  useEffect(() => {
    const cargarMuns = async () => {
      setMunicipiosApi([]);
      setMunSel("");
      if (!depSel) return;
      try {
        const r = await fetch(`https://api-colombia.com/api/v1/Department/${depSel}/cities`);
        const j = await r.json();
        const orden = j.sort((a, b) => a.name.localeCompare(b.name, "es"));
        setMunicipiosApi(orden);
      } catch (e) {
        toast("No se pudieron cargar municipios", { variant: "error" });
      }
    };
    cargarMuns();
  }, [depSel]);

  const depObj = useMemo(() => departamentos.find((d) => String(d.id) === String(depSel)) || null, [departamentos, depSel]);
  const munObj = useMemo(() => municipiosApi.find((m) => String(m.id) === String(munSel)) || null, [municipiosApi, munSel]);

  const onFile = (e) => {
    const f = e.target.files?.[0] || null;
    setFile(f);
    setPreview(f ? URL.createObjectURL(f) : "");
  };

  const uploadToSupabase = async () => {
    if (!file || !depObj || !munObj) throw new Error("Datos incompletos");
    const ext = file.name.split(".").pop() || "bin";
    const safe = (s) =>
      s.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-");
    const path = `${safe(depObj.name)}/${safe(munObj.name)}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("municipios").upload(path, file, {
      cacheControl: "3600",
      contentType: file.type,
      upsert: false,
    });
    if (error) throw error;
    const { data } = supabase.storage.from("municipios").getPublicUrl(path);
    return data.publicUrl;
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!depSel) return toast("Selecciona un departamento", { variant: "error" });
    if (!munSel) return toast("Selecciona un municipio", { variant: "error" });
    if (!file) return toast("Selecciona una imagen", { variant: "error" });

    try {
      setLoading(true);
      const url = await uploadToSupabase();
      await addDoc(collection(db, "municipios"), {
        departamento: depObj.name,
        municipio: munObj.name,
        url,
        creadoEn: serverTimestamp(),
        resolucionSugerida: "1920x1080 o 3840x2160",
      });
      toast("Municipio registrado", { variant: "success", icon: "✅" });
      setFile(null);
      setPreview("");
      setMunSel("");
    } catch (err) {
      toast(err.message || "Error al guardar", { variant: "error" });
    } finally {
      setLoading(false);
    }
  };

  const eliminar = async (m) => {
    if (!confirm(`Eliminar "${m.departamento} / ${m.municipio}"?`)) return;
    try {
      await deleteDoc(doc(db, "municipios", m.id));
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
            <h1 className="au-title">Gestión de Municipios</h1>
            <p className="au-sub">Selecciona el departamento y municipio, sube una imagen Full HD o 4K.</p>
          </div>
        </header>

        <div className="au-card">
          <div className="au-cardHead">
            <div className="au-chip">{municipios.length} municipios</div>
          </div>
          <div className="au-tableWrap" style={{ padding: 16 }}>
            <form onSubmit={submit} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr auto", gap: 12, alignItems: "center" }}>
              <select value={depSel} onChange={(e) => setDepSel(e.target.value)} className="au-filter">
                <option value="">Departamento</option>
                {departamentos.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
              <select
                value={munSel}
                onChange={(e) => setMunSel(e.target.value)}
                className="au-filter"
                disabled={!depSel || !municipiosApi.length}
              >
                <option value="">{depSel ? "Municipio" : "Selecciona un departamento"}</option>
                {municipiosApi.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
              <input type="file" accept="image/*" onChange={onFile} className="au-filter" />
              <button
                type="submit"
                disabled={loading}
                className="au-btnDanger"
                style={{ background: "#111827", color: "#fff", borderColor: "#111827" }}
              >
                {loading ? "Guardando..." : "Guardar"}
              </button>

              {preview && (
                <div style={{ gridColumn: "1 / -1", display: "flex", gap: 12, alignItems: "center" }}>
                  <img
                    src={preview}
                    alt="preview"
                    style={{
                      maxHeight: 160,
                      borderRadius: 12,
                      border: "1px solid var(--au-line)",
                      background: "#fff",
                    }}
                  />
                </div>
              )}
            </form>
          </div>
        </div>

        <div className="au-card">
          <div className="au-cardHead">
            <h3 className="au-title" style={{ fontSize: "1.1rem" }}>
              Registrados
            </h3>
          </div>
          <div className="au-tableWrap" style={{ padding: 16 }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(260px,1fr))", gap: 14 }}>
              {municipios.map((m) => (
                <article key={m.id} className="au-row" style={{ display: "grid", gap: 8 }}>
                  <div className="au-td" style={{ fontWeight: 800, borderRadius: 14 }}>
                    {m.departamento} / {m.municipio}
                  </div>
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
                    {m.url ? (
                      <img
                        src={m.url}
                        alt={m.municipio}
                        style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }}
                      />
                    ) : (
                      "Sin imagen"
                    )}
                  </div>
                  <div
                    className="au-td"
                    style={{
                      display: "flex",
                      gap: 8,
                      justifyContent: "space-between",
                      alignItems: "center",
                      borderRadius: 14,
                    }}
                  >
                    {m.url ? (
                      <a
                        href={m.url}
                        target="_blank"
                        rel="noreferrer"
                        className="au-btnDanger"
                        style={{
                          background: "linear-gradient(180deg,#ffffff,#f8fafc)",
                          color: "#0b0b0b",
                          borderColor: "rgba(0,0,0,.06)",
                        }}
                      >
                        Ver
                      </a>
                    ) : (
                      <span style={{ color: "var(--au-muted)", fontWeight: 800 }}>Sin URL</span>
                    )}
                    <button onClick={() => eliminar(m)} className="au-btnDanger">
                      🗑 Eliminar
                    </button>
                  </div>
                </article>
              ))}
              {!municipios.length && (
                <div className="au-empty" style={{ gridColumn: "1 / -1" }}>
                  No hay municipios
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
