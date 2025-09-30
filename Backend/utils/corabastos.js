import axios from 'axios';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';

function pad2(n){return n.toString().padStart(2,'0');}
function toYmd(d){const y=d.getFullYear();const m=pad2(d.getMonth()+1);const day=pad2(d.getDate());return{y,m,ymd:`${y}${m}${day}`};}
function lastBusinessDate(base=new Date()){const d=new Date(base);while(d.getDay()===0||d.getDay()===6){d.setDate(d.getDate()-1);}return d;}
function buildUrl(dateObj){const{y,m,ymd}=toYmd(dateObj);return{ymd,url:`https://corabastos.com.co/wp-content/uploads/${y}/${m}/Boletin_diario_${ymd}.pdf`};}

async function fetchPdfBuffer(dateOpt){
  let tries=0;
  let d=dateOpt?new Date(`${dateOpt.slice(0,4)}-${dateOpt.slice(4,6)}-${dateOpt.slice(6,8)}`):lastBusinessDate();
  while(tries<5){
    d=lastBusinessDate(d);
    const{url,ymd}=buildUrl(d);
    try{
      const res=await axios.get(url,{responseType:'arraybuffer'});
      return{buffer:res.data,usedDate:ymd,url};
    }catch{
      d.setDate(d.getDate()-1);
      tries++;
    }
  }
  throw new Error('No fue posible obtener el PDF de Corabastos en los últimos días hábiles.');
}

function toUint8(b){
  if(typeof Buffer!=='undefined'&&Buffer.isBuffer(b)) return new Uint8Array(b.buffer,b.byteOffset,b.byteLength);
  if(b instanceof ArrayBuffer) return new Uint8Array(b);
  if(b instanceof Uint8Array) return new Uint8Array(b.buffer,b.byteOffset,b.byteLength);
  return Uint8Array.from(b);
}

async function pdfToText(uint8){
  const task=getDocument({data:uint8,disableWorker:true,isEvalSupported:false,disableFontFace:true,disableRange:true,disableStream:true});
  const pdf=await task.promise;
  let out=[];
  for(let p=1;p<=pdf.numPages;p++){
    const page=await pdf.getPage(p);
    const tc=await page.getTextContent();
    const txt=tc.items.map(i=>('str'in i?i.str:'')).join(' ');
    out.push(txt);
  }
  return out.join('\n');
}

function norm(s){
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,' ').trim().toLowerCase();
}

function parseAllRows(text){
  const re=/([A-ZÁÉÍÓÚÑ0-9/.,' -]+?)\s+(KILO|BOLSA|BULTO|CAJA(?: DE MADERA)?|DOCENA|TONELADA|ROLLO|ATADO|CANASTILLA|PAQUETE|LIBRAS)\s+(\d+)\s+([A-ZÁÉÍÓÚÑ ]+?)\s+\$?([\d.,]+)\s+\$?([\d.,]+)\s+\$?([\d.,]+)\s+(Estable|Bajo|Subi[oó])/gi;
  const out=[];
  let m;
  while((m=re.exec(text))!==null){
    out.push({
      nombre:m[1].replace(/\s+/g,' ').trim(),
      presentacion:m[2].trim(),
      cantidad:Number(m[3]),
      unidadMedida:m[4].trim(),
      precioCalidadExtra:m[5],
      precioCalidadPrimera:m[6],
      precioPorUnidad:m[7],
      variacion:m[8].replace(/i[oó]/i,'ió')
    });
  }
  return out;
}

export async function getPrecios({fechaYmd,productos=[]}={}){
  const{buffer,usedDate,url}=await fetchPdfBuffer(fechaYmd);
  const uint8=toUint8(buffer);
  const text=await pdfToText(uint8);
  const rows=parseAllRows(text);
  const wanted=productos.map(p=>norm(p));
  const filtered=wanted.length?rows.filter(r=>wanted.some(w=>norm(r.nombre).startsWith(w))):rows;
  return{fecha:usedDate,urlPdf:url,rows:filtered};
}
