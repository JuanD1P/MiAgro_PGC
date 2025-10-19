import React, { useEffect, useState, useMemo, useRef, useCallback } from "react";
// import { Link } from "react-router-dom"; // ya no usamos Link
import { db } from "../../firebase/client";
import { collection, addDoc, onSnapshot, deleteDoc, doc, serverTimestamp, updateDoc } from "firebase/firestore";
import { supabase } from "../../supabase/client";
import NavbarAdm from "./NavbarAdm.jsx";
import "./DOCSS/Productos.css";
import { PRODUCTOS_OPCIONES } from "../../data/productosListado";
import Swal from "sweetalert2";
import "@sweetalert2/themes/borderless/borderless.css";

const MESES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
const TIPOS = ["Fruta","Verdura","Tubérculo","Grano","Aromática","Otro"];

function ToastHost({ toasts, onClose }) {
  return (
    <div className="mg-toast-host" role="region" aria-live="polite" aria-label="Notificaciones">
      {toasts.map(t => (
        <div key={t.id} className={`mg-toast ${t.variant ? `mg-toast--${t.variant}` : "mg-toast--info"}`}>
          <div className="mg-toast__icon" aria-hidden="true">{t.icon || "ℹ️"}</div>
          <div className="mg-toast__body">
            {t.title ? <div className="mg-toast__title">{t.title}</div> : null}
            <div className="mg-toast__msg">{t.message}</div>
          </div>
          <button className="mg-toast__close" onClick={()=>onClose(t.id)} aria-label="Cerrar notificación">✕</button>
        </div>
      ))}
    </div>
  );
}

const RangeFree = React.memo(function RangeFree({
  label, unit, placeholderMin, placeholderMax,
  minValue, maxValue, onMinChange, onMaxChange, maxLen = 4
}) {
  return (
    <div className="au-field">
      <div className="au-label">
        {label} {unit ? <span className="au-muted">({unit})</span> : null}
      </div>
      <div className="au-range">
        <input
          type="text"
          className="au-input"
          placeholder={placeholderMin || "Mín."}
          value={minValue}
          onChange={(e)=>onMinChange(e.target.value)}
          autoComplete="off"
          spellCheck={false}
          inputMode="numeric"
          maxLength={maxLen}
          onKeyDown={(e)=>{ if (e.key === "Enter") e.preventDefault(); e.stopPropagation(); }}
          onKeyUp={(e)=>{ e.stopPropagation(); }}
        />
        <span className="au-rangeSep">a</span>
        <input
          type="text"
          className="au-input"
          placeholder={placeholderMax || "Máx."}
          value={maxValue}
          onChange={(e)=>onMaxChange(e.target.value)}
          autoComplete="off"
          spellCheck={false}
          inputMode="numeric"
          maxLength={maxLen}
          onKeyDown={(e)=>{ if (e.key === "Enter") e.preventDefault(); e.stopPropagation(); }}
          onKeyUp={(e)=>{ e.stopPropagation(); }}
        />
      </div>
    </div>
  );
});

