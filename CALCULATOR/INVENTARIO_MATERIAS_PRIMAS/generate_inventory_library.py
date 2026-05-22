#!/usr/bin/env python3

import csv
import html
import json
import re
import shutil
import subprocess
from collections import defaultdict
from datetime import datetime
from pathlib import Path

PROJECT_DIR = Path(__file__).resolve().parent
ROOT_DIR = PROJECT_DIR.parent
INVOICE_DIR = ROOT_DIR / "Facturas para inventario"
OUTPUT_DIR = PROJECT_DIR / "output"
CSV_OUTPUT = OUTPUT_DIR / "materias_primas.csv"
JSON_OUTPUT = OUTPUT_DIR / "materias_primas.json"
HTML_OUTPUT = OUTPUT_DIR / "biblioteca_materias_primas.html"

CATEGORY_NAMES = {
    "ALIMENTACIÓN",
    "BEBIDAS",
    "CARNICERIA",
    "CHARCUTERIA",
    "CONGELADOS",
    "FRUTA Y VERDURA",
    "LIMPIEZA",
    "MENAJE",
    "PANADERIA",
    "REFRIGERADOS",
}

FIELDNAMES = [
    "Referencia",
    "Producto",
    "Categoria",
    "Formato Detectado",
    "Unidad Base",
    "Contenido por Unidad",
    "Cantidad Total",
    "Unidades Compradas",
    "Coste Medio Sin IVA",
    "Coste Medio Con IVA",
    "Coste Medio por Unidad Base",
    "Ultimo Coste Sin IVA",
    "Ultimo Coste Con IVA",
    "Ultimo Coste por Unidad Base",
    "Coste Min Sin IVA",
    "Coste Max Sin IVA",
    "IVA %",
    "Facturas",
    "Ultima Fecha",
    "Proveedor",
]


def parse_decimal(value):
    text = str(value or "").strip()
    if "," in text:
        text = text.replace(".", "").replace(",", ".")
    match = re.search(r"-?\d+(?:\.\d+)?", text)
    return float(match.group(0)) if match else 0.0


def format_money(value):
    return f"{value:.3f}" if value else ""


def extract_pdf_text(path):
    if not shutil.which("pdftotext"):
        raise RuntimeError("No se encontró pdftotext. Instala poppler para extraer datos de PDFs.")
    result = subprocess.run(
        ["pdftotext", str(path), "-"],
        check=False,
        capture_output=True,
        text=True,
    )
    return result.stdout


def clean_description(parts):
    text = " ".join(part.strip() for part in parts if part.strip())
    text = re.sub(r"\s+", " ", text)
    text = re.sub(r"\bLote\s*:.*$", "", text).strip()
    return text


def detect_unit_format(description):
    text = description.upper().replace(",", ".")
    patterns = [
        (r"(\d+(?:\.\d+)?)\s*(?:X|U\.?|UN|UD|UNDS|UNIDADES)\b", "UD", "UD", 1),
        (r"(\d+(?:\.\d+)?)\s*KG\b", "KG", "KG", 1),
        (r"(\d+(?:\.\d+)?)\s*K\b", "KG", "KG", 1),
        (r"(\d+(?:\.\d+)?)\s*G\b", "G", "KG", 0.001),
        (r"(\d+(?:\.\d+)?)\s*ML\b", "ML", "L", 0.001),
        (r"(\d+(?:\.\d+)?)\s*CL\b", "CL", "L", 0.01),
        (r"(\d+(?:\.\d+)?)\s*L\b", "L", "L", 1),
    ]
    for pattern, source_unit, base_unit, factor in patterns:
        matches = re.findall(pattern, text)
        if matches:
            value = parse_decimal(matches[-1])
            content = value * factor
            return {
                "detected_format": f"{matches[-1]} {source_unit}",
                "base_unit": base_unit,
                "content_per_unit": content,
            }
    if re.search(r"\bE/K\b|/K\b", text):
        return {"detected_format": "E/K", "base_unit": "KG", "content_per_unit": 1.0}
    if re.search(r"\bP\.U\b|\bU\b", text):
        return {"detected_format": "P.U", "base_unit": "UD", "content_per_unit": 1.0}
    return {"detected_format": "", "base_unit": "UD", "content_per_unit": 1.0}


