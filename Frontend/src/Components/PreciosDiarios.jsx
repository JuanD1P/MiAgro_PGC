import { useEffect, useMemo, useState } from 'react';
import { api } from '../api/axios';

const PREDETERMINADOS = [
  'FRESA',
  'MAIZ AMARILLO DURO /ROCOL',
  'MAIZ BLANCO DURO',
  'GRANADILLA',
  'LULO',
  'ACELGA',
  'PIMENTON',
];

export default function PreciosDiarios() {
  const [productos, setProductos] = useState(PREDETERMINADOS);
  const [nuevo, setNuevo] = useState('');
  const [data, setData] = useState([]);
  const [fecha, setFecha] = useState('');
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');

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

  useEffect(() => { cargar(); }, [query]);

  const agregar = () => {
    const nom = (nuevo || '').trim();
    if (!nom) return;
    if (productos.some(p => p.toLowerCase() === nom.toLowerCase())) { setNuevo(''); return; }
    setProductos(prev => [...prev, nom]);
    setNuevo('');
  };

  const quitar = (nom) => {
    setProductos(prev => prev.filter(p => p.toLowerCase() !== nom.toLowerCase()));
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
        {productos.map(p => (
          <span key={p} style={{ border: '1px solid #e1e7f5', padding: '6px 10px', borderRadius: 999, background: '#f6f9ff', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            {p}
            <button onClick={() => quitar(p)} style={{ border: 0, background: 'transparent', cursor: 'pointer' }}>✕</button>
          </span>
        ))}
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
            {data.map((r, idx) => (
              <tr key={idx}>
                <td style={{ padding: 8 }}>{r.nombre}</td>
                <td style={{ padding: 8 }}>{r.presentacion}</td>
                <td style={{ padding: 8 }}>{r.cantidad}</td>
                <td style={{ padding: 8 }}>{r.unidadMedida}</td>
                <td style={{ padding: 8 }}>{r.precioCalidadExtra}</td>
                <td style={{ padding: 8 }}>{r.precioCalidadPrimera}</td>
                <td style={{ padding: 8 }}>{r.precioPorUnidad}</td>
                <td style={{ padding: 8 }}>{r.variacion}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ fontSize: 12, marginTop: 10, opacity: .65 }}>
        Fuente: Corabastos. La vista consulta el boletín del último día hábil disponible.
      </div>
    </div>
  );
}
