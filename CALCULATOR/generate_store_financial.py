#!/usr/bin/env python3
"""
Financial Statement POR TIENDA - Uber Eats & Glovo
Incluye TODOS los datos: ventas, deducciones, promos, advertising, etc.
"""

import csv
from datetime import datetime
from collections import defaultdict
import os
import glob

# Base paths
BASE_DIR = "/Users/alexismurillo/gula-intel/CALCULATOR/GLOVO Y UBER"
UBER_PAYMENT_DETAILS = f"{BASE_DIR}/UBER EATS/PAYMENT DETAILS UBER EATS (4 STORES).csv"
GLOVO_ORDER_DETAILS = f"{BASE_DIR}/GLOVO/GLOBO ORDER DETAILS (4 STORES).csv"

# Store paths
UBER_STORES = {
    'CARTAGENA': f"{BASE_DIR}/UBER EATS/CARTAGENA UBER EATS",
    'MOSTOLES': f"{BASE_DIR}/UBER EATS/MOSTOLES UBER EATS",
    'SEVILLA': f"{BASE_DIR}/UBER EATS/SEVILLA UBER EATS",
    'VALENCIA': f"{BASE_DIR}/UBER EATS/VALENCIA UBER EATS"
}

GLOVO_STORES = {
    'CARTAGENA': f"{BASE_DIR}/GLOVO/CARTAGENA GLOVO",
    'MOSTOLES': f"{BASE_DIR}/GLOVO/MOSTOLES GLOVO",
    'SEVILLA': f"{BASE_DIR}/GLOVO/SEVILLA GLOVO",
    'VALENCIA': f"{BASE_DIR}/GLOVO/VALENCIA GLOVO"
}

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
    """Load Uber Eats promos for a store"""
    promos_file = f"{store_path}/UBER EATS PROMOS {store_path.split('/')[-1].replace(' UBER EATS', '')}.csv"
    if not os.path.exists(promos_file):
        return []
    
    promos = []
    try:
        with open(promos_file, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for row in reader:
                if row.get('Status') == 'ACTIVE':
                    promos.append(row)
    except:
        pass
    return promos

def load_uber_advertising(store_path):
    """Load Uber Eats advertising for a store"""
    ads_file = f"{store_path}/UBER EATS ADVERTISING {store_path.split('/')[-1].replace(' UBER EATS', '')}.csv"
    if not os.path.exists(ads_file):
        return []
    
    ads = []
    try:
        with open(ads_file, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for row in reader:
                if row.get('Status') == 'ACTIVE':
                    ads.append(row)
    except:
        pass
    return ads

def load_glovo_advertising(store_path):
    """Load Glovo advertising for a store"""
    ads_file = f"{store_path}/GLOVO ADVERTISING {store_path.split('/')[-1].replace(' GLOVO', '')}.xlsx"
    if not os.path.exists(ads_file):
        return []
    return []  # Excel file - would need pandas

def process_uber_by_store(data):
    """Process Uber Eats data grouped by store"""
    print("Processing Uber Eats by store...")
    
    store_data = defaultdict(lambda: {
        'orders': 0,
        'sales_excl_vat': 0.0,
        'sales_incl_vat': 0.0,
        'offers_incl': 0.0,
        'marketing_adjustment': 0.0,
        'delivery_fee_incl': 0.0,
        'pick_pack_fee': 0.0,
        'bag_fee': 0.0,
        'delivery_offer_incl': 0.0,
        'order_error_adj_incl': 0.0,
        'price_adj_incl': 0.0,
        'meal_voucher': 0.0,
        'tips': 0.0,
        'other_payments': 0.0,
        'marketplace_fee_incl': 0.0,
        'total_payout': 0.0,
        'promos': [],
        'advertising': []
    })
    
    for row in data:
        store = row.get('Store Name', 'Unknown')
        
        store_data[store]['orders'] += 1
        store_data[store]['sales_excl_vat'] += parse_float(row.get('Sales (excl. VAT)', 0))
        store_data[store]['sales_incl_vat'] += parse_float(row.get('Sales (incl. VAT)', 0))
        store_data[store]['offers_incl'] += parse_float(row.get('Offers on items (incl. VAT)', 0))
        store_data[store]['marketing_adjustment'] += parse_float(row.get('Marketing Adjustment (incl. VAT)', 0))
        store_data[store]['delivery_fee_incl'] += parse_float(row.get('Delivery Fee (incl VAT)', 0))
        store_data[store]['pick_pack_fee'] += parse_float(row.get('Pick and Pack Fee', 0))
        store_data[store]['bag_fee'] += parse_float(row.get('Bag Fee', 0))
        store_data[store]['delivery_offer_incl'] += parse_float(row.get('Delivery Offer Redemptions (incl. VAT)', 0))
        store_data[store]['order_error_adj_incl'] += parse_float(row.get('Order Error Adjustments (incl. VAT)', 0))
        store_data[store]['price_adj_incl'] += parse_float(row.get('Price Adjustments (incl. VAT)', 0))
        store_data[store]['meal_voucher'] += parse_float(row.get('Meal Voucher', 0))
        store_data[store]['tips'] += parse_float(row.get('Tips', 0))
        store_data[store]['other_payments'] += parse_float(row.get('Other payments (incl VAT)', 0))
        store_data[store]['marketplace_fee_incl'] += parse_float(row.get('Marketplace Fee after discount (incl VAT)', 0))
        store_data[store]['total_payout'] += parse_float(row.get('Total payout ', 0))
    
    # Add promos and advertising data
    for store_name, store_path in UBER_STORES.items():
        uber_store_name = f"GULA - {store_name.capitalize()}"
        if uber_store_name in store_data:
            store_data[uber_store_name]['promos'] = load_uber_promos(store_path)
            store_data[uber_store_name]['advertising'] = load_uber_advertising(store_path)
    
    return store_data

def process_glovo_by_store(data):
    """Process Glovo data grouped by store"""
    print("Processing Glovo by store...")
    
    store_data = defaultdict(lambda: {
        'orders': 0,
        'subtotal': 0.0,
        'service_fee': 0.0,
        'packaging_charges': 0.0,
        'minimum_order_fee': 0.0,
        'tax_charge': 0.0,
        'online_payment_fee': 0.0,
        'discount_funded': 0.0,
        'voucher_funded': 0.0,
        'commission': 0.0,
        'operational_charges': 0.0,
        'ads_fee': 0.0,
        'wait_time_fee': 0.0,
        'marketing_fees': 0.0,
        'cancellation_fee': 0.0,
        'estimated_earnings': 0.0,
        'cash_collected': 0.0,
        'amount_owed': 0.0,
        'payout_amount': 0.0,
        'platform_discount': 0.0,
        'platform_voucher': 0.0,
        'total_discount': 0.0,
        'total_voucher': 0.0,
        'tax_amount': 0.0,
        'advertising': []
    })
    
    for row in data:
        store = row.get('Restaurant name', row.get('\ufeffRestaurant name', 'Unknown'))
        fields = list(row.values())
        
        store_data[store]['orders'] += 1
        store_data[store]['subtotal'] += parse_float(fields[15] if len(fields) > 15 else 0)
        store_data[store]['service_fee'] += parse_float(fields[16] if len(fields) > 16 else 0)
        store_data[store]['packaging_charges'] += parse_float(fields[17] if len(fields) > 17 else 0)
        store_data[store]['minimum_order_fee'] += parse_float(fields[18] if len(fields) > 18 else 0)
        store_data[store]['tax_charge'] += parse_float(fields[21] if len(fields) > 21 else 0)
        store_data[store]['online_payment_fee'] += parse_float(fields[22] if len(fields) > 22 else 0)
        store_data[store]['discount_funded'] += parse_float(fields[23] if len(fields) > 23 else 0)
        store_data[store]['voucher_funded'] += parse_float(fields[24] if len(fields) > 24 else 0)
        store_data[store]['commission'] += parse_float(fields[25] if len(fields) > 25 else 0)
        store_data[store]['operational_charges'] += parse_float(fields[26] if len(fields) > 26 else 0)
        store_data[store]['ads_fee'] += parse_float(fields[27] if len(fields) > 27 else 0)
        store_data[store]['wait_time_fee'] += parse_float(fields[28] if len(fields) > 28 else 0)
        store_data[store]['marketing_fees'] += parse_float(fields[29] if len(fields) > 29 else 0)
        store_data[store]['cancellation_fee'] += parse_float(fields[30] if len(fields) > 30 else 0)
        store_data[store]['estimated_earnings'] += parse_float(fields[31] if len(fields) > 31 else 0)
        store_data[store]['cash_collected'] += parse_float(fields[32] if len(fields) > 32 else 0)
        store_data[store]['amount_owed'] += parse_float(fields[33] if len(fields) > 33 else 0)
        store_data[store]['payout_amount'] += parse_float(fields[34] if len(fields) > 34 else 0)
        store_data[store]['platform_discount'] += parse_float(fields[35] if len(fields) > 35 else 0)
        store_data[store]['platform_voucher'] += parse_float(fields[36] if len(fields) > 36 else 0)
        store_data[store]['total_discount'] += parse_float(fields[37] if len(fields) > 37 else 0)
        store_data[store]['total_voucher'] += parse_float(fields[38] if len(fields) > 38 else 0)
        store_data[store]['tax_amount'] += parse_float(fields[39] if len(fields) > 39 else 0)
    
    # Add advertising data
    for store_name, store_path in GLOVO_STORES.items():
        glovo_store_name = f"GULA - {store_name[:3].upper()} - Calle"
        # Try to match store name
        for store in store_data.keys():
            if store_name[:3].upper() in store:
                store_data[store]['advertising'] = load_glovo_advertising(store_path)
    
    return store_data

def generate_html(uber_stores, glovo_stores):
    """Generate financial statement HTML by store"""
    
    html = """<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Financial Statement por Tienda - Uber Eats & Glovo</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: #f5f5f5;
            padding: 20px;
            color: #333;
        }
        
        .container {
            max-width: 1800px;
            margin: 0 auto;
        }
        
        .header {
            background: linear-gradient(135deg, #000000 0%, #1a1a1a 100%);
            color: white;
            padding: 40px;
            border-radius: 10px;
            margin-bottom: 30px;
            text-align: center;
        }
        
        .header h1 {
            font-size: 2.5em;
            margin-bottom: 10px;
        }
        
        .header p {
            font-size: 1.2em;
            opacity: 0.9;
        }
        
        .period {
            display: inline-block;
            background: rgba(255,255,255,0.2);
            padding: 10px 25px;
            border-radius: 25px;
            margin-top: 15px;
            font-weight: bold;
        }
        
        .platform-section {
            background: white;
            padding: 30px;
            border-radius: 10px;
            margin-bottom: 30px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        
        .platform-header {
            display: flex;
            align-items: center;
            margin-bottom: 25px;
            padding-bottom: 15px;
            border-bottom: 3px solid;
        }
        
        .platform-header.uber {
            border-color: #000;
        }
        
        .platform-header.glovo {
            border-color: #ffc107;
        }
        
        .platform-logo {
            font-size: 2em;
            margin-right: 15px;
        }
        
        .platform-header h2 {
            font-size: 2em;
            color: #333;
        }
        
        .store-card {
            background: #f8f9fa;
            padding: 25px;
            border-radius: 10px;
            margin-bottom: 25px;
            border-left: 5px solid #667eea;
        }
        
        .store-card.uber {
            border-left-color: #000;
        }
        
        .store-card.glovo {
            border-left-color: #ffc107;
        }
        
        .store-card h3 {
            font-size: 1.5em;
            margin-bottom: 20px;
            color: #333;
        }
        
        .metrics-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
            gap: 15px;
            margin-bottom: 20px;
        }
        
        .metric {
            background: white;
            padding: 15px;
            border-radius: 8px;
            text-align: center;
        }
        
        .metric-label {
            font-size: 0.8em;
            color: #666;
            text-transform: uppercase;
            letter-spacing: 1px;
            margin-bottom: 8px;
        }
        
        .metric-value {
            font-size: 1.4em;
            font-weight: bold;
            color: #333;
        }
        
        .metric-value.negative {
            color: #dc3545;
        }
        
        .deductions-section {
            margin-top: 20px;
            padding-top: 20px;
            border-top: 2px solid #eee;
        }
        
        .deductions-section h4 {
            font-size: 1.1em;
            margin-bottom: 15px;
            color: #666;
        }
        
        .table-container {
            overflow-x: auto;
            margin-bottom: 20px;
        }
        
        table {
            width: 100%;
            border-collapse: collapse;
            font-size: 0.85em;
        }
        
        th {
            background: #333;
            color: white;
            padding: 10px;
            text-align: right;
            font-weight: bold;
            text-transform: uppercase;
            font-size: 0.7em;
        }
        
        th:first-child {
            text-align: left;
        }
        
        td {
            padding: 8px 10px;
            border-bottom: 1px solid #eee;
            text-align: right;
        }
        
        td:first-child {
            text-align: left;
            font-weight: bold;
        }
        
        .promos-list, .ads-list {
            background: white;
            padding: 15px;
            border-radius: 8px;
            margin-top: 10px;
        }
        
        .promo-item, .ad-item {
            padding: 10px;
            border-bottom: 1px solid #eee;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        
        .promo-item:last-child, .ad-item:last-child {
            border-bottom: none;
        }
        
        .promo-name, .ad-name {
            font-weight: bold;
        }
        
        .promo-stats, .ad-stats {
            font-size: 0.9em;
            color: #666;
        }
        
        .section-title {
            background: #667eea;
            color: white;
            padding: 10px 15px;
            font-weight: bold;
            margin-top: 15px;
            border-radius: 5px;
        }
        
        .section-title.uber {
            background: #000;
        }
        
        .section-title.glovo {
            background: #ffc107;
            color: #333;
        }
        
        @media (max-width: 768px) {
            .metrics-grid {
                grid-template-columns: 1fr;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📊 FINANCIAL STATEMENT POR TIENDA</h1>
            <p>Análisis Detallado por Ubicación - Uber Eats & Glovo</p>
            <div class="period">📅 Periodo: 1-11 Mayo 2026</div>
        </div>
"""
    
    # UBER EATS SECTION
    html += """
        <div class="platform-section">
            <div class="platform-header uber">
                <div class="platform-logo">⚫</div>
                <h2>UBER EATS - Por Tienda</h2>
            </div>
"""
    
    for store_name, metrics in sorted(uber_stores.items(), key=lambda x: x[1]['sales_incl_vat'], reverse=True):
        if store_name == 'Unknown':
            continue
            
        html += f"""
            <div class="store-card uber">
                <h3>📍 {store_name}</h3>
                
                <div class="metrics-grid">
                    <div class="metric">
                        <div class="metric-label">Órdenes</div>
                        <div class="metric-value">{metrics['orders']:,}</div>
                    </div>
                    <div class="metric">
                        <div class="metric-label">Ventas (inc. IVA)</div>
                        <div class="metric-value">€{metrics['sales_incl_vat']:,.2f}</div>
                    </div>
                    <div class="metric">
                        <div class="metric-label">Offers/Desc</div>
                        <div class="metric-value negative">€{metrics['offers_incl']:,.2f}</div>
                    </div>
                    <div class="metric">
                        <div class="metric-label">Marketing Adj</div>
                        <div class="metric-value negative">€{metrics['marketing_adjustment']:,.2f}</div>
                    </div>
                    <div class="metric">
                        <div class="metric-label">Delivery Fee</div>
                        <div class="metric-value">€{metrics['delivery_fee_incl']:,.2f}</div>
                    </div>
                    <div class="metric">
                        <div class="metric-label">Pick & Pack</div>
                        <div class="metric-value">€{metrics['pick_pack_fee']:,.2f}</div>
                    </div>
                    <div class="metric">
                        <div class="metric-label">Bag Fee</div>
                        <div class="metric-value">€{metrics['bag_fee']:,.2f}</div>
                    </div>
                    <div class="metric">
                        <div class="metric-label">Marketplace Fee</div>
                        <div class="metric-value negative">€{metrics['marketplace_fee_incl']:,.2f}</div>
                    </div>
                    <div class="metric">
                        <div class="metric-label">Tips</div>
                        <div class="metric-value">€{metrics['tips']:,.2f}</div>
                    </div>
                    <div class="metric">
                        <div class="metric-label">Total Payout</div>
                        <div class="metric-value">€{metrics['total_payout']:,.2f}</div>
                    </div>
                </div>
                
                <div class="deductions-section">
                    <h4>💰 Deducciones Detalladas</h4>
                    <div class="table-container">
                        <table>
                            <thead>
                                <tr>
                                    <th>Concepto</th>
                                    <th>Importe</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td>Ventas Brutas (inc. IVA)</td>
                                    <td>€{metrics['sales_incl_vat']:,.2f}</td>
                                </tr>
                                <tr>
                                    <td>(-) Offers/Descuentos</td>
                                    <td class="negative">-€{metrics['offers_incl']:,.2f}</td>
                                </tr>
                                <tr>
                                    <td>(-) Marketing Adjustment</td>
                                    <td class="negative">-€{metrics['marketing_adjustment']:,.2f}</td>
                                </tr>
                                <tr>
                                    <td>(+) Delivery Fee</td>
                                    <td>+€{metrics['delivery_fee_incl']:,.2f}</td>
                                </tr>
                                <tr>
                                    <td>(+) Pick & Pack Fee</td>
                                    <td>+€{metrics['pick_pack_fee']:,.2f}</td>
                                </tr>
                                <tr>
                                    <td>(+) Bag Fee</td>
                                    <td>+€{metrics['bag_fee']:,.2f}</td>
                                </tr>
                                <tr>
                                    <td>(+) Tips</td>
                                    <td>+€{metrics['tips']:,.2f}</td>
                                </tr>
                                <tr>
                                    <td>(+) Other Payments</td>
                                    <td>+€{metrics['other_payments']:,.2f}</td>
                                </tr>
                                <tr>
                                    <td>(-) Marketplace Fee (Comisión)</td>
                                    <td class="negative">-€{metrics['marketplace_fee_incl']:,.2f}</td>
                                </tr>
                                <tr style="background: #333; color: white; font-weight: bold;">
                                    <td>= NET PAYOUT</td>
                                    <td>€{metrics['total_payout']:,.2f}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
"""
        
        # Promos section
        if metrics['promos']:
            html += """
                    <div class="section-title uber">🎟️ PROMOS ACTIVOS</div>
                    <div class="promos-list">
"""
            for promo in metrics['promos'][:5]:  # Show first 5 active promos
                sales = parse_float(promo.get('Sales (EUR)', 0))
                orders = parse_float(promo.get('Orders', 0))
                new_customers = parse_float(promo.get('New customers', 0))
                uber_funding = promo.get('Uber funding (%)', '0')
                
                html += f"""
                        <div class="promo-item">
                            <div>
                                <div class="promo-name">{promo.get('Offer type', 'N/A')}</div>
                                <div class="promo-stats">Status: {promo.get('Status', 'N/A')} | Uber Funding: {uber_funding}%</div>
                            </div>
                            <div class="promo-stats">
                                Ventas: €{sales:,.2f} | Órdenes: {int(orders)} | Nuevos: {int(new_customers)}
                            </div>
                        </div>
"""
            html += """
                    </div>
"""
        
        # Advertising section
        if metrics['advertising']:
            html += """
                    <div class="section-title uber">📢 ADVERTISING ACTIVO</div>
                    <div class="ads-list">
"""
            for ad in metrics['advertising'][:3]:  # Show first 3 active ads
                ad_sales = parse_float(ad.get('Ad sales (EUR)', 0))
                ad_spend = parse_float(ad.get('Ad spend (EUR)', 0))
                roas = parse_float(ad.get('ROAS', 0))
                orders = parse_float(ad.get('Orders', 0))
                
                html += f"""
                        <div class="ad-item">
                            <div>
                                <div class="ad-name">{ad.get('Campaign Name', 'N/A')}</div>
                                <div class="ad-stats">Status: {ad.get('Status', 'N/A')} | ROAS: {roas:.2f}x</div>
                            </div>
                            <div class="ad-stats">
                                Ventas: €{ad_sales:,.2f} | Gasto: €{ad_spend:,.2f} | Órdenes: {int(orders)}
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
                <h2>GLOVO - Por Tienda</h2>
            </div>
"""
    
    for store_name, metrics in sorted(glovo_stores.items(), key=lambda x: x[1]['subtotal'], reverse=True):
        html += f"""
            <div class="store-card glovo">
                <h3>📍 {store_name}</h3>
                
                <div class="metrics-grid">
                    <div class="metric">
                        <div class="metric-label">Órdenes</div>
                        <div class="metric-value">{metrics['orders']:,}</div>
                    </div>
                    <div class="metric">
                        <div class="metric-label">Subtotal (Ventas)</div>
                        <div class="metric-value">€{metrics['subtotal']:,.2f}</div>
                    </div>
                    <div class="metric">
                        <div class="metric-label">Commission</div>
                        <div class="metric-value negative">€{metrics['commission']:,.2f}</div>
                    </div>
                    <div class="metric">
                        <div class="metric-label">Service Fee</div>
                        <div class="metric-value negative">€{metrics['service_fee']:,.2f}</div>
                    </div>
                    <div class="metric">
                        <div class="metric-label">Packaging</div>
                        <div class="metric-value negative">€{metrics['packaging_charges']:,.2f}</div>
                    </div>
                    <div class="metric">
                        <div class="metric-label">Ads Fee</div>
                        <div class="metric-value negative">€{metrics['ads_fee']:,.2f}</div>
                    </div>
                    <div class="metric">
                        <div class="metric-label">Marketing Fees</div>
                        <div class="metric-value negative">€{metrics['marketing_fees']:,.2f}</div>
                    </div>
                    <div class="metric">
                        <div class="metric-label">Online Pay Fee</div>
                        <div class="metric-value negative">€{metrics['online_payment_fee']:,.2f}</div>
                    </div>
                    <div class="metric">
                        <div class="metric-label">Estimated Earnings</div>
                        <div class="metric-value">€{metrics['estimated_earnings']:,.2f}</div>
                    </div>
                    <div class="metric">
                        <div class="metric-label">Discount Funded</div>
                        <div class="metric-value negative">€{metrics['discount_funded']:,.2f}</div>
                    </div>
                </div>
                
                <div class="deductions-section">
                    <h4>💰 Deducciones Detalladas</h4>
                    <div class="table-container">
                        <table>
                            <thead>
                                <tr>
                                    <th>Concepto</th>
                                    <th>Importe</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td>Ventas Brutas (Subtotal)</td>
                                    <td>€{metrics['subtotal']:,.2f}</td>
                                </tr>
                                <tr>
                                    <td>(-) Service Fee</td>
                                    <td class="negative">-€{metrics['service_fee']:,.2f}</td>
                                </tr>
                                <tr>
                                    <td>(-) Packaging Charges</td>
                                    <td class="negative">-€{metrics['packaging_charges']:,.2f}</td>
                                </tr>
                                <tr>
                                    <td>(-) Minimum Order Fee</td>
                                    <td class="negative">-€{metrics['minimum_order_fee']:,.2f}</td>
                                </tr>
                                <tr>
                                    <td>(-) Online Payment Fee</td>
                                    <td class="negative">-€{metrics['online_payment_fee']:,.2f}</td>
                                </tr>
                                <tr>
                                    <td>(-) Discount Funded</td>
                                    <td class="negative">-€{metrics['discount_funded']:,.2f}</td>
                                </tr>
                                <tr>
                                    <td>(-) Voucher Funded</td>
                                    <td class="negative">-€{metrics['voucher_funded']:,.2f}</td>
                                </tr>
                                <tr>
                                    <td>(-) Commission</td>
                                    <td class="negative">-€{metrics['commission']:,.2f}</td>
                                </tr>
                                <tr>
                                    <td>(-) Operational Charges</td>
                                    <td class="negative">-€{metrics['operational_charges']:,.2f}</td>
                                </tr>
                                <tr>
                                    <td>(-) Ads Fee (Advertising)</td>
                                    <td class="negative">-€{metrics['ads_fee']:,.2f}</td>
                                </tr>
                                <tr>
                                    <td>(-) Wait Time Fee</td>
                                    <td class="negative">-€{metrics['wait_time_fee']:,.2f}</td>
                                </tr>
                                <tr>
                                    <td>(-) Marketing Fees</td>
                                    <td class="negative">-€{metrics['marketing_fees']:,.2f}</td>
                                </tr>
                                <tr>
                                    <td>(+) Platform-Funded Discount</td>
                                    <td>+€{metrics['platform_discount']:,.2f}</td>
                                </tr>
                                <tr>
                                    <td>(+) Platform-Funded Voucher</td>
                                    <td>+€{metrics['platform_voucher']:,.2f}</td>
                                </tr>
                                <tr style="background: #ffc107; color: #333; font-weight: bold;">
                                    <td>= ESTIMATED EARNINGS</td>
                                    <td>€{metrics['estimated_earnings']:,.2f}</td>
                                </tr>
                            </tbody>
                        </table>
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
    print("GENERANDO FINANCIAL STATEMENT POR TIENDA")
    print("="*80)
    print()
    
    # Load data
    uber_data = load_uber_data()
    glovo_data = load_glovo_data()
    
    # Process by store
    uber_stores = process_uber_by_store(uber_data)
    glovo_stores = process_glovo_by_store(glovo_data)
    
    # Generate HTML
    html = generate_html(uber_stores, glovo_stores)
    
    # Save HTML
    output_file = "/Users/alexismurillo/gula-intel/CALCULATOR/financial_statement_stores.html"
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write(html)
    
    print(f"\n✅ Financial Statement por Tienda generado: {output_file}")

if __name__ == "__main__":
    main()
