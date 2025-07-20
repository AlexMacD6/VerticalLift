import pandas as pd
import numpy as np
import cvxpy as cp
from typing import Dict, List, Tuple, Optional
import json
from algorithms import (
    optimise_rectpack,
    optimise_simple,
    optimise_cvxpy_continuous,
    optimise_cvxpy_discrete
)

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

def optimise_simple(df: pd.DataFrame, tray_width_in: float = 36, tray_length_in: float = 156, tray_depth_in: float = 18, buffer_pct: float = 0.95, **kw):
    """
    Simple optimizer following the straightforward approach:
    1. Calculate vertical layers
    2. Calculate slot dimensions with 1-inch snap
    3. Greedy row packing
    4. Summarize results
    """
    print(f"[SIMPLE OPTIMIZER] Starting optimization with {len(df)} SKUs")
    print(f"[SIMPLE OPTIMIZER] Tray dimensions: {tray_width_in}x{tray_length_in}x{tray_depth_in}")
    print(f"[SIMPLE OPTIMIZER] Buffer: {buffer_pct*100}%")
    
    # Determine quantity column
    if 'on_shelf_units' in df.columns:
        quantity_col = 'on_shelf_units'
        print(f"[SIMPLE OPTIMIZER] Using 'on_shelf_units' for quantities")
    elif 'on_hand_units' in df.columns:
        quantity_col = 'on_hand_units'
        print(f"[SIMPLE OPTIMIZER] Using 'on_hand_units' for quantities")
    else:
        quantity_col = 'annual_units_sold'
        print(f"[SIMPLE OPTIMIZER] Using 'annual_units_sold' for quantities")
    
    # Create working copy
    df_work = df.copy()
    
    # Ensure required columns exist
    required_columns = ['sku_id', 'width_in', 'length_in', 'height_in', 'weight_lb']
    missing_columns = [col for col in required_columns if col not in df_work.columns]
    if missing_columns:
        raise ValueError(f"Missing required columns: {missing_columns}")
    
    # Check if individual SKUs fit in tray
    effective_tray_width = tray_width_in * buffer_pct
    effective_tray_length = tray_length_in * buffer_pct
    
    oversized_skus = df_work[(df_work["width_in"] > effective_tray_width) | (df_work["length_in"] > effective_tray_length)]
    if not oversized_skus.empty:
        oversized_list = oversized_skus["sku_id"].tolist()
        raise ValueError(f"SKUs {oversized_list} are too large for tray: individual dimensions exceed {effective_tray_width:.1f}x{effective_tray_length:.1f}")
    
    # 1. Analyze all three dimensions to determine optimal height orientation
    effective_tray_depth = tray_depth_in * buffer_pct
    
    # Calculate layers for each possible height orientation
    layers_height = np.maximum(1, effective_tray_depth // df_work.height_in)
    layers_width = np.maximum(1, effective_tray_depth // df_work.width_in)
    layers_length = np.maximum(1, effective_tray_depth // df_work.length_in)
    
    # Determine which dimension should be used for height (vertical stacking)
    # Choose the dimension that gives the most layers
    height_orientation = []
    layers_list = []
    grid_dim1_list = []
    grid_dim2_list = []
    
    for i in range(len(df_work)):
        height_layers = layers_height.iloc[i]
        width_layers = layers_width.iloc[i]
        length_layers = layers_length.iloc[i]
        
        # Calculate height efficiency for all dimensions
        height_dim = df_work.iloc[i]["height_in"]
        width_dim = df_work.iloc[i]["width_in"]
        length_dim = df_work.iloc[i]["length_in"]
        
        # Calculate height efficiency (how much of available height is used)
        height_efficiency = (height_layers * height_dim) / effective_tray_depth
        width_efficiency = (width_layers * width_dim) / effective_tray_depth
        length_efficiency = (length_layers * length_dim) / effective_tray_depth
        
        # Choose the dimension with highest height efficiency
        if height_efficiency >= width_efficiency and height_efficiency >= length_efficiency:
            # Height gives highest efficiency
            height_orientation.append("height")
            layers_list.append(height_layers)
            grid_dim1_list.append(width_dim)
            grid_dim2_list.append(length_dim)
        elif width_efficiency >= height_efficiency and width_efficiency >= length_efficiency:
            # Width gives highest efficiency
            height_orientation.append("width")
            layers_list.append(width_layers)
            grid_dim1_list.append(height_dim)
            grid_dim2_list.append(length_dim)
        else:
            # Length gives highest efficiency
            height_orientation.append("length")
            layers_list.append(length_layers)
            grid_dim1_list.append(height_dim)
            grid_dim2_list.append(width_dim)
    
    df_work["layers"] = layers_list
    df_work["height_orientation"] = height_orientation
    df_work["grid_dim1"] = grid_dim1_list
    df_work["grid_dim2"] = grid_dim2_list
    
    # Calculate units per layer
    df_work["units_per_layer"] = np.ceil(df_work[quantity_col] / df_work.layers).astype(int)
    
    # Check for invalid values and fix them
    invalid_layers = df_work["layers"].isna() | (df_work["layers"] <= 0)
    invalid_units = df_work["units_per_layer"].isna() | (df_work["units_per_layer"] <= 0)
    
    if invalid_layers.any():
        df_work.loc[invalid_layers, "layers"] = 1
    
    if invalid_units.any():
        df_work.loc[invalid_units, "units_per_layer"] = 1
    
    print(f"[SIMPLE OPTIMIZER] Layer calculations complete")
    print(f"[SIMPLE OPTIMIZER] Average layers per SKU: {df_work.layers.mean():.1f}")
    print(f"[SIMPLE OPTIMIZER] Average units per layer: {df_work.units_per_layer.mean():.1f}")
    
    # 2. Calculate slot dimensions with 1-inch snap and bounds checking
    effective_tray_width = tray_width_in * buffer_pct
    effective_tray_length = tray_length_in * buffer_pct
    
    # Calculate slot dimensions using the optimal 2D grid dimensions
    try:
        df_work["slot_w_in"] = np.ceil(np.sqrt(df_work.units_per_layer) * df_work.grid_dim1)
        df_work["slot_l_in"] = np.ceil(np.sqrt(df_work.units_per_layer) * df_work.grid_dim2)
        
        # Track which dimensions are used for 2D grid optimization
        df_work["grid_dimensions"] = df_work["height_orientation"].apply(
            lambda x: "width × length" if x == "height" else 
                     "height × length" if x == "width" else "height × width"
        )
    except Exception as e:
        # Fallback to simple 1x1 slots if calculation fails
        df_work["slot_w_in"] = df_work.grid_dim1
        df_work["slot_l_in"] = df_work.grid_dim2
        df_work["grid_dimensions"] = df_work["height_orientation"].apply(
            lambda x: "width × length" if x == "height" else 
                     "height × length" if x == "width" else "height × width"
        )
    
    # Check if any slots are too large and adjust
    oversized_slots = (df_work["slot_w_in"] > effective_tray_width) | (df_work["slot_l_in"] > effective_tray_length)
    
    if oversized_slots.any():
        print(f"[SIMPLE OPTIMIZER] Found {oversized_slots.sum()} oversized slots, adjusting...")
        
        for idx in df_work[oversized_slots].index:
            row = df_work.loc[idx]
            units_needed = row["units_per_layer"]
            grid_dim1 = row["grid_dim1"]
            grid_dim2 = row["grid_dim2"]
            
            # Try to find a better arrangement that fits
            # Calculate how many units can fit in the 2D grid dimensions
            max_units_width = int(effective_tray_width / grid_dim1) if grid_dim1 > 0 else 1
            max_units_length = int(effective_tray_length / grid_dim2) if grid_dim2 > 0 else 1
            
            # Find the best arrangement
            best_width = 1
            best_length = 1
            best_area = float('inf')
            
            for w in range(1, min(max_units_width + 1, int(np.sqrt(units_needed)) + 10)):
                for l in range(1, min(max_units_length + 1, int(np.sqrt(units_needed)) + 10)):
                    if w * l >= units_needed:
                        area = w * grid_dim1 * l * grid_dim2
                        if area < best_area:
                            best_area = area
                            best_width = w
                            best_length = l
            
            # Update slot dimensions
            df_work.loc[idx, "slot_w_in"] = best_width * grid_dim1
            df_work.loc[idx, "slot_l_in"] = best_length * grid_dim2
            
            print(f"[SIMPLE OPTIMIZER] SKU {row['sku_id']}: adjusted slot to {best_width * grid_dim1:.1f}x{best_length * grid_dim2:.1f} for {units_needed} units")
    
    # Final bounds check
    oversized_after_adjustment = (df_work["slot_w_in"] > effective_tray_width) | (df_work["slot_l_in"] > effective_tray_length)
    if oversized_after_adjustment.any():
        oversized_skus = df_work[oversized_after_adjustment]["sku_id"].tolist()
        raise ValueError(f"SKUs {oversized_skus} still too large for tray after adjustment. Consider reducing quantities or using larger trays.")
    
    print(f"[SIMPLE OPTIMIZER] Slot dimension calculations complete")
    print(f"[SIMPLE OPTIMIZER] Average slot width: {df_work.slot_w_in.mean():.1f}")
    print(f"[SIMPLE OPTIMIZER] Average slot length: {df_work.slot_l_in.mean():.1f}")
    
    # 3. Greedy row packing
    # Ensure required columns exist
    if "slot_w_in" not in df_work.columns or "slot_l_in" not in df_work.columns:
        # Fallback: use original dimensions
        df_work["slot_w_in"] = df_work.width_in
        df_work["slot_l_in"] = df_work.length_in
    
    slots = df_work.sort_values("slot_l_in", ascending=False)[
              ["sku_id", "slot_w_in", "slot_l_in"]].to_records(index=False)
    
    layout = []
    tray, x, y, row_h = 1, 0, 0, 0
    
    for sku, w, l in slots:
        # Double-check slot dimensions (should already be validated above)
        if w > effective_tray_width or l > effective_tray_length:
            raise ValueError(f"SKU {sku} slot too big for tray: {w:.1f}x{l:.1f} vs {effective_tray_width:.1f}x{effective_tray_length:.1f}")
        
        # Check if we need a new row
        if x + w > effective_tray_width:
            y += row_h
            x, row_h = 0, 0
        
        # Check if we need a new tray
        if y + l > effective_tray_length:
            tray += 1
            x = y = row_h = 0
        
        layout.append((sku, tray, x, y, w, l))
        x += w
        row_h = max(row_h, l)
    
    layout_df = pd.DataFrame(layout, columns=["sku_id", "tray", "x_in", "y_in", "slot_w_in", "slot_l_in"])
    
    # Ensure layout_df has all required columns
    if layout_df.empty:
        raise ValueError("No layout generated - check if all SKUs fit in tray")
    
    print(f"[SIMPLE OPTIMIZER] Layout packing complete")
    print(f"[SIMPLE OPTIMIZER] {layout_df.tray.max()} trays required")
    
    # 4. Merge layout with original data and add compatibility columns
    # First, rename layout_df columns to avoid conflicts
    layout_df_renamed = layout_df.rename(columns={
        "slot_w_in": "layout_slot_w_in",
        "slot_l_in": "layout_slot_l_in"
    })
    
    result_df = df_work.merge(layout_df_renamed, on="sku_id", how="left")
    
    # Add compatibility columns
    result_df["slot_width_in"] = result_df["layout_slot_w_in"]
    result_df["slot_length_in"] = result_df["layout_slot_l_in"]
    result_df["layer_orientation"] = "standard"  # Simple approach doesn't change orientation
    result_df["trays_needed"] = result_df["tray"]
    result_df["grid_dimensions"] = result_df["grid_dimensions"]  # Add grid dimensions info
    
    # Analyze small items for toss bin recommendations
    small_item_analysis = []
    for i, row in result_df.iterrows():
        analysis = is_small_item(
            row['length_in'], 
            row['width_in'], 
            row['height_in'], 
            row['weight_lb'],
            row.get('description', '')
        )
        small_item_analysis.append(analysis)
    
    result_df["small_item_analysis"] = small_item_analysis
    result_df["is_toss_bin_candidate"] = [analysis['is_toss_bin_candidate'] for analysis in small_item_analysis]
    result_df["toss_bin_score"] = [analysis['score'] for analysis in small_item_analysis]
    
    # Add on_shelf_units if not present
    if 'on_shelf_units' not in result_df.columns:
        if quantity_col in result_df.columns:
            result_df["on_shelf_units"] = result_df[quantity_col]
        else:
            result_df["on_shelf_units"] = 0
    
    print(f"[SIMPLE OPTIMIZER] Optimization complete!")
    print(f"[SIMPLE OPTIMIZER] Total trays needed: {result_df.trays_needed.max()}")
    print(f"[SIMPLE OPTIMIZER] Toss bin candidates: {result_df.is_toss_bin_candidate.sum()}")
    
    return result_df

def optimise_cvxpy_continuous(df: pd.DataFrame, **kw):
    """Legacy function - redirect to simple optimizer"""
    print("[LEGACY] CVXPY continuous optimizer deprecated, using simple optimizer")
    return optimise_simple(df, **kw)

def optimise_cvxpy_discrete(df: pd.DataFrame, **kw):
    """Legacy function - redirect to simple optimizer"""
    print("[LEGACY] CVXPY discrete optimizer deprecated, using simple optimizer")
    return optimise_simple(df, **kw)

def optimise_rectpack(df: pd.DataFrame, tray_width_in: float = 36, tray_length_in: float = 156, tray_depth_in: float = 18, buffer_pct: float = 0.95, **kw):
    """
    Maximal-Rectangles Algorithm using rectpack library for optimal 2D bin packing.
    This algorithm provides superior packing efficiency compared to simple greedy approaches.
    """
    print(f"[RECTPACK OPTIMIZER] Starting optimization with {len(df)} SKUs")
    print(f"[RECTPACK OPTIMIZER] Tray dimensions: {tray_width_in}x{tray_length_in}x{tray_depth_in}")
    print(f"[RECTPACK OPTIMIZER] Buffer: {buffer_pct*100}%")
    
    # Determine quantity column
    if 'on_shelf_units' in df.columns:
        quantity_col = 'on_shelf_units'
        print(f"[RECTPACK OPTIMIZER] Using 'on_shelf_units' for quantities")
    elif 'on_hand_units' in df.columns:
        quantity_col = 'on_hand_units'
        print(f"[RECTPACK OPTIMIZER] Using 'on_hand_units' for quantities")
    else:
        quantity_col = 'annual_units_sold'
        print(f"[RECTPACK OPTIMIZER] Using 'annual_units_sold' for quantities")
    
    # Create working copy
    df_work = df.copy()
    
    # Ensure required columns exist
    required_columns = ['sku_id', 'width_in', 'length_in', 'height_in', 'weight_lb']
    missing_columns = [col for col in required_columns if col not in df_work.columns]
    if missing_columns:
        raise ValueError(f"Missing required columns: {missing_columns}")
    
    # Check if individual SKUs fit in tray
    effective_tray_width = tray_width_in * buffer_pct
    effective_tray_length = tray_length_in * buffer_pct
    
    oversized_skus = df_work[(df_work["width_in"] > effective_tray_width) | (df_work["length_in"] > effective_tray_length)]
    if not oversized_skus.empty:
        oversized_list = oversized_skus["sku_id"].tolist()
        raise ValueError(f"SKUs {oversized_list} are too large for tray: individual dimensions exceed {effective_tray_width:.1f}x{effective_tray_length:.1f}")
    
    # 1. Analyze all three dimensions to determine optimal height orientation
    effective_tray_depth = tray_depth_in * buffer_pct
    
    # Calculate layers for each possible height orientation
    layers_height = np.maximum(1, effective_tray_depth // df_work.height_in)
    layers_width = np.maximum(1, effective_tray_depth // df_work.width_in)
    layers_length = np.maximum(1, effective_tray_depth // df_work.length_in)
    
    # Determine which dimension should be used for height (vertical stacking)
    height_orientation = []
    layers_list = []
    grid_dim1_list = []
    grid_dim2_list = []
    
    for i in range(len(df_work)):
        height_layers = layers_height.iloc[i]
        width_layers = layers_width.iloc[i]
        length_layers = layers_length.iloc[i]
        
        # Calculate height efficiency for all dimensions
        height_dim = df_work.iloc[i]["height_in"]
        width_dim = df_work.iloc[i]["width_in"]
        length_dim = df_work.iloc[i]["length_in"]
        
        # Calculate height efficiency (how much of available height is used)
        height_efficiency = (height_layers * height_dim) / effective_tray_depth
        width_efficiency = (width_layers * width_dim) / effective_tray_depth
        length_efficiency = (length_layers * length_dim) / effective_tray_depth
        
        # Choose the dimension with highest height efficiency
        if height_efficiency >= width_efficiency and height_efficiency >= length_efficiency:
            # Height gives highest efficiency
            height_orientation.append("height")
            layers_list.append(height_layers)
            grid_dim1_list.append(width_dim)
            grid_dim2_list.append(length_dim)
        elif width_efficiency >= height_efficiency and width_efficiency >= length_efficiency:
            # Width gives highest efficiency
            height_orientation.append("width")
            layers_list.append(width_layers)
            grid_dim1_list.append(height_dim)
            grid_dim2_list.append(length_dim)
        else:
            # Length gives highest efficiency
            height_orientation.append("length")
            layers_list.append(length_layers)
            grid_dim1_list.append(height_dim)
            grid_dim2_list.append(width_dim)
    
    df_work["layers"] = layers_list
    df_work["height_orientation"] = height_orientation
    df_work["grid_dim1"] = grid_dim1_list
    df_work["grid_dim2"] = grid_dim2_list
    
    # Calculate units per layer
    df_work["units_per_layer"] = np.ceil(df_work[quantity_col] / df_work.layers).astype(int)
    
    # Check for invalid values and fix them
    invalid_layers = df_work["layers"].isna() | (df_work["layers"] <= 0)
    invalid_units = df_work["units_per_layer"].isna() | (df_work["units_per_layer"] <= 0)
    
    if invalid_layers.any():
        df_work.loc[invalid_layers, "layers"] = 1
    
    if invalid_units.any():
        df_work.loc[invalid_units, "units_per_layer"] = 1
    
    print(f"[RECTPACK OPTIMIZER] Layer calculations complete")
    print(f"[RECTPACK OPTIMIZER] Average layers per SKU: {df_work.layers.mean():.1f}")
    print(f"[RECTPACK OPTIMIZER] Average units per layer: {df_work.units_per_layer.mean():.1f}")
    
    # 2. Calculate slot dimensions with 1-inch snap and bounds checking
    effective_tray_width = tray_width_in * buffer_pct
    effective_tray_length = tray_length_in * buffer_pct
    
    # Calculate slot dimensions using the optimal 2D grid dimensions
    try:
        df_work["slot_w_in"] = np.ceil(np.sqrt(df_work.units_per_layer) * df_work.grid_dim1)
        df_work["slot_l_in"] = np.ceil(np.sqrt(df_work.units_per_layer) * df_work.grid_dim2)
    except Exception as e:
        print(f"[RECTPACK OPTIMIZER] Error calculating slot dimensions: {e}")
        # Fallback to simple calculation
        df_work["slot_w_in"] = df_work.grid_dim1
        df_work["slot_l_in"] = df_work.grid_dim2
    
    # Ensure slot dimensions don't exceed tray bounds
    df_work["slot_w_in"] = np.minimum(df_work["slot_w_in"], effective_tray_width)
    df_work["slot_l_in"] = np.minimum(df_work["slot_l_in"], effective_tray_length)
    
    # Round up to nearest inch
    df_work["slot_w_in"] = np.ceil(df_work["slot_w_in"]).astype(int)
    df_work["slot_l_in"] = np.ceil(df_work["slot_l_in"]).astype(int)
    
    print(f"[RECTPACK OPTIMIZER] Slot dimensions calculated")
    print(f"[RECTPACK OPTIMIZER] Average slot size: {df_work.slot_w_in.mean():.1f}x{df_work.slot_l_in.mean():.1f}")
    
    # 3. Use rectpack for optimal 2D bin packing
    print(f"[RECTPACK OPTIMIZER] Starting rectpack bin packing...")
    
    # Prepare rectangles for rectpack
    rects = []
    for _, row in df_work.iterrows():
        w, l = int(row.slot_w_in), int(row.slot_l_in)
        # Enforce buffer
        w = min(w, int(effective_tray_width))
        l = min(l, int(effective_tray_length))
        
        # Add multiple rectangles for the number of trays needed
        trays_needed = int(np.ceil(row[quantity_col] / (row.layers * row.units_per_layer)))
        for _ in range(trays_needed):
            rects.append((w, l, row.sku_id))
    
    print(f"[RECTPACK OPTIMIZER] Prepared {len(rects)} rectangles for packing")
    
    # Build packer with Maximal-Rectangles algorithm
    packer = newPacker(
        mode=rectpack.PackingMode.Offline,
        bin_algo=rectpack.PackingBin.BBF,  # Best-Area-Fit
        sort_algo=rectpack.SORT_AREA,
        rotation=False
    )
    
    # Add rectangles to packer
    for w, h, tag in rects:
        packer.add_rect(w, h, rid=tag)
    
    # Allow unlimited identical trays
    packer.add_bin(int(effective_tray_width), int(effective_tray_length), float("inf"))
    
    # Pack!
    packer.pack()
    
    # Collect results
    layout_rows = []
    for tray_id, b in enumerate(packer.bin_list(), start=1):
        for rect in b:
            try:
                # Check if rect has the expected attributes
                if hasattr(rect, 'x') and hasattr(rect, 'y') and hasattr(rect, 'width') and hasattr(rect, 'height') and hasattr(rect, 'rid'):
                    x, y = rect.x, rect.y
                    w, l = rect.width, rect.height
                    sku = rect.rid
                    layout_rows.append((sku, tray_id, x, y, w, l))
                else:
                    print(f"[RECTPACK OPTIMIZER] Warning: rect object missing expected attributes: {rect}")
                    # Skip this rectangle if it doesn't have the expected structure
                    continue
            except Exception as e:
                print(f"[RECTPACK OPTIMIZER] Error processing rect {rect}: {e}")
                continue
    
    print(f"[RECTPACK OPTIMIZER] Packed {len(rects)} slots into {len(packer.bin_list())} trays")
    print(f"[RECTPACK OPTIMIZER] Layout rows created: {len(layout_rows)}")
    print(f"[RECTPACK OPTIMIZER] Sample layout row: {layout_rows[0] if layout_rows else 'No rows'}")
    
    # Create layout DataFrame
    layout_df = pd.DataFrame(
        layout_rows,
        columns=["sku_id", "tray", "x_in", "y_in", "slot_w_in", "slot_l_in"]
    )
    print(f"[RECTPACK OPTIMIZER] Layout DataFrame shape: {layout_df.shape}")
    print(f"[RECTPACK OPTIMIZER] Layout DataFrame head: {layout_df.head()}")
    
    # Merge with original data to get additional information
    result_df = df_work.merge(
        layout_df.groupby('sku_id').agg({
            'tray': 'count',
            'x_in': 'first',
            'y_in': 'first'
        }).reset_index().rename(columns={'tray': 'trays_needed'}),
        on='sku_id',
        how='left'
    )
    
    # Calculate trays needed based on layout
    result_df['trays_needed'] = result_df['trays_needed'].fillna(1).astype(int)
    
    # Calculate on-shelf units
    result_df['on_shelf_units'] = (
        result_df['trays_needed'] * 
        result_df['layers'] * 
        result_df['units_per_layer']
    )
    
    print(f"[RECTPACK OPTIMIZER] Optimization complete")
    print(f"[RECTPACK OPTIMIZER] Total trays needed: {len(packer.bin_list())}")
    print(f"[RECTPACK OPTIMIZER] Average utilization: {len(rects) / (len(packer.bin_list()) * effective_tray_width * effective_tray_length) * 100:.1f}%")
    
    # Add tray layout data for visualization
    tray_layouts = []
    for tray_id, b in enumerate(packer.bin_list(), start=1):
        tray_slots = []
        for rect in b:
            try:
                # Check if rect has the expected attributes
                if hasattr(rect, 'x') and hasattr(rect, 'y') and hasattr(rect, 'width') and hasattr(rect, 'height') and hasattr(rect, 'rid'):
                    tray_slots.append({
                        'sku_id': rect.rid,
                        'x_in': rect.x,
                        'y_in': rect.y,
                        'width_in': rect.width,
                        'length_in': rect.height
                    })
                else:
                    print(f"[RECTPACK OPTIMIZER] Warning: rect object missing expected attributes in tray layout: {rect}")
                    continue
            except Exception as e:
                print(f"[RECTPACK OPTIMIZER] Error processing rect in tray layout {rect}: {e}")
                continue
        tray_layouts.append({
            'tray_id': tray_id,
            'slots': tray_slots
        })
    
    # Add tray layout data to result DataFrame
    result_df.attrs['tray_layouts'] = tray_layouts
    print(f"[RECTPACK OPTIMIZER] Tray layouts created: {len(tray_layouts)}")
    print(f"[RECTPACK OPTIMIZER] Sample tray layout: {tray_layouts[0] if tray_layouts else 'No layouts'}")
    
    return result_df

def optimise_greedy(df: pd.DataFrame, **kw):
    """Legacy function - redirect to simple optimizer"""
    print("[LEGACY] Greedy optimizer deprecated, using simple optimizer")
    return optimise_simple(df, **kw)

def optimise(df: pd.DataFrame, model="simple", **kw):
    """
    Main optimization function - supports multiple algorithms
    """
    print(f"[MAIN] Using {model} optimizer")
    
    if model == "rectpack" or model == "maximal-rectangles":
        return optimise_rectpack(df, **kw)
    elif model == "simple":
        return optimise_simple(df, **kw)
    elif model == "cvxpy_continuous":
        return optimise_cvxpy_continuous(df, **kw)
    elif model == "cvxpy_discrete":
        return optimise_cvxpy_discrete(df, **kw)
    elif model == "greedy":
        return optimise_greedy(df, **kw)
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
    total_trays = df_result['trays_needed'].max() if 'trays_needed' in df_result.columns else 1
    
    # Slot utilization
    total_slot_area = 0
    total_tray_area = total_trays * tray_length_in * tray_width_in * (buffer_pct ** 2)
    
    for _, row in df_result.iterrows():
        slot_width = row.get('slot_width_in', 0)
        slot_length = row.get('slot_length_in', 0)
        total_slot_area += slot_width * slot_length
    
    area_utilization = (total_slot_area / total_tray_area) * 100 if total_tray_area > 0 else 0
    
    # Toss bin analysis
    toss_bin_candidates = df_result.get('is_toss_bin_candidate', pd.Series([False] * len(df_result))).sum()
    toss_bin_pct = (toss_bin_candidates / total_skus) * 100 if total_skus > 0 else 0
    
    # Layer analysis
    avg_layers = df_result.get('layers', pd.Series([1] * len(df_result))).mean()
    max_layers = df_result.get('layers', pd.Series([1] * len(df_result))).max()
    
    # Calculate additional KPIs for frontend compatibility
    avg_slot_width = df_result.get('slot_width_in', pd.Series([0] * len(df_result))).mean() if len(df_result) > 0 else 0
    avg_slot_length = df_result.get('slot_length_in', pd.Series([0] * len(df_result))).mean() if len(df_result) > 0 else 0
    total_units = df_result.get('on_shelf_units', pd.Series([0] * len(df_result))).sum() if len(df_result) > 0 else 0
    
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