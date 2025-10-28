// src/Agricultores/VistasTop3/CargaPantalla.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import "../DOCSS/cargapantalla.css";

export default function LoadingScreen({
  visible = true,
  tips = [],
  intervalMs = 3000,
  gifSrc = "/XOsX.gif",
  showProgress = true
}) {
  const frases = useMemo(
    () =>
      tips.length
        ? tips
        : [
            "Consultando precios históricos...",
            "Consultando información de clima...",
            "Calculando valores...",
            "Creando Top 3...",
            "Escogiendo mejores productos...",
            "Terminando de cosechar resultados..."
          ],
    [tips]
  );

  const [index, setIndex] = useState(0);
  const [bar, setBar] = useState(0.08);
  const tipTimer = useRef(null);
  const rafRef = useRef(null);

  useEffect(() => {
    if (!visible) return;
    tipTimer.current = setInterval(() => {
      setIndex((i) => (i + 1) % frases.length);
    }, intervalMs);
    return () => {
      if (tipTimer.current) clearInterval(tipTimer.current);
    };
  }, [visible, frases.length, intervalMs]);

  useEffect(() => {
    if (!visible) return;
    let start;
    const duration = 10000;
    const loop = (t) => {
      if (!start) start = t;
      const p = ((t - start) % duration) / duration;
      setBar(Math.max(0.08, p));
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [visible]);

  if (!visible) return null;

  return (
    <div className="carga-overlay" role="status" aria-live="polite">
      <div className="carga-sky">
        <span className="carga-cloud c1" />
        <span className="carga-cloud c2" />
        <span className="carga-cloud c3" />
      </div>
      <div className="carga-card">
        <div className="carga-gif">
          <img src={gifSrc} alt="" />
        </div>
        <div className="carga-text">{frases[index]}</div>
        {showProgress && (
          <div className="carga-progress">
            <div className="carga-bar" style={{ transform: `scaleX(${bar})` }} />
          </div>
        )}
        <div className="carga-chip">Modo agricultor</div>
      </div>
    </div>
  );
}
