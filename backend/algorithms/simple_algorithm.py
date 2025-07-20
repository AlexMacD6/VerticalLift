import pandas as pd
import numpy as np
from typing import Dict, List, Tuple, Optional

def optimise_simple(df: pd.DataFrame, tray_width_in: float = 36, tray_length_in: float = 156, tray_depth_in: float = 18, buffer_pct: float = 0.95, **kw):
    """
    Simple optimizer following the straightforward approach:
    1. Calculate vertical layers
    2. Calculate slot dimensions with 1-inch snap
    3. Greedy row packing
    4. Summarize results
    """
    # Determine quantity column
    if 'on_shelf_units' in df.columns:
        quantity_col = 'on_shelf_units'
    elif 'on_hand_units' in df.columns:
        quantity_col = 'on_hand_units'
    else:
        quantity_col = 'annual_units_sold'
    
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
    
    # 2. Calculate slot dimensions with 1-inch snap and bounds checking
    effective_tray_width = tray_width_in * buffer_pct
    effective_tray_length = tray_length_in * buffer_pct
    
    # Calculate slot dimensions using the optimal 2D grid dimensions
    try:
        df_work["slot_w_in"] = np.ceil(np.sqrt(df_work.units_per_layer) * df_work.grid_dim1)
        df_work["slot_l_in"] = np.ceil(np.sqrt(df_work.units_per_layer) * df_work.grid_dim2)
    except Exception as e:
        # Fallback to simple calculation
        df_work["slot_w_in"] = df_work.grid_dim1
        df_work["slot_l_in"] = df_work.grid_dim2
    
    # Ensure slot dimensions don't exceed tray bounds
    df_work["slot_w_in"] = np.minimum(df_work["slot_w_in"], effective_tray_width)
    df_work["slot_l_in"] = np.minimum(df_work["slot_l_in"], effective_tray_length)
    
    # Round up to nearest inch
    df_work["slot_w_in"] = np.ceil(df_work["slot_w_in"]).astype(int)
    df_work["slot_l_in"] = np.ceil(df_work["slot_l_in"]).astype(int)
    
    # 3. Simple greedy row packing
    
    # Calculate trays needed for each SKU
    trays_needed_list = []
    for _, row in df_work.iterrows():
        units = row[quantity_col]
        layers = row.layers
        units_per_layer = row.units_per_layer
        
        # Calculate how many trays this SKU needs
        trays_needed = int(np.ceil(units / (layers * units_per_layer)))
        trays_needed_list.append(trays_needed)
    
    df_work["trays_needed"] = trays_needed_list
    
    # Calculate on-shelf units
    df_work["on_shelf_units"] = (
        df_work["trays_needed"] * 
        df_work["layers"] * 
        df_work["units_per_layer"]
    )
    
    return df_work 