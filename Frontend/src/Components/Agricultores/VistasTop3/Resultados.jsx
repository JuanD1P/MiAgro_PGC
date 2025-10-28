// src/Agricultores/VistasTop3/Resultados.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../DOCSS/top3.css";
import { loadPreciosFromExcel } from "../../utils/preciosLoaderExcel";
import { cicloCoincidenciaSeasonProxy } from "../../utils/climaOpenMeteo";

const MAP = { ene:"01", feb:"02", mar:"03", abr:"04", may:"05", jun:"06", jul:"07", ago:"08", sep:"09", oct:"10", nov:"11", dic:"12" };

function addDays(iso, days) {
  if (!iso || days == null) return null;
  const d = new Date(iso);
  d.setDate(d.getDate() + Number(days));
  return d.toISOString().slice(0, 10);
}
function formatSpanishDate(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleDateString("es-CO", { day: "numeric", month: "long", year: "numeric" });
}
function norm(s) {
  return (s || "").toString().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}
function parseExcelDate(value){
  if(value == null) return null;
  if(typeof value === "number"){
    const ms = (value - 25569) * 86400 * 1000;
    const d = new Date(ms);
    d.setDate(d.getDate() + 1);
    return d;
  }
  if(value instanceof Date) return value;
  const s = String(value).trim().toLowerCase();
  if(/^\d+$/.test(s)){
    const n = Number(s);
    const ms = (n - 25569) * 86400 * 1000;
    const d = new Date(ms);
    d.setDate(d.getDate() + 1);
    return d;
  }
  if(/^\d{4}-\d{2}-\d{2}$/.test(s)) return new Date(s);
  const parts = s.split(/[\s\-\/]+/).filter(Boolean);
  if(parts.length >= 2){
    const m = parts[0].slice(0,3);
    let y = parts[1];
    if(y.length === 2) y = `20${y}`;
    if(MAP[m]) return new Date(`${y}-${MAP[m]}-01`);
  }
  const d = new Date(s);
  return isNaN(d) ? null : d;
}
function categoryByRank(rank, total){
  if(rank <= 1) return "Excelente";
  if(rank <= Math.min(3, total)) return "Muy buenos";
  if(rank <= Math.min(5, total)) return "Buenos";
  if(rank <= Math.min(7, total)) return "Normales";
  if(rank <= Math.min(9, total)) return "Malos";
  if(rank <= Math.min(11, total)) return "Muy malos";
  return "Horrible";
}
function toNum(x){ const n = typeof x==="string" ? parseFloat(String(x).replace(",", ".").trim()) : x; return Number.isFinite(n)? n : null; }
function pick(obj, path){ return path.split(".").reduce((a,k)=> (a&&a[k]!=null)?a[k]:null, obj); }
function parseLatLonString(s){
  if(typeof s!=="string") return [null,null];
  const m = s.split(/[,\s]+/).map(v=>toNum(v)).filter(v=>v!=null);
  if(m.length===2) return [m[0], m[1]];
  return [null,null];
}
function getLatLon(m){
  const cands = [
    [m?.lat, m?.lon],
    [m?.lat, m?.lng],
    [m?.latitude, m?.longitude],
    [m?.latitud, m?.longitud],
    [pick(m,"location.lat"), pick(m,"location.lon")],
    [pick(m,"ubicacion.lat"), pick(m,"ubicacion.lon")],
    [pick(m,"ubicacion.latitud"), pick(m,"ubicacion.longitud")],
    [pick(m,"geo.lat"), pick(m,"geo.lon")],
    [pick(m,"centroide.lat"), pick(m,"centroide.lon")],
    [pick(m,"centroide.latitude"), pick(m,"centroide.longitude")],
    Array.isArray(m?.latlng) ? m.latlng : null,
    Array.isArray(m?.centroide?.coordinates) ? m.centroide.coordinates.slice().reverse() : null,
    m?.geopoint && typeof m.geopoint.latitude==="number" && typeof m.geopoint.longitude==="number" ? [m.geopoint.latitude, m.geopoint.longitude] : null,
    m?._lat && m?._long ? [m._lat, m._long] : null,
    parseLatLonString(m?.latlon),
    parseLatLonString(m?.coord)
  ];
  for(const c of cands){
    if(!c) continue;
    const a = toNum(c[0]); const b = toNum(c[1]);
    if(a!=null && b!=null) return [a,b];
  }
  return [4.711, -74.072];
}
const rankOrder = {
  "excelente": 0,
  "muy buenos": 1,
  "buenos": 2,
  "normales": 3,
  "malos": 4,
  "muy malos": 5,
  "horrible": 6
};
function medalSrc(i){
  if(i===0) return "/medalla-oro.png";
  if(i===1) return "/medalla-plata.png";
  return "/medalla-bronce.png";
}

