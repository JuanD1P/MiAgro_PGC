import React, { useEffect, useState, useMemo, useRef } from "react";
import { db } from "../../firebase/client";
import { collection, addDoc, onSnapshot, deleteDoc, doc, serverTimestamp } from "firebase/firestore";
import { supabase } from "../../supabase/client";
import ToastStack from "../ToastStack";
import NavbarAdm from "./NavbarAdm.jsx";
import "./DOCSS/Admin.css";
import { PRODUCTOS_OPCIONES } from "../../data/productosListado";

export default function ProductosAdmin() {
  const [toasts, setToasts] = useState([]);
  const toast = (m, o = {}) => setToasts((t) => [...t, { id: crypto.randomUUID(), message: m, ...o }]);
  const closeToast = (id) => setToasts((t) => t.filter((x) => x.id !== id));


  const notify = {
    success: (msg, opts) => toast(msg, { title: "Listo", icon: "✅", variant: "success", ...opts }),
    error:   (msg, opts) => toast(msg, { title: "Revisa esto", icon: "⛔", variant: "error", ...opts }),
    warn:    (msg, opts) => toast(msg, { title: "Atención", icon: "⚠️", variant: "warning", ...opts }),
    info:    (msg, opts) => toast(msg, { title: "Info", icon: "ℹ️", variant: "info", ...opts }),
  };

  const [nombre, setNombre] = useState("");
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState("");
  const [loading, setLoading] = useState(false);
  const [productos, setProductos] = useState([]);
  const [filtro, setFiltro] = useState("");

  const [openList, setOpenList] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  const [dragOver, setDragOver] = useState(false);

  const inputRef = useRef(null);
  const listRef = useRef(null);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "productos"), (snap) => {
      setProductos(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    }, (err) => notify.error(err.message || "Error leyendo productos"));
    return unsub;
  }, []);

  const productosExistentes = useMemo(
    () => productos.map((p) => (p.nombre || "").toLowerCase().trim()),
    [productos]
  );

  const opcionesFiltradas = useMemo(() => {
    const q = filtro.trim().toLowerCase();
    const base = PRODUCTOS_OPCIONES
      .filter((o) => o.label.toLowerCase().includes(q) && !productosExistentes.includes(o.label.toLowerCase().trim()))
      .sort((a, b) => a.label.localeCompare(b.label, "es"));
    return base.slice(0, 50);
  }, [filtro, productosExistentes]);

  const visibleOptions = useMemo(() => opcionesFiltradas.slice(0, 8), [opcionesFiltradas]);

  const onFile = (f) => {
    if (!f) {
      notify.warn("No seleccionaste ninguna imagen");
      return;
    }
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const onFileInput = (e) => {
    const f = e.target.files?.[0] || null;
    onFile(f);
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer?.files?.[0] || null;
    if (!f) return notify.warn("Archivo inválido o vacío");
    onFile(f);
  };

  const clearImage = () => {
    setFile(null);
    setPreview("");
    const el = document.getElementById("prod-file");
    if (el) el.value = "";
    notify.info("Imagen removida", { duration: 2000 });
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
    if (!nombre.trim()) return notify.error("Selecciona un producto de la lista o escribe uno", { title: "Nombre requerido" });
    if (!file) return notify.error("Selecciona una imagen del producto", { title: "Imagen requerida" });
    try {
      setLoading(true);
      notify.info("Subiendo imagen…", { duration: 2500 });
      const url = await uploadToSupabase(file, nombre);
      await addDoc(collection(db, "productos"), { nombre: nombre.trim(), url, creadoEn: serverTimestamp() });
      notify.success("Producto creado");
      setNombre("");
      setFile(null);
      setPreview("");
      setFiltro("");
      setOpenList(false);
    } catch (err) {
      notify.error(err.message || "Error subiendo/guardando");
    } finally {
      setLoading(false);
    }
  };

  const eliminar = async (p) => {
    if (!confirm(`Eliminar "${p.nombre}"?`)) return;
    try {
      await deleteDoc(doc(db, "productos", p.id));
      notify.warn("Producto eliminado");
    } catch (e) {
      notify.error(e.message || "No se pudo eliminar");
    }
  };

  const selectOption = (opt) => {
    setNombre(opt.value);
    setFiltro(opt.label);
    setOpenList(false);
    inputRef.current?.blur();
    toast(`Seleccionaste: ${opt.label}`, { variant: "info", icon: "✅", title: "Producto" });
  };

  const onSearchKey = (e) => {
    if (!openList && (e.key === "ArrowDown" || e.key === "Enter")) {
      setOpenList(true);
      setActiveIdx(0);
      return;
    }
    if (!openList) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, visibleOptions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const opt = visibleOptions[activeIdx];
      if (opt) selectOption(opt);
    } else if (e.key === "Escape") {
      setOpenList(false);
    }
  };

  useEffect(() => {
    setActiveIdx(0);
  }, [filtro]);

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
          <div className="au-tableWrap au-pad16">
            <form onSubmit={submit} className="au-pro-form">
              <div className="au-pro-group">
                <div className="au-pro-combobox" aria-haspopup="listbox" aria-expanded={openList}>
                  <input
                    ref={inputRef}
                    value={filtro}
                    onChange={(e) => {
                      setFiltro(e.target.value);
                      setOpenList(true);
                    }}
                    onFocus={() => setOpenList(true)}
                    onKeyDown={onSearchKey}
                    placeholder="Buscar o elegir producto"
                    className="au-pro-search"
                    role="combobox"
                    aria-controls="pro-options"
                    aria-autocomplete="list"
                  />
                  <button
                    type="button"
                    className="au-pro-clear"
                    onClick={() => {
                      setFiltro("");
                      setNombre("");
                      inputRef.current?.focus();
                      notify.info("Búsqueda limpiada", { duration: 1500 });
                    }}
                    aria-label="Limpiar búsqueda"
                  >
                    ✕
                  </button>
                  {openList && (
                    <div className="au-pro-list" id="pro-options" role="listbox" ref={listRef}>
                      {visibleOptions.length ? (
                        visibleOptions.map((o, i) => {
                          const idx = o.label.toLowerCase().indexOf(filtro.trim().toLowerCase());
                          const before = idx >= 0 ? o.label.slice(0, idx) : o.label;
                          const match = idx >= 0 ? o.label.slice(idx, idx + filtro.trim().length) : "";
                          const after = idx >= 0 ? o.label.slice(idx + filtro.trim().length) : "";
                          return (
                            <div
                              key={o.value}
                              role="option"
                              aria-selected={i === activeIdx}
                              className={`au-pro-option ${i === activeIdx ? "is-active" : ""}`}
                              onMouseDown={() => selectOption(o)}
                            >
                              <span className="au-pro-optionText">
                                {idx >= 0 ? (
                                  <>
                                    {before}<strong>{match}</strong>{after}
                                  </>
                                ) : (
                                  o.label
                                )}
                              </span>
                            </div>
                          );
                        })
                      ) : (
                        <div className="au-pro-emptyOpt">Sin resultados</div>
                      )}
                    </div>
                  )}
                </div>

                <select
                  value={nombre}
                  onChange={(e) => {
                    const val = e.target.value;
                    setNombre(val);
                    const opt = PRODUCTOS_OPCIONES.find((x) => x.value === val);
                    setFiltro(opt ? opt.label : val);
                    setOpenList(false);
                  }}
                  className="au-pro-select"
                >
                  <option value="">Selecciona un producto</option>
                  {opcionesFiltradas.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>

              <div
                className={`au-pro-dropzone ${dragOver ? "is-over" : ""}`}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={onDrop}
                tabIndex={0}
                role="button"
                aria-label="Seleccionar o arrastrar imagen"
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    document.getElementById("prod-file")?.click();
                  }
                }}
              >
                <input id="prod-file" type="file" accept="image/*" onChange={onFileInput} />
                <div className="au-dz-icon">🖼️</div>
                <div className="au-dz-label">Seleccionar o arrastrar imagen</div>
                {file && <span className="au-dz-filename">{file.name}</span>}
              </div>

              {preview && (
                <div className="au-pro-preview">
                  <img src={preview} alt="preview" className="au-pro-previewImg" />
                  <button type="button" className="au-btnDanger au-btnDangerSolid" onClick={clearImage}>Quitar imagen</button>
                </div>
              )}

              <button type="submit" disabled={loading} className="au-btnDanger au-pro-btnSave">
                {loading ? "Guardando..." : "Guardar"}
              </button>
            </form>
          </div>
        </div>

        <div className="au-card">
          <div className="au-cardHead">
            <h3 className="au-title au-title-sm">Registrados</h3>
          </div>
          <div className="au-tableWrap au-pad16">
            <div className="au-pro-grid">
              {productos.map((p) => (
                <article key={p.id} className="au-row au-pro-card">
                  <div className="au-td au-pro-stage">
                    {p.url ? <img src={p.url} alt={p.nombre} className="au-pro-img" loading="lazy" decoding="async" /> : "Sin imagen"}
                  </div>
                  <div className="au-td au-tdStrong au-pro-name">{p.nombre}</div>
                  <div className="au-td au-pro-actions">
                    {p.url ? (
                      <a href={p.url} target="_blank" rel="noreferrer" className="au-pro-link">Ver</a>
                    ) : (
                      <span className="au-muted">Sin URL</span>
                    )}
                    <button onClick={() => eliminar(p)} className="au-btnDanger">🗑 Eliminar</button>
                  </div>
                </article>
              ))}
              {!productos.length && <div className="au-empty au-pro-empty">No hay productos</div>}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
