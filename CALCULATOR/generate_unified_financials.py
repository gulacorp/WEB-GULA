#!/usr/bin/env python3

import csv
import glob
import html
import json
import os
import re
from collections import defaultdict
from datetime import datetime

ROOT = "/Users/alexismurillo/gula-intel/CALCULATOR"
BASE_DIR = f"{ROOT}/GLOVO Y UBER"
OUTPUT_DIR = f"{ROOT}/FINANCIAL_OUTPUT"

GLOVO_ORDERS = f"{BASE_DIR}/GLOVO/GLOBO ORDER DETAILS (4 STORES).csv"
UBER_PAYMENT = f"{BASE_DIR}/UBER EATS/PAYMENT DETAILS UBER EATS (4 STORES).csv"
UBER_ITEM_LEVEL = f"{BASE_DIR}/UBER EATS/PAYMENT DETAILS ITEM LEVEL  UBER EATS(4 STORES).csv"

FIELDS = [
    "Plataforma", "Tienda", "Ciudad", "Fecha", "Order ID", "Tipo Registro", "Estado",
    "Ventas Base", "Ventas Total", "IVA", "Comisión Plataforma", "Tipo Promo", "Campaign UUID",
    "Descuento Items", "Gasto Publicidad", "Uber Funding %", "Coste Promo Restaurante",
    "Coste Promo Plataforma", "Tarifa Espera", "Otros Ajustes", "Total Deducciones",
    "Ingreso Neto", "Ingreso Neto Reportado", "Diferencia Conciliación", "Margen %",
    "Order Items", "Fuente", "Notas"
]


def parse_float(value):
    if value is None:
        return 0.0
    text = str(value).replace("€", "").replace("$", "").replace(",", "").strip()
    if text == "":
        return 0.0
    try:
        return float(text)
    except ValueError:
        match = re.search(r"-?\d+(?:\.\d+)?", text)
        return float(match.group(0)) if match else 0.0


def parse_date(value):
    text = str(value or "").strip()
    if not text or text.lower() == "ongoing":
        return ""
    text = text.split("T")[0].strip()
    formats = ["%Y-%m-%d %H:%M", "%Y-%m-%d", "%m/%d/%y", "%m/%d/%Y", "%B %d, %Y", "%b %d, %Y"]
    for fmt in formats:
        try:
            return datetime.strptime(text, fmt).strftime("%Y-%m-%d")
        except ValueError:
            pass
    return text[:10]


def csv_rows(path, skip_rows=0):
    with open(path, "r", encoding="utf-8-sig", newline="") as file:
        for _ in range(skip_rows):
            next(file)
        return list(csv.DictReader(file))


def write_csv(path, rows, fieldnames):
    with open(path, "w", encoding="utf-8-sig", newline="") as file:
        writer = csv.DictWriter(file, fieldnames=fieldnames, extrasaction="ignore")
        writer.writeheader()
        writer.writerows(rows)


def city_from_store(store):
    text = str(store or "").lower()
    if "val" in text or "ruzafa" in text or "cadis" in text or "cádiz" in text:
        return "Valencia"
    if "cartagena" in text or "caa" in text:
        return "Cartagena"
    if "sevilla" in text or "sev" in text:
        return "Sevilla"
    if "móstoles" in text or "mostoles" in text or "mos" in text:
        return "Móstoles"
    return ""


def norm_text(value):
    return re.sub(r"[^a-z0-9]+", " ", str(value or "").lower()).strip()


def date_in_range(order_date, start_date, end_date):
    if not order_date or not start_date:
        return False
    if not end_date:
        return order_date >= start_date
    return start_date <= order_date <= end_date


def read_uber_items():
    items_by_order = defaultdict(list)
    current_order = ""
    for row in csv_rows(UBER_ITEM_LEVEL):
        order_id = row.get("Order ID", "").strip()
        if order_id:
            current_order = order_id
        elif current_order and row.get("Item Name", "").strip():
            items_by_order[current_order].append(row.get("Item Name", "").strip())
    return items_by_order


