import { useEffect, useMemo, useState } from 'react';
import { api } from '../api/axios';
import { db } from '../firebase/client';
import { collection, onSnapshot } from 'firebase/firestore';

export default function PreciosDiarios() {
  const [productosBD, setProductosBD] = useState([]);
  const [productos, setProductos] = useState([]);
  const [nuevo, setNuevo] = useState('');
  const [data, setData] = useState([]);
  const [fecha, setFecha] = useState('');
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'productos'), snap => {
      const arr = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setProductosBD(arr);
      setProductos(prev => {
        const prevSet = new Set(prev.map(x => norm(x)));
        const bdSet = new Set(arr.map(x => norm(x.nombre || '')));
        const same = prev.length === arr.length && [...prevSet].every(k => bdSet.has(k));
        return prev.length === 0 || same ? arr.map(x => x.nombre) : prev;
      });
    });
    return unsub;
  }, []);

  const norm = (s='') =>
    s
      .toString()
      .normalize('NFD')
      .replace(/\p{Diacritic}+/gu, '')
      .trim()
      .toLowerCase()
      .replace(/\s+/g, ' ');

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

  useEffect(() => { if (query) cargar(); }, [query]);

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

  return (
    <div style={{ padding: 16 }}>
      <h2 style={{ marginBottom: 8 }}>Precios diarios Corabastos</h2>
      <div style={{ fontSize: 12, marginBottom: 12, opacity: 0.8 }}>
        Fecha boletín: {fecha ? `${fecha.slice(0,4)}-${fecha.slice(4,6)}-${fecha.slice(6,8)}` : '—'}
      </div>

      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12 }}>
        <input
          value={nuevo}
          onChange={e => setNuevo(e.target.value)}
          placeholder="Agregar producto (ej: FRESA)"
          style={{ padding: 8, flex: 1 }}
        />
        <button onClick={agregar} style={{ padding: '8px 12px' }}>Agregar</button>
        <button onClick={cargar} style={{ padding: '8px 12px' }} disabled={cargando}>
          {cargando ? 'Cargando…' : 'Actualizar'}
        </button>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
        {productos.map(p => {
          const u = urlByNombre.get(norm(p));
          return (
            <span
              key={p + Math.random()}
              style={{
                border: '1px solid #e1e7f5',
                padding: '6px 10px',
                borderRadius: 999,
                background: '#f6f9ff',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8
              }}
            >
              {u ? (
                <img
                  src={u}
                  alt={p}
                  style={{ width: 20, height: 20, objectFit: 'cover', borderRadius: '50%', border: '1px solid #e5e7eb' }}
                />
              ) : null}
              {p}
              <button onClick={() => quitar(p)} style={{ border: 0, background: 'transparent', cursor: 'pointer' }}>✕</button>
            </span>
          );
        })}
      </div>

      {error && <div style={{ color: '#b91c1c', marginBottom: 12 }}>{error}</div>}

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              {['Nombre','Presentación','Cantidad','Unidad','$ Extra','$ Primera','$ Unidad','Variación'].map(h => (
                <th key={h} style={{ textAlign: 'left', borderBottom: '1px solid #e1e7f5', padding: 8 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.length === 0 && !cargando && (
              <tr><td colSpan="8" style={{ padding: 12, opacity: 0.7 }}>Sin resultados para los productos solicitados.</td></tr>
            )}
            {data.map((r, idx) => {
              const u = urlByNombre.get(norm(r.nombre));
              return (
                <tr key={idx}>
                  <td style={{ padding: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                    {u ? (
                      <img
                        src={u}
                        alt={r.nombre}
                        style={{ width: 28, height: 28, objectFit: 'cover', borderRadius: 6, border: '1px solid #e5e7eb' }}
                      />
                    ) : null}
                    <span>{r.nombre}</span>
                  </td>
                  <td style={{ padding: 8 }}>{r.presentacion}</td>
                  <td style={{ padding: 8 }}>{r.cantidad}</td>
                  <td style={{ padding: 8 }}>{r.unidadMedida}</td>
                  <td style={{ padding: 8 }}>{r.precioCalidadExtra}</td>
                  <td style={{ padding: 8 }}>{r.precioCalidadPrimera}</td>
                  <td style={{ padding: 8 }}>{r.precioPorUnidad}</td>
                  <td style={{ padding: 8 }}>{r.variacion}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div style={{ fontSize: 12, marginTop: 10, opacity: .65 }}>
        Fuente: Corabastos. La vista consulta el boletín del último día hábil disponible.
      </div>
    </div>
  );
}
