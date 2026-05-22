#!/usr/bin/env python3
"""
Full Financial Statement Dashboard for Uber Eats and Glovo
Generates a detailed financial statement with ALL deductions
"""

import csv
from datetime import datetime
from collections import defaultdict
import os

# File paths
BASE_DIR = "/Users/alexismurillo/gula-intel/CALCULATOR/GLOVO Y UBER"
UBER_PAYMENT_DETAILS = f"{BASE_DIR}/UBER EATS/PAYMENT DETAILS UBER EATS (4 STORES).csv"
GLOVO_ORDER_DETAILS = f"{BASE_DIR}/GLOVO/GLOBO ORDER DETAILS (4 STORES).csv"

def parse_float(value):
    """Parse string to float, handling various formats"""
    if value is None or value == '':
        return 0.0
    try:
        cleaned = str(value).replace('€', '').replace(',', '').replace('$', '').strip()
        return float(cleaned)
    except:
        return 0.0

def load_uber_full():
    """Load Uber Eats with ALL columns"""
    print("Loading Uber Eats full data...")
    data = []
    try:
        with open(UBER_PAYMENT_DETAILS, 'r', encoding='utf-8') as f:
            f.readline()  # Skip first header row
            reader = csv.DictReader(f)
            for row in reader:
                data.append(row)
        print(f"  - Uber Payment Details: {len(data)} rows")
        return data
    except Exception as e:
        print(f"  - Error loading Uber: {e}")
        return []

