import React, { useEffect, useState, useMemo, useRef } from "react";
import { db } from "../../firebase/client";
import { collection, addDoc, onSnapshot, deleteDoc, doc, serverTimestamp } from "firebase/firestore";
import { supabase } from "../../supabase/client";
import ToastStack from "../ToastStack";
import NavbarAdm from "./NavbarAdm.jsx";
import "./DOCSS/Productos.css";


import { PRODUCTOS_OPCIONES } from "../../data/productosListado";

const MESES = [
  "Enero","Febrero","Marzo","Abril","Mayo","Junio",
  "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"
];

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

  // Solo los campos solicitados
  const [agro, setAgro] = useState({
    tempMin: "", tempMax: "",
    humMin: "", humMax: "",
    altMin: "", altMax: "",
    cicloDias: "",
    epocas: []
  });

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

  const numOrNull = (v) => {
    if (v === "" || v === null || v === undefined) return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  };

  const validarRangos = () => {
    const checks = [
      { a: "tempMin", b: "tempMax", label: "Temperatura (°C)" },
      { a: "humMin",  b: "humMax",  label: "Humedad relativa (%)" },
      { a: "altMin",  b: "altMax",  label: "Altitud (m s. n. m.)" },
    ];
    for (const c of checks) {
      const a = numOrNull(agro[c.a]);
      const b = numOrNull(agro[c.b]);
      if (a !== null && b !== null && a > b) {
        notify.error(`Revisa el rango de ${c.label}: el mínimo no puede ser mayor que el máximo.`);
        return false;
      }
    }
    return true;
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!nombre.trim()) return notify.error("Selecciona un producto de la lista o escribe uno", { title: "Nombre requerido" });
    if (!file) return notify.error("Selecciona una imagen del producto", { title: "Imagen requerida" });
    if (!validarRangos()) return;

    try {
      setLoading(true);
      notify.info("Subiendo imagen…", { duration: 2500 });
      const url = await uploadToSupabase(file, nombre);

      const docAgro = {
        temperatura: { min: numOrNull(agro.tempMin), max: numOrNull(agro.tempMax), unidad: "°C" },
        humedad:     { min: numOrNull(agro.humMin),  max: numOrNull(agro.humMax),  unidad: "%" },
        altitud:     { min: numOrNull(agro.altMin),  max: numOrNull(agro.altMax),  unidad: "m s. n. m." },
        cicloDias: numOrNull(agro.cicloDias),
        epocasSiembra: agro.epocas
      };

      await addDoc(collection(db, "productos"), {
        nombre: nombre.trim(),
        url,
        creadoEn: serverTimestamp(),
        agro: docAgro
      });

      notify.success("Producto creado con datos agronómicos");
      setNombre("");
      setFile(null);
      setPreview("");
      setFiltro("");
      setOpenList(false);
      setAgro({
        tempMin: "", tempMax: "",
        humMin: "", humMax: "",
        altMin: "", altMax: "",
        cicloDias: "",
        epocas: []
      });
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

  const toggleFromList = (arr, value) => {
    return arr.includes(value) ? arr.filter(v => v !== value) : [...arr, value];
  };

  const ChipMulti = ({ title, options, value, onChange, ariaLabel }) => (
    <div className="au-field">
      <label className="au-label">{title}</label>
      <div className="au-chips" role="group" aria-label={ariaLabel || title}>
        {options.map(op => (
          <button
            key={op}
            type="button"
            className={`au-chip ${value.includes(op) ? "is-selected" : ""}`}
            onClick={() => onChange(toggleFromList(value, op))}
            aria-pressed={value.includes(op)}
          >
            {op}
          </button>
        ))}
      </div>
    </div>
  );

  const Range = ({ label, minName, maxName, unit, step="any", placeholderMin, placeholderMax }) => (
    <div className="au-field">
      <label className="au-label">{label} {unit ? <span className="au-muted">({unit})</span> : null}</label>
      <div className="au-range">
        <input
          type="number"
          step={step}
          value={agro[minName]}
          onChange={(e)=>setAgro((s)=>({...s,[minName]: e.target.value}))}
          className="au-input"
          placeholder={placeholderMin || "Mín."}
          aria-label={`${label} mínimo`}
        />
        <span className="au-rangeSep">a</span>
        <input
          type="number"
          step={step}
          value={agro[maxName]}
          onChange={(e)=>setAgro((s)=>({...s,[maxName]: e.target.value}))}
          className="au-input"
          placeholder={placeholderMax || "Máx."}
          aria-label={`${label} máximo`}
        />
      </div>
    </div>
  );

  return (
    <div className="au-layout">
      <NavbarAdm />
      <section className="au-main">
        <ToastStack toasts={toasts} onClose={closeToast} />

        <header className="au-mainHead">
          <div>
            <h1 className="au-title">Gestión de Productos</h1>
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
                <div className="au-dz-icon">📷</div>
                <div className="au-dz-label">Seleccionar o arrastrar imagen</div>
                {file && <span className="au-dz-filename">{file.name}</span>}
              </div>

              {preview && (
                <div className="au-pro-preview">
                  <img src={preview} alt="preview" className="au-pro-previewImg" />
                  <button type="button" className="au-btnDanger au-btnDangerSolid" onClick={clearImage}>Quitar imagen</button>
                </div>
              )}

              <div className="au-grid-2">
                <Range label="Temperatura ideal" minName="tempMin" maxName="tempMax" unit="°C" step="0.1" placeholderMin="18" placeholderMax="28" />
                <Range label="Humedad relativa" minName="humMin" maxName="humMax" unit="%" step="1" placeholderMin="50" placeholderMax="80" />
                <Range label="Altitud" minName="altMin" maxName="altMax" unit="m s. n. m." step="1" placeholderMin="0" placeholderMax="2600" />

                <div className="au-field">
                  <label className="au-label">Ciclo (días a cosecha)</label>
                  <input
                    type="number"
                    className="au-input"
                    placeholder="Ej. 90–120"
                    value={agro.cicloDias}
                    onChange={(e)=>setAgro(s=>({...s,cicloDias:e.target.value}))}
                    min="0"
                  />
                </div>
              </div>

              <ChipMulti
                title="Épocas de siembra (meses)"
                options={MESES}
                value={agro.epocas}
                onChange={(v)=>setAgro(s=>({...s, epocas: v}))}
                ariaLabel="Selecciona los meses recomendados de siembra"
              />

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
                  <div className="au-td au-tdStrong au-pro-name">
                    {p.nombre}
                    {p.agro?.temperatura && (
                      <div className="au-muted" style={{fontSize:".85rem"}}>
                        {p.agro.temperatura.min ?? "–"}–{p.agro.temperatura.max ?? "–"} °C
                        {" • "}
                        Hum.: {p.agro.humedad?.min ?? "–"}–{p.agro.humedad?.max ?? "–"} %
                      </div>
                    )}
                  </div>
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