def read_uber_promos():
    promos = []
    for path in glob.glob(f"{BASE_DIR}/UBER EATS/* UBER EATS/UBER EATS PROMOS *.csv"):
        city = os.path.basename(path).replace("UBER EATS PROMOS ", "").replace(".csv", "").title()
        for row in csv_rows(path):
            promos.append({
                "Ciudad": city,
                "Campaign UUID": row.get("Campaign UUID", ""),
                "Tipo Promo": row.get("Offer type", ""),
                "Status": row.get("Status", ""),
                "Fecha Inicio": parse_date(row.get("Start date")),
                "Fecha Fin": parse_date(row.get("End date")),
                "Items": row.get("Items", ""),
                "Ventas Campaña": parse_float(row.get("Sales (EUR)")),
                "Ordenes Campaña": parse_float(row.get("Orders")),
                "Uber Funding %": parse_float(row.get("Uber funding (%)")),
                "Archivo Fuente": os.path.basename(path),
            })
    return promos


def read_uber_ads():
    ads = []
    for path in glob.glob(f"{BASE_DIR}/UBER EATS/* UBER EATS/UBER EATS ADVERTISING *.csv"):
        city = os.path.basename(path).replace("UBER EATS ADVERTISING ", "").replace(".csv", "").title()
        for row in csv_rows(path):
            ad_spend = parse_float(row.get("Ad spend (EUR)"))
            ad_sales = parse_float(row.get("Ad sales (EUR)"))
            ads.append({
                "Plataforma": "UBER EATS",
                "Ciudad": city,
                "Tienda": row.get("Store name", ""),
                "Campaign UUID": row.get("Campaign UUID", ""),
                "Tipo Promo": "Advertising",
                "Órdenes": int(parse_float(row.get("Orders"))),
                "Ventas Total": ad_sales,
                "Descuento Items": 0.0,
                "Gasto Publicidad": ad_spend,
                "Coste Promo Restaurante": 0.0,
                "Coste Promo Plataforma": 0.0,
                "ROI %": ((ad_sales - ad_spend) / ad_spend * 100) if ad_spend else 0.0,
                "Fuente": "UBER ADVERTISING CSV",
            })
    return ads


def match_uber_promo(order, promos):
    if order["Descuento Items"] <= 0:
        return {}
    candidates = [
        promo for promo in promos
        if promo["Status"].upper() == "ACTIVE"
        and promo["Ciudad"] == order["Ciudad"]
        and date_in_range(order["Fecha"], promo["Fecha Inicio"], promo["Fecha Fin"])
    ]
    order_items = norm_text(order.get("Order Items", ""))
    for promo in candidates:
        promo_items = norm_text(promo.get("Items", ""))
        if promo_items and any(part and part in order_items for part in promo_items.split()):
            promo["Confianza Correlación"] = "ITEMS_FECHA"
            return promo
    if candidates:
        candidates[0]["Confianza Correlación"] = "FECHA_CIUDAD"
        return candidates[0]
    return {"Confianza Correlación": "SIN_MATCH"}


