// === CONFIG ===
const API_URL = 'https://script.google.com/macros/s/AKfycbzcOff6VsMbgE2oWf-_DWTTYG2y6tNBOR671BVLbjN1fIBXnCixVxVsbpKLr3RzIuvU/exec';

const $ = (id) => document.getElementById(id);
const setVal = (id, v) => { const el = $(id); if (el) el.value = (v ?? '').toString(); };

function showOverlay(){ $('overlay').classList.remove('hidden'); }
function hideOverlay(){ $('overlay').classList.add('hidden'); }

async function fetchByJob(nro){
  const url = `${API_URL}?op=getByJob&nro=${encodeURIComponent(nro)}`;
  const res = await fetch(url);
  if(!res.ok) throw new Error('HTTP '+res.status);
  return res.json();
}

function render(item){
  setVal('t-fecha-encarga', item.fechaEncarga);
  setVal('t-fecha-retira',  item.fechaRetira);
  setVal('t-tipo-cristal',  item.tipoCristal);
  setVal('t-od-esf', item.odEsf);
  setVal('t-od-cil', item.odCil);
  setVal('t-od-eje', item.odEje);
  setVal('t-oi-esf', item.oiEsf);
  setVal('t-oi-cil', item.oiCil);
  setVal('t-oi-eje', item.oiEje);
  setVal('t-narmazon', item.nArmazon);
  setVal('t-detalle-armazon', item.detalleArmazon);
  setVal('t-apenom', item.apellidoNombre);
  const elNro = $('t-nro');
  if(elNro) elNro.textContent = item.nroTrabajo || '';
  $('btnImprimir').disabled = false;
}

function clearUI(){
  ['t-fecha-encarga','t-fecha-retira','t-tipo-cristal','t-od-esf','t-od-cil','t-od-eje',
   't-oi-esf','t-oi-cil','t-oi-eje','t-narmazon','t-detalle-armazon','t-apenom'
  ].forEach(id=> setVal(id,''));
  const elNro = $('t-nro'); if (elNro) elNro.textContent = '';
  $('btnImprimir').disabled = true;
}

async function buscarTrabajo(){
  clearUI();
  const nro = $('nro').value.trim();
  if(!nro){ alert('Ingresá un N° de trabajo (columna D)'); return; }
  showOverlay();
  try{
    const json = await fetchByJob(nro);
    if(!json.ok || !json.item){ alert('No se encontró el trabajo'); return; }
    render(json.item);
  }catch(err){
    console.error(err);
    alert('Error consultando la planilla');
  }finally{
    hideOverlay();
  }
}

/* ====================== ESCÁNER CON CÁMARA ====================== */
let mediaStream = null;
let detector = null;
let rafId = 0;

function supportsBarcodeDetector(){
  return 'BarcodeDetector' in window;
}

async function openScanner(){
  $('scanModal').classList.add('open');
  const video = $('scanVideo');
  try{
    // Preferir cámara trasera
    mediaStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio:false });
    video.srcObject = mediaStream;
    await video.play();

    if (supportsBarcodeDetector()){
      // Formatos comunes (agrego QR también por si lo usás)
      detector = new BarcodeDetector({ formats: ['code_128','ean_13','ean_8','upc_a','upc_e','code_39','qr_code'] });
      const tick = async () => {
        try{
          const codes = await detector.detect(video);
          if (codes && codes.length){
            const code = (codes[0].rawValue || '').trim();
            if (code){
              stopScanner();
              $('nro').value = code;
              buscarTrabajo();
              return;
            }
          }
        }catch(e){ /* ignore frame errors */ }
        rafId = requestAnimationFrame(tick);
      };
      rafId = requestAnimationFrame(tick);
    } else {
      // Si no está soportado, mostramos la opción de app externa
      $('scanHint').textContent = 'Tu navegador no soporta escaneo directo. Usá “Abrir app de escaneo”.';
    }
  }catch(e){
    console.error(e);
    alert('No se pudo acceder a la cámara.');
    closeScanner();
  }
}

function stopScanner(){
  if (rafId) cancelAnimationFrame(rafId);
  rafId = 0;
  if (mediaStream){
    mediaStream.getTracks().forEach(t=>t.stop());
    mediaStream = null;
  }
}

function closeScanner(){
  stopScanner();
  $('scanModal').classList.remove('open');
}

/* ======= App externa ZXing: intent + callback ======= */
function buildZxingLink(){
  const here = new URL(window.location.href);
  // Al volver de la app, queremos ?nro={CODE}
  const ret = new URL(here.href);
  ret.searchParams.set('via', 'scanapp');
  ret.searchParams.set('nro', '{CODE}');
  const params = new URLSearchParams({
    ret: ret.toString(),
    // Podés limitar formatos: CODE_128 y EAN_13 son típicos
    SCAN_FORMATS: 'CODE_128,EAN_13,EAN_8,UPC_A,UPC_E,QR_CODE'
  });
  // Link clásico
  const zxingUri = `zxing://scan/?${params.toString()}`;
  return zxingUri;
}

function applyQueryPrefill(){
  const q = new URLSearchParams(window.location.search);
  const nro = q.get('nro');
  if (nro){
    $('nro').value = nro.trim();
    buscarTrabajo();
  }
}

/* ====================== INIT ====================== */
document.addEventListener('DOMContentLoaded', ()=>{
  $('btnBuscar').addEventListener('click', buscarTrabajo);
  $('btnImprimir').addEventListener('click', ()=> window.print());

  // Buscar con ENTER
  $('nro').addEventListener('keydown', (ev)=>{
    if(ev.key === 'Enter'){
      ev.preventDefault();
      buscarTrabajo();
    }
  });

  // Escáner
  $('btnScan').addEventListener('click', openScanner);
  $('scanClose').addEventListener('click', closeScanner);
  // Link a app externa de escaneo
  const zxing = buildZxingLink();
  $('btnScanApp').setAttribute('href', zxing);

  // Si volvemos de la app con ?nro=...
  applyQueryPrefill();
});

// Cerrar el modal si se toca afuera
document.addEventListener('click', (e)=>{
  const modal = $('scanModal');
  if (!modal.classList.contains('open')) return;
  const box = $('scanBox');
  if (modal === e.target){ closeScanner(); }
});