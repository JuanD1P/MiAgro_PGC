// Inicio.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { db } from "../../firebase/client";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import styles from "./DOCSS/inicio.module.css";
import { getAuth, onAuthStateChanged } from "firebase/auth";

function norm(s = "") {
  return s.toString().toLowerCase().normalize("NFD").replace(/\p{Diacritic}+/gu, "").trim();
}
function cToF(c) {
  return Math.round((c * 9) / 5 + 32);
}
function iconPath(code) {
  const c = Number(code ?? 3);
  if (c === 0) return "/clima1.png";
  if ([1, 2].includes(c)) return "/clima2.png";
  if ([3, 45, 48, 51, 53, 55, 56, 57].includes(c)) return "/clima3.png";
  if ([61, 63, 65, 66, 67, 80, 81].includes(c)) return "/clima4.png";
  if ([82, 95, 96, 99].includes(c)) return "/clima5.png";
  if ([71, 73, 75, 77, 85, 86].includes(c)) return "/clima6.png";
  return "/clima3.png";
}

export default function Inicio() {
  const navigate = useNavigate();
  const [municipios, setMunicipios] = useState([]);
  const [qSearch, setQSearch] = useState("");
  const [municipioSel, setMunicipioSel] = useState(null);
  const [coords, setCoords] = useState(null);
  const [clima, setClima] = useState(null);
  const [unit, setUnit] = useState("C");
  const [openPicker, setOpenPicker] = useState(false);
  const [loadingGeo, setLoadingGeo] = useState(false);
  const [loadingWx, setLoadingWx] = useState(false);
  const [booting, setBooting] = useState(true);
  const [productos, setProductos] = useState([]);
  const [cultivos, setCultivos] = useState([]);
  const trackRef = useRef(null);
  const autoRef = useRef(null);
  const pausedRef = useRef(false);
  const selId = useRef(localStorage.getItem("municipioSeleccionado") || "");
  const geoCacheRef = useRef({});
  const geoCacheKey = "geoCacheV1";

  useEffect(() => {
    try {
      const raw = localStorage.getItem(geoCacheKey);
      if (raw) geoCacheRef.current = JSON.parse(raw) || {};
    } catch {}
  }, []);

  useEffect(() => {
    const qy = query(collection(db, "municipios"), orderBy("creadoEn", "desc"));
    const unsub = onSnapshot(qy, (snap) => {
      const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setMunicipios(rows);
    });
    return unsub;
  }, []);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "productos"), (snap) => {
      const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setProductos(rows);
    });
    return unsub;
  }, []);

  useEffect(() => {
    const auth = getAuth();
    const off = onAuthStateChanged(auth, (u) => {
      if (!u?.uid) {
        setCultivos([]);
        return;
      }
      const qy = query(collection(db, "usuarios", u.uid, "cultivos"), orderBy("creadoEn", "desc"));
      const unsub = onSnapshot(qy, (snap) => {
        const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setCultivos(rows);
      });
      return () => unsub();
    });
    return () => off();
  }, []);

  useEffect(() => {
    if (!municipios.length) return;
    let pre = municipios.find((m) => m.id === selId.current) || null;
    if (!pre) {
      const faca = municipios.find((m) => norm(m.municipio).includes("facatativa") || norm(m.municipio) === "faca");
      pre = faca || municipios[0] || null;
    }
    if (pre) selectMunicipio(pre, false);
  }, [municipios]);

  async function ensureCoords(m) {
    if (m.lat != null && m.lng != null) return { lat: Number(m.lat), lng: Number(m.lng) };
    const cached = geoCacheRef.current[m.id];
    if (cached && typeof cached.lat === "number" && typeof cached.lng === "number") return cached;
    setLoadingGeo(true);
    try {
      const q1 = `${m.municipio}, ${m.departamento}, Colombia`;
      const url1 = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q1)}&count=1&language=es&format=json`;
      let r = await fetch(url1);
      let j = await r.json();
      let hit = j?.results?.[0];
      if (!hit) {
        const q2 = `${m.municipio}, Colombia`;
        const url2 = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q2)}&count=1&language=es&format=json`;
        r = await fetch(url2);
        j = await r.json();
        hit = j?.results?.[0];
      }
      if (hit) {
        const out = { lat: Number(hit.latitude), lng: Number(hit.longitude) };
        geoCacheRef.current[m.id] = out;
        try {
          localStorage.setItem(geoCacheKey, JSON.stringify(geoCacheRef.current));
        } catch {}
        return out;
      }
    } catch {} finally {
      setLoadingGeo(false);
    }
    return null;
  }

  async function selectMunicipio(m, shouldReload = true) {
    selId.current = m.id;
    localStorage.setItem("municipioSeleccionado", m.id);
    setMunicipioSel(m);
    const c = await ensureCoords(m);
    setCoords(c);
    if (shouldReload) {
      setTimeout(() => window.location.reload(), 120);
    }
  }

  useEffect(() => {
    const fetchWeather = async () => {
      if (!coords) {
        setClima(null);
        return;
      }
      setLoadingWx(true);
      const url =
        `https://api.open-meteo.com/v1/forecast?latitude=${coords.lat}&longitude=${coords.lng}` +
        `&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code` +
        `&current_weather=true` +
        `&hourly=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code` +
        `&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,weather_code` +
        `&timezone=auto`;
      try {
        const r = await fetch(url);
        const j = await r.json();
        setClima(j);
      } catch {
        setClima(null);
      } finally {
        setLoadingWx(false);
        setBooting(false);
      }
    };
    fetchWeather();
  }, [coords, municipioSel?.id]);

  const hr = clima?.hourly || {};
  const hrTimes = hr.time || [];
  let nowIdx = -1;
  if (hrTimes.length) {
    const nowISO = new Date().toISOString().slice(0, 13);
    nowIdx = hrTimes.findIndex((t) => t.startsWith(nowISO));
    if (nowIdx < 0) nowIdx = hrTimes.length - 1;
  }
  const hTemp = nowIdx >= 0 ? hr.temperature_2m?.[nowIdx] : null;
  const hHum = nowIdx >= 0 ? hr.relative_humidity_2m?.[nowIdx] : null;
  const hWind = nowIdx >= 0 ? hr.wind_speed_10m?.[nowIdx] : null;
  const hCode = nowIdx >= 0 ? (hr.weather_code?.[nowIdx] ?? hr.weathercode?.[nowIdx]) : null;

  const currNew = clima?.current || {};
  const currOld = clima?.current_weather || {};
  const currTemp = currNew.temperature_2m ?? currOld.temperature ?? hTemp ?? null;
  const currHum = currNew.relative_humidity_2m ?? hHum ?? null;
  const currWind = currNew.wind_speed_10m ?? currOld.windspeed ?? hWind ?? null;
  const currCode = currNew.weather_code ?? currOld.weathercode ?? hCode ?? null;

  const dias = useMemo(() => {
    const out = [];
    if (!clima?.daily) return out;
    const d = clima.daily;
    const codes = d.weather_code || d.weathercode || [];
    for (let i = 0; i < d.time.length; i++) {
      out.push({
        date: d.time[i],
        tmax: d.temperature_2m_max[i],
        tmin: d.temperature_2m_min[i],
        pprob: d.precipitation_probability_max?.[i],
        code: codes[i]
      });
    }
    return out.slice(0, 7);
  }, [clima]);

  const bgUrl = municipioSel?.url || "";
  const filtered = useMemo(() => {
    const q = norm(qSearch);
    if (!q) return municipios;
    return municipios.filter((m) => norm(`${m.municipio} ${m.departamento}`).includes(q));
  }, [municipios, qSearch]);

  const showLoader = booting || loadingGeo || loadingWx;

  const prodsForMunicipio = useMemo(() => {
    return productos;
  }, [productos]);

  const onNav = (dir) => {
    const el = trackRef.current;
    if (!el) return;
    const card = el.querySelector(`.${styles.proCard}`);
    const delta = card ? card.clientWidth + 16 : el.clientWidth * 0.8;
    el.scrollBy({ left: dir * delta, behavior: "smooth" });
  };

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    const loop = () => {
      if (pausedRef.current) return;
      const maxScroll = el.scrollWidth - el.clientWidth;
      const advance = Math.max(1, Math.round(el.clientWidth * 0.5));
      if (el.scrollLeft >= maxScroll - 4) {
        el.scrollTo({ left: 0, behavior: "smooth" });
      } else {
        el.scrollBy({ left: advance, behavior: "smooth" });
      }
    };
    autoRef.current = setInterval(loop, 3800);
    return () => clearInterval(autoRef.current);
  }, []);

  const tips = [
    (m) => `Recuerda revisar el pronóstico de la tarde en ${m} antes de regar.`,
    (m) => `Anota hoy la humedad del suelo en ${m}; te ayuda a ajustar riego.`,
    (m) => `Verifica viento en ${m} antes de aplicar productos al follaje.`,
    (m) => `¿Semillas listas? Revisa fechas de siembra recomendadas para ${m}.`,
    (m) => `Sube una foto de tu cultivo y pregunta a la IA por buenas prácticas.`,
    (m) => `Consulta precios del día para vender mejor en tu plaza cercana.`,
    (m) => `Mira el Top 3 recomendado; puede darte una idea rápida para ${m}.`,
  ];
  const tipOfDay = useMemo(() => {
    const m = municipioSel?.municipio || "tu municipio";
    const idx = new Date().getDate() % tips.length;
    return tips[idx](m);
  }, [municipioSel?.municipio]);

  const cultivosJoin = useMemo(() => {
    if (!cultivos?.length) return [];
    return cultivos.map((c) => {
      const p = productos.find((pp) => norm(pp.nombre) === norm(c.producto));
      return {
        ...c,
        img: p?.url || "/producto_placeholder.jpg",
        variedad: p?.variedad || "",
        tipo: c.tipo || p?.tipo || "",
      };
    });
  }, [cultivos, productos]);

  return (
    <div className={`${styles.wrap} ${!showLoader ? styles.ready : ""}`}>
      {showLoader && (
        <div className={styles.loadingScreen}>
          <div className={styles.spinner}></div>
          <div className={styles.loadingText}>Cargando datos del clima…</div>
        </div>
      )}

      <section className={styles.hero}>
        <div className={styles.heroHead}>
          <h1 className={styles.title}>
            {municipioSel ? `${municipioSel.municipio.toUpperCase()} ${municipioSel.departamento.toUpperCase()}` : "SELECCIONA MUNICIPIO"}
          </h1>
          <div className={styles.actionsTop}>
            <span className={styles.sectionTag}>Clima</span>
            <button className={styles.btnPicker} onClick={() => setOpenPicker(v => !v)}>
              Cambiar municipio
              <span className={`${styles.caret} ${openPicker ? styles.caretUp : ""}`}></span>
            </button>
            <div className={`${styles.pickerInline} ${openPicker ? styles.pickerOpen : ""}`}>
              <div className={styles.pickerBody}>
                <input className={styles.search} placeholder="Buscar municipio o departamento"
                  value={qSearch} onChange={(e)=>setQSearch(e.target.value)} />
                <div className={styles.list}>
                  {filtered.map(m => (
                    <button key={m.id}
                      className={`${styles.item} ${m.id===municipioSel?.id ? styles.itemSel : ""}`}
                      onClick={() => selectMunicipio(m, true)}>
                      <div className={styles.itemTitle}>{m.municipio}</div>
                      <div className={styles.itemSub}>{m.departamento}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className={styles.heroGrid}>
          <div className={styles.weatherCol}>
            <div className={styles.todayBox}>
              <div className={styles.todayMain}>
                <img className={styles.iconNow} src={iconPath(currCode)} alt="" />
                <div className={styles.tempNow}>
                  {currTemp != null ? (unit === "C" ? Math.round(currTemp) : cToF(currTemp)) : "--"}
                  <button className={`${styles.unit} ${unit === "C" ? styles.unitOn : ""}`} onClick={() => setUnit("C")}>°C</button>
                  <span className={styles.sep}>|</span>
                  <button className={`${styles.unit} ${unit === "F" ? styles.unitOn : ""}`} onClick={() => setUnit("F")}>°F</button>
                </div>
              </div>
              <div className={styles.meta}>
                <div>Prob. de precipitaciones: {dias[0]?.pprob != null ? `${dias[0].pprob}%` : "—"}</div>
                <div>Humedad: {currHum != null ? `${currHum}%` : "—"}</div>
                <div>Viento: {currWind != null ? `${Math.round(currWind)} km/h` : "—"}</div>
              </div>
            </div>

            <div className={styles.weekStrip}>
              {dias.map((d, i) => (
                <div key={d.date} className={styles.day} style={{ animationDelay: `${i * 30}ms` }}>
                  <div className={styles.dayName}>
                    {new Date(d.date).toLocaleDateString("es-CO", { weekday: "short" })}
                  </div>
                  <img className={styles.dayIcon} src={iconPath(d.code)} alt="" />
                  <div className={styles.dayTemps}>
                    <span>{unit === "C" ? Math.round(d.tmin) : cToF(d.tmin)}°</span>
                    <span> / </span>
                    <span>{unit === "C" ? Math.round(d.tmax) : cToF(d.tmax)}°</span>
                  </div>
                  <div className={styles.dayP}>{d.pprob != null ? `${d.pprob}%` : "—"}</div>
                </div>
              ))}
            </div>
          </div>

          <aside className={styles.muniPanel}>
            <img
              className={styles.muniImg}
              src={bgUrl || "/fallback-muni.jpg"}
              alt={municipioSel ? `${municipioSel.municipio}, ${municipioSel.departamento}` : "Municipio"}
              loading="lazy"
              decoding="async"
            />
            <div className={styles.muniBadge}>
              {municipioSel ? `${municipioSel.municipio}, ${municipioSel.departamento}` : "—"}
            </div>
          </aside>
        </div>
      </section>

      <section className={styles.actionsWrap} aria-label="Qué puedes hacer">
        <h2 className={styles.actionsTitle}>¿Qué puedes hacer?</h2>
        <div className={styles.actionsGrid}>
          <button className={styles.actionCard} onClick={() => navigate("/Inicio")}>
            <div className={styles.actionImgBox}>
              <img src="/Clima_ini.svg" alt="Clima próximos 7 días" className={styles.actionImg} loading="lazy" decoding="async" />
            </div>
            <div className={styles.actionText}>
              <b>Ver clima</b>
              <span>Pronóstico de 7 días, humedad y viento de tu municipio.</span>
            </div>
          </button>

          <button className={styles.actionCard} onClick={() => navigate("/ChatIA")}>
            <div className={styles.actionImgBox}>
              <img src="/chatIa_ini.png" alt="Consejos con IA" className={styles.actionImg} loading="lazy" decoding="async" />
            </div>
            <div className={styles.actionText}>
              <b>Pídele consejos a la IA</b>
              <span>Buenas prácticas de siembra, riego y control según tu cultivo.</span>
            </div>
          </button>

          <button className={styles.actionCard} onClick={() => navigate("/TopProductos")}>
            <div className={styles.actionImgBox}>
              <img src="/planta_ini.svg" alt="Te ayudamos a escoger" className={styles.actionImg} loading="lazy" decoding="async" />
            </div>
            <div className={styles.actionText}>
              <b>Te ayudamos a escoger</b>
              <span>Top 3 cultivos con fechas estimadas de siembra y cosecha.</span>
            </div>
          </button>

          <button className={styles.actionCard} onClick={() => navigate("/PreciosDiarios")}>
            <div className={styles.actionImgBox}>
              <img src="/precio_ini.svg" alt="Precios diarios" className={styles.actionImg} loading="lazy" decoding="async" />
            </div>
            <div className={styles.actionText}>
              <b>Consulta precios diarios</b>
              <span>Variaciones y referencias de mercado para vender mejor.</span>
            </div>
          </button>
        </div>
        <div className={styles.actionsFoot}>
          <span className={styles.footIcon} aria-hidden>💡</span>
          <p className={styles.footText}>{tipOfDay}</p>
        </div>
      </section>

      <section className={styles.top3Wrap} aria-label="Top 3 recomendado">
        <div className={styles.top3Band}>
          <div className={styles.top3Copy}>
            <h2 className={styles.top3Title}>¿No sabes qué sembrar?</h2>
            <p className={styles.top3Lead}>Nosotros te ayudamos con…</p>
            <ul className={styles.top3List}>
              <li>Análisis de clima histórico y pronóstico regional.</li>
              <li>Demanda y precios recientes del mercado.</li>
              <li>Parámetros agro del cultivo en tu zona.</li>
            </ul>
            <p className={styles.top3After}>
              Después te damos el <b>Top 3</b> de los mejores productos para sembrar,
              la <b>fecha estimada de cosecha</b> y te contamos <b>por qué</b>.
            </p>
            <button
              className={styles.top3CTA}
              onClick={() => navigate("/TopProductos")}
              aria-label="Ir a la vista Top 3"
            >
              Consultar Top 3
            </button>
          </div>

          <div className={styles.top3Art} role="presentation">
            <img
              src="/granjerozzz.png"
              alt="Granjero descansando"
              className={styles.top3Farmer}
              loading="lazy"
              decoding="async"
              draggable={false}
            />
          </div>
        </div>
      </section>



      <section className={styles.bandPro}>
        <div className={styles.innerWide}>
          <div className={styles.proHead}>
            <div className={styles.proCopy}>
              <h2 className={styles.proTitle}>Productos disponibles</h2>
              <p className={styles.proSub}>Explora los cultivos de la Región.</p>
            </div>
            <div className={styles.proNav}>
              <button className={styles.navBtn} onClick={() => onNav(-1)} aria-label="Anterior">‹</button>
              <button className={styles.navBtn} onClick={() => onNav(1)} aria-label="Siguiente">›</button>
            </div>
          </div>

          <div
            className={styles.proViewport}
            onMouseEnter={() => (pausedRef.current = true)}
            onMouseLeave={() => (pausedRef.current = false)}
          >
            <div className={styles.proTrack} ref={trackRef}>
              {prodsForMunicipio.map((p) => (
                <article key={p.id} className={styles.proCard}>
                  <div className={styles.proThumb}>
                    {p.url ? (
                      <img src={p.url} alt={p.nombre} loading="lazy" decoding="async" />
                    ) : (
                      <div className={styles.proThumbEmpty}>Sin imagen</div>
                    )}
                    {p.tipo ? <span className={styles.proBadge}>{p.tipo}</span> : null}
                  </div>
                  <div className={styles.proBody}>
                    <h3 className={styles.proName}>{p.nombre}</h3>
                    <div className={styles.proChips}>
                      {p.variedad ? <span className={styles.proChip}>{p.variedad}</span> : null}
                      {p.ciclo ? <span className={styles.proChip}>{p.ciclo}</span> : null}
                    </div>
                  </div>
                </article>
              ))}
              {!prodsForMunicipio.length && (
                <div className={styles.proEmpty}>No hay productos registrados</div>
              )}
            </div>
          </div>
        </div>
      </section>
            {cultivosJoin.length > 0 && (
        <section className={styles.myWrap} aria-label="Mis cultivos">
          <div className={styles.myHead}>
            <h2 className={styles.myTitle}>Mis cultivos</h2>
            <p className={styles.mySub}>Registros asociados a tu cuenta</p>
          </div>

          <div className={styles.myGrid}>
            {cultivosJoin.map((c) => (
              <article key={c.id} className={styles.myCard}>
                <div className={styles.myImgBox}>
                  <img src={c.img} alt={c.producto} className={styles.myImg} loading="lazy" decoding="async" />
                </div>
                <div className={styles.myBody}>
                  <h3 className={styles.myName}>{c.producto}</h3>
                  <div className={styles.myChips}>
                    {c.tipo ? <span className={styles.myChip}>{c.tipo}</span> : null}
                    {c.variedad ? <span className={styles.myChip}>{c.variedad}</span> : null}
                    <span className={styles.myChip}>{c.metros2 ?? 0} m²</span>
                    {c.municipio ? (
                      <span className={styles.myChip}>{c.municipio}{c.departamento ? ` – ${c.departamento}` : ""}</span>
                    ) : null}
                  </div>

                  <div className={styles.myMeta}>
                    <div className={styles.myKard}>
                      <div className={styles.kLabel}>Siembra</div>
                      <div className={styles.kValue}>{c.fechaSiembra || "—"}</div>
                    </div>
                    <div className={styles.myKard}>
                      <div className={styles.kLabel}>Cosecha</div>
                      <div className={styles.kValue}>{c.fechaCosecha || "—"}</div>
                    </div>
                    <div className={styles.myKard}>
                      <div className={styles.kLabel}>Temp.</div>
                      <div className={styles.kValue}>{c.temperatura || "—"}</div>
                    </div>
                    <div className={styles.myKard}>
                      <div className={styles.kLabel}>Humedad</div>
                      <div className={styles.kValue}>{c.humedad || "—"}</div>
                    </div>
                    <div className={styles.myKard}>
                      <div className={styles.kLabel}>Altitud</div>
                      <div className={styles.kValue}>{c.altitud || "—"}</div>
                    </div>
                    <div className={styles.myKard}>
                      <div className={styles.kLabel}>Clima</div>
                      <div className={styles.kValue}>{c.climaCoincidencia != null ? `${c.climaCoincidencia}%` : "—"}</div>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
