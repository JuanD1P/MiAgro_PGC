import { authAdmin } from "../utils/db.js";

export const requireAuth = async (req, res, next) => {
  try {
    const raw = String(req.headers.authorization || req.get("Authorization") || "");
    const m = raw.match(/^Bearer\s+(.+)$/i);
    let token = m ? m[1].trim() : "";

    if (!token && req.cookies?.session) token = req.cookies.session;

    if (!token) {
      console.warn("requireAuth: falta token. Headers:", req.headers);
      return res.status(401).json({ error: "Falta token (Bearer)" });
    }

    const decoded = await authAdmin.verifyIdToken(token);
    req.user = decoded; 
    return next();
  } catch (e) {
    console.error("requireAuth error:", e?.message);
    return res.status(401).json({ error: "No autorizado" });
  }
};
