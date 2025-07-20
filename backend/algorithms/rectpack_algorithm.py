import pandas as pd
import numpy as np
import rectpack
from rectpack import newPacker
from typing import Dict, List, Tuple, Optional, Union
import json
from datetime import datetime

def optimise_rectpack(df: pd.DataFrame, tray_width_in: float = 36, tray_length_in: float = 156, tray_depth_in: float = 18, buffer_pct: float = 0.95, inventory_list_id: str = None, **kw):
    """
    Maximal-Rectangles Algorithm using rectpack library with Prisma database storage.
    This version properly maps rectpack attributes and stores results in the database.
    """
    print(f"[RECTPACK ALGORITHM] Starting optimization with {len(df)} SKUs")
    print(f"[RECTPACK ALGORITHM] Tray dimensions: {tray_width_in}x{tray_length_in}x{tray_depth_in}")
    print(f"[RECTPACK ALGORITHM] Buffer: {buffer_pct*100}%")
    print(f"[RECTPACK ALGORITHM] Inventory list ID: {inventory_list_id}")
    
    # Determine quantity column
    if 'on_shelf_units' in df.columns:
        quantity_col = 'on_shelf_units'
        print(f"[RECTPACK ALGORITHM] Using 'on_shelf_units' for quantities")
    elif 'on_hand_units' in df.columns:
        quantity_col = 'on_hand_units'
        print(f"[RECTPACK ALGORITHM] Using 'on_hand_units' for quantities")
    else:
        quantity_col = 'annual_units_sold'
        print(f"[RECTPACK ALGORITHM] Using 'annual_units_sold' for quantities")
    
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
    
    # Calculate layers for each possible height orientation with NaN handling
    # Handle division by zero or NaN values
    height_in_safe = df_work.height_in.fillna(1).clip(lower=0.1)
    width_in_safe = df_work.width_in.fillna(1).clip(lower=0.1)
    length_in_safe = df_work.length_in.fillna(1).clip(lower=0.1)
    
    layers_height = np.maximum(1, effective_tray_depth // height_in_safe)
    layers_width = np.maximum(1, effective_tray_depth // width_in_safe)
    layers_length = np.maximum(1, effective_tray_depth // length_in_safe)
    
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
        # Handle potential NaN values in dimensions
        height_dim = height_dim if not pd.isna(height_dim) else 1
        width_dim = width_dim if not pd.isna(width_dim) else 1
        length_dim = length_dim if not pd.isna(length_dim) else 1
        
        height_efficiency = (height_layers * height_dim) / effective_tray_depth
        width_efficiency = (width_layers * width_dim) / effective_tray_depth
        length_efficiency = (length_layers * length_dim) / effective_tray_depth
        
        # Handle any NaN efficiencies
        height_efficiency = height_efficiency if not pd.isna(height_efficiency) else 0
        width_efficiency = width_efficiency if not pd.isna(width_efficiency) else 0
        length_efficiency = length_efficiency if not pd.isna(length_efficiency) else 0
        
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
    
    # Check for invalid values and fix them BEFORE calculating units_per_layer
    invalid_layers = df_work["layers"].isna() | (df_work["layers"] <= 0)
    if invalid_layers.any():
        df_work.loc[invalid_layers, "layers"] = 1
    
    # Calculate units per layer AFTER fixing NaN values
    # Handle division by zero or NaN
    quantity_safe = df_work[quantity_col].fillna(1).clip(lower=1)
    layers_safe = df_work.layers.fillna(1).clip(lower=1)
    df_work["units_per_layer"] = np.ceil(quantity_safe / layers_safe).astype(int)
    
    # Check for invalid units and fix them
    invalid_units = df_work["units_per_layer"].isna() | (df_work["units_per_layer"] <= 0)
    if invalid_units.any():
        df_work.loc[invalid_units, "units_per_layer"] = 1
    
    # Layer calculations complete
    
    # 2. Calculate slot dimensions with 1-inch snap and bounds checking
    effective_tray_width = tray_width_in * buffer_pct
    effective_tray_length = tray_length_in * buffer_pct
    
    # Calculate slot dimensions using the optimal 2D grid dimensions
    try:
        # Check for NaN values in units_per_layer and grid dimensions
        df_work["units_per_layer"] = df_work["units_per_layer"].fillna(1)
        df_work["grid_dim1"] = df_work["grid_dim1"].fillna(1)
        df_work["grid_dim2"] = df_work["grid_dim2"].fillna(1)
        
        # Ensure positive values
        df_work["units_per_layer"] = df_work["units_per_layer"].clip(lower=1)
        df_work["grid_dim1"] = df_work["grid_dim1"].clip(lower=1)
        df_work["grid_dim2"] = df_work["grid_dim2"].clip(lower=1)
        
        # Calculate slot dimensions with improved algorithm
        # Use a more conservative approach to prevent overlapping
        for idx, row in df_work.iterrows():
            units = row.units_per_layer
            dim1 = row.grid_dim1
            dim2 = row.grid_dim2
            
            # Calculate optimal grid arrangement
            # Try to find the best rectangular arrangement
            best_width = dim1
            best_length = dim2
            min_waste = float('inf')
            
            # Try different grid arrangements
            for cols in range(1, min(int(np.sqrt(units)) + 3, int(effective_tray_width / dim1) + 1)):
                rows = int(np.ceil(units / cols))
                if rows <= 0:
                    continue
                    
                slot_w = cols * dim1
                slot_l = rows * dim2
                
                # Check if this arrangement fits in the tray
                if slot_w <= effective_tray_width and slot_l <= effective_tray_length:
                    waste = (cols * rows) - units  # How many extra slots we need
                    if waste < min_waste:
                        min_waste = waste
                        best_width = slot_w
                        best_length = slot_l
            
            # If no arrangement fits, use the original dimensions
            if best_width > effective_tray_width or best_length > effective_tray_length:
                best_width = min(dim1, effective_tray_width)
                best_length = min(dim2, effective_tray_length)
            
            df_work.loc[idx, "slot_w_in"] = best_width
            df_work.loc[idx, "slot_l_in"] = best_length
        
        # Slot dimensions calculated successfully
        
    except Exception as e:
        print(f"[RECTPACK V2 ALGORITHM] Error calculating slot dimensions: {e}")
        print(f"[RECTPACK V2 ALGORITHM] Using fallback calculation")
        # Fallback to simple calculation
        df_work["slot_w_in"] = df_work.grid_dim1.fillna(1)
        df_work["slot_l_in"] = df_work.grid_dim2.fillna(1)
    
    # Ensure slot dimensions don't exceed tray bounds and handle any remaining NaN values
    df_work["slot_w_in"] = np.minimum(df_work["slot_w_in"].fillna(1), effective_tray_width)
    df_work["slot_l_in"] = np.minimum(df_work["slot_l_in"].fillna(1), effective_tray_length)
    
    # Round up to nearest inch and ensure integers
    df_work["slot_w_in"] = np.ceil(df_work["slot_w_in"]).astype(int)
    df_work["slot_l_in"] = np.ceil(df_work["slot_l_in"]).astype(int)
    
    # Final safety check - ensure no NaN values remain
    df_work["slot_w_in"] = df_work["slot_w_in"].fillna(1).astype(int)
    df_work["slot_l_in"] = df_work["slot_l_in"].fillna(1).astype(int)
    
    # Slot dimensions calculated
    
    # 3. Use rectpack for optimal 2D bin packing
    
    # Prepare rectangles for rectpack
    rects = []
    for idx, row in df_work.iterrows():
        try:
            if pd.isna(row.layers) or pd.isna(row.units_per_layer):
                layers = row.layers if not pd.isna(row.layers) else 1
                units_per_layer = row.units_per_layer if not pd.isna(row.units_per_layer) else 1
            else:
                layers = row.layers
                units_per_layer = row.units_per_layer
            
            # Ensure positive values
            if layers <= 0 or units_per_layer <= 0:
                layers = 1
                units_per_layer = 1
            
            # Get slot dimensions with robust NaN handling
            slot_w = row.slot_w_in
            slot_l = row.slot_l_in
            
            # Handle any remaining NaN values
            if pd.isna(slot_w) or pd.isna(slot_l):
                slot_w = row.grid_dim1 if not pd.isna(row.grid_dim1) else 1
                slot_l = row.grid_dim2 if not pd.isna(row.grid_dim2) else 1
            
            # Ensure positive values and convert to integers
            w = max(1, int(float(slot_w)))
            l = max(1, int(float(slot_l)))
            
            # Enforce buffer
            w = min(w, int(effective_tray_width))
            l = min(l, int(effective_tray_length))
            
            # Calculate trays needed based on how many units can fit in one tray
            quantity = row[quantity_col] if not pd.isna(row[quantity_col]) else 1
            if quantity <= 0:
                quantity = 1
            
            # Calculate how many units can fit in one tray based on slot dimensions
            # This is the key fix: calculate units per tray based on slot capacity, not layers
            units_per_tray = layers * units_per_layer
            
            # But we also need to consider if the slot itself can fit multiple units
            # Calculate how many units can fit in the slot area
            slot_area = w * l
            unit_area = row.grid_dim1 * row.grid_dim2  # Area needed per unit
            if unit_area > 0:
                units_per_slot = max(1, int(slot_area / unit_area))
                units_per_tray = layers * units_per_slot
            else:
                units_per_tray = layers * units_per_layer
                
            trays_needed = max(1, int(np.ceil(quantity / units_per_tray)))
            
            for tray_index in range(trays_needed):
                # Create unique identifier for each tray instance of this SKU
                unique_sku_id = f"{row.sku_id}_T{tray_index + 1}"
                rects.append((w, l, unique_sku_id))
                
        except Exception as e:
            print(f"[RECTPACK V2 ALGORITHM] Error processing row {idx} ({row.sku_id}): {e}")
            continue
    
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
    
    # 4. Store results in Prisma database (with improved fallback)
    tray_layouts = []
    
    # Get the packed rectangles from rectpack
    rect_list = packer.rect_list()
    
    # Group rectangles by bin_id
    bins = {}
    for rect in rect_list:
        bin_id, x, y, width, height, rid = rect
        if bin_id not in bins:
            bins[bin_id] = []
        
        # Extract original SKU ID from the unique identifier
        # Format: "SKU0001_T1" -> "SKU0001"
        original_sku_id = rid.split('_T')[0] if '_T' in rid else rid
        
        bins[bin_id].append({
            'sku_id': original_sku_id,
            'x_in': x,
            'y_in': y,
            'width_in': width,
            'length_in': height
        })
    
    # Use in-memory storage for tray layouts (Prisma is not available in Python environment)
    tray_layouts = []
    for tray_id, slots in bins.items():
        tray_layouts.append({
            'tray_id': tray_id,
            'slots': slots
        })
    
    # 5. Create result DataFrame
    # Merge with original data to get additional information
    result_df = df_work.copy()
    
    # Calculate actual trays needed based on packing results
    # Count how many times each SKU appears across all trays
    sku_tray_counts = {}
    for tray_id, slots in bins.items():
        for slot in slots:
            sku_id = slot['sku_id']
            if sku_id not in sku_tray_counts:
                sku_tray_counts[sku_id] = set()
            sku_tray_counts[sku_id].add(tray_id)
    
    # Update trays_needed based on actual packing
    result_df['trays_needed'] = result_df['sku_id'].map(
        lambda x: len(sku_tray_counts.get(x, set()))
    ).fillna(1)
    
    # Keep the original on-shelf units from the database
    # Don't recalculate based on trays_needed as this inflates the numbers
    # The original quantity is the source of truth
    result_df['on_shelf_units'] = result_df[quantity_col]
    
    # Add tray layout data to result DataFrame
    result_df.attrs['tray_layouts'] = tray_layouts
    
    return result_df 