export default function ProductosAdmin() {
  const [toasts, setToasts] = useState([]);
  const pushToast = (message, opts={}) => {
    const id = crypto.randomUUID();
    const t = { id, message, duration: opts.duration ?? 3500, ...opts };
    setToasts(prev => [...prev, t]);
    if (t.duration > 0) setTimeout(()=>setToasts(prev=>prev.filter(x=>x.id!==id)), t.duration);
  };
  const closeToast = (id) => setToasts(prev => prev.filter(x=>x.id!==id));
  const notify = {
    success: (msg, o) => pushToast(msg, { title:"Listo", icon:"✅", variant:"success", ...o }),
    error:   (msg, o) => pushToast(msg, { title:"Error", icon:"🛑", variant:"error", ...o }),
    warn:    (msg, o) => pushToast(msg, { title:"Atención", icon:"⚠️", variant:"warning", ...o }),
    info:    (msg, o) => pushToast(msg, { title:"Info", icon:"ℹ️", variant:"info", ...o }),
  };

  const [showForm, setShowForm] = useState(false);

  const [nombre, setNombre] = useState("");
  const [tipo, setTipo] = useState("");
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState("");
  const [loading, setLoading] = useState(false);
  const [productos, setProductos] = useState([]);

  // búsqueda en LISTA de productos (nuevo)
  const [qList, setQList] = useState("");

  // combo de selección para el form
  const [filtro, setFiltro] = useState("");
  const [openList, setOpenList] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  const [dragOver, setDragOver] = useState(false);

  const [agro, setAgro] = useState({ cicloDias: "", epocas: [] });

  const [rangos, setRangos] = useState({
    tempMin: "", tempMax: "",
    humMin:  "", humMax:  "",
    altMin:  "", altMax:  ""
  });

  // MODO EDICIÓN
  const [editing, setEditing] = useState(null);
  const isEditing = !!editing;

  const inputRef = useRef(null);
  const listRef = useRef(null);
  const formRef = useRef(null);

  // Cargar lista
  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, "productos"),
      snap => setProductos(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
      err => notify.error(err.message || "No se pudieron leer los productos")
    );
    return unsub;
  }, []);

  // Scroll al formulario cuando se muestre
  useEffect(() => {
    if (showForm && formRef.current) {
      formRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [showForm]);

  // Cerrar dropdown al hacer clic fuera
  useEffect(() => {
    if (!openList) return;
    const onDocClick = (e) => {
      const inInput = inputRef.current && inputRef.current.contains(e.target);
      const inList  = listRef.current && listRef.current.contains(e.target);
      if (!inInput && !inList) setOpenList(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [openList]);

  const productosExistentes = useMemo(
    () => productos.map(p => (p.nombre || "").toLowerCase().trim()),
    [productos]
  );

  const opcionesFiltradas = useMemo(() => {
    const q = filtro.trim().toLowerCase();
    const base = PRODUCTOS_OPCIONES
      .filter(o => o.label.toLowerCase().includes(q) && !productosExistentes.includes(o.label.toLowerCase().trim()))
      .sort((a,b)=>a.label.localeCompare(b.label,"es"));
    return base.slice(0,50);
  }, [filtro, productosExistentes]);

  const visibleOptions = useMemo(() => opcionesFiltradas.slice(0,8), [opcionesFiltradas]);

  // FILTRO de la grilla
  const productosFiltrados = useMemo(() => {
    const q = qList.trim().toLowerCase();
    if (!q) return productos;
    return productos.filter(p => (p.nombre || "").toLowerCase().includes(q));
  }, [qList, productos]);

  const onFile = (f) => {
    if (!f) return notify.warn("Selecciona una imagen válida");
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };
  const onFileInput = (e) => onFile(e.target.files?.[0] || null);
  const onDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer?.files?.[0] || null;
    if (!f) return notify.warn("Archivo inválido");
    onFile(f);
  };
  const clearImage = () => {
    setFile(null);
    setPreview("");
    const el = document.getElementById("prod-file");
    if (el) el.value = "";
    notify.info("Imagen removida", { duration: 1800 });
  };

  const clearSearch = useCallback(() => {
    setFiltro("");
    setNombre("");
    setOpenList(false);
    inputRef.current?.focus();
  }, []);

  const parseMaybe = (s) => {
    if (s === "" || s === null || s === undefined) return null;
    const n = Number(String(s).replace(",", "."));
    return Number.isFinite(n) ? n : NaN;
  };

  const validarAntesDeGuardar = (requireImage = true) => {
    const tMin = parseMaybe(rangos.tempMin);
    const tMax = parseMaybe(rangos.tempMax);
    const hMin = parseMaybe(rangos.humMin);
    const hMax = parseMaybe(rangos.humMax);
    const aMin = parseMaybe(rangos.altMin);
    const aMax = parseMaybe(rangos.altMax);
    const ciclo = parseMaybe(agro.cicloDias);

    const errors = [];
    const req = (cond, msg) => { if (cond) errors.push(msg); };
    req(!nombre.trim(), "Escribe o selecciona el nombre del producto");
    req(!tipo.trim(), "Selecciona el tipo de producto");
    req(requireImage && !file && !preview, "Agrega una imagen del producto");

    const inRange = (n, lo, hi) => n >= lo && n <= hi;

    if (rangos.tempMin !== "" && Number.isNaN(tMin)) errors.push("Temperatura mínima inválida");
    if (rangos.tempMax !== "" && Number.isNaN(tMax)) errors.push("Temperatura máxima inválida");
    if (rangos.humMin  !== "" && Number.isNaN(hMin))  errors.push("Humedad mínima inválida");
    if (rangos.humMax  !== "" && Number.isNaN(hMax))  errors.push("Humedad máxima inválida");
    if (rangos.altMin  !== "" && Number.isNaN(aMin))  errors.push("Altitud mínima inválida");
    if (rangos.altMax  !== "" && Number.isNaN(aMax))  errors.push("Altitud máxima inválida");
    if (agro.cicloDias !== "" && Number.isNaN(ciclo)) errors.push("Ciclo de días inválido");

    if (!Number.isNaN(tMin ?? NaN) && !inRange(tMin, -50, 80)) errors.push("Temperatura mínima fuera de -50 a 80 °C");
    if (!Number.isNaN(tMax ?? NaN) && !inRange(tMax, -50, 80)) errors.push("Temperatura máxima fuera de -50 a 80 °C");
    if (tMin != null && tMax != null && !Number.isNaN(tMin) && !Number.isNaN(tMax) && tMin > tMax) errors.push("Temperatura: el mínimo no puede ser mayor que el máximo");

    if (!Number.isNaN(hMin ?? NaN) && !inRange(hMin, 0, 100)) errors.push("Humedad mínima fuera de 0–100 %");
    if (!Number.isNaN(hMax ?? NaN) && !inRange(hMax, 0, 100)) errors.push("Humedad máxima fuera de 0–100 %");
    if (hMin != null && hMax != null && !Number.isNaN(hMin) && !Number.isNaN(hMax) && hMin > hMax) errors.push("Humedad: el mínimo no puede ser mayor que el máximo");

    if (!Number.isNaN(aMin ?? NaN) && !inRange(aMin, -200, 9000)) errors.push("Altitud mínima fuera de -200 a 9000 m");
    if (!Number.isNaN(aMax ?? NaN) && !inRange(aMax, -200, 9000)) errors.push("Altitud máxima fuera de -200 a 9000 m");
    if (aMin != null && aMax != null && !Number.isNaN(aMin) && !Number.isNaN(aMax) && aMin > aMax) errors.push("Altitud: el mínimo no puede ser mayor que el máximo");

    if (!Number.isNaN(ciclo ?? NaN) && !inRange(ciclo, 0, 730)) errors.push("Ciclo de días fuera de 0 a 730");

    if (errors.length) { errors.forEach(m=>notify.error(m)); return null; }

    return {
      temperatura: { min: Number.isNaN(tMin) ? null : tMin, max: Number.isNaN(tMax) ? null : tMax, unidad: "°C" },
      humedad:     { min: Number.isNaN(hMin) ? null : hMin, max: Number.isNaN(hMax) ? null : hMax, unidad: "%" },
      altitud:     { min: Number.isNaN(aMin) ? null : aMin, max: Number.isNaN(aMax) ? null : aMax, unidad: "m s. n. m." },
      cicloDias:   Number.isNaN(ciclo) ? null : ciclo,
      epocasSiembra: agro.epocas
    };
  };

  const uploadToSupabase = async (file, nombre) => {
    const ext = file.name.split(".").pop() || "bin";
    const safe = nombre.trim().toLowerCase().replace(/\s+/g, "-");
    const path = `images/${Date.now()}_${safe}.${ext}`;
    const { error } = await supabase.storage.from("productos").upload(path, file, {
      cacheControl: "3600", contentType: file.type, upsert: false
    });
    if (error) throw error;
    const { data } = supabase.storage.from("productos").getPublicUrl(path);
    return data.publicUrl;
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    const docAgro = validarAntesDeGuardar(!isEditing);
    if (!docAgro) return;
    try {
      setLoading(true);

      let url = editing?.url || "";
      if (file) {
        notify.info("Subiendo imagen…", { duration: 2200 });
        url = await uploadToSupabase(file, nombre);
      } else if (!preview && !isEditing) {
        notify.warn("Falta la imagen");
        setLoading(false);
        return;
      }

      const payload = {
        nombre: nombre.trim(),
        tipo: tipo.trim(),
        url,
        agro: docAgro,
        ...(isEditing ? {} : { creadoEn: serverTimestamp() }),
      };

      if (isEditing) {
        await updateDoc(doc(db, "productos", editing.id), payload);
        notify.success("Producto actualizado");
      } else {
        await addDoc(collection(db, "productos"), payload);
        notify.success("Producto creado");
      }

      resetForm();
    } catch (err) {
      notify.error(err.message || "Error al guardar");
    } finally {
      setLoading(false);
    }
  };

  const onSearchKey = (e) => {
    if (!openList && (e.key === "ArrowDown" || e.key === "Enter")) {
      e.preventDefault(); setOpenList(true); setActiveIdx(0); return;
    }
    if (!openList) return;
    if (e.key === "ArrowDown") { e.preventDefault(); setActiveIdx(i=>Math.min(i+1, visibleOptions.length-1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActiveIdx(i=>Math.max(i-1, 0)); }
    else if (e.key === "Enter") { e.preventDefault(); const opt = visibleOptions[activeIdx]; if (opt){ setNombre(opt.value); setFiltro(opt.label); setOpenList(false);} }
    else if (e.key === "Escape") { setOpenList(false); }
  };
  useEffect(()=>{ setActiveIdx(0); }, [filtro]);

  const toggleFromList = (arr, v) => arr.includes(v) ? arr.filter(x=>x!==v) : [...arr, v];

  const ChipMulti = ({ title, options, value, onChange, ariaLabel }) => (
    <div className="au-field">
      <div className="au-label">{title}</div>
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

  const handleTempMin = useCallback((v)=>setRangos(s=>({...s,tempMin:v})),[]);
  const handleTempMax = useCallback((v)=>setRangos(s=>({...s,tempMax:v})),[]);
  const handleHumMin  = useCallback((v)=>setRangos(s=>({...s,humMin:v})),[]);
  const handleHumMax  = useCallback((v)=>setRangos(s=>({...s,humMax:v})),[]);
  const handleAltMin  = useCallback((v)=>setRangos(s=>({...s,altMin:v})),[]);
  const handleAltMax  = useCallback((v)=>setRangos(s=>({...s,altMax:v})),[]);

  const startEdit = (p) => {
    setEditing(p);
    setShowForm(true);
    setNombre(p.nombre || "");
    setFiltro(p.nombre || "");
    setTipo(p.tipo || "");
    setPreview(p.url || "");
    setFile(null);

    const a = p.agro || {};
    setRangos({
      tempMin: a.temperatura?.min?.toString() ?? "",
      tempMax: a.temperatura?.max?.toString() ?? "",
      humMin:  a.humedad?.min?.toString() ?? "",
      humMax:  a.humedad?.max?.toString() ?? "",
      altMin:  a.altitud?.min?.toString() ?? "",
      altMax:  a.altitud?.max?.toString() ?? "",
    });
    setAgro({
      cicloDias: a.cicloDias != null ? String(a.cicloDias) : "",
      epocas: a.epocasSiembra || a.epocas || [],
    });

    // asegúrate de subir hasta el formulario
    requestAnimationFrame(() => {
      if (formRef.current) formRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  const resetForm = () => {
    setAgro({ cicloDias:"", epocas:[] });
    setRangos({ tempMin:"", tempMax:"", humMin:"", humMax:"", altMin:"", altMax:"" });
    setNombre(""); setTipo("");
    setFile(null); setPreview("");
    setFiltro(""); setOpenList(false);
    setEditing(null);
    setShowForm(false);
  };

  const eliminar = async (p) => {
    const { isConfirmed } = await Swal.fire({
      icon: "warning",
      title: "¿Eliminar producto?",
      showCancelButton: true,
      confirmButtonText: "Sí, eliminar",
      cancelButtonText: "Cancelar",
      reverseButtons: true,
      focusConfirm: false,
      buttonsStyling: false,
      customClass: { popup: "au-sw-popup", title: "au-sw-title", actions: "au-sw-actions", confirmButton: "au-sw-confirm", cancelButton: "au-sw-cancel" },
      preConfirm: () => {
        const v = (document.getElementById("sw-del-confirm")?.value || "").trim().toUpperCase();
        if (v !== "ELIMINAR") {
          Swal.showValidationMessage("Debes escribir ELIMINAR");
          return false;
        }
      }
    });
    if (!isConfirmed) return;
    try {
      await Swal.fire({
        title: "Eliminando…",
        html: "Por favor espera",
        allowOutsideClick: false,
        showConfirmButton: false,
        didOpen: async () => {
          Swal.showLoading();
          await deleteDoc(doc(db, "productos", p.id));
          Swal.close();
        }
      });
      notify.warn("Producto eliminado");
    } catch (e) {
      Swal.close();
      notify.error(e.message || "No se pudo eliminar");
    }
  };

  return (
    <div className="au-layout">
      <NavbarAdm />
      <section className="au-main">
        <ToastHost toasts={toasts} onClose={closeToast} />

        <header className="au-mainHead">
          <h1 className="au-title">Gestión de Productos</h1>
          <button
            className="au-btnPrimary au-btnAdd"
            type="button"
            onClick={()=> setShowForm(v => { if (!v) setEditing(null); return !v; })}
            aria-expanded={showForm}
            aria-controls="pro-form-card"
          >
            {showForm ? "✕ Cerrar" : "+ Agregar"}
          </button>
        </header>

        {/* Búsqueda en la lista */}
        <div className="pro-searchbar">
          <input
            className="pro-searchInput"
            type="text"
            placeholder="Buscar producto"
            value={qList}
            onChange={(e)=>setQList(e.target.value)}
            aria-label="Buscar producto por nombre"
          />
        </div>

        {showForm && (
          <div className="au-card" id="pro-form-card" ref={formRef}>
            <div className="au-cardHead">
              <div className="au-chip">{isEditing ? "Editar producto" : "Nuevo producto"}</div>
            </div>

            <div className="au-pad16">
              <form onSubmit={onSubmit} className="pro-form" autoComplete="off">
                <div className="form-wrap">
                  <section className="form-col">
                    <div className="section">
                      <div className="section-head">
                        <div className="section-title">Básicos</div>
                        <div className="section-sub">Nombre y tipo</div>
                      </div>
                      <div className="grid-2">
                        <div className="au-field">
                          <div className="au-label">Producto</div>
                          <div className="au-pro-combobox" aria-haspopup="listbox" aria-expanded={openList}>
                            <input
                              ref={inputRef}
                              value={filtro}
                              onChange={(e)=>{ setFiltro(e.target.value); setOpenList(true); }}
                              onFocus={()=>setOpenList(true)}
                              onKeyDown={onSearchKey}
                              placeholder="Buscar o elegir producto"
                              className="au-pro-search"
                              role="combobox"
                              aria-controls="pro-options"
                              aria-autocomplete="list"
                              autoComplete="off"
                              spellCheck={false}
                            />
                            <button
                              type="button"
                              className="au-pro-clear"
                              onClick={clearSearch}
                              aria-label="Limpiar búsqueda"
                            >
                              ✕
                            </button>
                            {openList && (
                              <div className="au-pro-list" id="pro-options" role="listbox" ref={listRef}>
                                {visibleOptions.length ? (
                                  visibleOptions.map((o, i) => {
                                    const q = filtro.trim().toLowerCase();
                                    const idx = o.label.toLowerCase().indexOf(q);
                                    const before = idx >= 0 ? o.label.slice(0, idx) : o.label;
                                    const match  = idx >= 0 ? o.label.slice(idx, idx + q.length) : "";
                                    const after  = idx >= 0 ? o.label.slice(idx + q.length) : "";
                                    return (
                                      <div
                                        key={o.value}
                                        role="option"
                                        aria-selected={i === activeIdx}
                                        className={`au-pro-option ${i === activeIdx ? "is-active" : ""}`}
                                        onMouseDown={() => { setNombre(o.value); setFiltro(o.label); setOpenList(false); }}
                                      >
                                        <span className="au-pro-optionText">
                                          {idx >= 0 ? (<>{before}<strong>{match}</strong>{after}</>) : o.label}
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
                        </div>

                        <div className="au-field">
                          <div className="au-label">Tipo</div>
                          <select value={tipo} onChange={(e)=>setTipo(e.target.value)} className="au-input">
                            <option value="">Selecciona el tipo</option>
                            {TIPOS.map(t => <option key={t} value={t}>{t}</option>)}
                          </select>
                        </div>
                      </div>
                    </div>

                    <div className="section">
                      <div className="section-head">
                        <div className="section-title">Imagen</div>
                        <div className="section-sub">Vista previa de la imagen seleccionada</div>
                      </div>
                      <div className="au-field au-field-file">
                        <div className="au-label">Archivo</div>
                        <div
                          className={`au-pro-dropzone ${dragOver ? "is-over" : ""}`}
                          onDragOver={(e)=>{ e.preventDefault(); setDragOver(true); }}
                          onDragLeave={()=>setDragOver(false)}
                          onDrop={onDrop}
                          tabIndex={0}
                          role="button"
                          aria-label="Seleccionar o arrastrar imagen"
                        >
                          <input id="prod-file" type="file" accept="image/*" onChange={onFileInput} />
                          {!preview && (
                            <div className="au-dz-inner">
                              <div className="au-dz-icon">📷</div>
                              <div className="au-dz-label">Seleccionar o arrastrar imagen</div>
                            </div>
                          )}
                          {preview && (
                            <div className="au-pro-previewOverlay">
                              <img src={preview} alt="preview" className="au-pro-previewImgContain" />
                              <button type="button" className="au-btnDanger au-btnDangerSolid au-pro-remove" onClick={clearImage}>Quitar</button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </section>

                  <section className="form-col">
                    <div className="section">
                      <div className="section-head">
                        <div className="section-title">Parámetros</div>
                        <div className="section-sub">Rangos recomendados</div>
                      </div>
                      <div className="grid-2">
                        <RangeFree
                          label="Temperatura ideal"
                          unit="°C"
                          placeholderMin="18"
                          placeholderMax="28"
                          minValue={rangos.tempMin}
                          maxValue={rangos.tempMax}
                          onMinChange={handleTempMin}
                          onMaxChange={handleTempMax}
                          maxLen={4}
                        />
                        <RangeFree
                          label="Humedad relativa"
                          unit="%"
                          placeholderMin="50"
                          placeholderMax="80"
                          minValue={rangos.humMin}
                          maxValue={rangos.humMax}
                          onMinChange={handleHumMin}
                          onMaxChange={handleHumMax}
                          maxLen={4}
                        />
                        <RangeFree
                          label="Altitud"
                          unit="m s. n. m."
                          placeholderMin="0"
                          placeholderMax="2600"
                          minValue={rangos.altMin}
                          maxValue={rangos.altMax}
                          onMinChange={handleAltMin}
                          onMaxChange={handleAltMax}
                          maxLen={4}
                        />
                        <div className="au-field">
                          <div className="au-label">Ciclo (días a cosecha)</div>
                          <input
                            type="text"
                            className="au-input"
                            placeholder="90"
                            value={agro.cicloDias}
                            onChange={(e)=>setAgro(s=>({...s, cicloDias:e.target.value}))}
                            autoComplete="off"
                            spellCheck={false}
                            inputMode="numeric"
                            maxLength={4}
                            name="cicloDias"
                            onKeyDown={(e)=>{ if (e.key === "Enter") e.preventDefault(); e.stopPropagation(); }}
                            onKeyUp={(e)=>{ e.stopPropagation(); }}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="section">
                      <div className="section-head">
                        <div className="section-title">Épocas</div>
                        <div className="section-sub">Puedes escoger varios</div>
                      </div>
                      <ChipMulti
                        title="Meses de siembra"
                        options={MESES}
                        value={agro.epocas}
                        onChange={(v)=>setAgro(s=>({...s, epocas: v}))}
                        ariaLabel="Selecciona los meses recomendados de siembra"
                      />
                    </div>
                  </section>
                </div>

                <div className="au-actions">
                  <button type="submit" disabled={loading} className="au-btnPrimary pro-btnSave">
                    {loading ? "Guardando..." : (isEditing ? "Actualizar" : "Guardar")}
                  </button>
                  <button type="button" className="au-btnGhost" onClick={resetForm}>Cancelar</button>
                </div>
              </form>
            </div>
          </div>
        )}

        <div className="au-card">
          <div className="au-cardHead">
            <h3 className="au-title au-title-sm">Registrados</h3>
            <div className="au-cardActions">
              <span className="au-chip">{productosFiltrados.length} productos</span>
            </div>
          </div>
          <div className="au-pad16">
            <div className="au-cardsGrid">
              {productosFiltrados.map((p) => (
                <article key={p.id} className="pro-card">
                  <div className="pro-thumb">
                    {p.url ? <img src={p.url} alt={p.nombre} loading="lazy" decoding="async" /> : <div className="pro-thumbEmpty">Sin imagen</div>}
                    {p.tipo ? <span className="pro-badge">{p.tipo}</span> : null}
                  </div>
                  <div className="pro-body">
                    <h4 className="pro-name">{p.nombre}</h4>
                    <div className="pro-meta">
                      {p.agro?.temperatura ? <span className="pro-chip">{p.agro.temperatura.min ?? "–"}–{p.agro.temperatura.max ?? "–"} °C</span> : null}
                      {p.agro?.humedad ? <span className="pro-chip">{p.agro.humedad.min ?? "–"}–{p.agro.humedad.max ?? "–"} %</span> : null}
                      {p.agro?.altitud ? <span className="pro-chip">{p.agro.altitud.min ?? "–"}–{p.agro.altitud.max ?? "–"} m</span> : null}
                      {p.agro?.cicloDias ? <span className="pro-chip">{p.agro.cicloDias} días</span> : null}
                    </div>
                    <div className="pro-actions">
                      <button
                        type="button"
                        onClick={() => startEdit(p)}
                        className="au-btnPrimary au-btnSm"
                      >
                        Administrar contenido
                      </button>
                      <button onClick={() => eliminar(p)} className="au-btnDanger au-btnSm">Eliminar</button>
                    </div>
                  </div>
                </article>
              ))}
              {!productosFiltrados.length && <div className="au-empty pro-empty">No hay productos</div>}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
