const OM = "https://archive-api.open-meteo.com/v1/era5";

function toISO(d){ return new Date(d).toISOString().slice(0,10); }
function addDays(iso, days){ const d=new Date(iso); d.setDate(d.getDate()+Number(days)); return toISO(d); }
function shiftYears(iso, k){ const d=new Date(iso+"T00:00:00Z"); d.setUTCFullYear(d.getUTCFullYear()+k); return toISO(d); }
function monthKey(iso){ const d=new Date(iso); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`; }

export async function fetchHourliesOpenMeteo({lat, lon, startISO, endISO}) {
  const params = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lon),
    start_date: startISO,
    end_date: endISO,
    hourly: "temperature_2m,relative_humidity_2m",
    timezone: "America/Bogota",
    temperature_unit: "celsius"
  });
  const url = `${OM}?${params.toString()}`;
  const res = await fetch(url);
  if(!res.ok) throw new Error(`Open-Meteo ${res.status}`);
  const j = await res.json();
  const t = j?.hourly?.temperature_2m || [];
  const h = j?.hourly?.relative_humidity_2m || [];
  const time = j?.hourly?.time || [];
  if(!Array.isArray(time) || time.length === 0) return [];
  return time.map((ts, i) => ({ ts, T: t[i] ?? null, H: h[i] ?? null }));
}

function daylightHour(ts){
  const hh = Number(ts.slice(11,13));
  return hh >= 6 && hh < 18;
}

function pct(a,b){ return b ? Math.round((a/b)*100) : 0; }

export function complianceByMonthDaily({rows, tempRange, humRange, tolT=1, tolH=5, daylightOnly=true}) {
  const days = new Map();
  for (const r of rows) {
    if (r.T==null || r.H==null) continue;
    if (daylightOnly && !daylightHour(r.ts)) continue;
    const inT = (tempRange?.min==null || r.T >= tempRange.min - tolT) && (tempRange?.max==null || r.T <= tempRange.max + tolT);
    const inH = (humRange?.min==null || r.H >= humRange.min - tolH) && (humRange?.max==null || r.H <= humRange.max + tolH);
    const dkey = r.ts.slice(0,10);
    if(!days.has(dkey)) days.set(dkey, { tot:0, okBoth:0 });
    const d = days.get(dkey);
    d.tot++;
    if(inT && inH) d.okBoth++;
  }
  const months = new Map();
  for (const [dkey, v] of days.entries()){
    const mk = monthKey(dkey);
    const okDay = v.okBoth >= Math.ceil(v.tot*0.5);
    if(!months.has(mk)) months.set(mk, { days:0, ok:0 });
    const m = months.get(mk);
    m.days++;
    if(okDay) m.ok++;
  }
  return Array.from(months.entries()).map(([mk,v])=>({ month: mk, pct: pct(v.ok, v.days), days: v.days })).sort((a,b)=>a.month.localeCompare(b.month));
}

function monthsBetween(startISO, endISO){
  const out = [];
  const s = new Date(startISO+"T00:00:00Z");
  const e = new Date(endISO+"T00:00:00Z");
  const cur = new Date(Date.UTC(s.getUTCFullYear(), s.getUTCMonth(), 1));
  const end = new Date(Date.UTC(e.getUTCFullYear(), e.getUTCMonth(), 1));
  while(cur <= end){
    const mk = `${cur.getUTCFullYear()}-${String(cur.getUTCMonth()+1).padStart(2,"0")}`;
    out.push(mk);
    cur.setUTCMonth(cur.getUTCMonth()+1);
  }
  return out;
}

export async function cicloCoincidenciaSeasonProxy({ lat, lon, fechaSiembraISO, cicloDias, tempRange, humRange, shiftYearsBack = 1, tolT=1, tolH=5 }) {
  const realStart = fechaSiembraISO;
  const realEnd = addDays(realStart, cicloDias);
  const refStartISO = shiftYears(realStart, -Math.abs(shiftYearsBack));
  const refEndISO = shiftYears(realEnd, -Math.abs(shiftYearsBack));
  const rows = await fetchHourliesOpenMeteo({lat, lon, startISO: refStartISO, endISO: refEndISO});
  const monthly = complianceByMonthDaily({rows, tempRange, humRange, tolT, tolH, daylightOnly:true});
  const validMonths = new Set(monthsBetween(refStartISO, refEndISO));
  const months = monthly.filter(m => validMonths.has(m.month));
  const overallPct = months.length ? Math.round(months.reduce((a,b)=>a+b.pct,0)/months.length) : 0;
  return { refStartISO, refEndISO, months, overallPct };
}
