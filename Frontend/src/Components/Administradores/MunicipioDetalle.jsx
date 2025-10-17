import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { db } from "../../firebase/client";
import {
  collection,
  onSnapshot,
  doc,
  updateDoc,
  addDoc,
  deleteDoc,
  serverTimestamp,
  getDoc,
} from "firebase/firestore";
import { supabase } from "../../supabase/client";
import ToastStack from "../ToastStack";
import NavbarAdm from "./NavbarAdm.jsx";
import "./DOCSS/Admin.css";
import Swal from "sweetalert2";
import "@sweetalert2/themes/borderless/borderless.css";

export default function MunicipioDetalle() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [toasts, setToasts] = useState([]);
  const toast = (m, o = {}) =>
    setToasts((t) => [...t, { id: crypto.randomUUID(), message: m, ...o }]);
  const closeToast = (id) => setToasts((t) => t.filter((x) => x.id !== id));
  const notify = {
    success: (msg, opts) => toast(msg, { title: "Listo", icon: "✅", variant: "success", ...opts }),
    error: (msg, opts) => toast(msg, { title: "Revisa esto", icon: "⛔", variant: "error", ...opts }),
    warn: (msg, opts) => toast(msg, { title: "Atención", icon: "⚠️", variant: "warning", ...opts }),
    info: (msg, opts) => toast(msg, { title: "Info", icon: "ℹ️", variant: "info", ...opts }),
  };

  const [mun, setMun] = useState(null);
  const [prodsAsociados, setProdsAsociados] = useState([]);
  const [catalogoProds, setCatalogoProds] = useState([]);
  const [buscador, setBuscador] = useState("");
  const [editImgLoading, setEditImgLoading] = useState(false);

  const guessIconField = (p) =>
    p.iconUrl || p.url || p.imagen || p.image || p.icon || p.emoji || "";
  const guessNameField = (p) => p.nombre || p.name || p.titulo || "";
  const looksLikeUrl = (s) => typeof s === "string" && /^https?:\/\//i.test(s);
  const looksLikeDataUri = (s) => typeof s === "string" && /^data:image\//i.test(s);
  const looksLikeEmoji = (s) => typeof s === "string" && s.length <= 4;
  const resolveBucketPath = (p) => {
    if (p.bucket && p.path) return { bucket: p.bucket, path: p.path };
    if (p.bucketName && p.objectPath) return { bucket: p.bucketName, path: p.objectPath };
    if (p.icon && typeof p.icon === "object" && p.icon.bucket && p.icon.path)
      return { bucket: p.icon.bucket, path: p.icon.path };
    return null;
  };
  const resolveIcon = async (p) => {
    const raw = guessIconField(p);
    if (looksLikeUrl(raw) || looksLikeDataUri(raw)) return raw;
    if (looksLikeEmoji(raw)) return raw;
    const bp = resolveBucketPath(p);
    if (bp) {
      const r = await supabase.storage
        .from(bp.bucket)
        .createSignedUrl(bp.path, 60 * 60 * 24 * 365 * 5);
      if (!r.error) return r.data.signedUrl;
    }
    return "";
  };
  const hydrateProducts = async (items) => {
    const arr = await Promise.all(
      items.map(async (p) => {
        const icon = await resolveIcon(p);
        return { ...p, _displayIcon: icon, _name: guessNameField(p) };
      })
    );
    arr.sort((a, b) =>
      String(a._name || "").localeCompare(String(b._name || ""), "es")
    );
    return arr;
  };

  useEffect(() => {
    let unsubMun = null, unsubCat = null, unsubAsoc = null;

    const init = async () => {
      const ref = doc(db, "municipios", id);
      const snap = await getDoc(ref);
      if (!snap.exists()) {
        notify.error("Municipio no encontrado");
        navigate("/admin/municipios");
        return;
      }
      setMun({ id: snap.id, ...snap.data() });

      unsubMun = onSnapshot(
        ref,
        (d) => setMun({ id: d.id, ...d.data() }),
        (e) => notify.error(e.message || "Error leyendo municipio")
      );

      unsubCat = onSnapshot(
        collection(db, "productos"),
        async (s) => {
          const base = s.docs.map((d) => ({ id: d.id, ...d.data() }));
          const hyd = await hydrateProducts(base);
          setCatalogoProds(hyd);
        },
        (e) => notify.error(e.message || "Error al leer catálogo")
      );

      unsubAsoc = onSnapshot(
        collection(db, "municipios", id, "productos"),
        async (s) => {
          const base = s.docs.map((d) => ({ id: d.id, ...d.data() }));
          const hyd = await hydrateProducts(base);
          setProdsAsociados(hyd);
        },
        (e) => notify.error(e.message || "Error al leer asociados")
      );
    };

    init();
    return () => {
      if (typeof unsubMun === "function") unsubMun();
      if (typeof unsubCat === "function") unsubCat();
      if (typeof unsubAsoc === "function") unsubAsoc();
    };
  }, [id]);

  const cambiarImagenMunicipio = async (e) => {
    const f = e.target.files?.[0] || null;
    if (!f || !mun) return;
    try {
      setEditImgLoading(true);
      const ext = f.name.split(".").pop() || "bin";
      const safe = (s) =>
        s.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-");
      const path = `${safe(mun.departamento)}/${safe(mun.municipio)}/cover-${Date.now()}.${ext}`;
      const up = await supabase.storage.from("municipios").upload(path, f, {
        cacheControl: "3600",
        contentType: f.type,
        upsert: false,
      });
      if (up.error) throw up.error;

      const signed = await supabase.storage
        .from("municipios")
        .createSignedUrl(path, 60 * 60 * 24 * 365 * 5);
      if (signed.error) throw signed.error;

      await updateDoc(doc(db, "municipios", mun.id), {
        url: signed.data.signedUrl,
        actualizadoEn: serverTimestamp(),
      });

      notify.success("Imagen actualizada");
    } catch (e2) {
      notify.error(e2.message || "No se pudo actualizar la imagen");
    } finally {
      setEditImgLoading(false);
      e.target.value = "";
    }
  };

  const asociarProducto = async (p) => {
    const ya = prodsAsociados.some((x) => x.productId === p.id);
    if (ya) return notify.warn("Este producto ya está asociado");
    try {
      await addDoc(collection(db, "municipios", id, "productos"), {
        productId: p.id,
        nombre: p._name || p.nombre || "",
        iconUrl: p._displayIcon || guessIconField(p) || "",
        asociadoEn: serverTimestamp(),
      });
      notify.success("Producto asociado");
    } catch (e) {
      notify.error(e.message || "No se pudo asociar");
    }
  };

  const eliminarProducto = async (p) => {
    const result = await Swal.fire({
      title: "¿Eliminar producto asociado?",
      html: `Quitarás <b>${p._name || p.nombre || "Producto"}</b> de este municipio.`,
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
          await deleteDoc(doc(db, "municipios", id, "productos", p.id));
        } catch (e) {
          Swal.showValidationMessage(e?.message || "No se pudo eliminar");
          return false;
        }
      },
      allowOutsideClick: () => !Swal.isLoading(),
    });
    if (result.isConfirmed) notify.warn("Producto eliminado");
  };

  const filtrados = useMemo(() => {
    const q = buscador.trim().toLowerCase();
    if (!q) return catalogoProds;
    return catalogoProds.filter((p) => String(p._name || "").toLowerCase().includes(q));
  }, [catalogoProds, buscador]);

  const esAsociado = (prodId) => prodsAsociados.some((x) => x.productId === prodId);

  return (
    <div className="au-layout">
      <NavbarAdm />
      <section className="au-main au-mdet">
        <ToastStack toasts={toasts} onClose={closeToast} />

        <div className="au-mdet-hero">
          <div className="au-mdet-heroIn">
            <div className="au-mdet-crumbs">
              <Link to="/admin/municipios" className="au-mdet-crumbLink">Municipios</Link>
              <span className="au-mdet-crumbSep">/</span>
              <span className="au-mdet-crumbCur">{mun ? mun.municipio : "Cargando…"}</span>
            </div>
            <h1 className="au-mdet-title">
              {mun ? `${mun.departamento} / ${mun.municipio}` : "Cargando…"}
            </h1>
            <div className="au-mdet-stats">
              <span className="au-chip">Productos: {prodsAsociados.length}</span>
              <span className="au-chip">Catálogo: {catalogoProds.length}</span>
            </div>
          </div>
        </div>

        <div className="au-mdet-grid">
          <div className="au-mdet-left">
            <div className="au-mdet-cover">
              {mun?.url ? (
                <img src={mun.url} alt={mun?.municipio || ""} className="au-mdet-coverImg" />
              ) : (
                <div className="au-mdet-coverEmpty">Sin imagen</div>
              )}

              <label className="au-mdet-fab">
                <input type="file" accept="image/*" onChange={cambiarImagenMunicipio} />
                <span className="au-mdet-fabIc">{editImgLoading ? "…" : "✏️"}</span>
                <span className="au-mdet-fabTx">{editImgLoading ? "Actualizando" : "Cambiar"}</span>
              </label>

              <div className="au-mdet-coverOverlay" />
            </div>

            <div className="au-mdet-panel">
              <div className="au-mdet-panelHead">
                <h3 className="au-mdet-panelTitle">Productos asociados</h3>
              </div>
              <div className="au-mdet-list">
                {prodsAsociados.map((p) => (
                  <div key={p.id} className="au-mdet-item">
                    <div className="au-mdet-itemIcon">
                      {p._displayIcon ? (
                        typeof p._displayIcon === "string" && p._displayIcon.length <= 4 ? (
                          <span className="au-emoji">{p._displayIcon}</span>
                        ) : (
                          <img src={p._displayIcon} alt="" className="au-iconImg" />
                        )
                      ) : (
                        <span className="au-emoji">✨</span>
                      )}
                    </div>
                    <div className="au-mdet-itemName">{p._name || p.nombre}</div>
                    <button onClick={() => eliminarProducto(p)} className="au-itemBtn au-danger">Eliminar</button>
                  </div>
                ))}
                {!prodsAsociados.length && <div className="au-listEmpty">Sin productos asociados</div>}
              </div>
            </div>
          </div>

          <aside className="au-mdet-right">
            <div className="au-mdet-sideCard">
              <div className="au-mdet-sideHead">
                <h4 className="au-mdet-sideTitle">Agregar desde catálogo</h4>
                <div className="au-mdet-search">
                  <input
                    value={buscador}
                    onChange={(e) => setBuscador(e.target.value)}
                    placeholder="Buscar producto"
                    className="au-mdet-searchInput"
                  />
                </div>
              </div>

              <div className="au-mdet-tags">
                <button onClick={() => setBuscador("")} className={`au-mdet-tag ${buscador === "" ? "is-active" : ""}`}>Todos</button>

              </div>

              <div className="au-mdet-catGrid">
                {filtrados.map((p) => {
                  const asociado = esAsociado(p.id);
                  return (
                    <div key={p.id} className="au-mdet-card">
                      <div className="au-mdet-cardIcon">
                        {p._displayIcon ? (
                          typeof p._displayIcon === "string" && p._displayIcon.length <= 4 ? (
                            <span className="au-emoji">{p._displayIcon}</span>
                          ) : (
                            <img src={p._displayIcon} alt="" className="au-iconImg" />
                          )
                        ) : (
                          <span className="au-emoji">🧩</span>
                        )}
                      </div>
                      <div className="au-mdet-cardName" title={p._name || "Producto"}>
                        {p._name || "Sin nombre"}
                      </div>
                      <button
                        onClick={() => asociarProducto(p)}
                        disabled={asociado}
                        className={`au-itemBtn ${asociado ? "au-disabled" : "au-primary"}`}
                      >
                        {asociado ? "Asociado" : "Asociar"}
                      </button>
                    </div>
                  );
                })}
                {!filtrados.length && (
                  <div className="au-listEmpty au-gridFull">No hay productos en el catálogo</div>
                )}
              </div>
            </div>

            <div className="au-mdet-sideSticky">
              <button className="au-mdet-back" onClick={() => navigate("/admin/municipios")}>← Volver</button>
            </div>
          </aside>
        </div>

        <div className="au-mdet-footer">
          <div className="au-mdet-footIn">
            <div className="au-mdet-footHint">Los cambios se guardan en tiempo real</div>
            <div className="au-mdet-footActions">
              <button className="au-btnDanger au-btnLight" onClick={() => navigate("/admin/municipios")}>Listo</button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
