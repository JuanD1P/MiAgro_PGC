import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import 'dotenv/config';

import admin from 'firebase-admin'; 

import { askOpenAI } from './utils/ai.js';
import { authAdmin, firestoreAdmin } from './utils/db.js';
import { requireAuth } from './middlewares/requireAuth.js';

import preciosRouter from './Routes/precios.js';
import { userRouter } from './Routes/usuariosR.js';

const app = express();


app.use(cors({
  origin: ['http://localhost:5173'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json());
app.use(cookieParser());

app.get('/health', (_req, res) => res.json({ ok: true }));


app.post('/auth/session', async (req, res) => {
  try {
    const { idToken } = req.body;
    if (!idToken) return res.status(400).json({ error: "Falta idToken" });

    const decoded = await authAdmin.verifyIdToken(idToken);
    const uid = decoded.uid;

    const doc = await firestoreAdmin.collection('usuarios').doc(uid).get();
    const rol = doc.exists ? (doc.data().rol || 'USER') : 'USER';

    res.json({ ok: true, uid, rol });
  } catch (e) {
    console.error('❌ Error en /auth/session:', e?.message);
    res.status(401).json({ error: 'Token inválido' });
  }
});


app.get('/api/whoami', requireAuth, (req, res) => {
  res.json({ uid: req.user?.uid || null, email: req.user?.email || null });
});


app.use('/api', preciosRouter);
app.use('/api', requireAuth, userRouter);

app.post('/api/ai/chat', requireAuth, async (req, res) => {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({ error: "OPENAI_API_KEY no está definida" });
    }

    const { text, conversationId } = req.body;
    if (!text?.trim()) return res.status(400).json({ error: "Falta 'text'." });


    const convRef = conversationId
      ? firestoreAdmin.collection('conversations').doc(conversationId)
      : firestoreAdmin.collection('conversations').doc();


    const history = [
      { role: 'system', content: 'Eres un asistente agrícola útil, conciso y práctico.' },
    ];

    const snap = await convRef.collection('messages')
      .orderBy('createdAt', 'asc')
      .get();

    snap.forEach(d => {
      const { role, content } = d.data();
      if (role && content) history.push({ role, content });
    });


    history.push({ role: 'user', content: text });


    const reply = await askOpenAI(history);


    const batch = firestoreAdmin.batch();
    const now = admin.firestore.FieldValue.serverTimestamp();
    const uid = req.user.uid;


    const meta = {
      owner: uid,
      createdAt: now,
    };
    if (snap.empty) {
      meta.title = text.slice(0, 60); 
    }

    batch.set(convRef, meta, { merge: true });

    batch.set(convRef.collection('messages').doc(), {
      role: 'user',
      content: text,
      createdAt: now,
      uid, 
    });

    batch.set(convRef.collection('messages').doc(), {
      role: 'assistant',
      content: reply,
      createdAt: now,
    });

    await batch.commit();

    res.json({ conversationId: convRef.id, reply });
  } catch (e) {
    console.error('❌ /api/ai/chat:', e);
    res.status(500).json({ error: e.message || 'Error interno' });
  }
});


app.listen(3000, () => {
  console.log('🚀 Servidor en funcionamiento en http://localhost:3000');
});
