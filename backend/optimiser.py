import pandas as pd
import numpy as np
from typing import Dict, List, Tuple, Optional
from algorithms.rectpack_algorithm import optimise_rectpack
from algorithms.simple_algorithm import optimise_simple

def is_small_item(length_in, width_in, height_in, weight_lb, description=""):
    """
    Analyze if an item is small enough to be a toss bin candidate.
    Returns analysis dictionary with score and recommendation.
    """
    # Calculate volume in cubic inches
    volume = length_in * width_in * height_in
    
    # Calculate surface area in square inches
    surface_area = 2 * (length_in * width_in + length_in * height_in + width_in * height_in)
    
    # Calculate longest dimension
    longest_dim = max(length_in, width_in, height_in)
    
    # Scoring criteria (lower score = better toss bin candidate)
    score = 0
    
    # Volume-based scoring (smaller is better)
    if volume < 100:  # Very small items
        score += 0
    elif volume < 500:  # Small items
        score += 1
    elif volume < 1000:  # Medium items
        score += 2
    else:  # Large items
        score += 3
    
    # Weight-based scoring (lighter is better)
    if weight_lb < 1:  # Very light
        score += 0
    elif weight_lb < 5:  # Light
        score += 1
    elif weight_lb < 10:  # Medium
        score += 2
    else:  # Heavy
        score += 3
    
    # Dimension-based scoring (smaller dimensions are better)
    if longest_dim < 6:  # Very small
        score += 0
    elif longest_dim < 12:  # Small
        score += 1
    elif longest_dim < 18:  # Medium
        score += 2
    else:  # Large
        score += 3
    
    # Surface area to volume ratio (higher ratio = more complex shape = better for toss bin)
    if surface_area / volume > 3:  # Complex shapes
        score -= 1
    elif surface_area / volume < 1.5:  # Simple shapes
        score += 1
    
    # Description-based hints
    if description:
        desc_lower = description.lower()
        if any(word in desc_lower for word in ['small', 'tiny', 'mini', 'micro', 'nano']):
            score -= 1
        if any(word in desc_lower for word in ['large', 'big', 'huge', 'bulky', 'heavy']):
            score += 2
    
    # Determine if it's a toss bin candidate
    is_toss_bin_candidate = score <= 3  # Low score = good candidate
    
    return {
        'is_toss_bin_candidate': is_toss_bin_candidate,
        'score': score,
        'volume': volume,
        'surface_area': surface_area,
        'longest_dimension': longest_dim,
        'surface_to_volume_ratio': surface_area / volume if volume > 0 else 0
    }

def optimise(df: pd.DataFrame, model="simple", **kw):
    """
    Main optimization function - supports multiple algorithms
    """
    print(f"[MAIN] Using {model} optimizer")
    print(f"[MAIN] Input DataFrame shape: {df.shape}")
    print(f"[MAIN] Input DataFrame columns: {list(df.columns)}")
    print(f"[MAIN] Input DataFrame sample:")
    print(df.head())
    
    # Check for NaN values in critical columns
    critical_columns = ['sku_id', 'width_in', 'length_in', 'height_in', 'weight_lb']
    for col in critical_columns:
        if col in df.columns:
            nan_count = df[col].isna().sum()
            if nan_count > 0:
                print(f"[MAIN] Warning: {nan_count} NaN values found in {col}")
        else:
            print(f"[MAIN] Warning: Missing column {col}")
    
    if model == "rectpack" or model == "maximal-rectangles":
        return optimise_rectpack(df, **kw)
    elif model == "simple":
        return optimise_simple(df, **kw)
    else:
        print(f"[MAIN] Unknown model '{model}', defaulting to simple optimizer")
        return optimise_simple(df, **kw)