def build_uber_rows(promos):
    rows = []
    item_map = read_uber_items()
    ad_counter = 1
    for row in csv_rows(UBER_PAYMENT, skip_rows=1):
        original_order_id = row.get("Order ID", "").strip()
        store = row.get("Store Name", "").strip()
        order_items = "; ".join(item_map.get(original_order_id, []))
        city = city_from_store(store)
        sales_base = parse_float(row.get("Sales (excl. VAT)"))
        iva = parse_float(row.get("VAT1 on Sales")) + parse_float(row.get("VAT2 on Sales")) + parse_float(row.get("VAT3 on Sales"))
        sales_total = parse_float(row.get("Sales (incl. VAT)"))
        marketplace_fee = abs(parse_float(row.get("Marketplace Fee after discount (incl VAT)")))
        discount_items = abs(parse_float(row.get("Offers on items (incl. VAT)")))
        order_error = abs(parse_float(row.get("Order Error Adjustments (incl. VAT)")))
        delivery_offer = abs(parse_float(row.get("Delivery Offer Redemptions (incl. VAT)")))
        other_payments = parse_float(row.get("Other payments (incl VAT)"))
        ad_spend = abs(other_payments) if other_payments < 0 else 0.0
        status = row.get("Order Status", "")
        record_type = "PEDIDO" if original_order_id else "AJUSTE_PUBLICIDAD"
        if status.lower() == "refund":
            record_type = "REFUND"
        order_id = original_order_id or f"UBER-ADJUSTMENT-{ad_counter:03d}"
        if not original_order_id:
            ad_counter += 1

        record = {
            "Plataforma": "UBER EATS",
            "Tienda": store,
            "Ciudad": city,
            "Fecha": parse_date(row.get("Order Date")),
            "Order ID": order_id,
            "Tipo Registro": record_type,
            "Estado": status,
            "Ventas Base": sales_base,
            "Ventas Total": sales_total,
            "IVA": iva,
            "Comisión Plataforma": marketplace_fee,
            "Tipo Promo": "",
            "Campaign UUID": "",
            "Descuento Items": discount_items,
            "Gasto Publicidad": ad_spend,
            "Uber Funding %": 0.0,
            "Coste Promo Restaurante": discount_items,
            "Coste Promo Plataforma": 0.0,
            "Tarifa Espera": 0.0,
            "Otros Ajustes": order_error + delivery_offer - (other_payments if other_payments > 0 else 0.0),
            "Total Deducciones": 0.0,
            "Ingreso Neto": 0.0,
            "Ingreso Neto Reportado": parse_float(row.get("Total payout ")),
            "Diferencia Conciliación": 0.0,
            "Margen %": 0.0,
            "Order Items": order_items,
            "Fuente": "PAYMENT DETAILS UBER EATS",
            "Notas": row.get("Other payments description", ""),
        }
        match = match_uber_promo(record, promos)
        if match:
            funding = parse_float(match.get("Uber Funding %"))
            record["Tipo Promo"] = match.get("Tipo Promo", "")
            record["Campaign UUID"] = match.get("Campaign UUID", "")
            record["Uber Funding %"] = funding
            record["Coste Promo Plataforma"] = discount_items * funding / 100
            record["Coste Promo Restaurante"] = discount_items - record["Coste Promo Plataforma"]
            record["Notas"] = (record["Notas"] + " " + match.get("Confianza Correlación", "")).strip()
        record["Total Deducciones"] = record["Comisión Plataforma"] + record["Coste Promo Restaurante"] + record["Gasto Publicidad"] + record["Otros Ajustes"]
        record["Ingreso Neto"] = record["Ventas Total"] - record["Total Deducciones"]
        record["Diferencia Conciliación"] = record["Ingreso Neto Reportado"] - record["Ingreso Neto"]
        record["Margen %"] = (record["Ingreso Neto"] / record["Ventas Total"] * 100) if record["Ventas Total"] else 0.0
        rows.append(record)
    return rows


def build_glovo_rows():
    rows = []
    for row in csv_rows(GLOVO_ORDERS):
        store = row.get("Restaurant name", row.get("\ufeffRestaurant name", "")).strip()
        status = row.get("Order status", "")
        subtotal = parse_float(row.get("Subtotal"))
        tax = parse_float(row.get("Tax Charge"))
        sales_base = subtotal - tax
        sales_total = subtotal
        commission = parse_float(row.get("Commission"))
        discount_by_you = parse_float(row.get("Discount Funded by you"))
        voucher_by_you = parse_float(row.get("Voucher Funded by you"))
        marketing = parse_float(row.get("Marketing Fees"))
        wait_time = parse_float(row.get("Wait time fee"))
        ads_fee = parse_float(row.get("Ads Fee"))
        operational = parse_float(row.get("Operational Charges"))
        cancellation = parse_float(row.get("Avoidable cancellation fee"))
        platform_discount = parse_float(row.get("Platform-Funded Discount"))
        platform_voucher = parse_float(row.get("Platform-Funded Voucher"))
        total_deductions = commission + discount_by_you + voucher_by_you + marketing + wait_time + ads_fee + operational + cancellation + tax
        net_income = sales_total - total_deductions
        reported = parse_float(row.get("Estimated earnings"))
        record_type = "CANCELADO" if status.lower() == "cancelled" else "PEDIDO"
        if record_type == "CANCELADO":
            sales_base = 0.0
            sales_total = 0.0
            tax = 0.0
            commission = 0.0
            discount_by_you = 0.0
            voucher_by_you = 0.0
            marketing = 0.0
            wait_time = 0.0
            ads_fee = 0.0
            operational = 0.0
            cancellation = 0.0
            total_deductions = 0.0
            net_income = reported
        notes = []
        if platform_discount:
            notes.append(f"Platform-Funded Discount {platform_discount:.2f}")
        if platform_voucher:
            notes.append(f"Platform-Funded Voucher {platform_voucher:.2f}")
        if discount_by_you or marketing:
            notes.append("Campaign UUID requiere screenshots/OCR")
        rows.append({
            "Plataforma": "GLOVO",
            "Tienda": store,
            "Ciudad": city_from_store(store),
            "Fecha": parse_date(row.get("Order received at")),
            "Order ID": row.get("Order ID", "").strip(),
            "Tipo Registro": record_type,
            "Estado": status,
            "Ventas Base": sales_base,
            "Ventas Total": sales_total,
            "IVA": tax,
            "Comisión Plataforma": commission,
            "Tipo Promo": "Discount Funded by you" if discount_by_you else "",
            "Campaign UUID": "SCREENSHOT_REQUIRED" if (discount_by_you or marketing) else "",
            "Descuento Items": discount_by_you + voucher_by_you,
            "Gasto Publicidad": marketing + ads_fee,
            "Uber Funding %": "",
            "Coste Promo Restaurante": discount_by_you + voucher_by_you,
            "Coste Promo Plataforma": platform_discount + platform_voucher,
            "Tarifa Espera": wait_time,
            "Otros Ajustes": operational + cancellation,
            "Total Deducciones": total_deductions,
            "Ingreso Neto": net_income,
            "Ingreso Neto Reportado": reported,
            "Diferencia Conciliación": reported - net_income,
            "Margen %": (net_income / sales_total * 100) if sales_total else 0.0,
            "Order Items": row.get("Order Items", ""),
            "Fuente": "GLOBO ORDER DETAILS",
            "Notas": "; ".join(notes),
        })
    return rows


