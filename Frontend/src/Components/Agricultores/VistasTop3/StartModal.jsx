import React, { useMemo, useState } from "react";
import "../DOCSS/EscogeSiembra.css";

const meses = ["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"];
const dias = ["Lu","Ma","Mi","Ju","Vi","Sa","Do"];

function todayISO() {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}
function aISO(d) {
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}
function formatSpanishDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("es-CO", { day: "numeric", month: "long", year: "numeric" });
}

function Calendar({ minISO, valueISO, onChange }) {
  const hoy = useMemo(() => new Date(), []);
  const min = minISO ? new Date(minISO + "T00:00:00") : null;
  const inicial = valueISO ? new Date(valueISO + "T00:00:00") : hoy;
  const [mes, setMes] = useState(inicial.getMonth());
  const [anio, setAnio] = useState(inicial.getFullYear());

  function prev(){ const m=mes-1; if(m<0){ setMes(11); setAnio(anio-1);} else setMes(m); }
  function next(){ const m=mes+1; if(m>11){ setMes(0); setAnio(anio+1);} else setMes(m); }

  const primerDiaMes = new Date(anio, mes, 1);
  const offset = (primerDiaMes.getDay() + 6) % 7;
  const diasEnMes = new Date(anio, mes + 1, 0).getDate();
  const celdas = [];
  for (let i = 0; i < offset; i++) celdas.push(null);
  for (let d = 1; d <= diasEnMes; d++) celdas.push(new Date(anio, mes, d));

  function esHoy(d){ return d.getFullYear()===hoy.getFullYear()&&d.getMonth()===hoy.getMonth()&&d.getDate()===hoy.getDate(); }
  function esSel(d){ return valueISO && aISO(d)===valueISO; }
  function deshab(d){ if(!min) return false; return d<min; }

  return (
    <div className="cal">
      <div className="cal-head">
        <button type="button" className="cal-nav">‹</button>
        <div className="cal-title">{meses[mes].charAt(0).toUpperCase()+meses[mes].slice(1)} {anio}</div>
        <button type="button" className="cal-nav">›</button>
      </div>
      <div className="cal-days">{dias.map(d=><div key={d} className="cal-day">{d}</div>)}</div>
      <div className="cal-grid">
        {celdas.map((d,i)=>{
          if(!d) return <div key={i} className="cal-cell cal-empty" />;
          const dis=deshab(d);
          const cls=["cal-cell",esHoy(d)?"is-today":"",esSel(d)?"is-selected":"",dis?"is-disabled":""].join(" ");
          return (
            <button key={i} type="button" className={cls} onClick={()=>!dis&&onChange(aISO(d))} disabled={dis}>
              {d.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function StartModal({ municipio, onConfirm }) {
  const [fecha, setFecha] = useState("");
  const min = useMemo(() => todayISO(), []);
  const valido = fecha && fecha >= min;
  const saludo = "HOLA MI AGRO -  EL DÍA DE HOY TE ENCUENTRAS EN";
  const lugar = municipio ? `${municipio.municipio || "MUNICIPIO"}, ${municipio.departamento || "DEPARTAMENTO"}` : "MUNICIPIO, DEPARTAMENTO";

  return (
    <section className="screen">
      <div className="left">
        <div className="left-top">
          <p className="saludo">{saludo}</p>
          <h1 className="titulo">
            <span className="muni">{String(lugar).split(",")[0] || "MUNICIPIO"},</span><br/>
            <span className="depto">{String(lugar).split(",")[1]?.trim() || "DEPARTAMENTO"}</span>
          </h1>
        </div>

        <div className="left-bottom">
          <div className="info">
            <p className="texto">
              Te ayudaremos a saber qué<br/>
              cosechar. ¿En qué fecha tienes<br/>
              pensado iniciar el cultivo?
            </p>
            <div className="stack-fecha">
              <span className="muted">fecha seleccionada:</span>
              <span className="pill">{formatSpanishDate(fecha)}</span>
            </div>
            <button className="btn" disabled={!valido} onClick={()=>valido&&onConfirm(fecha)}>Comenzar</button>
          </div>

          <div className="cal-wrap">
            <Calendar minISO={min} valueISO={fecha} onChange={setFecha} />
          </div>
        </div>
      </div>

      <div className="right">
        <img src="/granjeroTop3.png" alt="Agricultor sembrando" className="hero-img" />
      </div>
    </section>
  );
}