def calculate_kpis(plan_df, tray_length_in, tray_width_in, tray_depth_in, weight_limit_lb):
    """
    Calculate KPIs for the optimization plan
    """
    print(f"[KPIs] Calculating KPIs for {len(plan_df)} SKUs")
    
    # Basic tray utilization
    total_trays = plan_df['trays_needed'].max() if 'trays_needed' in plan_df.columns else 1
    tray_area = tray_length_in * tray_width_in
    tray_volume = tray_area * tray_depth_in
    
    # Calculate total slot area used
    total_slot_area = 0
    total_slot_volume = 0
    total_units = 0
    
    for _, row in plan_df.iterrows():
        slot_area = row.get('slot_width_in', 0) * row.get('slot_length_in', 0)
        slot_volume = slot_area * row.get('layers', 1)
        units = row.get('on_shelf_units', 0)
        
        total_slot_area += slot_area
        total_slot_volume += slot_volume
        total_units += units
    
    # Utilization metrics
    area_utilization = (total_slot_area / (total_trays * tray_area)) * 100 if total_trays > 0 else 0
    volume_utilization = (total_slot_volume / (total_trays * tray_volume)) * 100 if total_trays > 0 else 0
    
    # Weight analysis
    total_weight = 0
    for _, row in plan_df.iterrows():
        units = row.get('on_shelf_units', 0)
        weight_per_unit = row.get('weight_lb', 0)
        total_weight += units * weight_per_unit
    
    weight_utilization = (total_weight / (total_trays * weight_limit_lb)) * 100 if total_trays > 0 else 0
    
    kpis = {
        'total_trays': int(total_trays),
        'total_units': int(total_units),
        'total_weight_lb': round(total_weight, 2),
        'area_utilization_pct': round(area_utilization, 1),
        'volume_utilization_pct': round(volume_utilization, 1),
        'weight_utilization_pct': round(weight_utilization, 1),
        'avg_units_per_tray': round(total_units / total_trays, 1) if total_trays > 0 else 0,
        'toss_bin_candidates': int(plan_df.get('is_toss_bin_candidate', pd.Series([False] * len(plan_df))).sum())
    }
    
    print(f"[KPIs] KPIs calculated successfully")
    return kpis

def calculate_divider_kpis(df_result, tray_length_in, tray_width_in, tray_depth_in, buffer_pct=0.95):
    """
    Calculate divider-specific KPIs
    """
    print(f"[DIVIDER KPIs] Calculating divider KPIs")
    
    # Convert to JSON-serializable format
    def convert_numpy(obj):
        if isinstance(obj, np.integer):
            return int(obj)
        elif isinstance(obj, np.floating):
            return float(obj)
        elif isinstance(obj, np.ndarray):
            return obj.tolist()
        elif isinstance(obj, pd.Series):
            return obj.tolist()
        elif pd.isna(obj):
            return None
        elif isinstance(obj, (int, float)) and np.isnan(obj):
            return None
        elif isinstance(obj, (int, float)) and np.isinf(obj):
            return None
        return obj
    
    # Calculate basic metrics
    total_skus = len(df_result)
    
    # Handle NaN values in trays_needed
    if 'trays_needed' in df_result.columns:
        trays_needed_series = df_result['trays_needed'].fillna(1)
        total_trays = trays_needed_series.max() if len(trays_needed_series) > 0 else 1
    else:
        total_trays = 1
    
    # Slot utilization
    total_slot_area = 0
    total_tray_area = total_trays * tray_length_in * tray_width_in * (buffer_pct ** 2)
    
    for _, row in df_result.iterrows():
        slot_width = row.get('slot_width_in', 0)
        slot_length = row.get('slot_length_in', 0)
        
        # Handle NaN values
        if pd.isna(slot_width) or pd.isna(slot_length):
            slot_width = 0
            slot_length = 0
            
        total_slot_area += slot_width * slot_length
    
    area_utilization = (total_slot_area / total_tray_area) * 100 if total_tray_area > 0 else 0
    
    # Toss bin analysis
    toss_bin_candidates = df_result.get('is_toss_bin_candidate', pd.Series([False] * len(df_result))).sum()
    toss_bin_pct = (toss_bin_candidates / total_skus) * 100 if total_skus > 0 else 0
    
    # Layer analysis - handle NaN values
    layers_series = df_result.get('layers', pd.Series([1] * len(df_result)))
    layers_series = layers_series.fillna(1)  # Replace NaN with 1
    avg_layers = layers_series.mean()
    max_layers = layers_series.max()
    
    # Calculate additional KPIs for frontend compatibility - handle NaN values
    slot_width_series = df_result.get('slot_width_in', pd.Series([0] * len(df_result)))
    slot_width_series = slot_width_series.fillna(0)  # Replace NaN with 0
    avg_slot_width = slot_width_series.mean() if len(df_result) > 0 else 0
    
    slot_length_series = df_result.get('slot_length_in', pd.Series([0] * len(df_result)))
    slot_length_series = slot_length_series.fillna(0)  # Replace NaN with 0
    avg_slot_length = slot_length_series.mean() if len(df_result) > 0 else 0
    
    on_shelf_series = df_result.get('on_shelf_units', pd.Series([0] * len(df_result)))
    on_shelf_series = on_shelf_series.fillna(0)  # Replace NaN with 0
    total_units = on_shelf_series.sum() if len(df_result) > 0 else 0
    
    kpis = {
        'total_skus': int(total_skus),
        'total_trays': int(total_trays),
        'area_utilization_pct': round(area_utilization, 1),
        'toss_bin_candidates': int(toss_bin_candidates),
        'toss_bin_pct': round(toss_bin_pct, 1),
        'avg_layers': round(avg_layers, 1),
        'max_layers': int(max_layers),
        'tray_dimensions': f"{tray_length_in}x{tray_width_in}x{tray_depth_in}",
        'buffer_pct': buffer_pct * 100,
        # Additional KPIs for frontend compatibility
        'total_slot_area': round(total_slot_area, 1),
        'effective_tray_area': round(total_tray_area, 1),
        'avg_slot_width': round(avg_slot_width, 1),
        'avg_slot_length': round(avg_slot_length, 1),
        'total_units': int(total_units),
        'area_utilization': round(area_utilization, 1)
    }
    
    # Convert all values to JSON-serializable format
    kpis = {k: convert_numpy(v) for k, v in kpis.items()}
    
    print(f"[DIVIDER KPIs] KPIs calculated successfully")
    return kpis

