"""Descarga las calles de Ciudad del Este desde OpenStreetMap y guarda data/calles.json."""
import datetime, json, os, sys, time, urllib.parse, urllib.request

HW = "trunk|primary|secondary|tertiary|unclassified|residential|living_street|service|track|primary_link|secondary_link|tertiary_link"
CONSULTAS = [
    f'[out:json][timeout:180];area["name"="Ciudad del Este"]["boundary"="administrative"]->.a;way(area.a)["highway"~"^({HW})$"];out meta geom;',
    f'[out:json][timeout:180][bbox:-25.58,-54.72,-25.44,-54.55];way["highway"~"^({HW})$"];out meta geom;',
]
SERVIDORES = ["https://overpass-api.de/api/interpreter", "https://overpass.kumi.systems/api/interpreter"]
UA = "mapa-vial-cde (github.com/carlosduarte02/mapa-vial-cde)"

def pedir(q):
    for _ in range(3):
        for url in SERVIDORES:
            try:
                req = urllib.request.Request(url, data=urllib.parse.urlencode({"data": q}).encode(), headers={"User-Agent": UA})
                with urllib.request.urlopen(req, timeout=240) as r:
                    return json.load(r)
            except Exception as e:
                print("fallo", url, e, file=sys.stderr)
        time.sleep(30)
    return None

datos = None
for q in CONSULTAS:
    d = pedir(q)
    if d and d.get("elements"):
        datos = d
        break
    print("sin resultados, probando la consulta alternativa", file=sys.stderr)
if not datos:
    sys.exit("No se pudieron obtener datos de OpenStreetMap")

calles = []
for e in datos["elements"]:
    if "geometry" not in e:
        continue
    t = e.get("tags", {})
    calles.append({
        "i": e["id"], "n": t.get("name", ""),
        "s": (t.get("surface") or "").split(";")[0].strip(),
        "m": t.get("smoothness", ""), "h": t.get("highway", ""),
        "t": e.get("timestamp", "")[:10],
        "g": [[round(p["lat"], 5), round(p["lon"], 5)] for p in e["geometry"]],
    })

os.makedirs("data", exist_ok=True)
with open("data/calles.json", "w", encoding="utf-8") as f:
    json.dump({"generado": datetime.date.today().isoformat(), "calles": calles}, f, ensure_ascii=False, separators=(",", ":"))
print(len(calles), "calles guardadas")
