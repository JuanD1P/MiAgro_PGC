import { Router } from 'express';
import { getPrecios } from '../utils/corabastos.js';

const router = Router();

router.get('/precios-diarios', async (req, res) => {
  try {
    const productos = (req.query.productos || '').split(',').map(s => s.trim()).filter(Boolean);
    const fechaYmd = req.query.fecha && /^\d{8}$/.test(req.query.fecha) ? req.query.fecha : undefined;
    const data = await getPrecios({ fechaYmd, productos });
    res.json({ ok: true, ...data });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

export default router;
