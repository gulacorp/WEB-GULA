#!/usr/bin/env python3
"""
Sistema de Cálculos Reales - Financial Statement Profesional
Calcula matemáticamente todos los montos de ingresos, gastos y deducciones
"""

import csv
from datetime import datetime
from collections import defaultdict
import os

# Base paths
BASE_DIR = "/Users/alexismurillo/gula-intel/CALCULATOR/GLOVO Y UBER"
UBER_PAYMENT_DETAILS = f"{BASE_DIR}/UBER EATS/PAYMENT DETAILS UBER EATS (4 STORES).csv"
GLOVO_ORDER_DETAILS = f"{BASE_DIR}/GLOVO/GLOBO ORDER DETAILS (4 STORES).csv"

def parse_float(value):
    """Parse string to float"""
    if value is None or value == '':
        return 0.0
    try:
        cleaned = str(value).replace('€', '').replace(',', '').replace('$', '').strip()
        return float(cleaned)
    except:
        return 0.0

def load_uber_data():
    """Load Uber Eats payment details"""
    print("Loading Uber Eats data...")
    data = []
    try:
        with open(UBER_PAYMENT_DETAILS, 'r', encoding='utf-8') as f:
            f.readline()  # Skip first header
            reader = csv.DictReader(f)
            for row in reader:
                data.append(row)
        print(f"  - Uber Payment Details: {len(data)} rows")
        return data
    except Exception as e:
        print(f"  - Error: {e}")
        return []

