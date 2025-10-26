import { read, utils } from "xlsx";

function toNumber(v){
  const raw = String(v ?? "").replace(/[^\d.,]/g,"").trim();
  if(!raw) return 0;
  const hasComma = raw.includes(",");
  const hasDot = raw.includes(".");
  if(hasComma && hasDot) return Number(raw.replace(/\./g,"").replace(",","."));
  if(hasComma && !hasDot){
    if(/,\d{3}(\D|$)/.test(raw)) return Number(raw.replace(/,/g,""));
    return Number(raw.replace(",","."));
  }
  if(hasDot && !hasComma){
    if(/\.\d{3}(\D|$)/.test(raw) || /\d\.\d{3}(\.|$)/.test(raw)) return Number(raw.replace(/\./g,""));
    return Number(raw);
  }
  return Number(raw);
}

export async function loadPreciosFromExcel(path="/precios.xlsx"){
  const res = await fetch(path);
  const buf = await res.arrayBuffer();
  const wb = read(buf, { type: "array" });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rows = utils.sheet_to_json(sheet, { header: 1, raw: true });

  const out = [];
  for(const r of rows){
    const fecha = r[0];
    const producto = r[1];
    const precio = toNumber(r[2]);
    if(fecha != null && producto && precio){
      out.push({
        fecha,                                // <-- conserva tipo original (número o texto)
        producto: String(producto).trim(),
        precio
      });
    }
  }
  localStorage.setItem("precios_corabastos_2024", JSON.stringify(out));
  return out;
}