def split_item_blocks(text):
    lines = [line.rstrip() for line in text.splitlines()]
    current_category = "Sin categoría"
    current = None
    blocks = []

    for raw_line in lines:
        line = raw_line.strip()
        if not line:
            continue

        normalized = line.upper().strip()
        if normalized in CATEGORY_NAMES:
            current_category = normalized.title()
            continue

        match = re.match(r"^(\d{8})\s+(.+)$", line)
        if match:
            if current:
                blocks.append(current)
            current = {
                "reference": match.group(1),
                "category": current_category,
                "lines": [match.group(2).strip()],
            }
            continue

        if current:
            current["lines"].append(line)

    if current:
        blocks.append(current)

    return blocks


def parse_invoice_metadata(text, file_name):
    invoice_match = re.search(r"FACTURA\s*\n\s*(\d+)", text, re.IGNORECASE)
    date_match = re.search(r"FECHA\s*\n\s*(\d{2}-\d{2}-\d{4})", text, re.IGNORECASE)
    invoice_number = invoice_match.group(1) if invoice_match else file_name.replace(".pdf", "")
    date_value = ""
    if date_match:
        try:
            date_value = datetime.strptime(date_match.group(1), "%d-%m-%Y").strftime("%Y-%m-%d")
        except ValueError:
            date_value = date_match.group(1)
    return invoice_number, date_value


def parse_item_block(block, invoice_number, invoice_date):
    full_text = "\n".join(block["lines"])
    iva_match = re.search(r"(\d{1,2},\d)%", full_text)
    before_iva = full_text[:iva_match.start()] if iva_match else full_text
    after_iva = full_text[iva_match.end():] if iva_match else ""
    description = clean_description(before_iva.splitlines())
    unit_format = detect_unit_format(description)
    numbers = re.findall(r"\d{1,4},\d{2,3}", after_iva)

    quantity = parse_decimal(numbers[0]) if len(numbers) >= 1 else 0.0
    units = parse_decimal(numbers[1]) if len(numbers) >= 2 else quantity
    unit_without_tax = parse_decimal(numbers[2]) if len(numbers) >= 4 else 0.0
    unit_with_tax = parse_decimal(numbers[3]) if len(numbers) >= 4 else 0.0
    total_without_tax = parse_decimal(numbers[4]) if len(numbers) >= 5 else 0.0

    if not unit_without_tax and total_without_tax and quantity:
        unit_without_tax = total_without_tax / quantity
    normalized_without_tax = unit_without_tax / unit_format["content_per_unit"] if unit_format["content_per_unit"] else 0.0
    normalized_with_tax = unit_with_tax / unit_format["content_per_unit"] if unit_format["content_per_unit"] else 0.0

    return {
        "reference": block["reference"],
        "description": description,
        "category": block["category"],
        "detected_format": unit_format["detected_format"],
        "base_unit": unit_format["base_unit"],
        "content_per_unit": unit_format["content_per_unit"],
        "quantity": quantity,
        "units": units,
        "unit_without_tax": unit_without_tax,
        "unit_with_tax": unit_with_tax,
        "normalized_without_tax": normalized_without_tax,
        "normalized_with_tax": normalized_with_tax,
        "total_without_tax": total_without_tax,
        "iva": parse_decimal(iva_match.group(1)) if iva_match else 0.0,
        "invoice": invoice_number,
        "date": invoice_date,
        "supplier": "Transgourmet Iberica S.A.U.",
    }


def read_invoice_items():
    items = []
    for pdf_path in sorted(INVOICE_DIR.glob("*.pdf")):
        text = extract_pdf_text(pdf_path)
        invoice_number, invoice_date = parse_invoice_metadata(text, pdf_path.name)
        for block in split_item_blocks(text):
            item = parse_item_block(block, invoice_number, invoice_date)
            if item["description"]:
                items.append(item)
    return items


