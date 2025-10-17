import React, { useEffect, useState, useMemo, useDeferredValue } from "react";
import { db } from "../../firebase/client";
import {
  collection,
  addDoc,
  onSnapshot,
  deleteDoc,
  doc,
  serverTimestamp,
} from "firebase/firestore";
import { supabase } from "../../supabase/client";
import ToastStack from "../ToastStack";
import NavbarAdm from "./NavbarAdm.jsx";
import "./DOCSS/Admin.css";
import Swal from "sweetalert2";
import "@sweetalert2/themes/borderless/borderless.css";
import { useNavigate } from "react-router-dom";

const RegistradosGrid = React.memo(function RegistradosGrid({
  items,
  abrirAdmin,
  eliminar,
}) {
  const deferredItems = useDeferredValue(items);
  return (
    <div className="au-cards-grid">
      {deferredItems.map((m) => (
        <article key={m.id} className="au-row au-cardItem">
          <div className="au-td au-cardTitle">
            {m.departamento} / {m.municipio}
          </div>
          <div className="au-td au-imgBox">
            {m.url ? (
              <img
                src={m.url}
                alt={m.municipio}
                className="au-imgContain"
                loading="lazy"
                decoding="async"
              />
            ) : (
              <span className="au-emptyText">Sin imagen</span>
            )}
          </div>
          <div className="au-td au-actions">
            <button
              onClick={() => abrirAdmin(m)}
              className="au-btnDanger au-btnLight"
            >
              Administrar contenido
            </button>
            <button onClick={() => eliminar(m)} className="au-btnDanger">
              🗑 Eliminar
            </button>
          </div>
        </article>
      ))}
      {!deferredItems.length && (
        <div className="au-empty au-gridFull">No hay municipios</div>
      )}
    </div>
  );
});

