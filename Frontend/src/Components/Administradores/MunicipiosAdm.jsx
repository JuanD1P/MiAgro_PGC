import React, { useEffect, useState, useMemo, useDeferredValue } from "react";
import { db } from "../../firebase/client";
import { collection, addDoc, onSnapshot, deleteDoc, doc, serverTimestamp } from "firebase/firestore";
import { supabase } from "../../supabase/client";
import NavbarAdm from "./NavbarAdm.jsx";
import "./DOCSS/Admin.css";
import Swal from "sweetalert2";
import "@sweetalert2/themes/borderless/borderless.css";
import { useNavigate } from "react-router-dom";

const Toast = ({ toasts, remove }) => (
  <div className="au-toastStack">
    {toasts.map((t) => (
      <div key={t.id} className={`au-toast au-toast--${t.type}`}>
        <div className="au-toastIcon">{t.icon}</div>
        <div className="au-toastMsg">{t.message}</div>
        <button onClick={() => remove(t.id)} className="au-toastClose">×</button>
      </div>
    ))}
  </div>
);

const RegistradosGrid = React.memo(({ items, abrirAdmin, eliminar }) => {
  const deferredItems = useDeferredValue(items);
  return (
    <div className="au-cards-grid">
      {deferredItems.map((m) => (
        <article key={m.id} className="au-cardItem">
          <div className="au-cardTitle">{m.departamento} / {m.municipio}</div>
          <div className="au-imgBox">
            {m.url ? <img src={m.url} alt={m.municipio} className="au-imgContain" /> : <span className="au-emptyText">Sin imagen</span>}
          </div>
          <div className="au-actions">
            <button onClick={() => abrirAdmin(m)} className="au-btnPrimary">Administrar contenido</button>
            <button onClick={() => eliminar(m)} className="au-btnDanger">🗑 Eliminar</button>
          </div>
        </article>
      ))}
      {!deferredItems.length && <div className="au-empty au-gridFull">No hay municipios</div>}
    </div>
  );
});

export default function MunicipiosAdm() {
  const [toasts, setToasts] = useState([]);
  const addToast = (msg, type = "info") => {
    const id = crypto.randomUUID();
    const icon = type === "success" ? "✅" : type === "error" ? "⛔" : type === "warn" ? "⚠️" : "ℹ️";
    setToasts((t) => [...t, { id, message: msg, type, icon }]);
    setTimeout(() => removeToast(id), 3800);
  };
  const removeToast = (id) => setToasts((t) => t.filter((x) => x.id !== id));

  const [departamentos, setDepartamentos] = useState([]);
  const [municipiosApi, setMunicipiosApi] = useState([]);
  const [depSel, setDepSel] = useState("");
  const [munSel, setMunSel] = useState("");
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState("");
  const [loading, setLoading] = useState(false);
  const [municipios, setMunicipios] = useState([]);
  const navigate = useNavigate();

  const safe = (s) => s.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-");

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "municipios"), (snap) => setMunicipios(snap.docs.map((d) => ({ id: d.id, ...d.data() }))));
    return unsub;
  }, []);

  useEffect(() => {
    fetch("https://api-colombia.com/api/v1/Department")
      .then((r) => r.json())
      .then((j) => setDepartamentos(j.sort((a, b) => a.name.localeCompare(b.name, "es"))));
  }, []);

  useEffect(() => {
    if (!depSel) return setMunicipiosApi([]);
    fetch(`https://api-colombia.com/api/v1/Department/${depSel}/cities`)
      .then((r) => r.json())
      .then((j) => setMunicipiosApi(j.sort((a, b) => a.name.localeCompare(b.name, "es"))));
  }, [depSel]);

  const uploadToSupabase = async () => {
    const ext = file.name.split(".").pop() || "bin";
    const path = `${safe(depSel)}/${safe(munSel)}/${Date.now()}.${ext}`;
    const up = await supabase.storage.from("municipios").upload(path, file);
    if (up.error) throw up.error;
    const signed = await supabase.storage.from("municipios").createSignedUrl(path, 60 * 60 * 24 * 365 * 5);
    if (signed.error) throw signed.error;
    return signed.data.signedUrl;
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!depSel) return addToast("Selecciona un departamento", "error");
    if (!munSel) return addToast("Selecciona un municipio", "error");
    if (!file) return addToast("Selecciona una imagen válida", "error");
    try {
      setLoading(true);
      const url = await uploadToSupabase();
      await addDoc(collection(db, "municipios"), {
        departamento: departamentos.find((d) => d.id == depSel)?.name || "",
        municipio: municipiosApi.find((m) => m.id == munSel)?.name || "",
        url,
        creadoEn: serverTimestamp(),
      });
      addToast("Municipio registrado con éxito", "success");
      setDepSel(""); setMunSel(""); setFile(null); setPreview("");
    } catch {
      addToast("Error al guardar municipio", "error");
    } finally {
      setLoading(false);
    }
  };

  const eliminar = async (m) => {
    await deleteDoc(doc(db, "municipios", m.id));
    addToast("Municipio eliminado", "warn");
  };

  const abrirAdmin = (m) => navigate(`/admin/municipios/${m.id}`);

  return (
    <div className="au-layout">
      <NavbarAdm />
      <section className="au-main">
        <Toast toasts={toasts} remove={removeToast} />
        <header className="au-mainHead">
          <div>
            <h1 className="au-title">Gestión de Municipios</h1>
            <p className="au-sub">Registra municipios en la plataforma.</p>
          </div>
        </header>

        <div className="au-card">
          <div className="au-cardHead">
            <div className="au-chip">{municipios.length} municipios</div>
          </div>
          <form onSubmit={submit} className="au-grid-form au-grid-form--enhanced">
            <div className="au-field">
              <label className="au-label">Departamento</label>
              <select value={depSel} onChange={(e) => setDepSel(e.target.value)} className="au-input au-select">
                <option value="">Selecciona un departamento</option>
                {departamentos.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
              <div className="au-help">Primero selecciona el departamento.</div>
            </div>

            <div className="au-field">
              <label className="au-label">Municipio</label>
              <select value={munSel} onChange={(e) => setMunSel(e.target.value)} className="au-input au-select" disabled={!depSel}>
                <option value="">Selecciona un municipio</option>
                {municipiosApi.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
              <div className="au-help">Selecciona el municipio correspondiente.</div>
            </div>

            <div className="au-field au-field--drop">
  <label className="au-label">Imagen Seleccionada</label>
  <div
    className={`au-dropzone ${file ? "has-image" : ""}`}
    onClick={() => document.getElementById("mun-file").click()}
  >
    <input
      id="mun-file"
      type="file"
      accept="image/*"
      onChange={(e) => {
        const f = e.target.files[0];
        setFile(f);
        setPreview(URL.createObjectURL(f));
      }}
    />
    {!file && (
      <>
        <div className="au-dz-icon">📸</div>
        <div className="au-dz-label">Seleccionar o arrastrar</div>
      </>
    )}
    {file && (
      <img src={preview} alt="preview" className="au-previewInline" />
    )}
    {file && <span className="au-dz-filename">{file.name}</span>}
  </div>
  <div className="au-help">Peso recomendado &lt; 2 MB. Proporción 16:9.</div>
</div>


            <div className="au-actionsRow">
              <button type="submit" disabled={loading} className="au-btnPrimary">
                {loading ? "Guardando..." : "Guardar municipio"}
              </button>
            </div>
          </form>
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
