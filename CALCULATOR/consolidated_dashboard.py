#!/usr/bin/env python3
"""
Consolidated Dashboard for Uber Eats and Glovo Data
Generates a financial statement style dashboard combining data from both platforms
"""

import csv
from datetime import datetime
from collections import defaultdict
import os

# File paths
BASE_DIR = "/Users/alexismurillo/gula-intel/CALCULATOR/GLOVO Y UBER"
UBER_PAYMENT_DETAILS = f"{BASE_DIR}/UBER EATS/PAYMENT DETAILS UBER EATS (4 STORES).csv"
UBER_PAYOUT_SUMMARY = f"{BASE_DIR}/UBER EATS/PAYOUT SUMMARY UBER EATS (4 STORES).csv"
GLOVO_ORDER_DETAILS = f"{BASE_DIR}/GLOVO/GLOBO ORDER DETAILS (4 STORES).csv"
GLOVO_PERFORMANCE_SUMMARY = f"{BASE_DIR}/GLOVO/GLOVO PERFORMANCE SUMMARY.csv"

def load_csv(filepath, skip_header=False):
    """Load CSV file and return list of dictionaries"""
    data = []
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            if skip_header:
                # Skip first row (long descriptions), use second row as headers
                f.readline()  # Skip first line
                reader = csv.DictReader(f)
            else:
                reader = csv.DictReader(f)
            for row in reader:
                data.append(row)
        return data
    except Exception as e:
        print(f"  - Error loading {filepath}: {e}")
        return []

def load_uber_data():
    """Load Uber Eats payment details and payout summary"""
    print("Loading Uber Eats data...")
    
    uber_payment = load_csv(UBER_PAYMENT_DETAILS, skip_header=True)
    print(f"  - Uber Payment Details: {len(uber_payment)} rows")
    
    uber_payout = load_csv(UBER_PAYOUT_SUMMARY, skip_header=True)
    print(f"  - Uber Payout Summary: {len(uber_payout)} rows")
    
    return uber_payment, uber_payout

def load_glovo_data():
    """Load Glovo order details and performance summary"""
    print("Loading Glovo data...")
    
    glovo_orders = load_csv(GLOVO_ORDER_DETAILS)
    print(f"  - Glovo Order Details: {len(glovo_orders)} rows")
    
    glovo_performance = load_csv(GLOVO_PERFORMANCE_SUMMARY)
    print(f"  - Glovo Performance Summary: {len(glovo_performance)} rows")
    
    return glovo_orders, glovo_performance

def parse_float(value):
    """Parse string to float, handling various formats"""
    if value is None or value == '':
        return 0.0
    try:
        # Remove currency symbols and commas
        cleaned = str(value).replace('€', '').replace(',', '').replace('$', '').strip()
        return float(cleaned)
    except:
        return 0.0

def process_uber_data(payment_data, payout_data):
    """Process Uber Eats data for consolidation"""
    if not payment_data:
        return []
    
    print("Processing Uber Eats data...")
    print(f"  Sample row keys: {list(payment_data[0].keys())[:10]}")
    
    # Aggregate by store and date
    aggregated = defaultdict(lambda: {'orders': 0, 'sales': 0.0, 'commission': 0.0, 'payout': 0.0})
    
    for row in payment_data:
        # Use the correct column names from the second header row
        store = row.get('Store Name', row.get('store_name', 'Unknown'))
        date_str = row.get('Order Date', row.get('Order date', ''))
        
        # Parse date (format: "4/30/26" or "5/1/26")
        try:
            if '/' in date_str:
                parts = date_str.split('/')
                if len(parts) == 3:
                    # Convert MM/DD/YY to YYYY-MM-DD
                    month, day, year = parts
                    year = f"20{year}" if len(year) == 2 else year
                    date = f"{year}-{month.zfill(2)}-{day.zfill(2)}"
                else:
                    date = date_str
            else:
                date = date_str
        except:
            date = date_str
        
        # Use correct column names
        sales = parse_float(row.get('Sales (incl. VAT)', row.get('Sales (incl VAT)', 0)))
        commission = parse_float(row.get('Marketplace Fee after discount (incl VAT)', 
                                     row.get('Marketplace Fee after discount (incl VAT)', 0)))
        payout = parse_float(row.get('Total payout', row.get('Total payout ', 0)))
        
        key = (store, date)
        aggregated[key]['orders'] += 1
        aggregated[key]['sales'] += sales
        aggregated[key]['commission'] += commission
        aggregated[key]['payout'] += payout
    
    # Convert to list of dicts
    result = []
    for (store, date), metrics in aggregated.items():
        result.append({
            'Store': store,
            'Date': date,
            'Orders': metrics['orders'],
            'Sales': metrics['sales'],
            'Commission': metrics['commission'],
            'Net Payout': metrics['payout'],
            'Platform': 'Uber Eats'
        })
    
    return result

