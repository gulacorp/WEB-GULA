#!/usr/bin/env python3

import csv
import glob
import html
import json
import os
from collections import defaultdict

import generate_unified_financials as base

ROOT = "/Users/alexismurillo/gula-intel/CALCULATOR"
BASE_DIR = f"{ROOT}/GLOVO Y UBER"
OUTPUT_DIR = f"{ROOT}/FINANCIAL_OUTPUT"
STORE_BY_CITY = {
    "Cartagena": "GULA Cartagena",
    "Móstoles": "GULA Móstoles",
    "Mostoles": "GULA Móstoles",
    "Sevilla": "GULA Sevilla",
    "Valencia": "GULA Valencia",
}


def rows_from_csv(path):
    with open(path, "r", encoding="utf-8-sig", newline="") as file:
        return list(csv.DictReader(file))


def rel_path(path):
    return os.path.relpath(path, OUTPUT_DIR)


def unified_store(value):
    city = base.city_from_store(value)
    return STORE_BY_CITY.get(city, value or "")


def normalize_rows(rows):
    for row in rows:
        city = row.get("Ciudad") or base.city_from_store(row.get("Tienda", ""))
        row["Ciudad"] = "Móstoles" if city == "Mostoles" else city
        row["Tienda Original"] = row.get("Tienda", "")
        row["Tienda"] = STORE_BY_CITY.get(row["Ciudad"], row.get("Tienda", ""))
    return rows


def summarize(rows, keys):
    grouped = defaultdict(lambda: defaultdict(float))
    counts = defaultdict(int)
    for row in rows:
        key = tuple(row.get(k, "") for k in keys)
        counts[key] += 1
        for field in ["Ventas Total", "Total Deducciones", "Ingreso Neto", "Ingreso Neto Reportado", "Diferencia Conciliación", "Gasto Publicidad", "Descuento Items", "Coste Promo Restaurante", "Coste Promo Plataforma"]:
            grouped[key][field] += base.parse_float(row.get(field))
    output = []
    for key, values in sorted(grouped.items()):
        item = {keys[i]: key[i] for i in range(len(keys))}
        item["Órdenes"] = counts[key]
        for field, value in values.items():
            item[field] = round(value, 2)
        item["Estado Validación"] = "OK" if abs(item.get("Diferencia Conciliación", 0)) <= 1 else "REVISAR"
        output.append(item)
    return output


def read_popular_items():
    output = []
    for path in glob.glob(f"{BASE_DIR}/GLOVO/* GLOVO/GLOVO POPULAR ITEMS *.csv"):
        city = os.path.basename(path).replace("GLOVO POPULAR ITEMS ", "").replace(".csv", "").title()
        for row in rows_from_csv(path)[:12]:
            output.append({
                "Plataforma": "GLOVO",
                "Ciudad": city,
                "Tienda": STORE_BY_CITY.get(city, f"GULA {city}"),
                "Producto": row.get("Dish", ""),
                "Unidades": base.parse_float(row.get("Total")),
                "Ventas": base.parse_float(row.get("Sales")),
                "Fuente": os.path.basename(path),
            })
    for path in glob.glob(f"{BASE_DIR}/UBER EATS/* UBER EATS/UBER EATS POPULAR ITEMS *.csv"):
        city = os.path.basename(path).replace("UBER EATS POPULAR ITEMS ", "").replace(".csv", "").title()
        for row in rows_from_csv(path)[:12]:
            output.append({
                "Plataforma": "UBER EATS",
                "Ciudad": city,
                "Tienda": STORE_BY_CITY.get(city, f"GULA {city}"),
                "Producto": row.get("Item", ""),
                "Unidades": base.parse_float(row.get("Items Sold")),
                "Ventas": base.parse_float(row.get("Sales")),
                "Fuente": os.path.basename(path),
            })
    return output