def group_report(rows, keys):
    grouped = defaultdict(lambda: defaultdict(float))
    counts = defaultdict(int)
    for row in rows:
        key = tuple(row.get(k, "") for k in keys)
        counts[key] += 1
        for col in ["Ventas Total", "Total Deducciones", "Ingreso Neto", "Ingreso Neto Reportado", "Diferencia Conciliación"]:
            grouped[key][col] += parse_float(row.get(col))
    output = []
    for key, metrics in sorted(grouped.items()):
        item = {keys[i]: key[i] for i in range(len(keys))}
        item["Órdenes"] = counts[key]
        for col, value in metrics.items():
            item[col] = round(value, 2)
        item["Margen Promedio %"] = round(item["Ingreso Neto"] / item["Ventas Total"] * 100, 2) if item["Ventas Total"] else 0.0
        output.append(item)
    return output


def marketing_report(rows, ads):
    grouped = defaultdict(lambda: defaultdict(float))
    for row in rows:
        if parse_float(row.get("Descuento Items")) or parse_float(row.get("Gasto Publicidad")) or row.get("Campaign UUID"):
            key = (row.get("Plataforma", ""), row.get("Tienda", ""), row.get("Ciudad", ""), row.get("Tipo Promo", ""), row.get("Campaign UUID", ""))
            grouped[key]["Órdenes"] += 1
            grouped[key]["Ventas Total"] += parse_float(row.get("Ventas Total"))
            grouped[key]["Descuento Items"] += parse_float(row.get("Descuento Items"))
            grouped[key]["Gasto Publicidad"] += parse_float(row.get("Gasto Publicidad"))
            grouped[key]["Coste Promo Restaurante"] += parse_float(row.get("Coste Promo Restaurante"))
            grouped[key]["Coste Promo Plataforma"] += parse_float(row.get("Coste Promo Plataforma"))
    output = []
    for key, values in sorted(grouped.items()):
        cost = values["Coste Promo Restaurante"] + values["Gasto Publicidad"]
        output.append({
            "Plataforma": key[0], "Tienda": key[1], "Ciudad": key[2], "Tipo Promo": key[3], "Campaign UUID": key[4],
            "Órdenes": int(values["Órdenes"]), "Ventas Total": round(values["Ventas Total"], 2),
            "Descuento Items": round(values["Descuento Items"], 2), "Gasto Publicidad": round(values["Gasto Publicidad"], 2),
            "Coste Promo Restaurante": round(values["Coste Promo Restaurante"], 2),
            "Coste Promo Plataforma": round(values["Coste Promo Plataforma"], 2),
            "ROI %": round((values["Ventas Total"] - cost) / cost * 100, 2) if cost else 0.0,
            "Fuente": "ORDERS",
        })
    output.extend(ads)
    return output