def aggregate_items(items):
    grouped = defaultdict(list)
    for item in items:
        grouped[item["reference"]].append(item)

    rows = []
    for reference, records in grouped.items():
        priced = [record for record in records if record["unit_without_tax"] > 0]
        quantity_total = sum(record["quantity"] for record in records)
        units_total = sum(record["units"] for record in records)
        avg_without_tax = sum(record["unit_without_tax"] for record in priced) / len(priced) if priced else 0.0
        avg_with_tax = sum(record["unit_with_tax"] for record in priced) / len(priced) if priced else 0.0
        normalized_priced = [record for record in records if record["normalized_without_tax"] > 0]
        avg_normalized = sum(record["normalized_without_tax"] for record in normalized_priced) / len(normalized_priced) if normalized_priced else 0.0
        latest = sorted(records, key=lambda item: item["date"] or "", reverse=True)[0]
        costs = [record["unit_without_tax"] for record in priced]

        rows.append({
            "Referencia": reference,
            "Producto": latest["description"],
            "Categoria": latest["category"],
            "Formato Detectado": latest["detected_format"],
            "Unidad Base": latest["base_unit"],
            "Contenido por Unidad": f"{latest['content_per_unit']:.3f}".rstrip("0").rstrip("."),
            "Cantidad Total": f"{quantity_total:.2f}",
            "Unidades Compradas": f"{units_total:.2f}",
            "Coste Medio Sin IVA": format_money(avg_without_tax),
            "Coste Medio Con IVA": format_money(avg_with_tax),
            "Coste Medio por Unidad Base": format_money(avg_normalized),
            "Ultimo Coste Sin IVA": format_money(latest["unit_without_tax"]),
            "Ultimo Coste Con IVA": format_money(latest["unit_with_tax"]),
            "Ultimo Coste por Unidad Base": format_money(latest["normalized_without_tax"]),
            "Coste Min Sin IVA": format_money(min(costs) if costs else 0.0),
            "Coste Max Sin IVA": format_money(max(costs) if costs else 0.0),
            "IVA %": f"{latest['iva']:.1f}" if latest["iva"] else "",
            "Facturas": str(len({record["invoice"] for record in records})),
            "Ultima Fecha": latest["date"],
            "Proveedor": latest["supplier"],
            "Historial": records,
        })

    return sorted(rows, key=lambda row: (row["Categoria"], row["Producto"], row["Referencia"]))


def write_outputs(rows):
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    with CSV_OUTPUT.open("w", encoding="utf-8-sig", newline="") as file:
        writer = csv.DictWriter(file, fieldnames=FIELDNAMES, extrasaction="ignore")
        writer.writeheader()
        writer.writerows(rows)

    with JSON_OUTPUT.open("w", encoding="utf-8") as file:
        json.dump(rows, file, ensure_ascii=False, indent=2)

    HTML_OUTPUT.write_text(build_html(rows), encoding="utf-8")