def read_screenshots():
    output = []
    for path in glob.glob(f"{BASE_DIR}/GLOVO/**/*.png", recursive=True):
        lower = path.lower()
        category = "Promos" if "promos" in lower or "promotion" in lower else "Pagos" if "payment" in lower or "payout" in lower else "Operativo"
        output.append({
            "Ciudad": base.city_from_store(path),
            "Tienda": STORE_BY_CITY.get(base.city_from_store(path), os.path.basename(os.path.dirname(path))),
            "Categoría": category,
            "Archivo": os.path.basename(path),
            "Ruta": rel_path(path),
        })
    return sorted(output, key=lambda item: (item["Ciudad"], item["Categoría"], item["Archivo"]))


def read_promos(rows):
    promos = base.read_uber_promos()
    for promo in promos:
        promo["Plataforma"] = "UBER EATS"
        promo["Ciudad"] = "Móstoles" if promo.get("Ciudad") == "Mostoles" else promo.get("Ciudad", "")
        promo["Tienda"] = STORE_BY_CITY.get(promo["Ciudad"], f"GULA {promo['Ciudad']}")
        promo["Coste Detectado"] = promo.get("Ventas Campaña", 0)
        promo["Fuente"] = promo.get("Archivo Fuente", "")
    glovo_grouped = defaultdict(lambda: defaultdict(float))
    for row in rows:
        if row.get("Plataforma") != "GLOVO":
            continue
        if not (base.parse_float(row.get("Descuento Items")) or base.parse_float(row.get("Gasto Publicidad"))):
            continue
        tipo = row.get("Tipo Promo") or ("Marketing Fees / Ads Fee" if base.parse_float(row.get("Gasto Publicidad")) else "Promo Glovo")
        key = (row.get("Tienda", ""), row.get("Ciudad", ""), tipo)
        glovo_grouped[key]["Ventas Campaña"] += base.parse_float(row.get("Ventas Total"))
        glovo_grouped[key]["Ordenes Campaña"] += 1
        glovo_grouped[key]["Coste Detectado"] += base.parse_float(row.get("Coste Promo Restaurante")) + base.parse_float(row.get("Gasto Publicidad"))
        glovo_grouped[key]["Descuento en órdenes"] += base.parse_float(row.get("Descuento Items"))
        glovo_grouped[key]["Gasto Publicidad"] += base.parse_float(row.get("Gasto Publicidad"))
        glovo_grouped[key]["Ingreso neto órdenes"] += base.parse_float(row.get("Ingreso Neto Reportado"))
    glovo_rows = []
    for (store, city, tipo), values in sorted(glovo_grouped.items()):
        glovo_rows.append({
            "Plataforma": "GLOVO",
            "Ciudad": city,
            "Tienda": store,
            "Campaign UUID": f"GLOVO-{city.upper()}-{base.norm_text(tipo).replace(' ', '-')}",
            "Tipo Promo": tipo,
            "Status": "DATOS EXTRAÍDOS",
            "Fecha Inicio": "",
            "Fecha Fin": "",
            "Items": "Agregado desde importes de pedidos Glovo con descuento/marketing",
            "Ventas Campaña": round(values["Ventas Campaña"], 2),
            "Ordenes Campaña": int(values["Ordenes Campaña"]),
            "Uber Funding %": "",
            "Coste Detectado": round(values["Coste Detectado"], 2),
            "Descuento en órdenes": round(values["Descuento en órdenes"], 2),
            "Gasto Publicidad": round(values["Gasto Publicidad"], 2),
            "Ingreso neto órdenes": round(values["Ingreso neto órdenes"], 2),
            "Fuente": "GLOVO ORDER DETAILS + datos visibles en promos",
        })
    return promos + glovo_rows


def enrich_promos(promos, rows):
    by_campaign = defaultdict(lambda: defaultdict(float))
    for row in rows:
        campaign = row.get("Campaign UUID", "")
        if not campaign:
            continue
        by_campaign[campaign]["Órdenes en detalle"] += 1
        by_campaign[campaign]["Ventas en órdenes"] += base.parse_float(row.get("Ventas Total"))
        by_campaign[campaign]["Descuento en órdenes"] += base.parse_float(row.get("Descuento Items"))
        by_campaign[campaign]["Ingreso neto órdenes"] += base.parse_float(row.get("Ingreso Neto Reportado"))
    for promo in promos:
        campaign = promo.get("Campaign UUID", "")
        values = by_campaign.get(campaign, {})
        promo["Órdenes en detalle"] = int(values.get("Órdenes en detalle", 0))
        promo["Ventas en órdenes"] = round(values.get("Ventas en órdenes", 0), 2)
        promo["Descuento en órdenes"] = round(values.get("Descuento en órdenes", 0), 2)
        promo["Ingreso neto órdenes"] = round(values.get("Ingreso neto órdenes", 0), 2)
        promo["Diferencia ventas promo vs órdenes"] = round(base.parse_float(promo.get("Ventas Campaña")) - promo["Ventas en órdenes"], 2)
    return promos