export default function Resultados({ municipio, fechaInicio, items = [] }) {
  const navigate = useNavigate();
  const [precioMap, setPrecioMap] = useState(null);
  const [climaMap, setClimaMap] = useState({});
  const [climaErr, setClimaErr] = useState({});
  const [verTabla, setVerTabla] = useState(false);
  const [detalle, setDetalle] = useState(null);
  const tablaRef = useRef(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const rows = await loadPreciosFromExcel("/precios.xlsx");
      const map = {};
      for(const r of rows){
        const key = norm(r.producto);
        const d = parseExcelDate(r.fecha);
        if(!d) continue;
        if(!map[key]) map[key] = [];
        map[key].push({ date: d, precio: r.precio });
      }
      for(const k of Object.keys(map)){
        map[k].sort((a,b) => b.precio - a.precio);
      }
      if(mounted) setPrecioMap(map);
    })();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if(!fechaInicio || !municipio || !items?.length) return;
    const [lat,lon] = getLatLon(municipio);
    setClimaMap({});
    setClimaErr({});
    const run = async () => {
      await Promise.allSettled(items.map(async (p) => {
        const ciclo = p.agro?.cicloDias ?? null;
        if(!ciclo){ setClimaErr(prev=>({...prev,[p.id]:"nociclo"})); return; }
        const tempRange = p.agro?.temperatura || null;
        const humRange  = p.agro?.humedad || null;
        try{
          const res = await cicloCoincidenciaSeasonProxy({
            lat, lon,
            fechaSiembraISO: fechaInicio,
            cicloDias: ciclo,
            tempRange, humRange,
            shiftYearsBack: 1,
            tolT: 1,
            tolH: 5
          });
          setClimaMap(prev => ({...prev, [p.id]: res}));
        }catch(e){
          setClimaErr(prev=>({...prev,[p.id]:"error"}));
        }
      }));
    };
    run();
  }, [fechaInicio, municipio, items]);

  const excelRows = useMemo(() => {
    const base = items.map(p => {
      const ciclo = p.agro?.cicloDias ?? null;
      const diaCultivo = fechaInicio || "";
      const diaCosechaISO = ciclo != null ? addDays(fechaInicio, ciclo) : null;
      const diaCosechaTxt = diaCosechaISO ? formatSpanishDate(diaCosechaISO) : "";
      const dCosecha = diaCosechaISO ? new Date(diaCosechaISO) : null;
      const mesCosecha = dCosecha ? dCosecha.getMonth() : null;
      const anioCosecha = dCosecha ? dCosecha.getFullYear() : null;
      const epocas = Array.isArray(p.agro?.epocasSiembra) ? p.agro.epocasSiembra : [];
      const cumple = mesCosecha!=null
        ? epocas.some(e => norm(e).startsWith(
            new Date(2000, mesCosecha, 1).toLocaleDateString("es-CO",{month:"long"}).toLowerCase()
          )) ? "Cumple" : "No cumple"
        : "";
      let rankTxt = "";
      let rankCat = "";
      let rankPos = null;
      let rankTot = null;
      if(precioMap && mesCosecha!=null){
        const ds = precioMap[norm(p.nombre)] || [];
        let idx = ds.findIndex(x => x.date.getMonth() === mesCosecha && x.date.getFullYear() === anioCosecha);
        if(idx < 0) idx = ds.findIndex(x => x.date.getMonth() === mesCosecha);
        if(idx >= 0){
          const rank = idx + 1;
          const total = ds.length || 1;
          const cat = categoryByRank(rank, total);
          rankTxt = `${rank}/${total} · ${cat}`;
          rankCat = cat;
          rankPos = rank;
          rankTot = total;
        }
      }
      const clima = climaMap[p.id];
      const err = climaErr[p.id] || null;
      const climaCoincidencia = err ? null : (clima?.overallPct ?? null);
      return {
        id: p.id,
        nombre: p.nombre,
        tipo: p.tipo || "",
        url: p.url || "",
        tMin: p.agro?.temperatura?.min ?? "",
        tMax: p.agro?.temperatura?.max ?? "",
        hMin: p.agro?.humedad?.min ?? "",
        hMax: p.agro?.humedad?.max ?? "",
        aMin: p.agro?.altitud?.min ?? "",
        aMax: p.agro?.altitud?.max ?? "",
        ciclo: ciclo ?? "",
        epocas: epocas.length ? epocas.join(", ") : "",
        diaCultivoTxt: diaCultivo ? formatSpanishDate(diaCultivo) : "",
        diaCosechaTxt,
        cumple,
        rankSiembra: rankTxt,
        rankCat,
        rankPos,
        rankTot,
        climaCoincidencia
      };
    });
    return [...base].sort((a, b) => {
      const sa = a.cumple === "Cumple" ? 0 : 1;
      const sb = b.cumple === "Cumple" ? 0 : 1;
      if (sa !== sb) return sa - sb;
      const ra = rankOrder[norm(a.rankCat)] ?? 999;
      const rb = rankOrder[norm(b.rankCat)] ?? 999;
      if (ra !== rb) return ra - rb;
      const ca = a.climaCoincidencia ?? -1;
      const cb = b.climaCoincidencia ?? -1;
      if (ca !== cb) return cb - ca;
      return a.nombre.localeCompare(b.nombre, "es");
    });
  }, [items, fechaInicio, precioMap, climaMap, climaErr]);

  const top3 = useMemo(() => excelRows.slice(0, 3), [excelRows]);

  const abrirDetalle = (row, rankIndex) => {
    setDetalle({
      ...row,
      puesto: rankIndex + 1,
      epocasList: row.epocas ? row.epocas.split(",").map(s=>s.trim()).filter(Boolean) : []
    });
  };
  const cerrarDetalle = () => setDetalle(null);
  const irSembrar = (row) => navigate("/agricultores/sembrar", { state: { producto: row?.nombre, municipio, fechaInicio } });

  const goTabla = () => {
    if (!verTabla) setVerTabla(true);
    setTimeout(() => {
      if (tablaRef.current) tablaRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 80);
  };

  return (
    <div className="top3-wrap" aria-live="polite">
      <div className="top3-head">
        <div className="head-left">
          <h1 className="title-xl">Top 3 recomendados</h1>
          <button className="top3-btn ghost" onClick={() => setVerTabla(v => !v)} aria-pressed={verTabla}>
            {verTabla ? "Ocultar análisis" : "Ver análisis"}
          </button>
          <button className="top3-help" onClick={goTabla}>?</button>
        </div>
        {municipio && (
          <div className="top3-meta">
            <div className="top3-muted">Municipio seleccionado</div>
            <h2 className="subtitle-lg">
              {municipio.municipio} {municipio.departamento ? `– ${municipio.departamento}` : ""}
            </h2>
            {fechaInicio && (
              <div className="top3-muted">Fecha de inicio: {formatSpanishDate(fechaInicio)}</div>
            )}
          </div>
        )}
      </div>

      <div className="cards-grid">
        {top3.map((r, idx) => (
          <div key={`card-${r.id}`} className={`card card-rank-${idx+1}`} role="article">
            <img className="card-medal" src={medalSrc(idx)} alt={`Puesto ${idx+1}`} />
            <div className="card-body">
              <div className="card-media">
                {r.url ? <img src={r.url} alt={r.nombre} loading="lazy" /> : <div className="img-ph">SIN FOTO</div>}
              </div>
              <div className="card-info">
                <h3 className="card-title">{r.nombre}</h3>
                <div className="card-sub">{r.tipo || "—"}</div>
                <div className="card-row"><span>Siembra:</span><b>{r.diaCultivoTxt || "—"}</b></div>
                <div className="card-row"><span>Cosecha:</span><b>{r.diaCosechaTxt || "—"}</b></div>
                <div className="card-metrics">
                  <div className={`pill ${r.cumple==="Cumple"?"ok":"bad"}`}>{r.cumple || "—"}</div>
                  <div className="pill">{r.rankSiembra || "Sin ranking"}</div>
                  <div className="pill">{r.climaCoincidencia!=null ? `${r.climaCoincidencia}% clima` : "Clima —"}</div>
                </div>
              </div>
            </div>
            <div className="card-actions">
              <button className="top3-btn outline" onClick={() => abrirDetalle(r, idx)}>Ver detalle</button>
              <button className="top3-btn" onClick={() => irSembrar(r)}>Quiero sembrar!</button>
            </div>
          </div>
        ))}
        {!top3.length && <div className="top3-empty">Sin datos para el Top 3.</div>}
      </div>

      <div ref={tablaRef} />
      {verTabla && (
        <div className="tbl-wrap" id="analisis">
          <div className="tbl-title">
            Análisis total para los productos del municipio {municipio?.municipio || "—"}
          </div>
          <div className="tbl-scroll compact" role="region" aria-label="Tabla de análisis">
            <table className="tbl-excel slim">
              <thead>
                <tr>
                  <th>Producto</th>
                  <th>Tipo</th>
                  <th>Ciclo</th>
                  <th>Épocas</th>
                  <th>Siembra</th>
                  <th>Cosecha</th>
                  <th>¿Época?</th>
                  <th>Ranking mes</th>
                  <th>Clima (%)</th>
                  <th>Acción</th>
                </tr>
              </thead>
              <tbody>
                {excelRows.map((r) => (
                  <tr key={`xls-${r.id}`}>
                    <td><b>{r.nombre}</b></td>
                    <td>{r.tipo}</td>
                    <td>{r.ciclo || "—"}</td>
                    <td>{r.epocas || "—"}</td>
                    <td>{r.diaCultivoTxt || "—"}</td>
                    <td>{r.diaCosechaTxt || "—"}</td>
                    <td className={r.cumple === "Cumple" ? "status-good" : r.cumple ? "status-bad" : ""}>{r.cumple || "—"}</td>
                    <td>{r.rankSiembra || "—"}</td>
                    <td>{r.climaCoincidencia!=null ? `${r.climaCoincidencia}%` : "—"}</td>
                    <td className="tbl-actions">
                      <button className="top3-btn xs outline" onClick={() => abrirDetalle(r, Math.max(0, top3.findIndex(t=>t.id===r.id)))}>Detalle</button>
                      <button className="top3-btn xs" onClick={() => irSembrar(r)}>Sembrar</button>
                    </td>
                  </tr>
                ))}
                {!excelRows.length && (
                  <tr><td colSpan={10}>Sin datos</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!!detalle && (
        <div className="detailOverlay" role="dialog" aria-modal="true">
          <div className="detailBackdrop" onClick={cerrarDetalle} />
          <div className="detailPanel">
            <div className="detailHead">
              <div className="detailRank">#{detalle.puesto || "—"}</div>
              <h3 className="detailTitle">{detalle.nombre}</h3>
              <div className="headChips">
                <span className="chip-inv">{detalle.tipo || "—"}</span>
                {detalle.epocasList?.length
                  ? detalle.epocasList.map((e,ix)=>(<span className="chip-inv" key={`he-${ix}`}>{e}</span>))
                  : <span className="chip-inv">Sin épocas</span>}
              </div>
              <button className="detailClose" onClick={cerrarDetalle} aria-label="Cerrar">×</button>
            </div>

            <div className="detailBody">
              <div className="detailSide">
                <div className="detailMedia">
                  {detalle.url ? <img src={detalle.url} alt={detalle.nombre} /> : <div className="img-ph lg">SIN FOTO</div>}
                </div>
                <div className="sideActions">
                  <button className="top3-btn" onClick={() => irSembrar(detalle)}>Quiero sembrar!</button>
                  <button className="top3-btn outline" onClick={cerrarDetalle}>Volver</button>
                </div>
              </div>

              <div className="detailInfo">
                <div className="detailText">
                  {detalle.cumple === "Cumple" ? (
                    <p>El mes de cosecha <b className="ok">Cumple</b> con las épocas del producto.</p>
                  ) : (
                    <p>El mes de cosecha <b className="bad">No cumple</b> con las épocas del producto; en Sabana de Occidente la estabilidad térmica suele mitigar este punto.</p>
                  )}
                  <p>El mes obtuvo el puesto <b>{detalle.rankPos || "—"}</b> entre los precios más altos para este producto <b>({detalle.rankSiembra || "—"})</b>, por lo que se espera que sea <b>{detalle.rankCat || "—"}</b> en precios.</p>
                  <p>Condiciones ideales: <b>temperatura {detalle.tMin!==""&&detalle.tMax!==""?`${detalle.tMin}–${detalle.tMax} °C`:"—"}</b> y <b>humedad {detalle.hMin!==""&&detalle.hMax!==""?`${detalle.hMin}–${detalle.hMax} %`:"—"}</b>. Coincidencia estimada <b>{detalle.climaCoincidencia!=null?`${detalle.climaCoincidencia}%`:"—"}</b> con el clima de este año.</p>
                  <p>Si siembras en <b>{detalle.diaCultivoTxt || "—"}</b>, cosechas <b>{detalle.diaCosechaTxt || "—"}</b> con un ciclo de <b>{detalle.ciclo || "—"}</b> días.</p>
                </div>

                <div className="detailGrid">
                  <div className="metric"><div className="metricLabel">Temperatura ideal</div><div className="metricValue">{(detalle.tMin!==""&&detalle.tMax!=="")?`${detalle.tMin}–${detalle.tMax} °C`:"—"}</div></div>
                  <div className="metric"><div className="metricLabel">Humedad ideal</div><div className="metricValue">{(detalle.hMin!==""&&detalle.hMax!=="")?`${detalle.hMin}–${detalle.hMax} %`:"—"}</div></div>
                  <div className="metric"><div className="metricLabel">Altitud</div><div className="metricValue">{(detalle.aMin!==""&&detalle.aMax!=="")?`${detalle.aMin}–${detalle.aMax} m`:"—"}</div></div>
                  <div className="metric"><div className="metricLabel">Coincidencia clima</div><div className="metricValue">{detalle.climaCoincidencia!=null?`${detalle.climaCoincidencia}%`:"—"}</div></div>
                </div>

                <div className="detailPills">
                  <div className={`pill ${detalle.cumple==="Cumple"?"ok":"bad"}`}>{detalle.cumple || "—"}</div>
                  <div className="pill">{detalle.rankSiembra || "Sin ranking"}</div>
                  <div className="pill">{detalle.climaCoincidencia!=null ? `${detalle.climaCoincidencia}% clima` : "Clima —"}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
