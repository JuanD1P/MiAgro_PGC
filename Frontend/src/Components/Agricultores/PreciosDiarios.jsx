import { useEffect, useMemo, useState } from "react";
import { api } from "../../api/axios";
import { db } from "../../firebase/client";
import { collection, onSnapshot } from "firebase/firestore";
import "./DOCSS/PreciosDiarios.css";

export default function PreciosDiarios() {
  const [productosBD, setProductosBD] = useState([]);
  const [productos, setProductos] = useState([]);
  const [data, setData] = useState([]);
  const [fecha, setFecha] = useState("");
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [q, setQ] = useState("");
  const [sortKey, setSortKey] = useState("nombre");
  const [sortDir, setSortDir] = useState("asc");
  const [tipoSel, setTipoSel] = useState("Todos");
  const [helpOpen, setHelpOpen] = useState(false);

  const norm = (s = "") =>
    s.toString().normalize("NFD").replace(/\p{Diacritic}+/gu, "").trim().toLowerCase().replace(/\s+/g, " ");

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "productos"), (snap) => {
      const arr = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      const ordenados = [...arr].sort((a, b) =>
        (a?.nombre || "").localeCompare(b?.nombre || "", "es", { sensitivity: "base" })
      );
      setProductosBD(ordenados);
      setProductos(ordenados.map((x) => x.nombre));
    });
    return unsub;
  }, []);

  const urlByNombre = useMemo(() => {
    const m = new Map();
    for (const p of productosBD) if (p?.nombre) m.set(norm(p.nombre), p.url || "");
    return m;
  }, [productosBD]);

  const tipoByNombre = useMemo(() => {
    const m = new Map();
    for (const p of productosBD) if (p?.nombre) m.set(norm(p.nombre), p.tipo || "");
    return m;
  }, [productosBD]);

  const agroByNombre = useMemo(() => {
    const m = new Map();
    for (const p of productosBD) if (p?.nombre) m.set(norm(p.nombre), p.agro || null);
    return m;
  }, [productosBD]);

  const query = useMemo(() => productos.join(","), [productos]);

  const cargar = async () => {
    try {
      setCargando(true);
      setError("");
      const res = await api.get(`/api/precios-diarios`, { params: { productos: query } });
      const rows = Array.isArray(res.data?.rows) ? res.data.rows : [];
      const ordenados = [...rows].sort((a, b) =>
        (a?.nombre || "").localeCompare(b?.nombre || "", "es", { sensitivity: "base" })
      );
      setData(ordenados);
      setFecha(res.data?.fecha || "");
    } catch (e) {
      setError(e?.response?.data?.error || e.message);
      setData([]);
      setFecha("");
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    if (query) cargar();
  }, [query]);

  const meses = ["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"];
  const fechaLarga = (() => {
    if (!fecha || fecha.length !== 8) return "boletín —";
    const y = fecha.slice(0, 4);
    const m = Math.max(0, Math.min(11, Number(fecha.slice(4, 6)) - 1));
    const d = String(Number(fecha.slice(6, 8)));
    return `boletín ${d} de ${meses[m]} del ${y}`;
  })();

  const parseMoney = (v) => {
    if (v == null) return NaN;
    const s = String(v).replace(/\./g, "").replace(/,/g, "").replace(/[^\d.-]/g, "");
    return Number(s);
  };
  const parsePct = (v) => {
    if (v == null) return 0;
    const s = String(v).replace(",", ".").replace(/[^\d.-]/g, "");
    const n = Number(s);
    return isNaN(n) ? 0 : n;
  };
  const currency = (n) =>
    Number.isFinite(n)
      ? n.toLocaleString("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 })
      : "—";

  const trend = (pct) => {
    const n = parsePct(pct);
    if (n > 0) return { label: `${n}%`, cls: "is-up", chip: "↑ Alza" };
    if (n < 0) return { label: `${n}%`, cls: "is-down", chip: "↓ Baja" };
    return { label: "Estable", cls: "is-stable", chip: "• Estable" };
  };

  const tiposDisponibles = useMemo(() => {
    const set = new Set(["Todos"]);
    for (const p of productosBD) if (p?.tipo) set.add(p.tipo);
    return Array.from(set);
  }, [productosBD]);

  const filtered = useMemo(() => {
    const qn = norm(q);
    const t = tipoSel;
    return data.filter((r) => {
      const nombreMatch = !qn || norm(r.nombre).includes(qn);
      const tipoProd = tipoByNombre.get(norm(r.nombre)) || "";
      const tipoMatch = t === "Todos" || tipoProd === t;
      return nombreMatch && tipoMatch;
    });
  }, [data, q, tipoSel, tipoByNombre]);

  const sorted = useMemo(() => {
    const arr = [...filtered].map((r) => ({
      ...r,
      nUnidad: parseMoney(r.precioPorUnidad),
      nVar: parsePct(r.variacion),
    }));
    const dir = sortDir === "asc" ? 1 : -1;
    arr.sort((a, b) => {
      if (sortKey === "unidad") {
        const A = Number.isFinite(a.nUnidad) ? a.nUnidad : Infinity;
        const B = Number.isFinite(b.nUnidad) ? b.nUnidad : Infinity;
        return (A - B) * dir;
      }
      if (sortKey === "variacion") return (a.nVar - b.nVar) * dir;
      return (a.nombre || "").localeCompare(b.nombre || "", "es", { sensitivity: "base" }) * dir;
    });
    return arr;
  }, [filtered, sortKey, sortDir]);

  const setSort = (key) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const helpItems = [
    { k: "Nombre", v: "Producto registrado en plaza mayorista." },
    { k: "Presentación", v: "Atado, Bulto, Caja, Canastilla, Docena, Kilo, Rollo, Bolsa, Paquete, Tonelada, Unidades, Libras." },
    { k: "Cantidad", v: "Cantidad dentro de la presentación. Ej.: Bulto 50, Docena 10, Caja 24." },
    { k: "Unidad de medida", v: "Unidad base asociada a la cantidad: KILO, BULTO, ATADO, CAJA, CANASTILLA, DOCENA, ROLLO, BOLSA, TONELADA, UNIDADES, LIBRAS." },
    { k: "$ unidad", v: "Precio por unidad base en COP." },
    { k: "Cal. Extra", v: "Mejor selección o calibre del producto." },
    { k: "Cal. Primera", v: "Calidad comercial estándar." },
    { k: "Variación", v: "Cambio frente al día anterior: ↑ Alza, ↓ Baja o Estable." },
    { k: "Tipo", v: "Fruta, Verdura, Tubérculo, Grano u otros." },
    { k: "Ciclo d", v: "Días aproximados de ciclo productivo." },
    { k: "Nota", v: "Precios sujetos a oferta y demanda. Fuente Corabastos." }
  ];

  if (cargando) {
    return (
      <div className="loaderScreen">
        <div className="loaderSpinner"></div>
        <p className="loaderText">Cargando información…</p>
      </div>
    );
  }

  return (
    <div className="pdv">
      <button className="helpBtn" onClick={() => setHelpOpen((v) => !v)} aria-expanded={helpOpen} aria-controls="help-panel">?</button>
      <aside id="help-panel" className={`helpPanel ${helpOpen ? "is-open" : ""}`} aria-label="Guía rápida de campos">
        <div className="helpPanel__head">
          <div className="helpPanel__title">Guía rápida</div>
          <button className="helpClose" onClick={() => setHelpOpen(false)} aria-label="Cerrar">×</button>
        </div>
        <div className="helpPanel__body">
          {helpItems.map((i, idx) => (
            <div key={idx} className="helpRow">
              <div className="helpK">{i.k}</div>
              <div className="helpV">{i.v}</div>
            </div>
          ))}
        </div>
      </aside>

      <div className="pdv__wrap">
        <header className="pdv__hero" aria-label="Encabezado del boletín de precios">
          <div className="pdv__heroTop">
            <div className="pdv__badge">PRECIOS HOY</div>
            <h1 className="pdv__title">{fechaLarga}</h1>
            <p className="pdv__subtitle">Referencia mayorista para compras informadas</p>
          </div>
          <div className="pdv__bar">
            <div className="pdv__controlsLeft">
              <div className="pdv__segmented" role="tablist" aria-label="Ordenar">
                <button className={`pdv__seg ${sortKey==="nombre" ? "is-active":""}`} onClick={() => setSort("nombre")} role="tab">Nombre</button>
                <button className={`pdv__seg ${sortKey==="unidad" ? "is-active":""}`} onClick={() => setSort("unidad")} role="tab">$ Unidad</button>
                <button className={`pdv__seg ${sortKey==="variacion" ? "is-active":""}`} onClick={() => setSort("variacion")} role="tab">Variación</button>
                <span className={`pdv__segDir ${sortDir}`}></span>
              </div>
              <div className="pdv__chips" role="group" aria-label="Filtrar por tipo">
                {tiposDisponibles.map((t) => (
                  <button key={t} type="button" className={`pdv__chip ${tipoSel===t ? "is-selected":""}`} onClick={() => setTipoSel(t)}>{t}</button>
                ))}
              </div>
            </div>
            <div className="pdv__controlsRight">
              <div className="pdv__searchWrap">
                <input className="pdv__search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar producto" aria-label="Buscar producto" />
                <span className="pdv__kbd">/</span>
              </div>
              <div className="pdv__counter">Mostrando {sorted.length} de {data.length}</div>
            </div>
          </div>
          {error ? <div className="pdv__error">{error}</div> : null}
        </header>

        <section className="tiles" aria-label="Listado de productos">
          {sorted.length === 0 && <div className="pdv__empty">Sin resultados</div>}
          {sorted.map((r, idx) => {
            const t = trend(r.variacion);
            const key = norm(r.nombre);
            const img = urlByNombre.get(key);
            const tipo = tipoByNombre.get(key) || "—";
            const agro = agroByNombre.get(key);
            const unit = Number.isFinite(parseMoney(r.precioPorUnidad)) ? currency(parseMoney(r.precioPorUnidad)) : "—";
            return (
              <article key={idx} className={`tile ${t.cls}`}>
                <div className="tile__mediaWrap">
                  <div className="tile__media">
                    {img ? <img src={img} alt={r.nombre} loading="lazy" decoding="async" /> : <div className="tile__mediaFallback">{r.nombre?.[0] || "?"}</div>}
                    <div className="tile__mediaOverlay"></div>
                    <div className="tile__trend tagOverlay">
                      <span className={`tag ${t.cls}`}>
                        <span className="dot">{t.chip.split(" ")[0]}</span>
                        <span>{t.label}</span>
                      </span>
                    </div>
                    <div className="tile__pillMedia">
                      <div className="tile__pillLabel">$ unidad</div>
                      <div className="tile__pillValue">{unit}</div>
                    </div>
                  </div>
                </div>

                <div className="tile__content">
                  <div className="tile__titleRow">
                    <h3 className="tile__title">{r.nombre}</h3>
                    <span className="tile__badge">{tipo}</span>
                  </div>

                  <div className="tile__meta">
                    <div className="mItem">
                      <div className="mLabel">Presentación</div>
                      <div className="mValue">{r.presentacion || "—"}</div>
                    </div>
                    <div className="mItem">
                      <div className="mLabel">Cantidad</div>
                      <div className="mValue">{r.cantidad || "—"}</div>
                    </div>
                    <div className="mItem">
                      <div className="mLabel">Unidad</div>
                      <div className="mValue">{r.unidadMedida || "—"}</div>
                    </div>
                    {agro?.cicloDias ? (
                      <div className="mItem">
                        <div className="mLabel">Ciclo</div>
                        <div className="mValue">{agro.cicloDias} d</div>
                      </div>
                    ) : null}
                    <div className="mItem">
                      <div className="mLabel">Cal. Extra</div>
                      <div className="mValue">{r.precioCalidadExtra || "—"}</div>
                    </div>
                    <div className="mItem">
                      <div className="mLabel">Cal. Primera</div>
                      <div className="mValue">{r.precioCalidadPrimera || "—"}</div>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </section>

        <footer className="pdv__footer">
          <div>Fuente: Corabastos. Último día hábil disponible.</div>
        </footer>
      </div>
    </div>
  );
}
