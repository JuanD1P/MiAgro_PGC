import React, { useEffect, useMemo, useState } from "react";
import "../DOCSS/top3.css";
import { loadPreciosFromExcel } from "../../utils/preciosLoaderExcel";

const MAP = { ene:"01", feb:"02", mar:"03", abr:"04", may:"05", jun:"06", jul:"07", ago:"08", sep:"09", oct:"10", nov:"11", dic:"12" };

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
function monthName(date){
  return date ? date.toLocaleDateString("es-CO",{month:"long", year:"numeric"}) : "";
}
function norm(s){
  return (s||"").toString().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"");
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

export default function AnalisisPrecios({ producto, fechaCosechaTxt, onClose }) {
  const [rows, setRows] = useState(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const data = await loadPreciosFromExcel("/precios.xlsx");
      if(mounted) setRows(data);
    })();
    return () => { mounted = false; };
  }, []);

  const dataset = useMemo(() => {
    if(!rows) return [];
    return rows
      .filter(r => norm(r.producto) === norm(producto))
      .map(r => ({ ...r, date: parseExcelDate(r.fecha) }))
      .filter(r => r.date)
      .sort((a,b) => b.precio - a.precio);
  }, [rows, producto]);

  const resumen = useMemo(() => {
    if(!dataset.length) return null;
    const best = dataset[0];
    const worst = dataset[dataset.length - 1];
    const labels = dataset.map(d => monthName(d.date));
    const prices = dataset.map(d => d.precio);
    const cosechaDate = fechaCosechaTxt ? new Date(fechaCosechaTxt) : null;
    const cosechaLabel = cosechaDate ? monthName(cosechaDate) : null;
    let rankIndex = -1;
    if(cosechaLabel) rankIndex = labels.findIndex(l => norm(l) === norm(cosechaLabel));
    let categoria = "";
    if(rankIndex >= 0){
      const rank = rankIndex + 1;
      const total = dataset.length;
      categoria = categoryByRank(rank, total);
    }
    return {
      best:  { mes: monthName(best.date),  precio: best.precio },
      worst: { mes: monthName(worst.date), precio: worst.precio },
      cosecha: rankIndex >= 0 ? { mes: labels[rankIndex], precio: prices[rankIndex], categoria } : null
    };
  }, [dataset, fechaCosechaTxt]);

  return (
    <div className="top3-overlay top3-overlay--blur" role="dialog" aria-modal="true">
      <div className="top3-modal">
        <div className="top3-row" style={{ justifyContent:"space-between", marginBottom: 10 }}>
          <h2 style={{ margin: 0 }}>Análisis de precios · {producto}</h2>
          <button className="top3-cta" onClick={onClose}>Cerrar</button>
        </div>

        {!rows && <div className="top3-muted">Cargando datos desde Excel…</div>}
        {rows && !dataset.length && <div className="top3-empty">No hay datos para este producto.</div>}

        {dataset.length > 0 && resumen && (
          <>
            <div className="top3-row" style={{ gap: 12, marginBottom: 12 }}>
              <span className="top3-date-pill">Mejor: {resumen.best.mes} · ${resumen.best.precio.toLocaleString("es-CO")}</span>
              <span className="top3-date-pill" style={{ background:"#1452ff" }}>Más bajo: {resumen.worst.mes} · ${resumen.worst.precio.toLocaleString("es-CO")}</span>
              {resumen.cosecha && (
                <span className="top3-date-pill" style={{ background:"#0b1f4d" }}>
                  Cosecha: {resumen.cosecha.mes} · {resumen.cosecha.categoria}
                </span>
              )}
            </div>

            <div style={{ overflow:"auto", maxHeight: "60vh" }}>
              <table className="tbl-excel">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Mes</th>
                    <th>Precio</th>
                  </tr>
                </thead>
                <tbody>
                  {dataset.map((d, i) => (
                    <tr key={`${d.fecha}-${i}`}>
                      <td>{i + 1}</td>
                      <td>{monthName(d.date)}</td>
                      <td>${d.precio.toLocaleString("es-CO")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
