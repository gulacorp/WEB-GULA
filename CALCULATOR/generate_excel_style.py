#!/usr/bin/env python3
"""
Analisis Financiero - Formato Excel
Limpieza de datos y calculos correctos
"""

import csv
from collections import defaultdict

# File paths
BASE_DIR = "/Users/alexismurillo/gula-intel/CALCULATOR/GLOVO Y UBER"
UBER_ITEM_LEVEL = f"{BASE_DIR}/UBER EATS/PAYMENT DETAILS ITEM LEVEL  UBER EATS(4 STORES).csv"
UBER_PAYMENT = f"{BASE_DIR}/UBER EATS/PAYMENT DETAILS UBER EATS (4 STORES).csv"
GLOVO_DETAILS = f"{BASE_DIR}/GLOVO/GLOBO ORDER DETAILS (4 STORES).csv"

def parse_float(value):
    """Parse string to float"""
    if value is None or value == '':
        return 0.0
    try:
        cleaned = str(value).replace('€', '').replace(',', '').replace('$', '').strip()
        return float(cleaned)
    except:
        return 0.0

def load_uber_payment():
    """Load Uber Eats payment data"""
    print("Loading Uber Eats payment data...")
    data = []
    try:
        with open(UBER_PAYMENT, 'r', encoding='utf-8') as f:
            f.readline()  # Skip first header
            reader = csv.DictReader(f)
            for row in reader:
                data.append(row)
        print(f"  - Payment details: {len(data)} rows")
        return data
    except Exception as e:
        print(f"  - Error: {e}")
        return []

