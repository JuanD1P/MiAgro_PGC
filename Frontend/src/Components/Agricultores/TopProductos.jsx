import React, { useEffect, useMemo, useRef, useState } from "react";
import "./DOCSS/top3.css";
import StartModal from "./VistasTop3/StartModal.jsx";
import LoadingScreen from "./VistasTop3/LoadingScreen.jsx";
import Resultados from "./VistasTop3/Resultados.jsx";
import { db } from "../../firebase/client";
import { collection, doc, getDoc, getDocs, onSnapshot, orderBy, query, where } from "firebase/firestore";

function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

export default function TopProductos() {
  const [munId] = useState(localStorage.getItem("municipioSeleccionado") || "");
  const [municipio, setMunicipio] = useState(null);
  const [asociados, setAsociados] = useState([]);
  const [detalles, setDetalles] = useState({});
  const [fechaInicio, setFechaInicio] = useState(null);
  const [loading, setLoading] = useState(false);
  const tipsRef = useRef([
    "Tomando en cuenta variables climatológicas…",
    "Tomando los productos y organizándolos…",
    "¡Ya casi! Preparando tu información…"
  ]);
  const [tipIndex, setTipIndex] = useState(0);

  useEffect(() => {
    if (!munId) return;
    const raw = localStorage.getItem("municipioSeleccionado_data");
    if (raw) { try { setMunicipio(JSON.parse(raw)); } catch {} }
    (async () => {
      try {
        const refM = doc(db, "municipios", munId);
        const snap = await getDoc(refM);
        if (snap.exists()) setMunicipio({ id: snap.id, ...snap.data() });
      } catch {}
    })();
    const qy = query(collection(db, "municipios", munId, "productos"), orderBy("asociadoEn", "desc"));
    const unsub = onSnapshot(qy, (s) => {
      const rows = s.docs.map((d) => ({ id: d.id, ...d.data() }));
      setAsociados(rows);
    }, () => setAsociados([]));
    return () => { if (typeof unsub === "function") unsub(); };
  }, [munId]);

  useEffect(() => {
    const run = async () => {
      const ids = Array.from(new Set(asociados.map(a => a.productId).filter(Boolean)));
      if (!ids.length) { setDetalles({}); return; }
      const acc = {};
      try {
        const chunks = chunk(ids, 10);
        for (const c of chunks) {
          const qy = query(collection(db, "productos"), where("__name__", "in", c));
          const snap = await getDocs(qy);
          snap.forEach(d => { acc[d.id] = { id: d.id, ...d.data() }; });
        }
      } catch {
        await Promise.all(ids.map(async (pid) => {
          try {
            const s = await getDoc(doc(db, "productos", pid));
            if (s.exists()) acc[pid] = { id: s.id, ...s.data() };
          } catch {}
        }));
      }
      setDetalles(acc);
    };
    run();
  }, [asociados]);

  const itemsAll = useMemo(() => {
    return asociados.map(a => {
      const det = a.productId ? detalles[a.productId] : null;
      return {
        id: a.productId || a.id,
        nombre: det?.nombre || a.nombre || "Producto",
        url: det?.url || a.iconUrl || "",
        tipo: det?.tipo || "",
        agro: det?.agro || null
      };
    });
  }, [asociados, detalles]);

  const handleConfirmFecha = async (fechaISO) => {
    setFechaInicio(fechaISO);
    setLoading(true);
    let i = 0;
    const timer = setInterval(() => {
      i = (i + 1) % tipsRef.current.length;
      setTipIndex(i);
    }, 1100);
    await new Promise((r) => setTimeout(r, 2600));
    clearInterval(timer);
    setLoading(false);
  };

  if (!munId) {
    return (
      <div className="top3-wrap">
        <h1>Top 3</h1>
        <div className="top3-empty">No hay un municipio seleccionado. Vuelve al inicio y elige uno.</div>
      </div>
    );
  }

  return (
    <>
      {!fechaInicio && <StartModal municipio={municipio} onConfirm={handleConfirmFecha} />}
      {loading && <LoadingScreen tips={tipsRef.current} activeIndex={tipIndex} showProgress useGif={false} />}
      {!!fechaInicio && !loading && (
        <Resultados municipio={municipio} fechaInicio={fechaInicio} items={itemsAll} />
      )}
    </>
  );
}