def process_glovo_data(orders_data, performance_data):
    """Process Glovo data for consolidation"""
    if not orders_data:
        return []
    
    print("Processing Glovo data...")
    if orders_data:
        print(f"  Sample row keys: {list(orders_data[0].keys())[:15]}")
    
    # Aggregate by store and date
    aggregated = defaultdict(lambda: {'orders': 0, 'sales': 0.0, 'commission': 0.0, 'payout': 0.0})
    
    for row in orders_data:
        # Use column names from the CSV
        store = row.get('Restaurant name', row.get('\ufeffRestaurant name', 'Unknown'))
        date_str = row.get('Order received at', row.get('Order Received At', ''))
        
        # Parse date (format: "2026-05-01 14:49")
        try:
            if 'T' in date_str:
                date = date_str.split('T')[0]
            elif ' ' in date_str:
                date = date_str.split(' ')[0]
            else:
                date = date_str
        except:
            date = date_str
        
        # Based on actual CSV structure:
        # Column 16 (index 15): Subtotal - total sales
        # Column 24 (index 23): Commission
        # Column 30 (index 29): Estimated earnings (this is the payout)
        # Column 32 (index 31): Payout Amount (might be empty)
        fields = list(row.values())
        sales = parse_float(fields[15] if len(fields) > 15 else 0)
        commission = parse_float(fields[23] if len(fields) > 23 else 0)
        
        # Try Estimated earnings first, then Payout Amount, then calculate as Sales - Commission
        payout = parse_float(fields[29] if len(fields) > 29 else 0)
        if payout == 0:
            payout = parse_float(fields[31] if len(fields) > 31 else 0)
        if payout == 0:
            payout = sales - commission
        
        key = (store, date)
        aggregated[key]['orders'] += 1
        aggregated[key]['sales'] += sales
        aggregated[key]['commission'] += commission
        aggregated[key]['payout'] += payout
    
    # Convert to list of dicts
    result = []
    for (store, date), metrics in aggregated.items():
        result.append({
            'Store': store,
            'Date': date,
            'Orders': metrics['orders'],
            'Sales': metrics['sales'],
            'Commission': metrics['commission'],
            'Net Payout': metrics['payout'],
            'Platform': 'Glovo'
        })
    
    return result

def create_financial_statement(uber_data, glovo_data):
    """Create consolidated financial statement"""
    print("Creating consolidated financial statement...")
    
    # Combine both platforms
    combined = uber_data + glovo_data
    
    if not combined:
        print("No data available for consolidation")
        return None
    
    # Calculate average order value
    for row in combined:
        if row['Orders'] > 0:
            row['Avg Order Value'] = row['Sales'] / row['Orders']
        else:
            row['Avg Order Value'] = 0.0
    
    # Sort by date
    combined.sort(key=lambda x: x['Date'])
    
    return combined

def aggregate_by_field(data, field):
    """Aggregate data by a specific field"""
    result = defaultdict(lambda: {'orders': 0, 'sales': 0.0, 'commission': 0.0, 'payout': 0.0})
    
    for row in data:
        key = row.get(field, 'Unknown')
        result[key]['orders'] += row['Orders']
        result[key]['sales'] += row['Sales']
        result[key]['commission'] += row['Commission']
        result[key]['payout'] += row['Net Payout']
    
    return result

def aggregate_by_platform_store(data):
    """Aggregate data by platform and store"""
    result = defaultdict(lambda: {'orders': 0, 'sales': 0.0, 'commission': 0.0, 'payout': 0.0})
    
    for row in data:
        key = (row['Platform'], row['Store'])
        result[key]['orders'] += row['Orders']
        result[key]['sales'] += row['Sales']
        result[key]['commission'] += row['Commission']
        result[key]['payout'] += row['Net Payout']
    
    return result

