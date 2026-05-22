#!/usr/bin/env python3
"""
Analisis de Costos por Pedido - Muestra origen de cada costo
Sin colores ni emojis - Diseño profesional
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

def load_uber_item_level():
    """Load Uber Eats item level data"""
    print("Loading Uber Eats item level data...")
    data = []
    try:
        with open(UBER_ITEM_LEVEL, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for row in reader:
                data.append(row)
        print(f"  - Item level: {len(data)} rows")
        return data
    except Exception as e:
        print(f"  - Error: {e}")
        return []

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

def analyze_uber_orders(item_data):
    """Analyze Uber Eats orders by grouping items with their order"""
    print("Analyzing Uber Eats orders...")
    
    orders = defaultdict(lambda: {
        'store': '',
        'date': '',
        'items': [],
        'sales_items': 0.0,
        'offers': 0.0,
        'marketing_adj': 0.0,
        'marketplace_fee': 0.0,
        'total_order': 0.0,
        'total_payout': 0.0
    })
    
    current_order_id = None
    
    for row in item_data:
        order_id = row.get('Order ID', '')
        
        # Si tiene Order ID, es una fila de resumen del orden
        if order_id:
            current_order_id = order_id
            orders[order_id]['store'] = row.get('Store Name', '')
            orders[order_id]['date'] = row.get('Order Date', '')
            orders[order_id]['offers'] = parse_float(row.get('Offers on items (incl. VAT)', 0))
            orders[order_id]['marketing_adj'] = parse_float(row.get('Marketing Adjustment (incl. VAT)', 0))
            orders[order_id]['marketplace_fee'] = parse_float(row.get('Marketplace Fee after discount (incl VAT)', 0))
            orders[order_id]['total_order'] = parse_float(row.get('Total Order (incl VAT)', 0))
            orders[order_id]['total_payout'] = parse_float(row.get('Total payout ', 0))
        # Si no tiene Order ID, es un item del orden anterior
        elif current_order_id:
            item_name = row.get('Item Name', '')
            unit_price = parse_float(row.get('Unit price', 0))
            sales_incl_vat = parse_float(row.get('Sales (incl. VAT)', 0))
            
            if item_name:
                orders[current_order_id]['items'].append({
                    'name': item_name,
                    'unit_price': unit_price,
                    'sales': sales_incl_vat
                })
                orders[current_order_id]['sales_items'] += sales_incl_vat
    
    return orders

def analyze_glovo_orders(data):
    """Analyze Glovo orders"""
    print("Analyzing Glovo orders...")
    
    orders = []
    
    for row in data:
        store = row.get('Restaurant name', row.get('\ufeffRestaurant name', 'Unknown'))
        order_id = row.get('Order ID', '')
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
        
        # Get item names from last column
        items_str = fields[-1] if len(fields) > 0 else ''
        items = [item.strip() for item in items_str.split(';') if item.strip()]
        
        order = {
            'store': store,
            'order_id': order_id,
            'date': date,
            'items': items,
            'subtotal': parse_float(fields[15] if len(fields) > 15 else 0),
            'service_fee': parse_float(fields[16] if len(fields) > 16 else 0),
            'commission': parse_float(fields[25] if len(fields) > 25 else 0),
            'ads_fee': parse_float(fields[27] if len(fields) > 27 else 0),
            'marketing_fees': parse_float(fields[29] if len(fields) > 29 else 0),
            'estimated_earnings': parse_float(fields[31] if len(fields) > 31 else 0)
        }
        
        orders.append(order)
    
    return orders

def generate_professional_html(uber_orders, glovo_orders):
    """Generate professional HTML without colors or emojis"""
    
    html = """<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Analisis de Costos por Pedido</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: Arial, Helvetica, sans-serif;
            background: #ffffff;
            padding: 20px;
            color: #000000;
            font-size: 12px;
        }
        
        .container {
            max-width: 1400px;
            margin: 0 auto;
        }
        
        .header {
            background: #000000;
            color: #ffffff;
            padding: 20px;
            margin-bottom: 30px;
            text-align: center;
        }
        
        .header h1 {
            font-size: 24px;
            margin-bottom: 5px;
        }
        
        .header p {
            font-size: 14px;
            opacity: 0.8;
        }
        
        .platform-section {
            background: #ffffff;
            padding: 20px;
            margin-bottom: 30px;
            border: 1px solid #000000;
        }
        
        .platform-header {
            font-size: 18px;
            font-weight: bold;
            margin-bottom: 20px;
            padding-bottom: 10px;
            border-bottom: 2px solid #000000;
        }
        
        .order-card {
            background: #f5f5f5;
            padding: 15px;
            margin-bottom: 15px;
            border-left: 3px solid #000000;
        }
        
        .order-header {
            font-size: 14px;
            font-weight: bold;
            margin-bottom: 10px;
        }
        
        .order-meta {
            font-size: 11px;
            color: #666;
            margin-bottom: 10px;
        }
        
        .calculation-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 15px;
            font-size: 11px;
        }
        
        .calculation-table th {
            background: #000000;
            color: #ffffff;
            padding: 8px;
            text-align: left;
            font-weight: bold;
        }
        
        .calculation-table td {
            padding: 6px 8px;
            border-bottom: 1px solid #cccccc;
        }
        
        .calculation-table tr.total td {
            background: #000000;
            color: #ffffff;
            font-weight: bold;
        }
        
        .items-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 10px;
            font-size: 11px;
        }
        
        .items-table th {
            background: #333333;
            color: #ffffff;
            padding: 6px;
            text-align: left;
            font-weight: bold;
        }
        
        .items-table td {
            padding: 5px 8px;
            border-bottom: 1px solid #cccccc;
        }
        
        .positive {
            color: #006400;
        }
        
        .negative {
            color: #8b0000;
        }
        
        .deduction-source {
            font-size: 10px;
            color: #666;
            font-style: italic;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Analisis de Costos por Pedido</h1>
            <p>Origen de Ventas y Deducciones</p>
        </div>
"""
    
    # UBER EATS SECTION
    html += """
        <div class="platform-section">
            <div class="platform-header">UBER EATS - Analisis por Pedido</div>
"""
    
    for order_id, order in sorted(uber_orders.items(), key=lambda x: x[1]['date'], reverse=True)[:20]:
        html += f"""
            <div class="order-card">
                <div class="order-header">Orden: {order_id}</div>
                <div class="order-meta">Tienda: {order['store']} | Fecha: {order['date']}</div>
                
                <table class="calculation-table">
                    <thead>
                        <tr>
                            <th>Concepto</th>
                            <th>Origen</th>
                            <th>Importe</th>
                        </tr>
                    </thead>
                    <tbody>
"""
        
        # Items - Ventas
        for item in order['items']:
            html += f"""
                        <tr>
                            <td>{item['name']}</td>
                            <td class="deduction-source">Venta de item</td>
                            <td class="positive">+€{item['sales']:.2f}</td>
                        </tr>
"""
        
        html += f"""
                        <tr>
                            <td><strong>TOTAL VENTAS</strong></td>
                            <td class="deduction-source">Suma de items</td>
                            <td class="positive"><strong>+€{order['sales_items']:.2f}</strong></td>
                        </tr>
"""
        
        # Deducciones
        if order['offers'] < 0:
            html += f"""
                        <tr>
                            <td>Offers/Descuentos</td>
                            <td class="deduction-source">Promociones aplicadas al orden</td>
                            <td class="negative">-€{abs(order['offers']):.2f}</td>
                        </tr>
"""
        
        if order['marketing_adj'] < 0:
            html += f"""
                        <tr>
                            <td>Marketing Adjustment</td>
                            <td class="deduction-source">Ajustes de marketing</td>
                            <td class="negative">-€{abs(order['marketing_adj']):.2f}</td>
                        </tr>
"""
        
        if order['marketplace_fee'] < 0:
            html += f"""
                        <tr>
                            <td>Marketplace Fee</td>
                            <td class="deduction-source">Comision de plataforma Uber</td>
                            <td class="negative">-€{abs(order['marketplace_fee']):.2f}</td>
                        </tr>
"""
        
        html += f"""
                        <tr class="total">
                            <td>TOTAL DEDUCCIONES</td>
                            <td></td>
                            <td>-€{abs(order['offers']) + abs(order['marketing_adj']) + abs(order['marketplace_fee']):.2f}</td>
                        </tr>
                        <tr class="total">
                            <td>NET PAYOUT</td>
                            <td>Ventas - Deducciones</td>
                            <td>€{order['total_payout']:.2f}</td>
                        </tr>
                    </tbody>
                </table>
                
                <table class="items-table">
                    <thead>
                        <tr>
                            <th>Item</th>
                            <th>Precio Unitario</th>
                            <th>Venta Total</th>
                        </tr>
                    </thead>
                    <tbody>
"""
        
        for item in order['items']:
            html += f"""
                        <tr>
                            <td>{item['name']}</td>
                            <td>€{item['unit_price']:.2f}</td>
                            <td>€{item['sales']:.2f}</td>
                        </tr>
"""
        
        html += f"""
                    </tbody>
                </table>
            </div>
"""
    
    html += """
        </div>
"""
    
    # GLOVO SECTION
    html += """
        <div class="platform-section">
            <div class="platform-header">GLOVO - Analisis por Pedido</div>
"""
    
    for order in sorted(glovo_orders, key=lambda x: x['date'], reverse=True)[:20]:
        html += f"""
            <div class="order-card">
                <div class="order-header">Orden: {order['order_id']}</div>
                <div class="order-meta">Tienda: {order['store']} | Fecha: {order['date']}</div>
                
                <table class="calculation-table">
                    <thead>
                        <tr>
                            <th>Concepto</th>
                            <th>Origen</th>
                            <th>Importe</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>Subtotal (Ventas)</td>
                            <td class="deduction-source">Suma de items</td>
                            <td class="positive">+€{order['subtotal']:.2f}</td>
                        </tr>
"""
        
        # Deducciones
        if order['service_fee'] > 0:
            html += f"""
                        <tr>
                            <td>Service Fee</td>
                            <td class="deduction-source">Tarifa de servicio</td>
                            <td class="negative">-€{order['service_fee']:.2f}</td>
                        </tr>
"""
        
        if order['commission'] > 0:
            html += f"""
                        <tr>
                            <td>Commission</td>
                            <td class="deduction-source">Comision de plataforma Glovo</td>
                            <td class="negative">-€{order['commission']:.2f}</td>
                        </tr>
"""
        
        if order['ads_fee'] > 0:
            html += f"""
                        <tr>
                            <td>Ads Fee</td>
                            <td class="deduction-source">Gasto en publicidad</td>
                            <td class="negative">-€{order['ads_fee']:.2f}</td>
                        </tr>
"""
        
        if order['marketing_fees'] > 0:
            html += f"""
                        <tr>
                            <td>Marketing Fees</td>
                            <td class="deduction-source">Tarifas de marketing</td>
                            <td class="negative">-€{order['marketing_fees']:.2f}</td>
                        </tr>
"""
        
        total_deductions = order['service_fee'] + order['commission'] + order['ads_fee'] + order['marketing_fees']
        
        html += f"""
                        <tr class="total">
                            <td>TOTAL DEDUCCIONES</td>
                            <td></td>
                            <td>-€{total_deductions:.2f}</td>
                        </tr>
                        <tr class="total">
                            <td>ESTIMATED EARNINGS</td>
                            <td>Ventas - Deducciones</td>
                            <td>€{order['estimated_earnings']:.2f}</td>
                        </tr>
                    </tbody>
                </table>
                
                <table class="items-table">
                    <thead>
                        <tr>
                            <th>Items</th>
                        </tr>
                    </thead>
                    <tbody>
"""
        
        for item in order['items']:
            html += f"""
                        <tr>
                            <td>{item}</td>
                        </tr>
"""
        
        html += f"""
                    </tbody>
                </table>
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
    print("GENERANDO ANALISIS DE COSTOS POR PEDIDO")
    print("="*80)
    print()
    
    # Load data
    uber_item_data = load_uber_item_level()
    uber_payment_data = load_uber_payment()
    glovo_data = load_glovo_details()
    
    # Analyze orders
    uber_orders = analyze_uber_orders(uber_item_data)
    glovo_orders = analyze_glovo_orders(glovo_data)
    
    # Generate HTML
    html = generate_professional_html(uber_orders, glovo_orders)
    
    # Save HTML
    output_file = "/Users/alexismurillo/gula-intel/CALCULATOR/cost_analysis.html"
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write(html)
    
    print(f"\nAnalisis de Costos generado: {output_file}")

if __name__ == "__main__":
    main()