def load_glovo_data():
    """Load Glovo order details"""
    print("Loading Glovo data...")
    data = []
    try:
        with open(GLOVO_ORDER_DETAILS, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for row in reader:
                data.append(row)
        print(f"  - Glovo Order Details: {len(data)} rows")
        return data
    except Exception as e:
        print(f"  - Error: {e}")
        return []

def load_uber_promos(store_path):
    """Load Uber Eats promos for a store and CALCULATE real amounts"""
    promos_file = f"{store_path}/UBER EATS PROMOS {store_path.split('/')[-1].replace(' UBER EATS', '')}.csv"
    if not os.path.exists(promos_file):
        return []
    
    promos = []
    try:
        with open(promos_file, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for row in reader:
                if row.get('Status') == 'ACTIVE':
                    # CALCULAR montos reales
                    sales = parse_float(row.get('Sales (EUR)', 0))
                    orders = parse_float(row.get('Orders', 0))
                    uber_funding_pct = parse_float(row.get('Uber funding (%)', 0))
                    
                    # Calcular monto de Uber funding
                    uber_funding_amount = sales * (uber_funding_pct / 100) if sales > 0 else 0
                    
                    # Calcular monto que paga el restaurante
                    restaurant_contribution = sales - uber_funding_amount
                    
                    promos.append({
                        'name': row.get('Offer type', 'N/A'),
                        'status': row.get('Status', 'N/A'),
                        'sales': sales,
                        'orders': int(orders),
                        'new_customers': int(parse_float(row.get('New customers', 0))),
                        'uber_funding_pct': uber_funding_pct,
                        'uber_funding_amount': uber_funding_amount,
                        'restaurant_contribution': restaurant_contribution,
                        'items': row.get('Items', '')
                    })
    except Exception as e:
        print(f"  - Error loading promos: {e}")
    return promos

def load_uber_advertising(store_path):
    """Load Uber Eats advertising for a store and CALCULATE real amounts"""
    ads_file = f"{store_path}/UBER EATS ADVERTISING {store_path.split('/')[-1].replace(' UBER EATS', '')}.csv"
    if not os.path.exists(ads_file):
        return []
    
    ads = []
    try:
        with open(ads_file, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for row in reader:
                if row.get('Status') == 'ACTIVE':
                    # CALCULAR montos reales
                    ad_spend = parse_float(row.get('Ad spend (EUR)', 0))
                    ad_sales = parse_float(row.get('Ad sales (EUR)', 0))
                    budget = parse_float(row.get('Budget', 0))
                    roas = parse_float(row.get('ROAS', 0))
                    orders = parse_float(row.get('Orders', 0))
                    
                    # Calcular ROI
                    roi = ((ad_sales - ad_spend) / ad_spend * 100) if ad_spend > 0 else 0
                    
                    # Calcular coste por orden
                    cost_per_order = ad_spend / orders if orders > 0 else 0
                    
                    ads.append({
                        'name': row.get('Campaign Name', 'N/A'),
                        'status': row.get('Status', 'N/A'),
                        'budget': budget,
                        'ad_spend': ad_spend,
                        'ad_sales': ad_sales,
                        'roas': roas,
                        'roi': roi,
                        'orders': int(orders),
                        'cost_per_order': cost_per_order,
                        'impressions': int(parse_float(row.get('Impressions', 0))),
                        'clicks': int(parse_float(row.get('Clicks', 0)))
                    })
    except Exception as e:
        print(f"  - Error loading advertising: {e}")
    return ads

def calculate_uber_financials(data):
    """CALCULAR financials reales de Uber Eats por tienda"""
    print("Calculating Uber Eats financials...")
    
    store_financials = defaultdict(lambda: {
        # INGRESOS
        'gross_sales': 0.0,
        'delivery_fee_income': 0.0,
        'pick_pack_fee_income': 0.0,
        'bag_fee_income': 0.0,
        'tips_income': 0.0,
        'other_income': 0.0,
        'price_adjustments_income': 0.0,
        
        # DEDUCCIONES - PROMOS
        'offers_discount': 0.0,
        'delivery_offer_discount': 0.0,
        'order_error_refunds': 0.0,
        'marketing_adjustment': 0.0,
        'meal_voucher': 0.0,
        
        # DEDUCCIONES - COMISIONES
        'marketplace_fee': 0.0,
        
        # PROMOS DETALLADOS (calculados)
        'promos': [],
        'total_promos_sales': 0.0,
        'total_uber_funding': 0.0,
        'total_restaurant_promo_cost': 0.0,
        
        # ADVERTISING DETALLADO (calculado)
        'advertising': [],
        'total_ad_spend': 0.0,
        'total_ad_sales': 0.0,
        'total_ad_roi': 0.0,
        
        # NETO
        'orders': 0,
        'net_payout': 0.0
    })
    
    for row in data:
        store = row.get('Store Name', 'Unknown')
        
        # INGRESOS
        store_financials[store]['gross_sales'] += parse_float(row.get('Sales (incl. VAT)', 0))
        store_financials[store]['delivery_fee_income'] += parse_float(row.get('Delivery Fee (incl VAT)', 0))
        store_financials[store]['pick_pack_fee_income'] += parse_float(row.get('Pick and Pack Fee', 0))
        store_financials[store]['bag_fee_income'] += parse_float(row.get('Bag Fee', 0))
        store_financials[store]['tips_income'] += parse_float(row.get('Tips', 0))
        store_financials[store]['other_income'] += parse_float(row.get('Other payments (incl VAT)', 0))
        store_financials[store]['price_adjustments_income'] += parse_float(row.get('Price Adjustments (incl. VAT)', 0))
        
        # DEDUCCIONES
        store_financials[store]['offers_discount'] += parse_float(row.get('Offers on items (incl. VAT)', 0))
        store_financials[store]['delivery_offer_discount'] += parse_float(row.get('Delivery Offer Redemptions (incl. VAT)', 0))
        store_financials[store]['order_error_refunds'] += parse_float(row.get('Order Error Adjustments (incl. VAT)', 0))
        store_financials[store]['marketing_adjustment'] += parse_float(row.get('Marketing Adjustment (incl. VAT)', 0))
        store_financials[store]['meal_voucher'] += parse_float(row.get('Meal Voucher', 0))
        store_financials[store]['marketplace_fee'] += parse_float(row.get('Marketplace Fee after discount (incl VAT)', 0))
        
        store_financials[store]['orders'] += 1
        store_financials[store]['net_payout'] += parse_float(row.get('Total payout ', 0))
    
    # Agregar datos de PROMOS y ADVERTISING por tienda
    for store_name, store_path in [
        ('CARTAGENA', f"{BASE_DIR}/UBER EATS/CARTAGENA UBER EATS"),
        ('MOSTOLES', f"{BASE_DIR}/UBER EATS/MOSTOLES UBER EATS"),
        ('SEVILLA', f"{BASE_DIR}/UBER EATS/SEVILLA UBER EATS"),
        ('VALENCIA', f"{BASE_DIR}/UBER EATS/VALENCIA UBER EATS")
    ]:
        uber_store_name = f"GULA - {store_name.capitalize()}"
        if uber_store_name in store_financials:
            # Cargar y calcular PROMOS
            promos = load_uber_promos(store_path)
            store_financials[uber_store_name]['promos'] = promos
            
            # CALCULAR totales de promos
            total_promo_sales = sum(p['sales'] for p in promos)
            total_uber_funding = sum(p['uber_funding_amount'] for p in promos)
            total_restaurant_cost = sum(p['restaurant_contribution'] for p in promos)
            
            store_financials[uber_store_name]['total_promos_sales'] = total_promo_sales
            store_financials[uber_store_name]['total_uber_funding'] = total_uber_funding
            store_financials[uber_store_name]['total_restaurant_promo_cost'] = total_restaurant_cost
            
            # Cargar y calcular ADVERTISING
            ads = load_uber_advertising(store_path)
            store_financials[uber_store_name]['advertising'] = ads
            
            # CALCULAR totales de advertising
            total_ad_spend = sum(a['ad_spend'] for a in ads)
            total_ad_sales = sum(a['ad_sales'] for a in ads)
            
            store_financials[uber_store_name]['total_ad_spend'] = total_ad_spend
            store_financials[uber_store_name]['total_ad_sales'] = total_ad_sales
    
    return store_financials

def calculate_glovo_financials(data):
    """CALCULAR financials reales de Glovo por tienda"""
    print("Calculating Glovo financials...")
    
    store_financials = defaultdict(lambda: {
        # INGRESOS
        'gross_sales': 0.0,
        
        # DEDUCCIONES - FEES
        'service_fee': 0.0,
        'packaging_fee': 0.0,
        'minimum_order_fee': 0.0,
        'online_payment_fee': 0.0,
        
        # DEDUCCIONES - PROMOS
        'discount_funded': 0.0,
        'voucher_funded': 0.0,
        
        # DEDUCCIONES - COMISIONES
        'commission': 0.0,
        'operational_charges': 0.0,
        'ads_fee': 0.0,
        'wait_time_fee': 0.0,
        'marketing_fees': 0.0,
        'cancellation_fee': 0.0,
        
        # INGRESOS ADICIONALES
        'platform_discount': 0.0,
        'platform_voucher': 0.0,
        
        # NETO
        'orders': 0,
        'estimated_earnings': 0.0
    })
    
    for row in data:
        store = row.get('Restaurant name', row.get('\ufeffRestaurant name', 'Unknown'))
        fields = list(row.values())
        
        # INGRESOS
        store_financials[store]['gross_sales'] += parse_float(fields[15] if len(fields) > 15 else 0)
        
        # DEDUCCIONES - FEES
        store_financials[store]['service_fee'] += parse_float(fields[16] if len(fields) > 16 else 0)
        store_financials[store]['packaging_fee'] += parse_float(fields[17] if len(fields) > 17 else 0)
        store_financials[store]['minimum_order_fee'] += parse_float(fields[18] if len(fields) > 18 else 0)
        store_financials[store]['online_payment_fee'] += parse_float(fields[22] if len(fields) > 22 else 0)
        
        # DEDUCCIONES - PROMOS
        store_financials[store]['discount_funded'] += parse_float(fields[23] if len(fields) > 23 else 0)
        store_financials[store]['voucher_funded'] += parse_float(fields[24] if len(fields) > 24 else 0)
        
        # DEDUCCIONES - COMISIONES
        store_financials[store]['commission'] += parse_float(fields[25] if len(fields) > 25 else 0)
        store_financials[store]['operational_charges'] += parse_float(fields[26] if len(fields) > 26 else 0)
        store_financials[store]['ads_fee'] += parse_float(fields[27] if len(fields) > 27 else 0)
        store_financials[store]['wait_time_fee'] += parse_float(fields[28] if len(fields) > 28 else 0)
        store_financials[store]['marketing_fees'] += parse_float(fields[29] if len(fields) > 29 else 0)
        store_financials[store]['cancellation_fee'] += parse_float(fields[30] if len(fields) > 30 else 0)
        
        # INGRESOS ADICIONALES
        store_financials[store]['platform_discount'] += parse_float(fields[35] if len(fields) > 35 else 0)
        store_financials[store]['platform_voucher'] += parse_float(fields[36] if len(fields) > 36 else 0)
        
        store_financials[store]['orders'] += 1
        store_financials[store]['estimated_earnings'] += parse_float(fields[31] if len(fields) > 31 else 0)
    
    return store_financials

def generate_professional_html(uber_financials, glovo_financials):
    """Generate professional financial statement HTML with REAL calculations"""
    
    html = """<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Financial Statement Profesional - Cálculos Reales</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: #f0f2f5;
            padding: 20px;
            color: #333;
        }
        
        .container {
            max-width: 2000px;
            margin: 0 auto;
        }
        
        .header {
            background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
            color: white;
            padding: 40px;
            border-radius: 15px;
            margin-bottom: 30px;
            text-align: center;
            box-shadow: 0 10px 30px rgba(0,0,0,0.3);
        }
        
        .header h1 {
            font-size: 2.8em;
            margin-bottom: 10px;
            font-weight: 700;
        }
        
        .header p {
            font-size: 1.3em;
            opacity: 0.9;
        }
        
        .period {
            display: inline-block;
            background: rgba(255,255,255,0.15);
            padding: 12px 30px;
            border-radius: 30px;
            margin-top: 20px;
            font-weight: bold;
            font-size: 1.1em;
        }
        
        .platform-section {
            background: white;
            padding: 40px;
            border-radius: 15px;
            margin-bottom: 30px;
            box-shadow: 0 5px 20px rgba(0,0,0,0.1);
        }
        
        .platform-header {
            display: flex;
            align-items: center;
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 4px solid;
        }
        
        .platform-header.uber {
            border-color: #000;
        }
        
        .platform-header.glovo {
            border-color: #ffc107;
        }
        
        .platform-logo {
            font-size: 3em;
            margin-right: 20px;
        }
        
        .platform-header h2 {
            font-size: 2.5em;
            color: #333;
            font-weight: 700;
        }
        
        .store-section {
            background: #f8f9fa;
            padding: 30px;
            border-radius: 12px;
            margin-bottom: 30px;
            border-left: 6px solid;
        }
        
        .store-section.uber {
            border-left-color: #000;
        }
        
        .store-section.glovo {
            border-left-color: #ffc107;
        }
        
        .store-section h3 {
            font-size: 1.8em;
            margin-bottom: 25px;
            color: #333;
            font-weight: 700;
        }
        
        .financial-statement {
            background: white;
            border-radius: 10px;
            overflow: hidden;
            margin-bottom: 25px;
        }
        
        .fs-header {
            background: #333;
            color: white;
            padding: 15px 20px;
            font-weight: bold;
            font-size: 1.2em;
        }
        
        .fs-header.income {
            background: #28a745;
        }
        
        .fs-header.expenses {
            background: #dc3545;
        }
        
        .fs-header.net {
            background: #007bff;
        }
        
        .fs-row {
            display: flex;
            padding: 12px 20px;
            border-bottom: 1px solid #eee;
        }
        
        .fs-row:last-child {
            border-bottom: none;
        }
        
        .fs-row:hover {
            background: #f0f0f0;
        }
        
        .fs-label {
            flex: 2;
            font-weight: 500;
        }
        
        .fs-sublabel {
            flex: 1;
            font-size: 0.9em;
            color: #666;
        }
        
        .fs-amount {
            flex: 1;
            text-align: right;
            font-weight: bold;
            font-size: 1.1em;
        }
        
        .fs-amount.positive {
            color: #28a745;
        }
        
        .fs-amount.negative {
            color: #dc3545;
        }
        
        .fs-total {
            background: #333;
            color: white;
            font-weight: bold;
        }
        
        .fs-total:hover {
            background: #555;
        }
        
        .detail-section {
            margin-top: 20px;
            padding: 20px;
            background: white;
            border-radius: 10px;
        }
        
        .detail-title {
            font-size: 1.3em;
            font-weight: bold;
            margin-bottom: 15px;
            color: #333;
            padding-bottom: 10px;
            border-bottom: 2px solid #ddd;
        }
        
        .detail-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 15px;
        }
        
        .detail-card {
            background: #f8f9fa;
            padding: 15px;
            border-radius: 8px;
            border-left: 4px solid #667eea;
        }
        
        .detail-card h4 {
            font-size: 1em;
            margin-bottom: 8px;
            color: #333;
        }
        
        .detail-card .value {
            font-size: 1.3em;
            font-weight: bold;
            color: #667eea;
        }
        
        .promo-list, .ad-list {
            margin-top: 15px;
        }
        
        .promo-item, .ad-item {
            background: white;
            padding: 15px;
            border-radius: 8px;
            margin-bottom: 10px;
            border-left: 4px solid #28a745;
        }
        
        .promo-item h5, .ad-item h5 {
            font-size: 1.1em;
            margin-bottom: 8px;
            color: #333;
        }
        
        .promo-stats, .ad-stats {
            font-size: 0.9em;
            color: #666;
            line-height: 1.6;
        }
        
        .calculation-formula {
            background: #fff3cd;
            padding: 15px;
            border-radius: 8px;
            margin-top: 15px;
            border-left: 4px solid #ffc107;
        }
        
        .calculation-formula h5 {
            font-size: 1em;
            margin-bottom: 10px;
            color: #856404;
        }
        
        .calculation-formula .formula {
            font-family: 'Courier New', monospace;
            font-size: 0.9em;
            color: #333;
        }
        
        @media (max-width: 768px) {
            .fs-row {
                flex-direction: column;
            }
            .fs-amount {
                text-align: left;
                margin-top: 5px;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📊 FINANCIAL STATEMENT PROFESIONAL</h1>
            <p>Cálculos Matemáticos Reales - Ingresos, Gastos y Resultados</p>
            <div class="period">📅 Periodo: 1-11 Mayo 2026</div>
        </div>
"""
    
    # UBER EATS SECTION
    html += """
        <div class="platform-section">
            <div class="platform-header uber">
                <div class="platform-logo">⚫</div>
                <h2>UBER EATS - Estado Financiero por Tienda</h2>
            </div>
"""
    
    for store_name, fin in sorted(uber_financials.items(), key=lambda x: x[1]['gross_sales'], reverse=True):
        if store_name == 'Unknown':
            continue
        
        # CALCULAR totales
        total_income = (fin['gross_sales'] + fin['delivery_fee_income'] + 
                       fin['pick_pack_fee_income'] + fin['bag_fee_income'] + 
                       fin['tips_income'] + fin['other_income'] + 
                       fin['price_adjustments_income'])
        
        total_expenses = (fin['offers_discount'] + fin['delivery_offer_discount'] + 
                          fin['order_error_refunds'] + fin['marketing_adjustment'] + 
                          fin['meal_voucher'] + fin['marketplace_fee'] + 
                          fin['total_ad_spend'] + fin['total_restaurant_promo_cost'])
        
        html += f"""
            <div class="store-section uber">
                <h3>📍 {store_name}</h3>
                
                <div class="financial-statement">
                    <div class="fs-header income">💰 INGRESOS (OBJETIVO GENERAL)</div>
"""
        
        # INGRESOS DETALLADOS
        html += f"""
                    <div class="fs-row">
                        <div class="fs-label">Ventas Brutas (inc. IVA)</div>
                        <div class="fs-sublabel">{fin['orders']:,} órdenes</div>
                        <div class="fs-amount positive">€{fin['gross_sales']:,.2f}</div>
                    </div>
"""
        
        if fin['delivery_fee_income'] > 0:
            html += f"""
                    <div class="fs-row">
                        <div class="fs-label">Delivery Fee</div>
                        <div class="fs-sublabel">Tarifa de delivery</div>
                        <div class="fs-amount positive">+€{fin['delivery_fee_income']:,.2f}</div>
                    </div>
"""
        
        if fin['pick_pack_fee_income'] > 0:
            html += f"""
                    <div class="fs-row">
                        <div class="fs-label">Pick & Pack Fee</div>
                        <div class="fs-sublabel">Tarifa de preparación</div>
                        <div class="fs-amount positive">+€{fin['pick_pack_fee_income']:,.2f}</div>
                    </div>
"""
        
        if fin['bag_fee_income'] > 0:
            html += f"""
                    <div class="fs-row">
                        <div class="fs-label">Bag Fee</div>
                        <div class="fs-sublabel">Tarifa de bolsa</div>
                        <div class="fs-amount positive">+€{fin['bag_fee_income']:,.2f}</div>
                    </div>
"""
        
        if fin['tips_income'] > 0:
            html += f"""
                    <div class="fs-row">
                        <div class="fs-label">Tips</div>
                        <div class="fs-sublabel">Propinas</div>
                        <div class="fs-amount positive">+€{fin['tips_income']:,.2f}</div>
                    </div>
"""
        
        if fin['other_income'] > 0:
            html += f"""
                    <div class="fs-row">
                        <div class="fs-label">Other Payments</div>
                        <div class="fs-sublabel">Otros pagos</div>
                        <div class="fs-amount positive">+€{fin['other_income']:,.2f}</div>
                    </div>
"""
        
        if fin['price_adjustments_income'] > 0:
            html += f"""
                    <div class="fs-row">
                        <div class="fs-label">Price Adjustments</div>
                        <div class="fs-sublabel">Ajustes de precio</div>
                        <div class="fs-amount positive">+€{fin['price_adjustments_income']:,.2f}</div>
                    </div>
"""
        
        html += f"""
                    <div class="fs-row fs-total">
                        <div class="fs-label">TOTAL INGRESOS</div>
                        <div class="fs-sublabel"></div>
                        <div class="fs-amount positive">€{total_income:,.2f}</div>
                    </div>
                </div>
                
                <div class="financial-statement">
                    <div class="fs-header expenses">💸 GASTOS Y DEDUCCIONES (OBJETIVO ESPECÍFICO)</div>
"""
        
        # GASTOS DETALLADOS POR CATEGORÍA
        if fin['offers_discount'] > 0:
            html += f"""
                    <div class="fs-row">
                        <div class="fs-label">Offers/Descuentos</div>
                        <div class="fs-sublabel">Descuentos en items</div>
                        <div class="fs-amount negative">-€{fin['offers_discount']:,.2f}</div>
                    </div>
"""
        
        if fin['delivery_offer_discount'] > 0:
            html += f"""
                    <div class="fs-row">
                        <div class="fs-label">Delivery Offer Redemptions</div>
                        <div class="fs-sublabel">Ofertas de delivery</div>
                        <div class="fs-amount negative">-€{fin['delivery_offer_discount']:,.2f}</div>
                    </div>
"""
        
        if fin['order_error_refunds'] > 0:
            html += f"""
                    <div class="fs-row">
                        <div class="fs-label">Order Error Refunds</div>
                        <div class="fs-sublabel">Reembolsos por errores</div>
                        <div class="fs-amount negative">-€{fin['order_error_refunds']:,.2f}</div>
                    </div>
"""
        
        if fin['marketing_adjustment'] > 0:
            html += f"""
                    <div class="fs-row">
                        <div class="fs-label">Marketing Adjustment</div>
                        <div class="fs-sublabel">Ajustes de marketing</div>
                        <div class="fs-amount negative">-€{fin['marketing_adjustment']:,.2f}</div>
                    </div>
"""
        
        if fin['meal_voucher'] > 0:
            html += f"""
                    <div class="fs-row">
                        <div class="fs-label">Meal Voucher</div>
                        <div class="fs-sublabel">Vales de comida</div>
                        <div class="fs-amount negative">-€{fin['meal_voucher']:,.2f}</div>
                    </div>
"""
        
        if fin['total_restaurant_promo_cost'] > 0:
            html += f"""
                    <div class="fs-row">
                        <div class="fs-label">Coste Promos Restaurante</div>
                        <div class="fs-sublabel">Parte del restaurante en promos</div>
                        <div class="fs-amount negative">-€{fin['total_restaurant_promo_cost']:,.2f}</div>
                    </div>
"""
        
        if fin['total_ad_spend'] > 0:
            html += f"""
                    <div class="fs-row">
                        <div class="fs-label">Ad Spend (Advertising)</div>
                        <div class="fs-sublabel">Gasto en publicidad</div>
                        <div class="fs-amount negative">-€{fin['total_ad_spend']:,.2f}</div>
                    </div>
"""
        
        if fin['marketplace_fee'] < 0:
            html += f"""
                    <div class="fs-row">
                        <div class="fs-label">Marketplace Fee (Comisión)</div>
                        <div class="fs-sublabel">Comisión de plataforma</div>
                        <div class="fs-amount negative">-€{abs(fin['marketplace_fee']):,.2f}</div>
                    </div>
"""
        
        html += f"""
                    <div class="fs-row fs-total">
                        <div class="fs-label">TOTAL GASTOS</div>
                        <div class="fs-sublabel"></div>
                        <div class="fs-amount negative">-€{total_expenses:,.2f}</div>
                    </div>
                </div>
                
                <div class="financial-statement">
                    <div class="fs-header net">🎯 RESULTADO NETO</div>
                    <div class="fs-row fs-total">
                        <div class="fs-label">NET PAYOUT (Ingresos - Gastos)</div>
                        <div class="fs-sublabel">{fin['orders']:,} órdenes</div>
                        <div class="fs-amount">€{fin['net_payout']:,.2f}</div>
                    </div>
                </div>
"""
        
        # DETALLES DE PROMOS
        if fin['promos']:
            html += """
                <div class="detail-section">
                    <div class="detail-title">🎟️ PROMOS DETALLADOS - CÁLCULOS POR PROMOCIÓN</div>
"""
            for promo in fin['promos']:
                html += f"""
                    <div class="promo-item">
                        <h5>{promo['name']}</h5>
                        <div class="promo-stats">
                            <strong>Ventas generadas:</strong> €{promo['sales']:,.2f}<br>
                            <strong>Órdenes:</strong> {promo['orders']:,}<br>
                            <strong>Nuevos clientes:</strong> {promo['new_customers']:,}<br>
                            <strong>Uber Funding:</strong> {promo['uber_funding_pct']}% = €{promo['uber_funding_amount']:,.2f}<br>
                            <strong>Coste Restaurante:</strong> €{promo['restaurant_contribution']:,.2f}
                        </div>
                    </div>
"""
            html += f"""
                    <div class="calculation-formula">
                        <h5>📊 CÁLCULO TOTAL DE PROMOS</h5>
                        <div class="formula">
                            Ventas Promos: €{fin['total_promos_sales']:,.2f}<br>
                            Uber Funding: €{fin['total_uber_funding']:,.2f}<br>
                            Coste Restaurante: €{fin['total_restaurant_promo_cost']:,.2f}
                        </div>
                    </div>
"""
            html += """
                </div>
"""
        
        # DETALLES DE ADVERTISING
        if fin['advertising']:
            html += """
                <div class="detail-section">
                    <div class="detail-title">📢 ADVERTISING DETALLADO - CÁLCULOS POR CAMPAÑA</div>
"""
            for ad in fin['advertising']:
                html += f"""
                    <div class="ad-item">
                        <h5>{ad['name']}</h5>
                        <div class="ad-stats">
                            <strong>Presupuesto:</strong> €{ad['budget']:,.2f}<br>
                            <strong>Gasto Real:</strong> €{ad['ad_spend']:,.2f}<br>
                            <strong>Ventas Generadas:</strong> €{ad['ad_sales']:,.2f}<br>
                            <strong>ROAS:</strong> {ad['roas']:.2f}x<br>
                            <strong>ROI:</strong> {ad['roi']:.1f}%<br>
                            <strong>Órdenes:</strong> {ad['orders']:,}<br>
                            <strong>Coste por Orden:</strong> €{ad['cost_per_order']:.2f}<br>
                            <strong>Impresiones:</strong> {ad['impressions']:,}<br>
                            <strong>Clicks:</strong> {ad['clicks']:,}
                        </div>
                    </div>
"""
            html += f"""
                    <div class="calculation-formula">
                        <h5>📊 CÁLCULO TOTAL DE ADVERTISING</h5>
                        <div class="formula">
                            Gasto Total: €{fin['total_ad_spend']:,.2f}<br>
                            Ventas Generadas: €{fin['total_ad_sales']:,.2f}<br>
                            ROAS Promedio: {(fin['total_ad_sales']/fin['total_ad_spend'] if fin['total_ad_spend'] > 0 else 0):.2f}x
                        </div>
                    </div>
"""
            html += """
                </div>
"""
        
        html += """
            </div>
"""
    
    html += """
        </div>
"""
    
    # GLOVO SECTION
    html += """
        <div class="platform-section">
            <div class="platform-header glovo">
                <div class="platform-logo">🟡</div>
                <h2>GLOVO - Estado Financiero por Tienda</h2>
            </div>
"""
    
    for store_name, fin in sorted(glovo_financials.items(), key=lambda x: x[1]['gross_sales'], reverse=True):
        # CALCULAR totales
        total_income = fin['gross_sales'] + fin['platform_discount'] + fin['platform_voucher']
        total_expenses = (fin['service_fee'] + fin['packaging_fee'] + fin['minimum_order_fee'] +
                          fin['online_payment_fee'] + fin['discount_funded'] + fin['voucher_funded'] +
                          fin['commission'] + fin['operational_charges'] + fin['ads_fee'] +
                          fin['wait_time_fee'] + fin['marketing_fees'] + fin['cancellation_fee'])
        
        html += f"""
            <div class="store-section glovo">
                <h3>📍 {store_name}</h3>
                
                <div class="financial-statement">
                    <div class="fs-header income">💰 INGRESOS (OBJETIVO GENERAL)</div>
                    <div class="fs-row">
                        <div class="fs-label">Ventas Brutas (Subtotal)</div>
                        <div class="fs-sublabel">{fin['orders']:,} órdenes</div>
                        <div class="fs-amount positive">€{fin['gross_sales']:,.2f}</div>
                    </div>
"""
        
        if fin['platform_discount'] > 0:
            html += f"""
                    <div class="fs-row">
                        <div class="fs-label">Platform-Funded Discount</div>
                        <div class="fs-sublabel">Descuento financiado por plataforma</div>
                        <div class="fs-amount positive">+€{fin['platform_discount']:,.2f}</div>
                    </div>
"""
        
        if fin['platform_voucher'] > 0:
            html += f"""
                    <div class="fs-row">
                        <div class="fs-label">Platform-Funded Voucher</div>
                        <div class="fs-sublabel">Voucher financiado por plataforma</div>
                        <div class="fs-amount positive">+€{fin['platform_voucher']:,.2f}</div>
                    </div>
"""
        
        html += f"""
                    <div class="fs-row fs-total">
                        <div class="fs-label">TOTAL INGRESOS</div>
                        <div class="fs-sublabel"></div>
                        <div class="fs-amount positive">€{total_income:,.2f}</div>
                    </div>
                </div>
                
                <div class="financial-statement">
                    <div class="fs-header expenses">💸 GASTOS Y DEDUCCIONES (OBJETIVO ESPECÍFICO)</div>
"""
        
        # GASTOS DETALLADOS
        if fin['service_fee'] > 0:
            html += f"""
                    <div class="fs-row">
                        <div class="fs-label">Service Fee</div>
                        <div class="fs-sublabel">Tarifa de servicio</div>
                        <div class="fs-amount negative">-€{fin['service_fee']:,.2f}</div>
                    </div>
"""
        
        if fin['packaging_fee'] > 0:
            html += f"""
                    <div class="fs-row">
                        <div class="fs-label">Packaging Charges</div>
                        <div class="fs-sublabel">Cargos de empaquetado</div>
                        <div class="fs-amount negative">-€{fin['packaging_fee']:,.2f}</div>
                    </div>
"""
        
        if fin['minimum_order_fee'] > 0:
            html += f"""
                    <div class="fs-row">
                        <div class="fs-label">Minimum Order Fee</div>
                        <div class="fs-sublabel">Tarifa de pedido mínimo</div>
                        <div class="fs-amount negative">-€{fin['minimum_order_fee']:,.2f}</div>
                    </div>
"""
        
        if fin['online_payment_fee'] > 0:
            html += f"""
                    <div class="fs-row">
                        <div class="fs-label">Online Payment Fee</div>
                        <div class="fs-sublabel">Tarifa de pago online</div>
                        <div class="fs-amount negative">-€{fin['online_payment_fee']:,.2f}</div>
                    </div>
"""
        
        if fin['discount_funded'] > 0:
            html += f"""
                    <div class="fs-row">
                        <div class="fs-label">Discount Funded by You</div>
                        <div class="fs-sublabel">Descuento financiado por ti</div>
                        <div class="fs-amount negative">-€{fin['discount_funded']:,.2f}</div>
                    </div>
"""
        
        if fin['voucher_funded'] > 0:
            html += f"""
                    <div class="fs-row">
                        <div class="fs-label">Voucher Funded by You</div>
                        <div class="fs-sublabel">Voucher financiado por ti</div>
                        <div class="fs-amount negative">-€{fin['voucher_funded']:,.2f}</div>
                    </div>
"""
        
        if fin['commission'] > 0:
            html += f"""
                    <div class="fs-row">
                        <div class="fs-label">Commission</div>
                        <div class="fs-sublabel">Comisión de plataforma</div>
                        <div class="fs-amount negative">-€{fin['commission']:,.2f}</div>
                    </div>
"""
        
        if fin['operational_charges'] > 0:
            html += f"""
                    <div class="fs-row">
                        <div class="fs-label">Operational Charges</div>
                        <div class="fs-sublabel">Cargos operacionales</div>
                        <div class="fs-amount negative">-€{fin['operational_charges']:,.2f}</div>
                    </div>
"""
        
        if fin['ads_fee'] > 0:
            html += f"""
                    <div class="fs-row">
                        <div class="fs-label">Ads Fee (Advertising)</div>
                        <div class="fs-sublabel">Gasto en publicidad</div>
                        <div class="fs-amount negative">-€{fin['ads_fee']:,.2f}</div>
                    </div>
"""
        
        if fin['wait_time_fee'] > 0:
            html += f"""
                    <div class="fs-row">
                        <div class="fs-label">Wait Time Fee</div>
                        <div class="fs-sublabel">Tarifa de espera</div>
                        <div class="fs-amount negative">-€{fin['wait_time_fee']:,.2f}</div>
                    </div>
"""
        
        if fin['marketing_fees'] > 0:
            html += f"""
                    <div class="fs-row">
                        <div class="fs-label">Marketing Fees</div>
                        <div class="fs-sublabel">Tarifas de marketing</div>
                        <div class="fs-amount negative">-€{fin['marketing_fees']:,.2f}</div>
                    </div>
"""
        
        if fin['cancellation_fee'] > 0:
            html += f"""
                    <div class="fs-row">
                        <div class="fs-label">Cancellation Fee</div>
                        <div class="fs-sublabel">Tarifa de cancelación</div>
                        <div class="fs-amount negative">-€{fin['cancellation_fee']:,.2f}</div>
                    </div>
"""
        
        html += f"""
                    <div class="fs-row fs-total">
                        <div class="fs-label">TOTAL GASTOS</div>
                        <div class="fs-sublabel"></div>
                        <div class="fs-amount negative">-€{total_expenses:,.2f}</div>
                    </div>
                </div>
                
                <div class="financial-statement">
                    <div class="fs-header net">🎯 RESULTADO NETO</div>
                    <div class="fs-row fs-total">
                        <div class="fs-label">ESTIMATED EARNINGS (Ingresos - Gastos)</div>
                        <div class="fs-sublabel">{fin['orders']:,} órdenes</div>
                        <div class="fs-amount">€{fin['estimated_earnings']:,.2f}</div>
                    </div>
                </div>
            </div>
"""
    
    html += """
        </div>
    </div>
</body>
</html>
"""
    
    return html

def main():
    print("="*80)
    print("GENERANDO FINANCIAL STATEMENT CON CÁLCULOS REALES")
    print("="*80)
    print()
    
    # Load data
    uber_data = load_uber_data()
    glovo_data = load_glovo_data()
    
    # Calculate REAL financials
    uber_financials = calculate_uber_financials(uber_data)
    glovo_financials = calculate_glovo_financials(glovo_data)
    
    # Generate HTML
    html = generate_professional_html(uber_financials, glovo_financials)
    
    # Save HTML
    output_file = "/Users/alexismurillo/gula-intel/CALCULATOR/financial_statement_professional.html"
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write(html)
    
    print(f"\n✅ Financial Statement Profesional generado: {output_file}")

if __name__ == "__main__":
    main()