def build_html(rows):
    data_json = json.dumps(rows, ensure_ascii=False)
    categories = sorted({row["Categoria"] for row in rows if row["Categoria"]})
    category_options = "".join(f"<option value='{html.escape(category)}'>{html.escape(category)}</option>" for category in categories)
    units = sorted({row["Unidad Base"] for row in rows if row.get("Unidad Base")})
    unit_options = "".join(f"<option value='{html.escape(unit)}'>{html.escape(unit)}</option>" for unit in units)
    total_products = len(rows)
    avg_costs = [parse_decimal(row["Coste Medio por Unidad Base"]) for row in rows if row["Coste Medio por Unidad Base"]]
    avg_cost = sum(avg_costs) / len(avg_costs) if avg_costs else 0.0

    return f"""<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Biblioteca de Materias Primas</title>
  <style>
    * {{ box-sizing: border-box; }}
    body {{ margin: 0; font-family: Arial, Helvetica, sans-serif; background: #f4f1ea; color: #1e1e1e; }}
    .shell {{ max-width: 1440px; margin: 0 auto; padding: 28px; }}
    .hero {{ background: #111; color: white; border-radius: 28px; padding: 32px; display: grid; gap: 18px; }}
    .hero h1 {{ margin: 0; font-size: 34px; letter-spacing: -1px; }}
    .hero p {{ margin: 0; color: #d7d0c4; max-width: 820px; line-height: 1.5; }}
    .stats {{ display: grid; grid-template-columns: repeat(4, minmax(160px, 1fr)); gap: 14px; margin-top: 10px; }}
    .stat {{ background: #fff; color: #111; border-radius: 18px; padding: 18px; }}
    .stat span {{ display: block; color: #716b61; font-size: 12px; text-transform: uppercase; letter-spacing: .08em; }}
    .stat strong {{ display: block; font-size: 26px; margin-top: 8px; }}
    .toolbar {{ display: grid; grid-template-columns: 1fr 230px 150px 190px; gap: 12px; margin: 22px 0; }}
    input, select {{ width: 100%; border: 1px solid #d8d1c7; border-radius: 14px; padding: 14px 16px; font-size: 14px; background: white; }}
    .layout {{ display: grid; grid-template-columns: 1fr 420px; gap: 20px; align-items: start; }}
    .panel {{ background: white; border: 1px solid #e0d9cf; border-radius: 22px; overflow: hidden; box-shadow: 0 18px 45px rgba(40, 32, 22, .08); }}
    table {{ width: 100%; border-collapse: collapse; font-size: 13px; }}
    th {{ background: #ede6db; text-align: left; padding: 14px; font-size: 11px; text-transform: uppercase; letter-spacing: .08em; color: #5d554b; position: sticky; top: 0; }}
    td {{ padding: 13px 14px; border-top: 1px solid #eee7dc; vertical-align: top; }}
    tr {{ cursor: pointer; }}
    tr:hover {{ background: #faf7f1; }}
    .ref {{ font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-weight: 700; }}
    .tag {{ display: inline-flex; padding: 5px 9px; background: #f1ece3; border-radius: 999px; font-size: 11px; color: #5a5147; }}
    .detail {{ padding: 22px; position: sticky; top: 20px; }}
    .detail h2 {{ margin: 0 0 8px; font-size: 22px; }}
    .muted {{ color: #716b61; }}
    .detail-grid {{ display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin: 18px 0; }}
    .metric {{ background: #f8f4ee; border-radius: 16px; padding: 14px; }}
    .metric span {{ display: block; font-size: 11px; color: #716b61; text-transform: uppercase; letter-spacing: .06em; }}
    .metric strong {{ display: block; margin-top: 7px; font-size: 18px; }}
    .history {{ margin-top: 16px; max-height: 340px; overflow: auto; }}
    .history-row {{ border-top: 1px solid #eee7dc; padding: 12px 0; font-size: 13px; }}
    .empty {{ padding: 38px; text-align: center; color: #716b61; }}
    .actions {{ display: flex; gap: 10px; flex-wrap: wrap; }}
    .button {{ display: inline-flex; text-decoration: none; background: #111; color: white; border-radius: 999px; padding: 10px 14px; font-size: 13px; }}
    @media (max-width: 1000px) {{ .toolbar, .layout, .stats {{ grid-template-columns: 1fr; }} .detail {{ position: static; }} }}
  </style>
</head>
<body>
  <main class="shell">
    <section class="hero">
      <div>
        <h1>Biblioteca de Materias Primas</h1>
        <p>Inventario base generado desde facturas. La referencia es el identificador principal y los costes se separan por formato de compra y unidad base para comparar mejor materias primas.</p>
      </div>
      <div class="actions">
        <a class="button" href="materias_primas.csv">Descargar CSV</a>
        <a class="button" href="materias_primas.json">Descargar JSON</a>
      </div>
      <div class="stats">
        <div class="stat"><span>Referencias únicas</span><strong>{total_products}</strong></div>
        <div class="stat"><span>Categorías</span><strong>{len(categories)}</strong></div>
        <div class="stat"><span>Coste medio normalizado</span><strong>€{avg_cost:.2f}</strong></div>
        <div class="stat"><span>Fuente</span><strong>PDF</strong></div>
      </div>
    </section>

    <section class="toolbar">
      <input id="search" type="search" placeholder="Buscar por referencia, producto o proveedor...">
      <select id="category"><option value="">Todas las categorías</option>{category_options}</select>
      <select id="unit"><option value="">Todas las unidades</option>{unit_options}</select>
      <select id="sort">
        <option value="product">Ordenar por producto</option>
        <option value="reference">Ordenar por referencia</option>
        <option value="cost_desc">Mayor coste por unidad</option>
        <option value="cost_asc">Menor coste por unidad</option>
        <option value="date_desc">Última compra</option>
      </select>
    </section>

    <section class="layout">
      <div class="panel">
        <table>
          <thead>
            <tr>
              <th>Referencia</th>
              <th>Materia prima</th>
              <th>Categoría</th>
              <th>Formato</th>
              <th>Coste envase</th>
              <th>Coste unidad base</th>
              <th>Facturas</th>
            </tr>
          </thead>
          <tbody id="rows"></tbody>
        </table>
        <div id="empty" class="empty" hidden>No hay productos con esos filtros.</div>
      </div>
      <aside class="panel detail" id="detail"></aside>
    </section>
  </main>

  <script>
    const data = {data_json};
    const rowsEl = document.getElementById('rows');
    const detailEl = document.getElementById('detail');
    const emptyEl = document.getElementById('empty');
    const searchEl = document.getElementById('search');
    const categoryEl = document.getElementById('category');
    const unitEl = document.getElementById('unit');
    const sortEl = document.getElementById('sort');

    function money(value) {{
      const number = Number(String(value || '0').replace(',', '.'));
      return number ? `€${{number.toFixed(3)}}` : 'Pendiente';
    }}

    function unitMoney(value, unit) {{
      const amount = money(value);
      return amount === 'Pendiente' ? amount : `${{amount}}/${{unit || 'UD'}}`;
    }}

    function filteredData() {{
      const query = searchEl.value.trim().toLowerCase();
      const category = categoryEl.value;
      const unit = unitEl.value;
      const sort = sortEl.value;
      let result = data.filter(item => {{
        const text = `${{item.Referencia}} ${{item.Producto}} ${{item.Proveedor}}`.toLowerCase();
        return (!query || text.includes(query)) && (!category || item.Categoria === category) && (!unit || item['Unidad Base'] === unit);
      }});

      result.sort((a, b) => {{
        if (sort === 'reference') return a.Referencia.localeCompare(b.Referencia);
        if (sort === 'cost_desc') return Number(b['Coste Medio por Unidad Base'] || 0) - Number(a['Coste Medio por Unidad Base'] || 0);
        if (sort === 'cost_asc') return Number(a['Coste Medio por Unidad Base'] || 0) - Number(b['Coste Medio por Unidad Base'] || 0);
        if (sort === 'date_desc') return String(b['Ultima Fecha']).localeCompare(String(a['Ultima Fecha']));
        return a.Producto.localeCompare(b.Producto);
      }});
      return result;
    }}

    function renderRows() {{
      const result = filteredData();
      rowsEl.innerHTML = result.map((item, index) => `
        <tr onclick="selectItem('${{item.Referencia}}')">
          <td class="ref">${{item.Referencia}}</td>
          <td><strong>${{item.Producto}}</strong><br><span class="muted">IVA ${{item['IVA %'] || '-'}}% · Base ${{item['Unidad Base'] || 'UD'}}</span></td>
          <td><span class="tag">${{item.Categoria}}</span></td>
          <td>${{item['Formato Detectado'] || 'Sin formato'}}<br><span class="muted">${{item['Contenido por Unidad'] || '1'}} ${{item['Unidad Base'] || 'UD'}}</span></td>
          <td>${{money(item['Coste Medio Sin IVA'])}}</td>
          <td><strong>${{unitMoney(item['Coste Medio por Unidad Base'], item['Unidad Base'])}}</strong></td>
          <td>${{item.Facturas}}</td>
        </tr>
      `).join('');
      emptyEl.hidden = result.length > 0;
      if (result.length && !detailEl.dataset.reference) selectItem(result[0].Referencia);
    }}

    window.selectItem = function(reference) {{
      const item = data.find(product => product.Referencia === reference);
      if (!item) return;
      detailEl.dataset.reference = reference;
      const history = [...item.Historial].sort((a, b) => String(b.date).localeCompare(String(a.date)));
      detailEl.innerHTML = `
        <span class="tag">${{item.Categoria}}</span>
        <h2>${{item.Producto}}</h2>
        <p class="muted ref">Referencia ${{item.Referencia}}</p>
        <div class="detail-grid">
          <div class="metric"><span>Coste medio por envase</span><strong>${{money(item['Coste Medio Sin IVA'])}}</strong></div>
          <div class="metric"><span>Coste medio por ${{item['Unidad Base'] || 'UD'}}</span><strong>${{unitMoney(item['Coste Medio por Unidad Base'], item['Unidad Base'])}}</strong></div>
          <div class="metric"><span>Formato detectado</span><strong>${{item['Formato Detectado'] || 'Sin formato'}}</strong></div>
          <div class="metric"><span>Contenido por unidad</span><strong>${{item['Contenido por Unidad'] || '1'}} ${{item['Unidad Base'] || 'UD'}}</strong></div>
          <div class="metric"><span>Último coste por envase</span><strong>${{money(item['Ultimo Coste Sin IVA'])}}</strong></div>
          <div class="metric"><span>Último coste por ${{item['Unidad Base'] || 'UD'}}</span><strong>${{unitMoney(item['Ultimo Coste por Unidad Base'], item['Unidad Base'])}}</strong></div>
          <div class="metric"><span>Rango coste</span><strong>${{money(item['Coste Min Sin IVA'])}} - ${{money(item['Coste Max Sin IVA'])}}</strong></div>
          <div class="metric"><span>Cantidad total</span><strong>${{item['Cantidad Total']}}</strong></div>
        </div>
        <p><strong>Proveedor:</strong> ${{item.Proveedor}}</p>
        <p><strong>Última fecha:</strong> ${{item['Ultima Fecha'] || 'Pendiente'}}</p>
        <h3>Historial de compras</h3>
        <div class="history">
          ${{history.map(record => `
            <div class="history-row">
              <strong>${{record.date || 'Sin fecha'}}</strong> · Factura ${{record.invoice}}<br>
              Formato: ${{record.detected_format || 'Sin formato'}} · Base: ${{record.content_per_unit || 1}} ${{record.base_unit || 'UD'}}<br>
              Cantidad: ${{record.quantity || '-'}} · Envase: ${{money(record.unit_without_tax)}} · Unidad base: ${{unitMoney(record.normalized_without_tax, record.base_unit)}}
            </div>
          `).join('')}}
        </div>
      `;
    }}

    [searchEl, categoryEl, unitEl, sortEl].forEach(element => element.addEventListener('input', renderRows));
    renderRows();
  </script>
</body>
</html>
"""


def main():
    items = read_invoice_items()
    rows = aggregate_items(items)
    write_outputs(rows)
    print(f"Facturas procesadas: {len(list(INVOICE_DIR.glob('*.pdf')))}")
    print(f"Registros extraídos: {len(items)}")
    print(f"Referencias únicas: {len(rows)}")
    print(f"CSV: {CSV_OUTPUT}")
    print(f"HTML: {HTML_OUTPUT}")


if __name__ == "__main__":
    main()
