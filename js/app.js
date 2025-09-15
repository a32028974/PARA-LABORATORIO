// === CONFIG ===
const API_URL = 'https://script.google.com/macros/s/AKfycbzcOff6VsMbgE2oWf-_DWTTYG2y6tNBOR671BVLbjN1fIBXnCixVxVsbpKLr3RzIuvU/exec';

const $ = (id) => document.getElementById(id);
const setVal = (id, v) => { const el = $(id); if (el) el.value = (v ?? '').toString(); };

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
  $('btnImprimir').disabled = false;
}

function clearUI(){
  ['t-fecha-encarga','t-fecha-retira','t-tipo-cristal','t-od-esf','t-od-cil','t-od-eje',
   't-oi-esf','t-oi-cil','t-oi-eje','t-narmazon','t-detalle-armazon','t-apenom'
  ].forEach(id=> setVal(id,''));
  $('btnImprimir').disabled = true;
}

document.addEventListener('DOMContentLoaded', ()=>{
  $('btnBuscar').addEventListener('click', async ()=>{
    clearUI();
    const nro = $('nro').value.trim();
    if(!nro){ alert('Ingresá un N° de trabajo (columna D)'); return; }
    try{
      const json = await fetchByJob(nro);
      if(!json.ok || !json.item){ alert('No se encontró el trabajo'); return; }
      render(json.item);
    }catch(err){
      console.error(err); alert('Error consultando la planilla');
    }
  });

  $('btnImprimir').addEventListener('click', ()=> window.print());
});
