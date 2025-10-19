// Backend/utils/ai.js
import fs from "node:fs";

const OPENAI_API_KEY = (process.env.OPENAI_API_KEY || "").replace(/\s/g, "");
const OPENAI_PROJECT = (process.env.OPENAI_PROJECT || "").trim();

function mask(s, keep = 6) {
  if (!s) return "(vacío)";
  return s.length <= keep * 2 ? "***" : s.slice(0, keep) + "…" + s.slice(-keep);
}

console.log("🔑 OPENAI_API_KEY:", OPENAI_API_KEY.startsWith("sk-proj-") ? "sk-proj-…" : mask(OPENAI_API_KEY));
console.log("🧩 OPENAI_PROJECT:", OPENAI_PROJECT ? mask(OPENAI_PROJECT) : "(sin project)");

if (!OPENAI_API_KEY) {
  console.error("❌ Falta OPENAI_API_KEY en el entorno.");
}
if (OPENAI_API_KEY.startsWith("sk-proj-") && !OPENAI_PROJECT) {
  console.error("❌ Usas clave de proyecto (sk-proj-…) pero falta OPENAI_PROJECT (proj_…).");
}

const SYSTEM_PROMPT_FALLBACK = `
Eres **MiAgro IA**, un asistente agrícola colombiano.

OBJETIVO
- Entregar respuestas **útiles, correctas y accionables** para productores, técnicos y tomadores de decisión.
- Prioriza **sostenibilidad**, **seguridad** y **buenas prácticas locales (MIP)**.

ÁMBITO PERMITIDO (OBLIGATORIO)
- Agricultura y producción agropecuaria (cultivos, suelos, riego, nutrición, plagas/enfermedades, MIP, poscosecha).
- Ganadería y sanidad animal en el contexto productivo.
- Clima y pronóstico **aplicado a decisiones agrícolas** (fenología, riegos, ventanas de siembra/cosecha).
- Economía rural y mercado agro **sin inventar precios** (dar métodos/fuentes para verificarlos).
- Normativa y buenas prácticas del sector agro en Colombia.

FUERA DE ALCANCE (RECHAZAR)
- Medicina humana, anatomía, fitness o diagnósticos clínicos
- Humor/chistes, horóscopos, temas legales/financieros generales no-agro.
- Programación, entretenimiento, trámites ajenos al agro, soporte técnico.
- Cualquier petición no relacionada con el agro o su clima aplicado.

ESTILO
- Responde **siempre en español**.
- Sé **claro** y **amable**. Explica lo necesario sin rodeos.
- Usa **listas numeradas** para recomendaciones y **negritas** para lo crucial.
- Cuando ayude, usa **tablas Markdown** compactas.
- Evita párrafos largos. Divide en secciones cortas con títulos breves.

RIGOR Y ALCANCE
- No inventes **precios** ni **clima**. Si faltan datos, dilo y sugiere dónde verificarlos (p.ej., IDEAM, ICA, MinAgricultura, bolsas/centrales de abasto locales).
- Si la consulta requiere **contexto** (municipio, cultivo, fecha, fase fenológica, escala del lote), **pídelo** explícitamente en 1–2 preguntas.
- Prefiere recomendaciones **MIP** y **bajo riesgo**; advierte contra prácticas prohibidas o peligrosas.
- Si hay **incertidumbre**, indícala y ofrece **supuestos razonables**.

FORMATO DE SALIDA
1) **Resumen** (2–4 viñetas con la idea central).
2) **Pasos prácticos** (1., 2., 3.).
3) **Detalles/explicación** (si aporta valor).
4) **Siguientes datos a aportar** (si faltan).
5) **Fuentes** (solo cuando uses información externa específica).

TABLAS (cuando aplique)
- Usa encabezados claros y pocas columnas. Ej.: \`| Práctica | Cuándo | Nota |\`.

REGLAS
- No compartas información que ponga en riesgo a personas/animales/ambiente.
- Mantén un tono **constructivo** y evita juicios.
- Si el usuario pide algo fuera del dominio, ayuda con límites razonables.

EJECUCIÓN
- Antes de responder, identifica: **cultivo**, **ubicación**, **ventana temporal**, **objetivo**.
- Ajusta la recomendación a ese contexto; si falta, **pregunta**.
`.trim();

function buildMessages({ history = [], userText, context = {} }) {
  const sysFromEnv = (process.env.MIAGRO_SYSTEM_PROMPT || "").trim();
  const systemPrompt = [
    sysFromEnv || SYSTEM_PROMPT_FALLBACK,
    context?.municipio ? `\nContexto: Municipio: ${context.municipio}.` : "",
    context?.departamento ? ` Departamento: ${context.departamento}.` : "",
    context?.cultivo ? ` Cultivo: ${context.cultivo}.` : "",
  ].join("").trim();

  const msgs = [];
  if (history.length && history[0]?.role === "system") {
    msgs.push(...history);
  } else {
    msgs.push({ role: "system", content: systemPrompt });
    msgs.push(...history);
  }
  if (userText) msgs.push({ role: "user", content: userText });
  return msgs.slice(-24);
}

export async function askOpenAI(
  messagesOrParams,
  opts = { temperature: 0.3, model: "gpt-4o-mini", max_tokens: 900 }
) {
  if (!OPENAI_API_KEY) {
    const e = new Error("Falta OPENAI_API_KEY.");
    e.status = 500; throw e;
  }
  if (OPENAI_API_KEY.startsWith("sk-proj-") && !OPENAI_PROJECT) {
    const e = new Error("Falta OPENAI_PROJECT para clave de proyecto.");
    e.status = 500; throw e;
  }

  const messages = Array.isArray(messagesOrParams)
    ? (messagesOrParams[0]?.role === "system"
        ? messagesOrParams
        : [{ role: "system", content: SYSTEM_PROMPT_FALLBACK }, ...messagesOrParams])
    : buildMessages(messagesOrParams || {});

  // === Llamada directa con fetch, enviando OpenAI-Project si aplica ===
  const headers = {
    "Authorization": `Bearer ${OPENAI_API_KEY}`,
    "Content-Type": "application/json",
  };
  if (OPENAI_API_KEY.startsWith("sk-proj-") && OPENAI_PROJECT) {
    headers["OpenAI-Project"] = OPENAI_PROJECT;
  }

  const body = {
    model: opts?.model ?? "gpt-4o-mini",
    temperature: opts?.temperature ?? 0.3,
    max_tokens: opts?.max_tokens ?? 900,
    messages,
  };

  let resp;
  try {
    resp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });
  } catch {
    const e = new Error("Error de red al llamar a OpenAI.");
    e.status = 502; throw e;
  }

  if (!resp.ok) {
    // 401/403 → credenciales mal
    if (resp.status === 401 || resp.status === 403) {
      const e = new Error("Credenciales de OpenAI inválidas o faltantes.");
      e.status = 502; throw e;
    }
    const e = new Error("Error llamando al modelo de OpenAI.");
    e.status = 502; throw e;
  }

  const data = await resp.json();
  return data?.choices?.[0]?.message?.content?.trim() || "";
}

export { buildMessages };