def validations(rows):
    output = []
    seen = set()
    for row in rows:
        errors = []
        key = (row.get("Plataforma"), row.get("Order ID"))
        if row.get("Tipo Registro") == "PEDIDO" and key in seen:
            errors.append("ORDER_ID_DUPLICADO")
        if row.get("Tipo Registro") == "PEDIDO":
            seen.add(key)
        if not row.get("Plataforma") or not row.get("Tienda") or not row.get("Fecha") or not row.get("Order ID"):
            errors.append("CAMPO_CRITICO_VACIO")
        if row.get("Tipo Registro") == "PEDIDO" and parse_float(row.get("Total Deducciones")) > parse_float(row.get("Ventas Total")):
            errors.append("DEDUCCIONES_MAYORES_A_VENTAS")
        margin = parse_float(row.get("Margen %"))
        if row.get("Tipo Registro") == "PEDIDO" and (margin < 0 or margin > 100):
            errors.append("MARGEN_FUERA_DE_RANGO")
        if row.get("Tipo Registro") == "PEDIDO" and abs(parse_float(row.get("Diferencia Conciliación"))) > 1:
            errors.append("DIFERENCIA_CON_PAYOUT_MAYOR_1EUR")
        output.append({
            "Plataforma": row.get("Plataforma"), "Tienda": row.get("Tienda"), "Fecha": row.get("Fecha"), "Order ID": row.get("Order ID"),
            "Ventas Total": round(parse_float(row.get("Ventas Total")), 2),
            "Total Deducciones": round(parse_float(row.get("Total Deducciones")), 2),
            "Ingreso Neto": round(parse_float(row.get("Ingreso Neto")), 2),
            "Ingreso Neto Reportado": round(parse_float(row.get("Ingreso Neto Reportado")), 2),
            "Diferencia Conciliación": round(parse_float(row.get("Diferencia Conciliación")), 2),
            "Errores": "; ".join(errors) if errors else "OK",
        })
    return output


def render_value(value):
    if isinstance(value, float):
        return f"{value:,.2f}"
    return html.escape(str(value if value is not None else ""))


def html_table(title, rows, fieldnames):
    parts = [f"<section><h2>{html.escape(title)}</h2><table><thead><tr>"]
    for field in fieldnames:
        parts.append(f"<th>{html.escape(field)}</th>")
    parts.append("</tr></thead><tbody>")
    for row in rows:
        parts.append("<tr>")
        for field in fieldnames:
            value = row.get(field, "")
            cls = "num" if isinstance(value, (int, float)) else ""
            parts.append(f"<td class='{cls}'>{render_value(value)}</td>")
        parts.append("</tr>")
    parts.append("</tbody></table></section>")
    return "".join(parts)


def write_html(rows, platform_report, store_report, daily_report, marketing_rows, validation_rows):
    page = """<!DOCTYPE html>
<html lang="es"><head><meta charset="UTF-8"><title>Financial Excel</title>
<style>
body{font-family:Arial,Helvetica,sans-serif;background:#fff;color:#000;margin:20px;font-size:12px}
h1{font-size:20px;margin:0 0 6px}h2{font-size:15px;margin:18px 0 8px}.meta{margin-bottom:16px;color:#333}
section{overflow:auto;max-height:650px;border:1px solid #999;margin-bottom:18px;padding:8px}
table{border-collapse:collapse;width:100%;white-space:nowrap}th,td{border:1px solid #999;padding:5px 7px;vertical-align:top}
th{background:#d9e1f2;font-weight:bold;text-align:center;position:sticky;top:0}td.num{text-align:right}tr:nth-child(even){background:#f8f8f8}
.note{background:#fff2cc;border:1px solid #999;padding:10px;margin-bottom:16px}
</style></head><body>
<h1>Tabla Financiera Unificada - GLOVO y UBER EATS</h1>
<div class="meta">Formato tipo Excel. Importes en EUR. Incluye tabla unificada, reportes, marketing y validación.</div>
<div class="note">GLOVO no tiene Campaign UUID estructurado en CSV; cuando hay marketing/descuento queda marcado como SCREENSHOT_REQUIRED para revisión manual/OCR.</div>
"""
    page += html_table("Comparativa Plataformas", platform_report, ["Plataforma", "Órdenes", "Ventas Total", "Total Deducciones", "Ingreso Neto", "Ingreso Neto Reportado", "Diferencia Conciliación", "Margen Promedio %"])
    page += html_table("Resumen por Tienda", store_report, ["Plataforma", "Tienda", "Ciudad", "Órdenes", "Ventas Total", "Total Deducciones", "Ingreso Neto", "Ingreso Neto Reportado", "Diferencia Conciliación", "Margen Promedio %"])
    page += html_table("Resumen por Tienda y Fecha", daily_report, ["Plataforma", "Tienda", "Fecha", "Órdenes", "Ventas Total", "Total Deducciones", "Ingreso Neto", "Ingreso Neto Reportado", "Diferencia Conciliación", "Margen Promedio %"])
    page += html_table("Marketing y Promociones", marketing_rows, ["Plataforma", "Tienda", "Ciudad", "Tipo Promo", "Campaign UUID", "Órdenes", "Ventas Total", "Descuento Items", "Gasto Publicidad", "Coste Promo Restaurante", "Coste Promo Plataforma", "ROI %", "Fuente"])
    page += html_table("Validación", validation_rows, ["Plataforma", "Tienda", "Fecha", "Order ID", "Ventas Total", "Total Deducciones", "Ingreso Neto", "Ingreso Neto Reportado", "Diferencia Conciliación", "Errores"])
    page += html_table("Tabla Unificada Completa", rows, FIELDS)
    page += "</body></html>"
    with open(f"{OUTPUT_DIR}/financial_excel.html", "w", encoding="utf-8") as file:
        file.write(page)