def generate_summary_stats(combined_data):
    """Generate summary statistics"""
    if not combined_data:
        return None, None, None, None
    
    print("\n" + "="*80)
    print("CONSOLIDATED FINANCIAL STATEMENT - UBER EATS & GLOVO")
    print("="*80)
    print(f"\nPeriod: May 1-11, 2026")
    print(f"Total Records: {len(combined_data)}")
    
    # Overall summary
    print("\n" + "-"*80)
    print("OVERALL SUMMARY")
    print("-"*80)
    
    total_sales = sum(row['Sales'] for row in combined_data)
    total_orders = sum(row['Orders'] for row in combined_data)
    total_commission = sum(row['Commission'] for row in combined_data)
    total_payout = sum(row['Net Payout'] for row in combined_data)
    avg_order = total_sales / total_orders if total_orders > 0 else 0
    comm_pct = total_commission / total_sales * 100 if total_sales > 0 else 0
    
    print(f"Total Sales:           €{total_sales:,.2f}")
    print(f"Total Orders:          {total_orders:,.0f}")
    print(f"Total Commission:     €{total_commission:,.2f} ({comm_pct:.1f}%)")
    print(f"Total Net Payout:      €{total_payout:,.2f}")
    print(f"Average Order Value:   €{avg_order:.2f}")
    
    # By Platform
    print("\n" + "-"*80)
    print("BY PLATFORM")
    print("-"*80)
    
    platform_agg = aggregate_by_field(combined_data, 'Platform')
    platform_summary = []
    
    for platform, metrics in sorted(platform_agg.items()):
        avg_order = metrics['sales'] / metrics['orders'] if metrics['orders'] > 0 else 0
        comm_pct = metrics['commission'] / metrics['sales'] * 100 if metrics['sales'] > 0 else 0
        print(f"\n{platform}:")
        print(f"  Sales:       €{metrics['sales']:,.2f}")
        print(f"  Orders:      {metrics['orders']:,.0f}")
        print(f"  Commission:  €{metrics['commission']:,.2f} ({comm_pct:.1f}%)")
        print(f"  Net Payout:  €{metrics['payout']:,.2f}")
        print(f"  Avg Order:   €{avg_order:.2f}")
        platform_summary.append({
            'Platform': platform,
            'Sales': metrics['sales'],
            'Orders': metrics['orders'],
            'Commission': metrics['commission'],
            'Net Payout': metrics['payout']
        })
    
    # By Store
    print("\n" + "-"*80)
    print("BY STORE")
    print("-"*80)
    
    store_agg = aggregate_by_platform_store(combined_data)
    store_summary = []
    
    for (platform, store), metrics in sorted(store_agg.items(), key=lambda x: x[1]['sales'], reverse=True):
        avg_order = metrics['sales'] / metrics['orders'] if metrics['orders'] > 0 else 0
        comm_pct = metrics['commission'] / metrics['sales'] * 100 if metrics['sales'] > 0 else 0
        print(f"\n{platform} - {store}:")
        print(f"  Sales:       €{metrics['sales']:,.2f}")
        print(f"  Orders:      {metrics['orders']:,.0f}")
        print(f"  Commission:  €{metrics['commission']:,.2f} ({comm_pct:.1f}%)")
        print(f"  Net Payout:  €{metrics['payout']:,.2f}")
        print(f"  Avg Order:   €{avg_order:.2f}")
        store_summary.append({
            'Platform': platform,
            'Store': store,
            'Sales': metrics['sales'],
            'Orders': metrics['orders'],
            'Commission': metrics['commission'],
            'Net Payout': metrics['payout']
        })
    
    # By Date
    print("\n" + "-"*80)
    print("DAILY BREAKDOWN")
    print("-"*80)
    
    date_agg = aggregate_by_field(combined_data, 'Date')
    daily_summary = []
    
    for date, metrics in sorted(date_agg.items()):
        avg_order = metrics['sales'] / metrics['orders'] if metrics['orders'] > 0 else 0
        comm_pct = metrics['commission'] / metrics['sales'] * 100 if metrics['sales'] > 0 else 0
        print(f"\n{date}:")
        print(f"  Sales:       €{metrics['sales']:,.2f}")
        print(f"  Orders:      {metrics['orders']:,.0f}")
        print(f"  Commission:  €{metrics['commission']:,.2f} ({comm_pct:.1f}%)")
        print(f"  Net Payout:  €{metrics['payout']:,.2f}")
        print(f"  Avg Order:   €{avg_order:.2f}")
        daily_summary.append({
            'Date': date,
            'Sales': metrics['sales'],
            'Orders': metrics['orders'],
            'Commission': metrics['commission'],
            'Net Payout': metrics['payout']
        })
    
    return combined_data, platform_summary, store_summary, daily_summary

def save_to_csv(data, filepath):
    """Save data to CSV file"""
    if not data:
        return
    
    fieldnames = list(data[0].keys())
    with open(filepath, 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(data)
    print(f"Saved: {filepath}")

def save_consolidated_data(combined_data, platform_summary, store_summary, daily_summary):
    """Save consolidated data to CSV files"""
    output_dir = "/Users/alexismurillo/gula-intel/CALCULATOR/CONSOLIDATED"
    os.makedirs(output_dir, exist_ok=True)
    
    if combined_data:
        save_to_csv(combined_data, f"{output_dir}/consolidated_daily_data.csv")
    
    if platform_summary:
        save_to_csv(platform_summary, f"{output_dir}/platform_summary.csv")
    
    if store_summary:
        save_to_csv(store_summary, f"{output_dir}/store_summary.csv")
    
    if daily_summary:
        save_to_csv(daily_summary, f"{output_dir}/daily_summary.csv")

def main():
    """Main execution function"""
    print("="*80)
    print("UBER EATS & GLOVO CONSOLIDATED DASHBOARD")
    print("="*80)
    print()
    
    # Load data
    uber_payment, uber_payout = load_uber_data()
    glovo_orders, glovo_performance = load_glovo_data()
    
    # Process data
    uber_processed = process_uber_data(uber_payment, uber_payout)
    glovo_processed = process_glovo_data(glovo_orders, glovo_performance)
    
    # Create financial statement
    combined_data = create_financial_statement(uber_processed, glovo_processed)
    
    # Generate and display summary
    if combined_data:
        combined_data, platform_summ, store_summ, daily_summ = generate_summary_stats(combined_data)
        
        # Save to files
        save_consolidated_data(combined_data, platform_summ, store_summ, daily_summ)
    else:
        print("\nNo data to process")

if __name__ == "__main__":
    main()