def classify_sku_tiers(df, tray_width, tray_length, buffer_pct=0.95):
    """
    Classify SKUs into tiers based on size and complexity
    """
    print(f"[TIERS] Classifying {len(df)} SKUs into tiers")
    
    # Calculate effective tray dimensions
    W_eff = tray_width * buffer_pct
    L_eff = tray_length * buffer_pct
    
    # Determine quantity column
    if 'on_shelf_units' in df.columns:
        quantity_col = 'on_shelf_units'
    elif 'on_hand_units' in df.columns:
        quantity_col = 'on_hand_units'
    else:
        quantity_col = 'annual_units_sold'
    
    # Simple tier classification
    tiers = []
    for _, row in df.iterrows():
        # Check if SKU fits in tray
        if row['width_in'] > W_eff or row['length_in'] > L_eff:
            tier = 'oversized'
        elif row['width_in'] < 6 and row['length_in'] < 6 and row['height_in'] < 6:
            tier = 'small'
        elif row['width_in'] < 12 and row['length_in'] < 12 and row['height_in'] < 12:
            tier = 'medium'
        else:
            tier = 'large'
        
        tiers.append(tier)
    
    df_tiered = df.copy()
    df_tiered['tier'] = tiers
    
    # Count tiers
    tier_counts = df_tiered['tier'].value_counts()
    print(f"[TIERS] Tier distribution: {dict(tier_counts)}")
    
    return df_tiered

def handle_small_skus(small_skus_df, tray_width, tray_length, buffer_pct=0.95):
    """
    Handle small SKUs with simple approach
    """
    print(f"[SMALL SKUs] Handling {len(small_skus_df)} small SKUs")
    
    # Use the simple optimizer for small SKUs too
    result_df = optimise_simple(small_skus_df, tray_width, tray_length, 18, buffer_pct)
    
    print(f"[SMALL SKUs] Small SKU optimization complete")
    return result_df 