def payout_validation(rows):
    output = []
    by_ref = defaultdict(lambda: defaultdict(float))
    for row in rows:
        if row.get("Plataforma") == "UBER EATS":
            key = (row.get("Tienda", ""), row.get("Fecha", ""), row.get("Fuente", ""))
            by_ref[key]["Ventas Total"] += base.parse_float(row.get("Ventas Total"))
            by_ref[key]["Ingreso Neto Reportado"] += base.parse_float(row.get("Ingreso Neto Reportado"))
            by_ref[key]["Órdenes"] += 1
    for item in summarize(rows, ["Plataforma"]):
        output.append(item)
    for item in summarize(rows, ["Plataforma", "Tienda", "Ciudad"]):
        output.append(item)
    return output


def js_data(name, value):
    return f"const {name} = {json.dumps(value, ensure_ascii=False)};"


def page(rows, store_summary, day_summary, promos, popular, screenshots, validation):
    critical = [item for item in validation if item.get("Estado Validación") == "REVISAR"]
    status = "OK" if not critical else "REVISAR"
    css = """
*{box-sizing:border-box}body{margin:0;font-family:Arial,Helvetica,sans-serif;background:#f4f6f8;color:#1f2937}.app{min-height:100vh}.topbar{position:sticky;top:0;z-index:20;background:#0f172a;color:white;padding:14px 18px;box-shadow:0 2px 8px #0002}.topbar h1{font-size:18px;margin:0}.topbar p{margin:4px 0 0;color:#cbd5e1;font-size:12px}.tabs{display:flex;gap:8px;flex-wrap:wrap;padding:14px 18px;background:white;border-bottom:1px solid #ddd;position:sticky;top:63px;z-index:19}.tabs button,.actions button{border:1px solid #cbd5e1;background:white;padding:9px 12px;border-radius:8px;cursor:pointer;font-weight:bold}.tabs button.active,.actions button.primary{background:#2563eb;color:white;border-color:#2563eb}.content{padding:18px;max-width:1500px;margin:0 auto}.cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:12px;margin-bottom:16px}.card{background:white;border:1px solid #e5e7eb;border-radius:12px;padding:14px;box-shadow:0 1px 4px #0001}.card .label{font-size:12px;color:#64748b}.card .value{font-size:22px;font-weight:bold;margin-top:6px}.ok{color:#15803d}.bad{color:#b91c1c}.filters{background:white;border:1px solid #e5e7eb;border-radius:12px;padding:12px;margin-bottom:16px}.filter-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:10px}.filters label{font-size:11px;font-weight:bold;color:#475569}.filters select,.filters input{width:100%;padding:8px;border:1px solid #cbd5e1;border-radius:8px;margin-top:4px}.panel{display:none}.panel.active{display:block}.table-wrap{background:white;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden}.table-head{display:flex;justify-content:space-between;gap:12px;align-items:center;padding:12px;border-bottom:1px solid #e5e7eb}.table-scroll{max-height:72vh;overflow:auto}table{width:100%;border-collapse:collapse;table-layout:fixed}th,td{border-bottom:1px solid #e5e7eb;padding:8px;text-align:left;vertical-align:top;white-space:normal;word-break:break-word;font-size:12px}th{position:sticky;top:0;background:#e2e8f0;z-index:2}td.num{text-align:right;font-variant-numeric:tabular-nums}.row-bad{background:#fee2e2}.compact th:nth-child(n+12),.compact td:nth-child(n+12){display:none}.drawer{position:fixed;inset:0;background:#0008;display:none;z-index:40}.drawer.active{display:block}.drawer-card{background:white;width:min(1100px,94vw);height:90vh;margin:5vh auto;border-radius:16px;overflow:auto;padding:18px}.drawer-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:14px}.drawer-header button{font-size:20px;border:0;background:#eee;border-radius:8px;padding:4px 10px;cursor:pointer}.promo-grid{display:grid;grid-template-columns:1.15fr .85fr;gap:12px}.promo-card{background:white;border:1px solid #e5e7eb;border-radius:12px;padding:12px}.promo-title{font-weight:bold;color:#1d4ed8}.promo-item,.popular-item{border-bottom:1px solid #e5e7eb;padding:10px 0}.promo-metrics{display:grid;grid-template-columns:repeat(4,minmax(90px,1fr));gap:8px;margin-top:8px}.metric{background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:8px}.metric b{display:block;font-size:13px}.popular-item{display:flex;justify-content:space-between;gap:12px}.muted{color:#64748b;font-size:11px}.screenshot-list a{display:block;color:#2563eb;text-decoration:none;margin:6px 0}.notes{width:100%;min-height:54px;border:1px solid #cbd5e1;border-radius:8px;padding:8px}.hide{display:none!important}@media(max-width:900px){.promo-grid{grid-template-columns:1fr}}@media(max-width:760px){.tabs{top:75px}.content{padding:10px}.table-scroll{max-height:65vh}th,td{font-size:11px;padding:6px}.compact th:nth-child(n+9),.compact td:nth-child(n+9){display:none}}
"""
    script = "\n".join([
        js_data("ROWS", rows),
        js_data("STORE_SUMMARY", store_summary),
        js_data("DAY_SUMMARY", day_summary),
        js_data("PROMOS", promos),
        js_data("POPULAR", popular),
        js_data("SCREENSHOTS", screenshots),
        js_data("VALIDATION", validation),
    ])
    return f"""<!DOCTYPE html>
<html lang="es"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Financial Excel Interactivo</title><style>{css}</style></head>
<body><div class="app"><header class="topbar"><h1>Financial Excel Interactivo - GLOVO y UBER EATS</h1><p>Vista sin scroll horizontal obligatorio. Datos visibles por pestañas, filtros y panel separado de promociones.</p></header>
<nav class="tabs"><button class="active" data-tab="resumen">Resumen</button><button data-tab="ordenes">Órdenes</button><button data-tab="tiendas">Tiendas</button><button data-tab="dias">Días</button><button data-tab="validacion">Validación</button><button data-tab="promos">Panel Promos</button></nav>
<main class="content">
<section id="resumen" class="panel active"><div class="cards" id="cards"></div><div class="card"><b>Estado coherencia carpeta GLOVO Y UBER:</b> <span class="{'ok' if status == 'OK' else 'bad'}">{status}</span><div class="muted">La validación compara cálculo consolidado contra los importes reportados disponibles por pedido/resumen. Si aparece REVISAR, entra en Validación.</div></div></section>
<section id="ordenes" class="panel"><div id="filters" class="filters"></div><div class="table-wrap"><div class="table-head"><b>Todos los datos de órdenes</b><div class="actions"><button onclick="toggleCompact()">Vista compacta</button><button class="primary" onclick="renderOrders()">Aplicar filtros</button></div></div><div class="table-scroll"><table id="ordersTable" class="compact"></table></div></div></section>
<section id="tiendas" class="panel"><div class="table-wrap"><div class="table-head"><b>Resumen por tienda</b></div><div class="table-scroll"><table id="storesTable"></table></div></div></section>
<section id="dias" class="panel"><div class="table-wrap"><div class="table-head"><b>Resumen por tienda y día</b></div><div class="table-scroll"><table id="daysTable"></table></div></div></section>
<section id="validacion" class="panel"><div class="table-wrap"><div class="table-head"><b>Validación y discrepancias</b></div><div class="table-scroll"><table id="validationTable"></table></div></div></section>
<section id="promos" class="panel"><div class="cards"><div class="card"><div class="label">Promos detectadas</div><div class="value" id="promoCount"></div></div><div class="card"><div class="label">Promos Glovo desde datos</div><div class="value" id="glovoPromoCount"></div></div><div class="card"><div class="label">Productos populares</div><div class="value" id="popularCount"></div></div></div><div id="promoFilters" class="filters"></div><div class="promo-grid"><div class="promo-card"><h3>Promos hechas vs datos por orden</h3><div id="promoList"></div></div><div class="promo-card"><h3>Productos populares</h3><div id="popularList"></div></div></div></section>
</main></div><div id="drawer" class="drawer"><div class="drawer-card"><div class="drawer-header"><h2>Detalle de orden</h2><button onclick="closeDrawer()">×</button></div><div id="drawerBody"></div></div></div>
<script>{script}
let compact=true;let notes=JSON.parse(localStorage.getItem('financialOrderNotes')||'{{}}');
function n(v){{return Number(v||0).toLocaleString('es-ES',{{minimumFractionDigits:2,maximumFractionDigits:2}})}}
function val(o,k){{return o[k]??''}}
function setTab(id){{document.querySelectorAll('.tabs button').forEach(b=>b.classList.toggle('active',b.dataset.tab===id));document.querySelectorAll('.panel').forEach(p=>p.classList.toggle('active',p.id===id));}}
document.querySelectorAll('.tabs button').forEach(b=>b.onclick=()=>setTab(b.dataset.tab));
function table(el,rows,cols){{let h='<thead><tr>'+cols.map(c=>`<th>${{c}}</th>`).join('')+'</tr></thead><tbody>';rows.forEach((r,i)=>{{let bad=Math.abs(Number(r['Diferencia Conciliación']||0))>1||r['Estado Validación']==='REVISAR'||String(r['Errores']||'').includes('REVISAR');h+=`<tr class="${{bad?'row-bad':''}}" onclick="openDrawer(${{i}}, this.dataset.source)" data-source="${{el}}">`+cols.map(c=>`<td class="${{typeof r[c]==='number'?'num':''}}">${{typeof r[c]==='number'?n(r[c]):String(r[c]??'')}}</td>`).join('')+'</tr>';}});h+='</tbody>';document.getElementById(el).innerHTML=h;}}
function buildFilters(){{let platforms=[...new Set(ROWS.map(r=>r.Plataforma))].sort();let stores=[...new Set(ROWS.map(r=>r.Tienda))].sort();let cities=[...new Set(ROWS.map(r=>r.Ciudad))].sort();document.getElementById('filters').innerHTML=`<div class="filter-grid"><div><label>Plataforma</label><select id="fPlatform"><option value="">Todas</option>${{platforms.map(x=>`<option>${{x}}</option>`).join('')}}</select></div><div><label>Tienda</label><select id="fStore"><option value="">Todas</option>${{stores.map(x=>`<option>${{x}}</option>`).join('')}}</select></div><div><label>Ciudad</label><select id="fCity"><option value="">Todas</option>${{cities.map(x=>`<option>${{x}}</option>`).join('')}}</select></div><div><label>Tipo registro</label><select id="fType"><option value="">Todos</option><option>PEDIDO</option><option>AJUSTE_PUBLICIDAD</option><option>REFUND</option><option>CANCELADO</option></select></div><div><label>Orden / producto</label><input id="fText" placeholder="Order ID o producto"></div><div><label>Solo discrepancias</label><select id="fBad"><option value="">No</option><option value="1">Sí</option></select></div></div>`;}}
function buildPromoFilters(){{let stores=[...new Set([...PROMOS.map(p=>p.Tienda),...POPULAR.map(p=>p.Tienda)].filter(Boolean))].sort();let platforms=[...new Set([...PROMOS.map(p=>p.Plataforma),...POPULAR.map(p=>p.Plataforma)].filter(Boolean))].sort();promoFilters.innerHTML=`<div class="filter-grid"><div><label>Tienda</label><select id="pfStore" onchange="renderPromos()"><option value="">Todas las 4 tiendas</option>${{stores.map(x=>`<option>${{x}}</option>`).join('')}}</select></div><div><label>Plataforma</label><select id="pfPlatform" onchange="renderPromos()"><option value="">Todas</option>${{platforms.map(x=>`<option>${{x}}</option>`).join('')}}</select></div><div><label>Estado promo</label><select id="pfStatus" onchange="renderPromos()"><option value="">Todos</option><option>ACTIVE</option><option>CANCELED</option><option>REVISIÓN MANUAL</option></select></div><div><label>Promo / producto / Campaign</label><input id="pfText" oninput="renderPromos()" placeholder="buscar"></div></div>`;}}
function filteredRows(){{let p=fPlatform.value,s=fStore.value,c=fCity.value,t=fType.value,q=fText.value.toLowerCase(),bad=fBad.value;return ROWS.filter(r=>(!p||r.Plataforma===p)&&(!s||r.Tienda===s)&&(!c||r.Ciudad===c)&&(!t||r['Tipo Registro']===t)&&(!q||String(r['Order ID']).toLowerCase().includes(q)||String(r['Order Items']).toLowerCase().includes(q))&&(!bad||Math.abs(Number(r['Diferencia Conciliación']||0))>1));}}
function renderOrders(){{table('ordersTable',filteredRows(),['Plataforma','Tienda','Ciudad','Fecha','Order ID','Tipo Registro','Estado','Ventas Total','Total Deducciones','Ingreso Neto','Ingreso Neto Reportado','Diferencia Conciliación','Tipo Promo','Campaign UUID','Descuento Items','Gasto Publicidad','Coste Promo Restaurante','Coste Promo Plataforma','Order Items','Notas']);document.getElementById('ordersTable').classList.toggle('compact',compact);}}
function toggleCompact(){{compact=!compact;renderOrders();}}
function cards(){{let total=ROWS.reduce((a,r)=>{{a.sales+=Number(r['Ventas Total']||0);a.net+=Number(r['Ingreso Neto Reportado']||0);a.diff+=Number(r['Diferencia Conciliación']||0);return a}},{{sales:0,net:0,diff:0}});document.getElementById('cards').innerHTML=`<div class="card"><div class="label">Registros</div><div class="value">${{ROWS.length}}</div></div><div class="card"><div class="label">Ventas reales</div><div class="value">${{n(total.sales)}}€</div></div><div class="card"><div class="label">Payout reportado</div><div class="value">${{n(total.net)}}€</div></div><div class="card"><div class="label">Diferencia total</div><div class="value ${{Math.abs(total.diff)<=1?'ok':'bad'}}">${{n(total.diff)}}€</div></div>`;}}
function promoFiltered(list){{let s=window.pfStore?pfStore.value:'',p=window.pfPlatform?pfPlatform.value:'',st=window.pfStatus?pfStatus.value:'',q=window.pfText?pfText.value.toLowerCase():'';return list.filter(x=>(!s||x.Tienda===s)&&(!p||x.Plataforma===p)&&(!st||x.Status===st)&&(!q||JSON.stringify(x).toLowerCase().includes(q)));}}
function renderPromos(){{let promos=promoFiltered(PROMOS),popular=promoFiltered(POPULAR);promoCount.textContent=promos.length+' / '+PROMOS.length;glovoPromoCount.textContent=promos.filter(p=>p.Plataforma==='GLOVO').length;popularCount.textContent=popular.length+' / '+POPULAR.length;promoList.innerHTML=promos.map(p=>`<div class="promo-item"><b>${{p.Tienda||p.Ciudad||''}} · ${{p.Plataforma||''}}</b><div class="promo-title">${{p['Tipo Promo']||'Promo'}}</div><div class="muted">Campaign: ${{p['Campaign UUID']||'N/A'}} | Estado: ${{p.Status||''}} | Fuente: ${{p.Fuente||p['Archivo Fuente']||''}}</div><div class="promo-metrics"><div class="metric"><span class="muted">Promo ventas</span><b>${{n(p['Ventas Campaña'])}}€</b></div><div class="metric"><span class="muted">Promo órdenes</span><b>${{p['Ordenes Campaña']||0}}</b></div><div class="metric"><span class="muted">Órdenes detalle</span><b>${{p['Órdenes en detalle']||0}}</b></div><div class="metric"><span class="muted">Diferencia</span><b class="${{Math.abs(Number(p['Diferencia ventas promo vs órdenes']||0))>1?'bad':'ok'}}">${{n(p['Diferencia ventas promo vs órdenes'])}}€</b></div></div><div class="muted">Items/base de promo: ${{p.Items||''}}</div><div class="muted">Ventas en órdenes: ${{n(p['Ventas en órdenes'])}}€ | Descuento en órdenes: ${{n(p['Descuento en órdenes'])}}€ | Gasto publicidad: ${{n(p['Gasto Publicidad'])}}€ | Neto órdenes: ${{n(p['Ingreso neto órdenes'])}}€</div></div>`).join('')||'<div class="muted">No hay promos para este filtro.</div>';popularList.innerHTML=popular.map(p=>`<div class="popular-item"><span><b>${{p.Plataforma}}</b> · ${{p.Tienda||p.Ciudad}}<br>${{p.Producto}}</span><span>${{n(p.Ventas)}}€<br>${{p.Unidades}} uds</span></div>`).join('')||'<div class="muted">No hay productos para este filtro.</div>';}}
function openDrawer(i,source){{let data=source==='ordersTable'?filteredRows():source==='storesTable'?STORE_SUMMARY:source==='daysTable'?DAY_SUMMARY:VALIDATION;let r=data[i];drawerBody.innerHTML=Object.keys(r).map(k=>`<div class="card"><div class="label">${{k}}</div><div>${{typeof r[k]==='number'?n(r[k]):String(r[k]??'')}}</div></div>`).join('')+(r['Order ID']?`<div class="card"><div class="label">Notas de esta orden</div><textarea class="notes" onchange="notes['${{r['Order ID']}}']=this.value;localStorage.setItem('financialOrderNotes',JSON.stringify(notes))">${{notes[r['Order ID']]||''}}</textarea></div>`:'');drawer.classList.add('active');}}
function closeDrawer(){{drawer.classList.remove('active')}}
buildFilters();buildPromoFilters();cards();renderOrders();table('storesTable',STORE_SUMMARY,['Plataforma','Tienda','Ciudad','Órdenes','Ventas Total','Total Deducciones','Ingreso Neto','Ingreso Neto Reportado','Diferencia Conciliación','Estado Validación']);table('daysTable',DAY_SUMMARY,['Plataforma','Tienda','Fecha','Órdenes','Ventas Total','Total Deducciones','Ingreso Neto','Ingreso Neto Reportado','Diferencia Conciliación','Estado Validación']);table('validationTable',VALIDATION,['Plataforma','Tienda','Ciudad','Órdenes','Ventas Total','Ingreso Neto Reportado','Diferencia Conciliación','Estado Validación']);renderPromos();
</script></body></html>"""


