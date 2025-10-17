import OpenAI from "openai";

if (!process.env.OPENAI_API_KEY) {
  console.error("Falta OPENAI_API_KEY en el entorno (no en el repo).");
}

const SYSTEM_PROMPT_FALLBACK = `
Eres **MiAgro IA**, un asistente agrícola colombiano.

OBJETIVO
- Entregar respuestas **útiles, correctas y accionables** para productores, técnicos y tomadores de decisión.
- Prioriza **sostenibilidad**, **seguridad** y **buenas prácticas locales (MIP)**.

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

export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

function buildMessages({ history = [], userText, context = {} }) {
  const sysFromEnv = (process.env.MIAGRO_SYSTEM_PROMPT || "").trim();
  const systemPrompt = [
    sysFromEnv || SYSTEM_PROMPT_FALLBACK,
    context?.municipio ? `\nContexto: Municipio: ${context.municipio}.` : "",
    context?.departamento ? ` Departamento: ${context.departamento}.` : "",
    context?.cultivo ? ` Cultivo: ${context.cultivo}.` : "",
  ].join("").trim();

  const messages = [];
  if (history.length && history[0]?.role === "system") {
    messages.push(...history);
  } else {
    messages.push({ role: "system", content: systemPrompt });
    messages.push(...history);
  }

  if (userText) messages.push({ role: "user", content: userText });

  const MAX_MSGS = 24;
  return messages.slice(-MAX_MSGS);
}

export async function askOpenAI(
  messagesOrParams,
  opts = { temperature: 0.3, model: "gpt-4o-mini", max_tokens: 900 }
) {
  let messages;
  if (Array.isArray(messagesOrParams)) {
    const hasSystem = messagesOrParams[0]?.role === "system";
    messages = hasSystem
      ? messagesOrParams
      : [{ role: "system", content: SYSTEM_PROMPT_FALLBACK }, ...messagesOrParams];
  } else {
    messages = buildMessages(messagesOrParams || {});
  }

  const resp = await openai.chat.completions.create({
    model: opts?.model ?? "gpt-4o-mini",
    temperature: opts?.temperature ?? 0.3,
    max_tokens: opts?.max_tokens ?? 900,
    messages,
  });

  return resp.choices[0]?.message?.content?.trim() || "";
}

export { buildMessages };