def load_glovo_details():
    """Load Glovo order details"""
    print("Loading Glovo order details...")
    data = []
    try:
        with open(GLOVO_DETAILS, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for row in reader:
                data.append(row)
        print(f"  - Glovo details: {len(data)} rows")
        return data
    except Exception as e:
        print(f"  - Error: {e}")
        return []

def process_uber_data(data):
    """Process Uber Eats data by store"""
    print("Processing Uber Eats data...")
    
    store_data = defaultdict(lambda: {
        'orders': 0,
        'sales_incl_vat': 0.0,
        'offers': 0.0,
        'marketing_adj': 0.0,
        'delivery_fee': 0.0,
        'pick_pack_fee': 0.0,
        'bag_fee': 0.0,
        'tips': 0.0,
        'marketplace_fee': 0.0,
        'total_payout': 0.0
    })
    
    for row in data:
        store = row.get('Store Name', 'Unknown')
        
        store_data[store]['orders'] += 1
        store_data[store]['sales_incl_vat'] += parse_float(row.get('Sales (incl. VAT)', 0))
        store_data[store]['offers'] += parse_float(row.get('Offers on items (incl. VAT)', 0))
        store_data[store]['marketing_adj'] += parse_float(row.get('Marketing Adjustment (incl. VAT)', 0))
        store_data[store]['delivery_fee'] += parse_float(row.get('Delivery Fee (incl VAT)', 0))
        store_data[store]['pick_pack_fee'] += parse_float(row.get('Pick and Pack Fee', 0))
        store_data[store]['bag_fee'] += parse_float(row.get('Bag Fee', 0))
        store_data[store]['tips'] += parse_float(row.get('Tips', 0))
        store_data[store]['marketplace_fee'] += parse_float(row.get('Marketplace Fee after discount (incl VAT)', 0))
        store_data[store]['total_payout'] += parse_float(row.get('Total payout ', 0))
    
    return store_data

def process_glovo_data(data):
    """Process Glovo data by store"""
    print("Processing Glovo data...")
    
    store_data = defaultdict(lambda: {
        'orders': 0,
        'subtotal': 0.0,
        'service_fee': 0.0,
        'packaging_fee': 0.0,
        'commission': 0.0,
        'ads_fee': 0.0,
        'marketing_fees': 0.0,
        'online_payment_fee': 0.0,
        'discount_funded': 0.0,
        'voucher_funded': 0.0,
        'estimated_earnings': 0.0
    })
    
    for row in data:
        store = row.get('Restaurant name', row.get('\ufeffRestaurant name', 'Unknown'))
        fields = list(row.values())
        
        store_data[store]['orders'] += 1
        store_data[store]['subtotal'] += parse_float(fields[15] if len(fields) > 15 else 0)
        store_data[store]['service_fee'] += parse_float(fields[16] if len(fields) > 16 else 0)
        store_data[store]['packaging_fee'] += parse_float(fields[17] if len(fields) > 17 else 0)
        store_data[store]['commission'] += parse_float(fields[25] if len(fields) > 25 else 0)
        store_data[store]['ads_fee'] += parse_float(fields[27] if len(fields) > 27 else 0)
        store_data[store]['marketing_fees'] += parse_float(fields[29] if len(fields) > 29 else 0)
        store_data[store]['online_payment_fee'] += parse_float(fields[22] if len(fields) > 22 else 0)
        store_data[store]['discount_funded'] += parse_float(fields[23] if len(fields) > 23 else 0)
        store_data[store]['voucher_funded'] += parse_float(fields[24] if len(fields) > 24 else 0)
        store_data[store]['estimated_earnings'] += parse_float(fields[31] if len(fields) > 31 else 0)
    
    return store_data

def generate_excel_style_html(uber_data, glovo_data):
    """Generate Excel-style HTML"""
    
    html = """<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Analisis Financiero - Formato Excel</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: Arial, sans-serif;
            background: #ffffff;
            padding: 20px;
            color: #000000;
        }
        
        .container {
            max-width: 1600px;
            margin: 0 auto;
        }
        
        .header {
            background: #4472C4;
            color: #ffffff;
            padding: 15px;
            margin-bottom: 20px;
            font-size: 16px;
            font-weight: bold;
        }
        
        .section {
            margin-bottom: 30px;
            border: 1px solid #000000;
        }
        
        .section-header {
            background: #D9D9D9;
            padding: 10px;
            font-weight: bold;
            border-bottom: 1px solid #000000;
            font-size: 14px;
        }
        
        table {
            width: 100%;
            border-collapse: collapse;
            font-size: 11px;
        }
        
        th {
            background: #D9D9D9;
            border: 1px solid #000000;
            padding: 8px;
            text-align: center;
            font-weight: bold;
        }
        
        td {
            border: 1px solid #000000;
            padding: 6px 8px;
            text-align: right;
        }
        
        td:first-child {
            text-align: left;
            font-weight: bold;
        }
        
        tr.total td {
            background: #FFC000;
            font-weight: bold;
        }
        
        tr.subtotal td {
            background: #E7E6E6;
            font-weight: bold;
        }
        
        .positive {
            color: #000000;
        }
        
        .negative {
            color: #FF0000;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">Analisis Financiero - Uber Eats y Glovo</div>
"""
    
    # UBER EATS SECTION
    html += """
        <div class="section">
            <div class="section-header">UBER EATS - Por Tienda</div>
            <table>
                <thead>
                    <tr>
                        <th>Tienda</th>
                        <th>Ordenes</th>
                        <th>Ventas (inc IVA)</th>
                        <th>Offers</th>
                        <th>Marketing Adj</th>
                        <th>Delivery Fee</th>
                        <th>Pick Pack</th>
                        <th>Bag Fee</th>
                        <th>Tips</th>
                        <th>Marketplace Fee</th>
                        <th>Total Payout</th>
                    </tr>
                </thead>
                <tbody>
"""
    
    uber_total = defaultdict(float)
    uber_total['orders'] = 0
    
    for store, data in sorted(uber_data.items()):
        if store == 'Unknown':
            continue
        
        # Calculate income
        income = data['sales_incl_vat'] + data['delivery_fee'] + data['pick_pack_fee'] + data['bag_fee'] + data['tips']
        
        # Calculate expenses
        expenses = abs(data['offers']) + abs(data['marketing_adj']) + abs(data['marketplace_fee'])
        
        html += f"""
                    <tr>
                        <td>{store}</td>
                        <td>{data['orders']}</td>
                        <td>{data['sales_incl_vat']:.2f}</td>
                        <td>{data['offers']:.2f}</td>
                        <td>{data['marketing_adj']:.2f}</td>
                        <td>{data['delivery_fee']:.2f}</td>
                        <td>{data['pick_pack_fee']:.2f}</td>
                        <td>{data['bag_fee']:.2f}</td>
                        <td>{data['tips']:.2f}</td>
                        <td>{data['marketplace_fee']:.2f}</td>
                        <td>{data['total_payout']:.2f}</td>
                    </tr>
"""
        
        uber_total['orders'] += data['orders']
        uber_total['sales'] += data['sales_incl_vat']
        uber_total['offers'] += data['offers']
        uber_total['marketing_adj'] += data['marketing_adj']
        uber_total['delivery_fee'] += data['delivery_fee']
        uber_total['pick_pack_fee'] += data['pick_pack_fee']
        uber_total['bag_fee'] += data['bag_fee']
        uber_total['tips'] += data['tips']
        uber_total['marketplace_fee'] += data['marketplace_fee']
        uber_total['payout'] += data['total_payout']
    
    html += f"""
                    <tr class="subtotal">
                        <td>TOTAL UBER EATS</td>
                        <td>{uber_total['orders']}</td>
                        <td>{uber_total['sales']:.2f}</td>
                        <td>{uber_total['offers']:.2f}</td>
                        <td>{uber_total['marketing_adj']:.2f}</td>
                        <td>{uber_total['delivery_fee']:.2f}</td>
                        <td>{uber_total['pick_pack_fee']:.2f}</td>
                        <td>{uber_total['bag_fee']:.2f}</td>
                        <td>{uber_total['tips']:.2f}</td>
                        <td>{uber_total['marketplace_fee']:.2f}</td>
                        <td>{uber_total['payout']:.2f}</td>
                    </tr>
                </tbody>
            </table>
        </div>
"""
    
    # GLOVO SECTION
    html += """
        <div class="section">
            <div class="section-header">GLOVO - Por Tienda</div>
            <table>
                <thead>
                    <tr>
                        <th>Tienda</th>
                        <th>Ordenes</th>
                        <th>Subtotal</th>
                        <th>Service Fee</th>
                        <th>Packaging Fee</th>
                        <th>Commission</th>
                        <th>Ads Fee</th>
                        <th>Marketing Fees</th>
                        <th>Online Pay Fee</th>
                        <th>Discount Funded</th>
                        <th>Voucher Funded</th>
                        <th>Estimated Earnings</th>
                    </tr>
                </thead>
                <tbody>
"""
    
    glovo_total = defaultdict(float)
    glovo_total['orders'] = 0
    
    for store, data in sorted(glovo_data.items()):
        # Calculate income
        income = data['subtotal']
        
        # Calculate expenses
        expenses = (data['service_fee'] + data['packaging_fee'] + data['commission'] + 
                   data['ads_fee'] + data['marketing_fees'] + data['online_payment_fee'] +
                   data['discount_funded'] + data['voucher_funded'])
        
        html += f"""
                    <tr>
                        <td>{store}</td>
                        <td>{data['orders']}</td>
                        <td>{data['subtotal']:.2f}</td>
                        <td>{data['service_fee']:.2f}</td>
                        <td>{data['packaging_fee']:.2f}</td>
                        <td>{data['commission']:.2f}</td>
                        <td>{data['ads_fee']:.2f}</td>
                        <td>{data['marketing_fees']:.2f}</td>
                        <td>{data['online_payment_fee']:.2f}</td>
                        <td>{data['discount_funded']:.2f}</td>
                        <td>{data['voucher_funded']:.2f}</td>
                        <td>{data['estimated_earnings']:.2f}</td>
                    </tr>
"""
        
        glovo_total['orders'] += data['orders']
        glovo_total['subtotal'] += data['subtotal']
        glovo_total['service_fee'] += data['service_fee']
        glovo_total['packaging_fee'] += data['packaging_fee']
        glovo_total['commission'] += data['commission']
        glovo_total['ads_fee'] += data['ads_fee']
        glovo_total['marketing_fees'] += data['marketing_fees']
        glovo_total['online_payment_fee'] += data['online_payment_fee']
        glovo_total['discount_funded'] += data['discount_funded']
        glovo_total['voucher_funded'] += data['voucher_funded']
        glovo_total['earnings'] += data['estimated_earnings']
    
    html += f"""
                    <tr class="subtotal">
                        <td>TOTAL GLOVO</td>
                        <td>{glovo_total['orders']}</td>
                        <td>{glovo_total['subtotal']:.2f}</td>
                        <td>{glovo_total['service_fee']:.2f}</td>
                        <td>{glovo_total['packaging_fee']:.2f}</td>
                        <td>{glovo_total['commission']:.2f}</td>
                        <td>{glovo_total['ads_fee']:.2f}</td>
                        <td>{glovo_total['marketing_fees']:.2f}</td>
                        <td>{glovo_total['online_payment_fee']:.2f}</td>
                        <td>{glovo_total['discount_funded']:.2f}</td>
                        <td>{glovo_total['voucher_funded']:.2f}</td>
                        <td>{glovo_total['earnings']:.2f}</td>
                    </tr>
                </tbody>
            </table>
        </div>
"""
    
    # CONSOLIDATED SECTION
    html += """
        <div class="section">
            <div class="section-header">RESUMEN CONSOLIDADO - UBER EATS + GLOVO</div>
            <table>
                <thead>
                    <tr>
                        <th>Plataforma</th>
                        <th>Ordenes</th>
                        <th>Ventas</th>
                        <th>Total Deducciones</th>
                        <th>Net Payout</th>
                    </tr>
                </thead>
                <tbody>
"""
    
    uber_deductions = abs(uber_total['offers']) + abs(uber_total['marketing_adj']) + abs(uber_total['marketplace_fee'])
    glovo_deductions = (glovo_total['service_fee'] + glovo_total['packaging_fee'] + glovo_total['commission'] +
                       glovo_total['ads_fee'] + glovo_total['marketing_fees'] + glovo_total['online_payment_fee'] +
                       glovo_total['discount_funded'] + glovo_total['voucher_funded'])
    
    total_orders = uber_total['orders'] + glovo_total['orders']
    total_sales = uber_total['sales'] + glovo_total['subtotal']
    total_deductions = uber_deductions + glovo_deductions
    total_payout = uber_total['payout'] + glovo_total['earnings']
    
    html += f"""
                    <tr>
                        <td>Uber Eats</td>
                        <td>{uber_total['orders']}</td>
                        <td>{uber_total['sales']:.2f}</td>
                        <td>{uber_deductions:.2f}</td>
                        <td>{uber_total['payout']:.2f}</td>
                    </tr>
                    <tr>
                        <td>Glovo</td>
                        <td>{glovo_total['orders']}</td>
                        <td>{glovo_total['subtotal']:.2f}</td>
                        <td>{glovo_deductions:.2f}</td>
                        <td>{glovo_total['earnings']:.2f}</td>
                    </tr>
                    <tr class="total">
                        <td>TOTAL CONSOLIDADO</td>
                        <td>{total_orders}</td>
                        <td>{total_sales:.2f}</td>
                        <td>{total_deductions:.2f}</td>
                        <td>{total_payout:.2f}</td>
                    </tr>
                </tbody>
            </table>
        </div>
    </div>
</body>
</html>
"""
    
    return html

def main():
    print("="*80)
    print("GENERANDO ANALISIS FINANCIERO - FORMATO EXCEL")
    print("="*80)
    print()
    
    # Load data
    uber_data = load_uber_payment()
    glovo_data = load_glovo_details()
    
    # Process data
    uber_processed = process_uber_data(uber_data)
    glovo_processed = process_glovo_data(glovo_data)
    
    # Generate HTML
    html = generate_excel_style_html(uber_processed, glovo_processed)
    
    # Save HTML
    output_file = "/Users/alexismurillo/gula-intel/CALCULATOR/financial_excel.html"
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write(html)
    
    print(f"\nAnalisis Financiero Excel generado: {output_file}")

if __name__ == "__main__":
    main()
