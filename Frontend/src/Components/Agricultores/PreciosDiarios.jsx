import { useEffect, useMemo, useState } from 'react';
import { api } from '../../api/axios';
import { db } from '../../firebase/client';
import { collection, onSnapshot } from 'firebase/firestore';
import "./DOCSS/PreciosDiarios.css";

export default function PreciosDiarios() {
  const [productosBD, setProductosBD] = useState([]);
  const [productos, setProductos] = useState([]);
  const [nuevo, setNuevo] = useState('');
  const [data, setData] = useState([]);
  const [fecha, setFecha] = useState('');
  const [cargando, setCargando] = useState(true); // 👈 inicia cargando en true
  const [error, setError] = useState('');

  const norm = (s = '') =>
    s
      .toString()
      .normalize('NFD')
      .replace(/\p{Diacritic}+/gu, '')
      .trim()
      .toLowerCase()
      .replace(/\s+/g, ' ');

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'productos'), snap => {
      const arr = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setProductosBD(arr);
      setProductos(arr.map(x => x.nombre));
    });
    return unsub;
  }, []);

  const urlByNombre = useMemo(() => {
    const m = new Map();
    for (const p of productosBD) {
      if (p?.nombre) m.set(norm(p.nombre), p.url || '');
    }
    return m;
  }, [productosBD]);

  const query = useMemo(() => productos.join(','), [productos]);

  const cargar = async () => {
    try {
      setCargando(true);
      setError('');
      const res = await api.get(`/api/precios-diarios`, { params: { productos: query } });
      setData(res.data.rows || []);
      setFecha(res.data.fecha || '');
    } catch (e) {
      setError(e?.response?.data?.error || e.message);
      setData([]);
      setFecha('');
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    if (query) cargar();
  }, [query]);

  const agregar = () => {
    const nom = (nuevo || '').trim();
    if (!nom) return;
    if (productos.some(p => norm(p) === norm(nom))) { setNuevo(''); return; }
    setProductos(prev => [...prev, nom]);
    setNuevo('');
  };

  const quitar = (nom) => {
    setProductos(prev => prev.filter(p => norm(p) !== norm(nom)));
  };

  // === 🌀 Pantalla de carga tipo Home ===
  if (cargando) {
    return (
      <div className="loaderScreen">
        <div className="loaderSpinner"></div>
        <p className="loaderText">Cargando información…</p>
      </div>
    );
  }

  // === 💾 Contenido principal ===
  return (
    <div className="pdv">
      <div className="pdv__header">
        <h2 className="pdv__title">Precios diarios Corabastos</h2>
        <div className="pdv__date">
          Fecha boletín: {fecha ? `${fecha.slice(0,4)}-${fecha.slice(4,6)}-${fecha.slice(6,8)}` : '—'}
        </div>
      </div>

      <div className="pdv__controls">
        <input
          className="pdv__input"
          value={nuevo}
          onChange={e => setNuevo(e.target.value)}
          placeholder="Agregar producto (ej: FRESA)"
        />
        <button className="pdv__btn pdv__btn--primary" onClick={agregar}>Agregar</button>
        <button className="pdv__btn pdv__btn--ghost" onClick={cargar}>Actualizar</button>
      </div>

      <div className="pdv__chips">
        {productos.map(p => {
          const u = urlByNombre.get(norm(p));
          return (
            <span key={p + Math.random()} className="pdv__chip">
              {u ? <img src={u} alt={p} className="pdv__chip-img" /> : null}
              <span className="pdv__chip-text">{p}</span>
              <button className="pdv__chip-x" onClick={() => quitar(p)} aria-label={`Quitar ${p}`}>✕</button>
            </span>
          );
        })}
      </div>

      {error && <div className="pdv__error">{error}</div>}

      <div className="pdv__table-wrap">
        <table className="pdv__table">
          <thead>
            <tr>
              {['Nombre','Presentación','Cantidad','Unidad','$ Extra','$ Primera','$ Unidad','Variación'].map(h => (
                <th key={h} className="pdv__th">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.length === 0 && (
              <tr><td colSpan="8" className="pdv__empty">Sin resultados para los productos solicitados.</td></tr>
            )}
            {data.map((r, idx) => {
              const u = urlByNombre.get(norm(r.nombre));
              return (
                <tr key={idx} className="pdv__tr">
                  <td className="pdv__td pdv__td--name">
                    {u ? <img src={u} alt={r.nombre} className="pdv__row-img" /> : null}
                    <span>{r.nombre}</span>
                  </td>
                  <td className="pdv__td">{r.presentacion}</td>
                  <td className="pdv__td">{r.cantidad}</td>
                  <td className="pdv__td">{r.unidadMedida}</td>
                  <td className="pdv__td">{r.precioCalidadExtra}</td>
                  <td className="pdv__td">{r.precioCalidadPrimera}</td>
                  <td className="pdv__td">{r.precioPorUnidad}</td>
                  <td className="pdv__td">{r.variacion}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="pdv__footer">
        Fuente: Corabastos. La vista consulta el boletín del último día hábil disponible.
      </div>
    </div>
  );
}