export default function MunicipiosAdm() {
  const [toasts, setToasts] = useState([]);
  const toast = (m, o = {}) =>
    setToasts((t) => [...t, { id: crypto.randomUUID(), message: m, ...o }]);
  const closeToast = (id) => setToasts((t) => t.filter((x) => x.id !== id));
  const notify = {
    success: (msg, opts) =>
      toast(msg, { title: "Listo", icon: "✅", variant: "success", ...opts }),
    error: (msg, opts) =>
      toast(msg, { title: "Revisa esto", icon: "⛔", variant: "error", ...opts }),
    warn: (msg, opts) =>
      toast(msg, { title: "Atención", icon: "⚠️", variant: "warning", ...opts }),
    info: (msg, opts) =>
      toast(msg, { title: "Info", icon: "ℹ️", variant: "info", ...opts }),
  };

  const [departamentos, setDepartamentos] = useState([]);
  const [municipiosApi, setMunicipiosApi] = useState([]);
  const [depSel, setDepSel] = useState("");
  const [munSel, setMunSel] = useState("");
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState("");
  const [loading, setLoading] = useState(false);
  const [municipios, setMunicipios] = useState([]);
  const [dragOver, setDragOver] = useState(false);
  const [lightUI, setLightUI] = useState(false);

  const navigate = useNavigate();

  const safe = (s) =>
    s
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-");

  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, "municipios"),
      (snap) => setMunicipios(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
      (err) => notify.error(err.message || "Error al leer municipios")
    );
    return unsub;
  }, []);

  useEffect(() => {
    const cargarDeps = async () => {
      try {
        const r = await fetch("https://api-colombia.com/api/v1/Department");
        const j = await r.json();
        const orden = j.sort((a, b) => a.name.localeCompare(b.name, "es"));
        setDepartamentos(orden);
      } catch {
        notify.error("No se pudieron cargar departamentos");
      }
    };
    cargarDeps();
  }, []);

  useEffect(() => {
    let alive = true;
    const cargarMuns = async () => {
      if (!depSel) {
        setMunicipiosApi([]);
        setMunSel("");
        return;
      }
      try {
        const r = await fetch(
          `https://api-colombia.com/api/v1/Department/${depSel}/cities`
        );
        const j = await r.json();
        const orden = j.sort((a, b) => a.name.localeCompare(b.name, "es"));
        if (alive) {
          setMunicipiosApi(orden);
          setMunSel("");
        }
      } catch {
        notify.error("No se pudieron cargar municipios");
      }
    };
    cargarMuns();
    return () => {
      alive = false;
    };
  }, [depSel]);

  const depObj = useMemo(
    () => departamentos.find((d) => String(d.id) === String(depSel)) || null,
    [departamentos, depSel]
  );
  const munObj = useMemo(
    () => municipiosApi.find((m) => String(m.id) === String(munSel)) || null,
    [municipiosApi, munSel]
  );

  const depOptions = useMemo(
    () =>
      departamentos.map((d) => (
        <option key={d.id} value={d.id}>
          {d.name}
        </option>
      )),
    [departamentos]
  );

  const munOptions = useMemo(
    () =>
      municipiosApi.map((m) => (
        <option key={m.id} value={m.id}>
          {m.name}
        </option>
      )),
    [municipiosApi]
  );

  const onFile = (e) => {
    const f = e.target.files?.[0] || null;
    setFile(f);
    setPreview(f ? URL.createObjectURL(f) : "");
    if (!f) notify.warn("No seleccionaste ninguna imagen");
  };
  const onDropFile = (e) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer?.files?.[0] || null;
    if (!f) return notify.warn("Archivo inválido o vacío");
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };
  const onKeyDropzone = (e) => {
    if (e.key === "Enter" || e.key === " ") {
      document.getElementById("mun-file")?.click();
    }
  };

  const uploadToSupabase = async () => {
    if (!file || !depObj || !munObj) throw new Error("Datos incompletos");
    const ext = file.name.split(".").pop() || "bin";
    const path = `${safe(depObj.name)}/${safe(munObj.name)}/${Date.now()}.${ext}`;
    const up = await supabase.storage
      .from("municipios")
      .upload(path, file, {
        cacheControl: "3600",
        contentType: file.type,
        upsert: false,
      });
    if (up.error) throw up.error;
    const signed = await supabase.storage
      .from("municipios")
      .createSignedUrl(path, 60 * 60 * 24 * 365 * 5);
    if (signed.error) throw signed.error;
    return signed.data.signedUrl;
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!depSel) return notify.error("Selecciona un departamento", { title: "Falta departamento" });
    if (!munSel) return notify.error("Selecciona un municipio", { title: "Falta municipio" });
    if (!file) return notify.error("Selecciona una imagen (16:9)", { title: "Imagen requerida" });

    try {
      setLoading(true);
      notify.info("Subiendo imagen…", { duration: 2500 });
      const url = await uploadToSupabase();
      await addDoc(collection(db, "municipios"), {
        departamento: depObj.name,
        municipio: munObj.name,
        url,
        creadoEn: serverTimestamp(),
        resolucionSugerida: "1920x1080 o 3840x2160",
      });
      notify.success("Municipio registrado");
      setFile(null);
      setPreview("");
      setMunSel("");
    } catch (err) {
      notify.error(err.message || "Error al guardar");
    } finally {
      setLoading(false);
    }
  };

  const eliminar = async (m) => {
    const result = await Swal.fire({
      title: "¿Eliminar municipio?",
      html: `Esto eliminará <b>${m.departamento} / ${m.municipio}</b> de la base de datos.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Sí, eliminar",
      cancelButtonText: "Cancelar",
      reverseButtons: true,
      showLoaderOnConfirm: true,
      buttonsStyling: false,
      customClass: {
        popup: "au-sw-popup",
        title: "au-sw-title",
        htmlContainer: "au-sw-text",
        actions: "au-sw-actions",
        confirmButton: "au-sw-confirm",
        cancelButton: "au-sw-cancel",
      },
      preConfirm: async () => {
        try {
          await deleteDoc(doc(db, "municipios", m.id));
        } catch (error) {
          Swal.showValidationMessage(
            error?.message || "No se pudo eliminar el municipio"
          );
          return false;
        }
      },
      allowOutsideClick: () => !Swal.isLoading(),
    });
    if (result.isConfirmed) {
      notify.warn("Municipio eliminado");
    }
  };

  const abrirAdmin = (m) => navigate(`/admin/municipios/${m.id}`);

  return (
    <div className={`au-layout ${lightUI ? "is-light" : ""}`}>
      <NavbarAdm />
      <section className="au-main">
        <ToastStack toasts={toasts} onClose={closeToast} />
        <header className="au-mainHead">
          <div>
            <h1 className="au-title">Gestión de Municipios</h1>
            <p className="au-sub">
              Selecciona el departamento y municipio, sube una imagen Full HD o 4K.
            </p>
          </div>
        </header>

        <div className="au-card">
          <div className="au-cardHead">
            <div className="au-chip">{municipios.length} municipios</div>
          </div>
          <div className="au-tableWrap au-pad16">
            <form onSubmit={submit} className="au-grid-form au-grid-form--enhanced">
              <div className="au-field">
                <label className="au-label">Departamento</label>
                <select
                  value={depSel}
                  onChange={(e) => setDepSel(e.target.value)}
                  onMouseDown={() => setLightUI(true)}
                  onBlur={() => setLightUI(false)}
                  className="au-filter au-input"
                >
                  <option value="">Selecciona un departamento</option>
                  {depOptions}
                </select>
                <div className="au-help">
                  Primero el departamento. Esto cargará sus municipios.
                </div>
              </div>

              <div className="au-field">
                <label className="au-label">Municipio</label>
                <select
                  value={munSel}
                  onChange={(e) => setMunSel(e.target.value)}
                  onMouseDown={() => setLightUI(true)}
                  onBlur={() => setLightUI(false)}
                  className="au-filter au-input"
                  disabled={!depSel || !municipiosApi.length}
                >
                  <option value="">
                    {depSel ? "Selecciona un municipio" : "Selecciona un departamento"}
                  </option>
                  {munOptions}
                </select>
                <div className="au-help">Asegúrate de seleccionar correctamente la ciudad.</div>
              </div>

              <div className="au-field au-field--drop">
                <label className="au-label">Imagen (1920×1080 o 3840×2160)</label>
                <div
                  className={`au-dropzone ${dragOver ? "is-over" : ""}`}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragOver(true);
                  }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={onDropFile}
                  tabIndex={0}
                  role="button"
                  aria-label="Seleccionar o arrastrar imagen"
                  onKeyDown={onKeyDropzone}
                >
                  <input id="mun-file" type="file" accept="image/*" onChange={onFile} />
                  <div className="au-dz-icon">📷</div>
                  <div className="au-dz-label">Seleccionar o arrastrar</div>
                  {file && <span className="au-dz-filename">{file.name}</span>}
                </div>
                <div className="au-help">Usa una imagen apaisada (16:9). Peso recomendado &lt; 2 MB.</div>
              </div>

              <div className="au-actionsRow">
                <button
                  type="submit"
                  disabled={loading}
                  className="au-btnDanger au-btnPrimary"
                >
                  {loading ? "Guardando..." : "Guardar municipio"}
                </button>
                {preview && (
                  <div className="au-preview">
                    <img src={preview} alt="preview" className="au-previewImg" />
                  </div>
                )}
              </div>
            </form>
          </div>
        </div>

        <div className="au-card">
          <div className="au-cardHead">
            <h3 className="au-title au-title-sm">Registrados</h3>
          </div>
          <div className="au-tableWrap au-pad16">
            <RegistradosGrid items={municipios} abrirAdmin={abrirAdmin} eliminar={eliminar} />
          </div>
        </div>
      </section>
    </div>
  );
}