def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    promos = base.read_uber_promos()
    ads = base.read_uber_ads()
    rows = normalize_rows(base.build_uber_rows(promos) + base.build_glovo_rows())
    rows.sort(key=lambda row: (row["Plataforma"], row["Tienda"], row["Fecha"], row["Order ID"]))
    store_summary = summarize(rows, ["Plataforma", "Tienda", "Ciudad"])
    day_summary = summarize(rows, ["Plataforma", "Tienda", "Fecha"])
    validation = summarize(rows, ["Plataforma", "Tienda", "Ciudad"])
    html_page = page(rows, store_summary, day_summary, enrich_promos(read_promos(rows), rows), read_popular_items(), [], validation)
    with open(f"{OUTPUT_DIR}/financial_excel_interactive.html", "w", encoding="utf-8") as file:
        file.write(html_page)
    with open(f"{OUTPUT_DIR}/VALIDACION_COHERENCIA_GLOVO_UBER.json", "w", encoding="utf-8") as file:
        json.dump(validation, file, ensure_ascii=False, indent=2)
    print(f"Interactive output: {OUTPUT_DIR}/financial_excel_interactive.html")
    print(f"Validation output: {OUTPUT_DIR}/VALIDACION_COHERENCIA_GLOVO_UBER.json")


if __name__ == "__main__":
    main()
