import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { db } from "../../firebase/client";
import { getAuth } from "firebase/auth";
import { doc, setDoc, collection, addDoc, serverTimestamp } from "firebase/firestore";
import "./DOCSS/Siembra.css";

function formatSpanishDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("es-CO", { day: "numeric", month: "long", year: "numeric" });
}

export default function Siembra() {
  const { state } = useLocation();
  const navigate = useNavigate();

  const producto = state?.producto || null;
  const municipio = state?.municipio || null;
  const fechaInicio = state?.fechaInicio || null;

  const [m2, setM2] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!producto) navigate(-1);
  }, [producto, navigate]);

  const tituloLugar = useMemo(() => {
    if (!municipio) return "";
    const a = municipio?.municipio || "";
    const b = municipio?.departamento ? ` – ${municipio.departamento}` : "";
    return a + b;
  }, [municipio]);

  const handleGuardar = async () => {
    const auth = getAuth();
    const user = auth.currentUser;
    if (!user) {
      alert("Debes iniciar sesión para guardar.");
      return;
    }
    const metros2 = Number(m2) || 0;
    setSaving(true);
    try {
      const uref = doc(db, "usuarios", user.uid);
      await setDoc(
        uref,
        {
          activo: true,
          displayName: user.displayName || "",
          email: user.email || "",
          provider: user.providerData?.[0]?.providerId || "custom",
          rol: "USER",
          updatedAt: serverTimestamp(),
          createdAt: serverTimestamp(),
        },
        { merge: true }
      );

      const cref = collection(db, "usuarios", user.uid, "cultivos");
      await addDoc(cref, {
        producto: producto?.nombre || "",
        tipo: producto?.tipo || "",
        fechaSiembra: producto?.diaCultivoTxt || formatSpanishDate(fechaInicio),
        fechaCosecha: producto?.diaCosechaTxt || "",
        temperatura: producto?.tMin !== "" && producto?.tMax !== "" ? `${producto.tMin}–${producto.tMax} °C` : "",
        humedad: producto?.hMin !== "" && producto?.hMax !== "" ? `${producto.hMin}–${producto.hMax} %` : "",
        altitud: producto?.aMin !== "" && producto?.aMax !== "" ? `${producto.aMin}–${producto.aMax} m` : "",
        climaCoincidencia: producto?.climaCoincidencia ?? null,
        metros2,
        municipio: municipio?.municipio || "",
        departamento: municipio?.departamento || "",
        creadoEn: serverTimestamp(),
      });

      setSaved(true);
      setTimeout(() => navigate(-1), 1300);
    } catch (e) {
      alert("No se pudo guardar el cultivo.");
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  if (!producto) return null;

  return (
    <section className="siem-wrap">
      <div className="siem-left">
        <p className="siem-hello">HOLA MI AGRO, ¡ASÍ QUE HAS DECIDIDO CULTIVAR!</p>
        <h1 className="siem-title">{producto.nombre || "PRODUCTO"}</h1>
        <p className="siem-sub">
          Sembrarás en <b>{producto.diaCultivoTxt || "—"}</b> y cosecharás en <b>{producto.diaCosechaTxt || "—"}</b>
        </p>

        <div className="siem-cards">
          <div className="siem-card">
            <div className="siem-card-label">Temperatura ideal</div>
            <div className="siem-card-val">
              {producto.tMin !== "" && producto.tMax !== "" ? `${producto.tMin}–${producto.tMax} °C` : "—"}
            </div>
          </div>
          <div className="siem-card">
            <div className="siem-card-label">Humedad ideal</div>
            <div className="siem-card-val">
              {producto.hMin !== "" && producto.hMax !== "" ? `${producto.hMin}–${producto.hMax} %` : "—"}
            </div>
          </div>
          <div className="siem-card">
            <div className="siem-card-label">Altitud</div>
            <div className="siem-card-val">
              {producto.aMin !== "" && producto.aMax !== "" ? `${producto.aMin}–${producto.aMax} m` : "—"}
            </div>
          </div>
          <div className="siem-card">
            <div className="siem-card-label">Coincidencia clima</div>
            <div className="siem-card-val">
              {producto.climaCoincidencia != null ? `${producto.climaCoincidencia}%` : "—"}
            </div>
          </div>
        </div>

        <div className="siem-m2">
          <label className="siem-m2-label">¿Cuántos metros² quieres cultivar de este producto?</label>
          <input
            className="siem-m2-input"
            type="number"
            min="0"
            step="1"
            placeholder="0"
            value={m2}
            onChange={(e) => setM2(e.target.value)}
          />
        </div>

        <div className="siem-actions">
          <button className="siem-btn" type="button" onClick={handleGuardar} disabled={saving || saved}>
            {saved ? "Guardado ✓" : saving ? "Guardando..." : "Guardar"}
          </button>
          <button className="siem-btn ghost" type="button" onClick={() => navigate(-1)}>
            Volver
          </button>
        </div>

        <div className="siem-meta">
          {tituloLugar ? <span className="chip">{tituloLugar}</span> : null}
        </div>
      </div>

      <div className="siem-right">
        <img className="siem-hero" src="/eleccion.png" alt="Elección de cultivo" />
      </div>
    </section>
  );
}