def load_glovo_full():
    """Load Glovo with ALL columns"""
    print("Loading Glovo full data...")
    data = []
    try:
        with open(GLOVO_ORDER_DETAILS, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for row in reader:
                data.append(row)
        print(f"  - Glovo Order Details: {len(data)} rows")
        return data
    except Exception as e:
        print(f"  - Error loading Glovo: {e}")
        return []

def process_uber_full(data):
    """Process Uber Eats with ALL deductions"""
    if not data:
        return []
    
    print("Processing Uber Eats full data...")
    
    # Group by date and store
    daily_data = defaultdict(lambda: defaultdict(lambda: {
        'orders': 0,
        'sales_excl_vat': 0.0,
        'vat1': 0.0,
        'vat2': 0.0,
        'vat3': 0.0,
        'sales_incl_vat': 0.0,
        'order_error_adj_excl': 0.0,
        'order_error_adj_incl': 0.0,
        'offers_excl': 0.0,
        'offers_incl': 0.0,
        'offer_redemption_fee': 0.0,
        'marketing_adjustment': 0.0,
        'meal_voucher': 0.0,
        'price_adj_excl': 0.0,
        'price_adj_incl': 0.0,
        'delivery_fee_excl': 0.0,
        'delivery_fee_incl': 0.0,
        'pick_pack_fee': 0.0,
        'bag_fee': 0.0,
        'delivery_offer_excl': 0.0,
        'delivery_offer_incl': 0.0,
        'total_order': 0.0,
        'cost_of_delivery_excl': 0.0,
        'cost_of_delivery_incl': 0.0,
        'marketplace_fee_before': 0.0,
        'marketplace_fee_discount': 0.0,
        'marketplace_fee_after': 0.0,
        'marketplace_fee_incl': 0.0,
        'tips': 0.0,
        'other_payments': 0.0,
        'total_payout': 0.0
    }))
    
    for row in data:
        store = row.get('Store Name', 'Unknown')
        date_str = row.get('Order Date', '')
        
        # Parse date
        try:
            if '/' in date_str:
                parts = date_str.split('/')
                if len(parts) == 3:
                    month, day, year = parts
                    year = f"20{year}" if len(year) == 2 else year
                    date = f"{year}-{month.zfill(2)}-{day.zfill(2)}"
                else:
                    date = date_str
            else:
                date = date_str
        except:
            date = date_str
        
        # Parse ALL financial columns
        daily_data[date][store]['orders'] += 1
        daily_data[date][store]['sales_excl_vat'] += parse_float(row.get('Sales (excl. VAT)', 0))
        daily_data[date][store]['vat1'] += parse_float(row.get('VAT1 on Sales', 0))
        daily_data[date][store]['vat2'] += parse_float(row.get('VAT2 on Sales', 0))
        daily_data[date][store]['vat3'] += parse_float(row.get('VAT3 on Sales', 0))
        daily_data[date][store]['sales_incl_vat'] += parse_float(row.get('Sales (incl. VAT)', 0))
        daily_data[date][store]['order_error_adj_excl'] += parse_float(row.get('Order Error Adjustments (excl. VAT)', 0))
        daily_data[date][store]['order_error_adj_incl'] += parse_float(row.get('Order Error Adjustments (incl. VAT)', 0))
        daily_data[date][store]['offers_excl'] += parse_float(row.get('Offers on items (excl. VAT)', 0))
        daily_data[date][store]['offers_incl'] += parse_float(row.get('Offers on items (incl. VAT)', 0))
        daily_data[date][store]['offer_redemption_fee'] += parse_float(row.get('Offer Redemption Fee', 0))
        daily_data[date][store]['marketing_adjustment'] += parse_float(row.get('Marketing Adjustment (incl. VAT)', 0))
        daily_data[date][store]['meal_voucher'] += parse_float(row.get('Meal Voucher', 0))
        daily_data[date][store]['price_adj_excl'] += parse_float(row.get('Price Adjustments (excl. VAT)', 0))
        daily_data[date][store]['price_adj_incl'] += parse_float(row.get('Price Adjustments (incl. VAT)', 0))
        daily_data[date][store]['delivery_fee_excl'] += parse_float(row.get('Delivery Fee (excl VAT)', 0))
        daily_data[date][store]['delivery_fee_incl'] += parse_float(row.get('Delivery Fee (incl VAT)', 0))
        daily_data[date][store]['pick_pack_fee'] += parse_float(row.get('Pick and Pack Fee', 0))
        daily_data[date][store]['bag_fee'] += parse_float(row.get('Bag Fee', 0))
        daily_data[date][store]['delivery_offer_excl'] += parse_float(row.get('Delivery Offer Redemptions (excl. VAT)', 0))
        daily_data[date][store]['delivery_offer_incl'] += parse_float(row.get('Delivery Offer Redemptions (incl. VAT)', 0))
        daily_data[date][store]['total_order'] += parse_float(row.get('Total Order (incl VAT)', 0))
        daily_data[date][store]['cost_of_delivery_excl'] += parse_float(row.get('Cost of Delivery (excl VAT)', 0))
        daily_data[date][store]['cost_of_delivery_incl'] += parse_float(row.get('Cost of Delivery (incl VAT)', 0))
        daily_data[date][store]['marketplace_fee_before'] += parse_float(row.get('Marketplace Fee before discount (excl VAT)', 0))
        daily_data[date][store]['marketplace_fee_discount'] += parse_float(row.get('Marketplace Fee discount (excl VAT)', 0))
        daily_data[date][store]['marketplace_fee_after'] += parse_float(row.get('Marketplace Fee after discount (excl VAT)', 0))
        daily_data[date][store]['marketplace_fee_incl'] += parse_float(row.get('Marketplace Fee after discount (incl VAT)', 0))
        daily_data[date][store]['tips'] += parse_float(row.get('Tips', 0))
        daily_data[date][store]['other_payments'] += parse_float(row.get('Other payments (incl VAT)', 0))
        daily_data[date][store]['total_payout'] += parse_float(row.get('Total payout ', 0))
    
    return daily_data

def process_glovo_full(data):
    """Process Glovo with ALL deductions"""
    if not data:
        return []
    
    print("Processing Glovo full data...")
    
    # Group by date and store
    daily_data = defaultdict(lambda: defaultdict(lambda: {
        'orders': 0,
        'subtotal': 0.0,
        'service_fee': 0.0,
        'packaging_charges': 0.0,
        'minimum_order_fee': 0.0,
        'vendor_refunds': 0.0,
        'customer_fee_total': 0.0,
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
        'tax_amount': 0.0
    }))
    
    for row in data:
        store = row.get('Restaurant name', row.get('\ufeffRestaurant name', 'Unknown'))
        date_str = row.get('Order received at', '')
        
        # Parse date
        try:
            if 'T' in date_str:
                date = date_str.split('T')[0]
            elif ' ' in date_str:
                date = date_str.split(' ')[0]
            else:
                date = date_str
        except:
            date = date_str
        
        fields = list(row.values())
        
        # Parse ALL financial columns
        daily_data[date][store]['orders'] += 1
        daily_data[date][store]['subtotal'] += parse_float(fields[15] if len(fields) > 15 else 0)
        daily_data[date][store]['service_fee'] += parse_float(fields[16] if len(fields) > 16 else 0)
        daily_data[date][store]['packaging_charges'] += parse_float(fields[17] if len(fields) > 17 else 0)
        daily_data[date][store]['minimum_order_fee'] += parse_float(fields[18] if len(fields) > 18 else 0)
        daily_data[date][store]['vendor_refunds'] += parse_float(fields[19] if len(fields) > 19 else 0)
        daily_data[date][store]['customer_fee_total'] += parse_float(fields[20] if len(fields) > 20 else 0)
        daily_data[date][store]['tax_charge'] += parse_float(fields[21] if len(fields) > 21 else 0)
        daily_data[date][store]['online_payment_fee'] += parse_float(fields[22] if len(fields) > 22 else 0)
        daily_data[date][store]['discount_funded'] += parse_float(fields[23] if len(fields) > 23 else 0)
        daily_data[date][store]['voucher_funded'] += parse_float(fields[24] if len(fields) > 24 else 0)
        daily_data[date][store]['commission'] += parse_float(fields[25] if len(fields) > 25 else 0)
        daily_data[date][store]['operational_charges'] += parse_float(fields[26] if len(fields) > 26 else 0)
        daily_data[date][store]['ads_fee'] += parse_float(fields[27] if len(fields) > 27 else 0)
        daily_data[date][store]['wait_time_fee'] += parse_float(fields[28] if len(fields) > 28 else 0)
        daily_data[date][store]['marketing_fees'] += parse_float(fields[29] if len(fields) > 29 else 0)
        daily_data[date][store]['cancellation_fee'] += parse_float(fields[30] if len(fields) > 30 else 0)
        daily_data[date][store]['estimated_earnings'] += parse_float(fields[31] if len(fields) > 31 else 0)
        daily_data[date][store]['cash_collected'] += parse_float(fields[32] if len(fields) > 32 else 0)
        daily_data[date][store]['amount_owed'] += parse_float(fields[33] if len(fields) > 33 else 0)
        daily_data[date][store]['payout_amount'] += parse_float(fields[34] if len(fields) > 34 else 0)
        daily_data[date][store]['platform_discount'] += parse_float(fields[35] if len(fields) > 35 else 0)
        daily_data[date][store]['platform_voucher'] += parse_float(fields[36] if len(fields) > 36 else 0)
        daily_data[date][store]['total_discount'] += parse_float(fields[37] if len(fields) > 37 else 0)
        daily_data[date][store]['total_voucher'] += parse_float(fields[38] if len(fields) > 38 else 0)
        daily_data[date][store]['tax_amount'] += parse_float(fields[39] if len(fields) > 39 else 0)
    
    return daily_data

def generate_html(uber_data, glovo_data):
    """Generate full financial statement HTML"""
    
    html = """<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Financial Statement Completo - Uber Eats & Glovo</title>
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
            max-width: 1600px;
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
        
        .summary-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 15px;
            margin-bottom: 30px;
        }
        
        .summary-card {
            background: #f8f9fa;
            padding: 20px;
            border-radius: 8px;
            border-left: 4px solid #667eea;
        }
        
        .summary-card.uber {
            border-left-color: #000;
        }
        
        .summary-card.glovo {
            border-left-color: #ffc107;
        }
        
        .summary-label {
            font-size: 0.85em;
            color: #666;
            text-transform: uppercase;
            letter-spacing: 1px;
            margin-bottom: 8px;
        }
        
        .summary-value {
            font-size: 1.8em;
            font-weight: bold;
            color: #333;
        }
        
        .table-container {
            overflow-x: auto;
            margin-bottom: 30px;
        }
        
        table {
            width: 100%;
            border-collapse: collapse;
            font-size: 0.9em;
        }
        
        th {
            background: #333;
            color: white;
            padding: 12px 8px;
            text-align: right;
            font-weight: bold;
            text-transform: uppercase;
            font-size: 0.75em;
            letter-spacing: 0.5px;
            position: sticky;
            top: 0;
        }
        
        th:first-child {
            text-align: left;
        }
        
        td {
            padding: 10px 8px;
            border-bottom: 1px solid #eee;
            text-align: right;
        }
        
        td:first-child {
            text-align: left;
            font-weight: bold;
            background: #f8f9fa;
        }
        
        tr:hover {
            background: #f0f0f0;
        }
        
        .section-header {
            background: #667eea;
            color: white;
            padding: 10px 15px;
            font-weight: bold;
            margin-top: 20px;
        }
        
        .section-header.uber {
            background: #000;
        }
        
        .section-header.glovo {
            background: #ffc107;
            color: #333;
        }
        
        .negative {
            color: #dc3545;
        }
        
        .positive {
            color: #28a745;
        }
        
        .total-row {
            background: #333;
            color: white;
            font-weight: bold;
        }
        
        .total-row td {
            border-bottom: none;
        }
        
        @media (max-width: 768px) {
            .summary-grid {
                grid-template-columns: 1fr;
            }
            
            table {
                font-size: 0.7em;
            }
            
            th, td {
                padding: 8px 4px;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📊 FINANCIAL STATEMENT COMPLETO</h1>
            <p>Análisis Detallado de Ingresos y Deducciones</p>
            <div class="period">📅 Periodo: 1-11 Mayo 2026</div>
        </div>
"""
    
    # UBER EATS SECTION
    html += """
        <div class="platform-section">
            <div class="platform-header uber">
                <div class="platform-logo">⚫</div>
                <h2>UBER EATS - Financial Statement</h2>
            </div>
"""
    
    # Calculate Uber totals
    uber_totals = defaultdict(float)
    uber_totals['orders'] = 0
    for date, stores in uber_data.items():
        for store, metrics in stores.items():
            uber_totals['orders'] += metrics['orders']
            for key, value in metrics.items():
                if key != 'orders':
                    uber_totals[key] += value
    
    # Uber summary cards
    html += f"""
            <div class="summary-grid">
                <div class="summary-card uber">
                    <div class="summary-label">Ventas Totales (inc. IVA)</div>
                    <div class="summary-value">€{uber_totals['sales_incl_vat']:,.2f}</div>
                </div>
                <div class="summary-card uber">
                    <div class="summary-label">Total Órdenes</div>
                    <div class="summary-value">{uber_totals['orders']:,}</div>
                </div>
                <div class="summary-card uber">
                    <div class="summary-label">Commission (Marketplace Fee)</div>
                    <div class="summary-value negative">€{uber_totals['marketplace_fee_incl']:,.2f}</div>
                </div>
                <div class="summary-card uber">
                    <div class="summary-label">Total Payout</div>
                    <div class="summary-value">€{uber_totals['total_payout']:,.2f}</div>
                </div>
                <div class="summary-card uber">
                    <div class="summary-label">Offers/Descuentos</div>
                    <div class="summary-value negative">€{uber_totals['offers_incl']:,.2f}</div>
                </div>
                <div class="summary-card uber">
                    <div class="summary-label">Marketing Adjustment</div>
                    <div class="summary-value negative">€{uber_totals['marketing_adjustment']:,.2f}</div>
                </div>
            </div>
"""
    
    # Uber detailed table by date
    html += """
            <div class="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>Fecha</th>
                            <th>Órdenes</th>
                            <th>Ventas (inc. IVA)</th>
                            <th>Offers/Desc</th>
                            <th>Marketing Adj</th>
                            <th>Delivery Fee</th>
                            <th>Pick & Pack</th>
                            <th>Bag Fee</th>
                            <th>Delivery Offer</th>
                            <th>Order Error</th>
                            <th>Price Adj</th>
                            <th>Meal Voucher</th>
                            <th>Tips</th>
                            <th>Other Pay</th>
                            <th>Marketplace Fee</th>
                            <th>Total Payout</th>
                        </tr>
                    </thead>
                    <tbody>
"""
    
    for date in sorted(uber_data.keys()):
        stores = uber_data[date]
        total_orders = sum(s['orders'] for s in stores.values())
        total_sales = sum(s['sales_incl_vat'] for s in stores.values())
        total_offers = sum(s['offers_incl'] for s in stores.values())
        total_marketing = sum(s['marketing_adjustment'] for s in stores.values())
        total_delivery_fee = sum(s['delivery_fee_incl'] for s in stores.values())
        total_pick_pack = sum(s['pick_pack_fee'] for s in stores.values())
        total_bag = sum(s['bag_fee'] for s in stores.values())
        total_delivery_offer = sum(s['delivery_offer_incl'] for s in stores.values())
        total_error = sum(s['order_error_adj_incl'] for s in stores.values())
        total_price_adj = sum(s['price_adj_incl'] for s in stores.values())
        total_meal = sum(s['meal_voucher'] for s in stores.values())
        total_tips = sum(s['tips'] for s in stores.values())
        total_other = sum(s['other_payments'] for s in stores.values())
        total_marketplace = sum(s['marketplace_fee_incl'] for s in stores.values())
        total_payout = sum(s['total_payout'] for s in stores.values())
        
        html += f"""
                        <tr>
                            <td>{date}</td>
                            <td>{total_orders}</td>
                            <td>€{total_sales:,.2f}</td>
                            <td class="negative">€{total_offers:,.2f}</td>
                            <td class="negative">€{total_marketing:,.2f}</td>
                            <td>€{total_delivery_fee:,.2f}</td>
                            <td>€{total_pick_pack:,.2f}</td>
                            <td>€{total_bag:,.2f}</td>
                            <td class="negative">€{total_delivery_offer:,.2f}</td>
                            <td class="negative">€{total_error:,.2f}</td>
                            <td>€{total_price_adj:,.2f}</td>
                            <td>€{total_meal:,.2f}</td>
                            <td>€{total_tips:,.2f}</td>
                            <td>€{total_other:,.2f}</td>
                            <td class="negative">€{total_marketplace:,.2f}</td>
                            <td>€{total_payout:,.2f}</td>
                        </tr>
"""
    
    # Uber total row
    html += f"""
                        <tr class="total-row">
                            <td>TOTAL</td>
                            <td>{uber_totals['orders']:,}</td>
                            <td>€{uber_totals['sales_incl_vat']:,.2f}</td>
                            <td>€{uber_totals['offers_incl']:,.2f}</td>
                            <td>€{uber_totals['marketing_adjustment']:,.2f}</td>
                            <td>€{uber_totals['delivery_fee_incl']:,.2f}</td>
                            <td>€{uber_totals['pick_pack_fee']:,.2f}</td>
                            <td>€{uber_totals['bag_fee']:,.2f}</td>
                            <td>€{uber_totals['delivery_offer_incl']:,.2f}</td>
                            <td>€{uber_totals['order_error_adj_incl']:,.2f}</td>
                            <td>€{uber_totals['price_adj_incl']:,.2f}</td>
                            <td>€{uber_totals['meal_voucher']:,.2f}</td>
                            <td>€{uber_totals['tips']:,.2f}</td>
                            <td>€{uber_totals['other_payments']:,.2f}</td>
                            <td>€{uber_totals['marketplace_fee_incl']:,.2f}</td>
                            <td>€{uber_totals['total_payout']:,.2f}</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
"""
    
    # GLOVO SECTION
    html += """
        <div class="platform-section">
            <div class="platform-header glovo">
                <div class="platform-logo">🟡</div>
                <h2>GLOVO - Financial Statement</h2>
            </div>
"""
    
    # Calculate Glovo totals
    glovo_totals = defaultdict(float)
    glovo_totals['orders'] = 0
    for date, stores in glovo_data.items():
        for store, metrics in stores.items():
            glovo_totals['orders'] += metrics['orders']
            for key, value in metrics.items():
                if key != 'orders':
                    glovo_totals[key] += value
    
    # Glovo summary cards
    html += f"""
            <div class="summary-grid">
                <div class="summary-card glovo">
                    <div class="summary-label">Subtotal (Ventas)</div>
                    <div class="summary-value">€{glovo_totals['subtotal']:,.2f}</div>
                </div>
                <div class="summary-card glovo">
                    <div class="summary-label">Total Órdenes</div>
                    <div class="summary-value">{glovo_totals['orders']:,}</div>
                </div>
                <div class="summary-card glovo">
                    <div class="summary-label">Commission</div>
                    <div class="summary-value negative">€{glovo_totals['commission']:,.2f}</div>
                </div>
                <div class="summary-card glovo">
                    <div class="summary-label">Estimated Earnings</div>
                    <div class="summary-value">€{glovo_totals['estimated_earnings']:,.2f}</div>
                </div>
                <div class="summary-card glovo">
                    <div class="summary-label">Service Fee</div>
                    <div class="summary-value negative">€{glovo_totals['service_fee']:,.2f}</div>
                </div>
                <div class="summary-card glovo">
                    <div class="summary-label">Ads Fee (Advertising)</div>
                    <div class="summary-value negative">€{glovo_totals['ads_fee']:,.2f}</div>
                </div>
            </div>
"""
    
    # Glovo detailed table by date
    html += """
            <div class="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>Fecha</th>
                            <th>Órdenes</th>
                            <th>Subtotal</th>
                            <th>Service Fee</th>
                            <th>Packaging</th>
                            <th>Min Order Fee</th>
                            <th>Tax Charge</th>
                            <th>Online Pay Fee</th>
                            <th>Discount Funded</th>
                            <th>Voucher Funded</th>
                            <th>Commission</th>
                            <th>Operational</th>
                            <th>Ads Fee</th>
                            <th>Wait Time</th>
                            <th>Marketing Fees</th>
                            <th>Cancellation Fee</th>
                            <th>Platform Discount</th>
                            <th>Platform Voucher</th>
                            <th>Estimated Earnings</th>
                        </tr>
                    </thead>
                    <tbody>
"""
    
    for date in sorted(glovo_data.keys()):
        stores = glovo_data[date]
        total_orders = sum(s['orders'] for s in stores.values())
        total_subtotal = sum(s['subtotal'] for s in stores.values())
        total_service = sum(s['service_fee'] for s in stores.values())
        total_packaging = sum(s['packaging_charges'] for s in stores.values())
        total_min = sum(s['minimum_order_fee'] for s in stores.values())
        total_tax = sum(s['tax_charge'] for s in stores.values())
        total_online = sum(s['online_payment_fee'] for s in stores.values())
        total_discount = sum(s['discount_funded'] for s in stores.values())
        total_voucher = sum(s['voucher_funded'] for s in stores.values())
        total_commission = sum(s['commission'] for s in stores.values())
        total_operational = sum(s['operational_charges'] for s in stores.values())
        total_ads = sum(s['ads_fee'] for s in stores.values())
        total_wait = sum(s['wait_time_fee'] for s in stores.values())
        total_marketing = sum(s['marketing_fees'] for s in stores.values())
        total_cancellation = sum(s['cancellation_fee'] for s in stores.values())
        total_platform_discount = sum(s['platform_discount'] for s in stores.values())
        total_platform_voucher = sum(s['platform_voucher'] for s in stores.values())
        total_earnings = sum(s['estimated_earnings'] for s in stores.values())
        
        html += f"""
                        <tr>
                            <td>{date}</td>
                            <td>{total_orders}</td>
                            <td>€{total_subtotal:,.2f}</td>
                            <td class="negative">€{total_service:,.2f}</td>
                            <td class="negative">€{total_packaging:,.2f}</td>
                            <td class="negative">€{total_min:,.2f}</td>
                            <td>€{total_tax:,.2f}</td>
                            <td class="negative">€{total_online:,.2f}</td>
                            <td class="negative">€{total_discount:,.2f}</td>
                            <td class="negative">€{total_voucher:,.2f}</td>
                            <td class="negative">€{total_commission:,.2f}</td>
                            <td class="negative">€{total_operational:,.2f}</td>
                            <td class="negative">€{total_ads:,.2f}</td>
                            <td class="negative">€{total_wait:,.2f}</td>
                            <td class="negative">€{total_marketing:,.2f}</td>
                            <td class="negative">€{total_cancellation:,.2f}</td>
                            <td>€{total_platform_discount:,.2f}</td>
                            <td>€{total_platform_voucher:,.2f}</td>
                            <td>€{total_earnings:,.2f}</td>
                        </tr>
"""
    
    # Glovo total row
    html += f"""
                        <tr class="total-row">
                            <td>TOTAL</td>
                            <td>{glovo_totals['orders']:,}</td>
                            <td>€{glovo_totals['subtotal']:,.2f}</td>
                            <td>€{glovo_totals['service_fee']:,.2f}</td>
                            <td>€{glovo_totals['packaging_charges']:,.2f}</td>
                            <td>€{glovo_totals['minimum_order_fee']:,.2f}</td>
                            <td>€{glovo_totals['tax_charge']:,.2f}</td>
                            <td>€{glovo_totals['online_payment_fee']:,.2f}</td>
                            <td>€{glovo_totals['discount_funded']:,.2f}</td>
                            <td>€{glovo_totals['voucher_funded']:,.2f}</td>
                            <td>€{glovo_totals['commission']:,.2f}</td>
                            <td>€{glovo_totals['operational_charges']:,.2f}</td>
                            <td>€{glovo_totals['ads_fee']:,.2f}</td>
                            <td>€{glovo_totals['wait_time_fee']:,.2f}</td>
                            <td>€{glovo_totals['marketing_fees']:,.2f}</td>
                            <td>€{glovo_totals['cancellation_fee']:,.2f}</td>
                            <td>€{glovo_totals['platform_discount']:,.2f}</td>
                            <td>€{glovo_totals['platform_voucher']:,.2f}</td>
                            <td>€{glovo_totals['estimated_earnings']:,.2f}</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
"""
    
    # COMBINED SUMMARY
    combined_sales = uber_totals['sales_incl_vat'] + glovo_totals['subtotal']
    combined_orders = uber_totals['orders'] + glovo_totals['orders']
    combined_commission = abs(uber_totals['marketplace_fee_incl']) + glovo_totals['commission']
    combined_payout = uber_totals['total_payout'] + glovo_totals['estimated_earnings']
    
    html += f"""
        <div class="platform-section">
            <div class="platform-header" style="border-color: #667eea;">
                <div class="platform-logo">📊</div>
                <h2>RESUMEN CONSOLIDADO - AMBAS PLATAFORMAS</h2>
            </div>
            <div class="summary-grid">
                <div class="summary-card">
                    <div class="summary-label">Ventas Totales</div>
                    <div class="summary-value">€{combined_sales:,.2f}</div>
                </div>
                <div class="summary-card">
                    <div class="summary-label">Total Órdenes</div>
                    <div class="summary-value">{combined_orders:,}</div>
                </div>
                <div class="summary-card">
                    <div class="summary-label">Commission Total</div>
                    <div class="summary-value negative">€{combined_commission:,.2f}</div>
                </div>
                <div class="summary-card">
                    <div class="summary-label">Payout Neto Total</div>
                    <div class="summary-value">€{combined_payout:,.2f}</div>
                </div>
            </div>
        </div>
    </div>
</body>
</html>
"""
    
    return html

def main():
    print("="*80)
    print("GENERANDO FINANCIAL STATEMENT COMPLETO")
    print("="*80)
    print()
    
    # Load data
    uber_data = load_uber_full()
    glovo_data = load_glovo_full()
    
    # Process data
    uber_processed = process_uber_full(uber_data)
    glovo_processed = process_glovo_full(glovo_data)
    
    # Generate HTML
    html = generate_html(uber_processed, glovo_processed)
    
    # Save HTML
    output_file = "/Users/alexismurillo/gula-intel/CALCULATOR/financial_statement.html"
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write(html)
    
    print(f"\n✅ Financial Statement generado: {output_file}")

if __name__ == "__main__":
    main()
