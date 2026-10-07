// Código compartido por los mapas: mapa base, carga de datos y utilidades.
const CDE = [-25.5097,-54.6111];
const HW = 'trunk|primary|secondary|tertiary|unclassified|residential|living_street|service|track|primary_link|secondary_link|tertiary_link';
// 1ª consulta: límite administrativo de Ciudad del Este. 2ª (respaldo): rectángulo.
const CONSULTAS = [
  `[out:json][timeout:180];area["name"="Ciudad del Este"]["boundary"="administrative"]->.a;way(area.a)["highway"~"^(${HW})$"];out meta geom;`,
  `[out:json][timeout:180][bbox:-25.58,-54.72,-25.44,-54.55];way["highway"~"^(${HW})$"];out meta geom;`
];
const SERVIDORES = ['https://overpass-api.de/api/interpreter','https://overpass.kumi.systems/api/interpreter'];
const $ = id => document.getElementById(id);
const fechaES = f => f ? f.split('-').reverse().join('/') : '—';

function crearMapa(){
  const map = L.map('map',{preferCanvas:true}).setView(CDE,13);
  const ESRI = 'https://server.arcgisonline.com/ArcGIS/rest/services/';
  const gris = L.layerGroup([
    L.tileLayer(ESRI+'Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}',{maxNativeZoom:16,maxZoom:19,attribution:'Tiles &copy; Esri'}),
    L.tileLayer(ESRI+'Canvas/World_Light_Gray_Reference/MapServer/tile/{z}/{y}/{x}',{maxNativeZoom:16,maxZoom:19})
  ]).addTo(map);
  const sat = L.tileLayer(ESRI+'World_Imagery/MapServer/tile/{z}/{y}/{x}',{maxZoom:19,attribution:'Tiles &copy; Esri'});
  const osm = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'});
  L.control.layers({'Mapa claro':gris,'Satélite':sat,'OpenStreetMap (solo en línea)':osm},null,{position:'topleft'}).addTo(map);
  return map;
}

function distKm(p){
  let m = 0;
  for(let i=1;i<p.length;i++){
    const a=p[i-1], b=p[i], r=Math.PI/180;
    m += Math.hypot((b[0]-a[0])*r,(b[1]-a[1])*r*Math.cos(a[0]*r))*6371000;
  }
  return m/1000;
}
const calle = (id,t,ts,pts) => ({id,name:t.name||'',surf:(t.surface||'').split(';')[0].trim(),
  smooth:t.smoothness||'',hw:t.highway||'',ts:(ts||'').slice(0,10),pts,km:distKm(pts)});

// Devuelve {fecha, calles}. Usa data/calles.json (se actualiza solo en GitHub); si no existe, consulta OpenStreetMap directo.
async function cargarCalles(){
  try{
    const r = await fetch('data/calles.json');
    if(!r.ok) throw 0;
    const d = await r.json();
    return {fecha:d.generado, calles:d.calles.map(c=>calle(c.i,{name:c.n,surface:c.s,smoothness:c.m,highway:c.h},c.t,c.g))};
  }catch(e){}
  for(const q of CONSULTAS) for(const u of SERVIDORES){
    try{
      const r = await fetch(u,{method:'POST',body:'data='+encodeURIComponent(q)});
      if(!r.ok) throw 0;
      const els = (await r.json()).elements.filter(e=>e.geometry);
      if(!els.length) break;
      return {fecha:new Date().toISOString().slice(0,10),
        calles:els.map(e=>calle(e.id,e.tags||{},e.timestamp,e.geometry.map(p=>[p.lat,p.lon])))};
    }catch(e){}
  }
  throw new Error('sin datos');
}
const errorCarga = () => { $('status').className='err';
  $('status').innerHTML='No se pudieron cargar los datos.<br><button onclick="location.reload()">Reintentar</button>'; };