def write_dictionary():
    dictionary = {
        "Ventas Total": "GLOVO = Subtotal reportado por Glovo, porque Tax Charge concilia como retención/deducción. UBER = Sales incl. VAT.",
        "Total Deducciones": "Suma de comisión, promo restaurante, publicidad, espera, impuestos retenidos y ajustes reales activos.",
        "Ingreso Neto": "Ventas Total - Total Deducciones.",
        "Ingreso Neto Reportado": "Total payout de UBER o Estimated earnings de GLOVO.",
        "Diferencia Conciliación": "Ingreso Neto Reportado - Ingreso Neto calculado.",
        "SCREENSHOT_REQUIRED": "GLOVO requiere lectura manual/OCR de screenshots para Campaign UUID.",
    }
    with open(f"{OUTPUT_DIR}/DICCIONARIO_DATOS.json", "w", encoding="utf-8") as file:
        json.dump(dictionary, file, ensure_ascii=False, indent=2)


def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    promos = read_uber_promos()
    ads = read_uber_ads()
    rows = build_uber_rows(promos) + build_glovo_rows()
    rows.sort(key=lambda row: (row["Fecha"], row["Plataforma"], row["Tienda"], row["Order ID"]))
    platform_report = group_report(rows, ["Plataforma"])
    store_report = group_report(rows, ["Plataforma", "Tienda", "Ciudad"])
    daily_report = group_report(rows, ["Plataforma", "Tienda", "Fecha"])
    marketing_rows = marketing_report(rows, ads)
    validation_rows = validations(rows)

    write_csv(f"{OUTPUT_DIR}/FINANZAS_CONSOLIDADAS_GLOVO_UBER.csv", rows, FIELDS)
    write_csv(f"{OUTPUT_DIR}/COMPARATIVA_PLATAFORMAS.csv", platform_report, ["Plataforma", "Órdenes", "Ventas Total", "Total Deducciones", "Ingreso Neto", "Ingreso Neto Reportado", "Diferencia Conciliación", "Margen Promedio %"])
    write_csv(f"{OUTPUT_DIR}/REPORTE_TIENDA_FECHA.csv", daily_report, ["Plataforma", "Tienda", "Fecha", "Órdenes", "Ventas Total", "Total Deducciones", "Ingreso Neto", "Ingreso Neto Reportado", "Diferencia Conciliación", "Margen Promedio %"])
    write_csv(f"{OUTPUT_DIR}/REPORTE_MARKETING.csv", marketing_rows, ["Plataforma", "Tienda", "Ciudad", "Tipo Promo", "Campaign UUID", "Órdenes", "Ventas Total", "Descuento Items", "Gasto Publicidad", "Coste Promo Restaurante", "Coste Promo Plataforma", "ROI %", "Fuente"])
    write_csv(f"{OUTPUT_DIR}/VALIDACION_FINANCIERA.csv", validation_rows, ["Plataforma", "Tienda", "Fecha", "Order ID", "Ventas Total", "Total Deducciones", "Ingreso Neto", "Ingreso Neto Reportado", "Diferencia Conciliación", "Errores"])
    write_dictionary()
    write_html(rows, platform_report, store_report, daily_report, marketing_rows, validation_rows)

    failed = [row for row in validation_rows if row["Errores"] != "OK"]
    print(f"Registros consolidados: {len(rows)}")
    print(f"Registros marketing: {len(marketing_rows)}")
    print(f"Validaciones con aviso: {len(failed)}")
    print(f"Output: {OUTPUT_DIR}")


if __name__ == "__main__":
    main()
