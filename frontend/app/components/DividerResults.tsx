"use client";
import React, { useState, useEffect, useMemo } from "react";
import {
  BarChart3,
  Package,
  Search,
  X,
  Download,
  Filter,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import TraySVGVisualization from "./TraySVGVisualization";
import Tray3DVisualization from "./Tray3DVisualization";

interface Slot {
  skuId: string;
  width: number;
  length: number;
  x: number;
  y: number;
  units?: number;
}

interface Tray {
  id: number;
  slots: Slot[];
  remainingSpace: number;
}

interface Divider {
  sku_id: string;
  width_in: number;
  length_in: number;
  height_in: number;
  weight_lb: number;
  description?: string;
  units_per_layer?: number;
  on_shelf_units?: number;
  annual_units_sold?: number;
  grid_dim1?: number;
  grid_dim2?: number;
  layers?: number;
  slot_w_in?: number;
  slot_l_in?: number;
  slot_width_in?: number;
  slot_length_in?: number;
  trays_needed?: number;
  height_orientation?: string;
  layer_orientation?: string;
  is_toss_bin_candidate?: boolean;
  toss_bin_score?: number;
}

interface KPIs {
  total_skus: number;
  total_trays: number;
  area_utilization_pct: number;
  toss_bin_candidates: number;
  toss_bin_pct: number;
  avg_layers: number;
  max_layers: number;
  tray_dimensions: string;
  buffer_pct: number;
  total_slot_area: number;
  effective_tray_area: number;
  avg_slot_width: number;
  avg_slot_length: number;
  total_units: number;
  area_utilization: number;
}

interface TrayDimensions {
  tray_width_in: number;
  tray_length_in: number;
  tray_depth_in: number;
  buffer_pct: number;
  length_in?: number;
  width_in?: number;
  depth_in?: number;
}

interface TrayLayout {
  tray_id: number;
  slots: Array<{
    sku_id: string;
    x_in: number;
    y_in: number;
    width_in: number;
    length_in: number;
  }>;
}

interface DividerResultsProps {
  dividers: Divider[];
  kpis: KPIs;
  trayDimensions: TrayDimensions;
  model: string;
  trayLayouts?: TrayLayout[];
  configParams?: any; // Add configParams to use actual values instead of hard-coded defaults
}

export default function DividerResults({
  dividers,
  kpis,
  trayDimensions,
  model,
  trayLayouts,
  configParams,
}: DividerResultsProps) {
  const [activeTab, setActiveTab] = useState<
    "table" | "tray-summary" | "trays"
  >("table");

  const [selectedSku, setSelectedSku] = useState<string | null>(null);
  const [traySearchSku, setTraySearchSku] = useState<string>("");
  const [sortConfig, setSortConfig] = useState<{
    key: string;
    direction: "asc" | "desc";
  } | null>({ key: "units", direction: "desc" });
  const [filters, setFilters] = useState({
    sku: "",
    description: "",
    minLayers: "",
    maxLayers: "",
    minTrays: "",
    maxTrays: "",
    orientation: "",
    multiTrayOnly: false,
  });
  const [showTrayModal, setShowTrayModal] = useState(false);
  const [selectedTray, setSelectedTray] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 25;

  const formatPercentage = (value: number) => {
    return `${(value * 100).toFixed(1)}%`;
  };

  // Ensure dividers is an array
  const safeDividers = dividers || [];

  // Ensure kpis is an object
  const safeKpis = kpis || {};

  // Filter the dividers based on current filters
  const filteredDividers = safeDividers.filter((divider) => {
    const sku = divider.sku_id || "";
    const description = divider.description || "";
    const layers = divider.layers || 0;
    const traysNeeded = divider.trays_needed || 0;
    const orientation =
      divider.height_orientation || divider.layer_orientation || "height";
    // Toss bin logic removed
    const isMultiTray = traysNeeded > 1;

    // SKU filter
    if (filters.sku && !sku.toLowerCase().includes(filters.sku.toLowerCase())) {
      return false;
    }

    // Description filter
    if (
      filters.description &&
      !description.toLowerCase().includes(filters.description.toLowerCase())
    ) {
      return false;
    }

    // Layers range filter
    if (filters.minLayers && layers < parseInt(filters.minLayers)) {
      return false;
    }
    if (filters.maxLayers && layers > parseInt(filters.maxLayers)) {
      return false;
    }

    // Trays range filter
    if (filters.minTrays && traysNeeded < parseInt(filters.minTrays)) {
      return false;
    }
    if (filters.maxTrays && traysNeeded > parseInt(filters.maxTrays)) {
      return false;
    }

    // Orientation filter
    if (filters.orientation && orientation !== filters.orientation) {
      return false;
    }

    // Toss bin filter removed

    // Multi-tray only filter
    if (filters.multiTrayOnly && !isMultiTray) {
      return false;
    }

    return true;
  });

  const clearFilters = () => {
    setFilters({
      sku: "",
      description: "",
      minLayers: "",
      maxLayers: "",
      minTrays: "",
      maxTrays: "",
      orientation: "",
      // tossBinOnly removed
      multiTrayOnly: false,
    });
  };

  const hasActiveFilters = Object.values(filters).some(
    (value) => value !== "" && value !== false
  );

  // Sorting functions
  const handleSort = (key: string) => {
    if (sortConfig && sortConfig.key === key) {
      setSortConfig({
        key,
        direction: sortConfig.direction === "asc" ? "desc" : "asc",
      });
    } else {
      setSortConfig({ key, direction: "asc" });
    }
  };

  const getSortedData = (data: Divider[]) => {
    if (!sortConfig) return data;

    return [...data].sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortConfig.key) {
        case "sku":
          aValue = a.sku_id || "";
          bValue = b.sku_id || "";
          break;
        case "description":
          aValue = a.description || "";
          bValue = b.description || "";
          break;
        case "units":
          aValue = a.on_shelf_units || 0;
          bValue = b.on_shelf_units || 0;
          break;
        case "length":
          aValue = a.length_in || 0;
          bValue = b.length_in || 0;
          break;
        case "width":
          aValue = a.width_in || 0;
          bValue = b.width_in || 0;
          break;
        case "height":
          aValue = a.height_in || 0;
          bValue = b.height_in || 0;
          break;
        case "weight":
          aValue = a.weight_lb || 0;
          bValue = b.weight_lb || 0;
          break;
        case "layers":
          aValue = a.layers || 1;
          bValue = b.layers || 1;
          break;
        case "trays":
          aValue = a.trays_needed || 1;
          bValue = b.trays_needed || 1;
          break;
        default:
          return 0;
      }

      if (typeof aValue === "string" && typeof bValue === "string") {
        return sortConfig.direction === "asc"
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      } else {
        return sortConfig.direction === "asc"
          ? aValue - bValue
          : bValue - aValue;
      }
    });
  };

  // Global tray packing calculation
  const calculateTrayPacking = () => {
    // Validate that we have the required configuration
    const trayWidth =
      configParams?.tray_width_in || trayDimensions?.tray_width_in;
    const trayLength =
      configParams?.tray_length_in || trayDimensions?.tray_length_in;
    const bufferPct = configParams?.buffer_pct || trayDimensions?.buffer_pct;

    if (!trayWidth || !trayLength || !bufferPct) {
      console.error("Missing required tray configuration:", {
        trayWidth,
        trayLength,
        bufferPct,
      });
      return [];
    }

    // If we have tray layouts from the backend (rectpack model), use those
    if (trayLayouts && trayLayouts.length > 0) {
      const effectiveTrayWidth = trayWidth * bufferPct;
      const effectiveTrayLength = trayLength * bufferPct;

      const backendTrays = trayLayouts.map((trayLayout: any) => {
        const totalArea = trayWidth * trayLength;
        const usedArea = trayLayout.slots.reduce(
          (sum: number, slot: any) => sum + slot.width_in * slot.length_in,
          0
        );

        return {
          id: trayLayout.tray_id,
          slots: trayLayout.slots.map((slot: any) => {
            // Calculate actual units for this slot based on slot area and unit dimensions
            const divider = safeDividers.find((d) => d.sku_id === slot.sku_id);
            const unitArea =
              (divider?.grid_dim1 || 1) * (divider?.grid_dim2 || 1);
            const slotArea = slot.width_in * slot.length_in;
            const unitsInSlot =
              unitArea > 0 ? Math.floor(slotArea / unitArea) : 1;
            const layers = divider?.layers || 1;
            const actualUnits = unitsInSlot * layers;

            return {
              skuId: slot.sku_id,
              x: slot.x_in,
              y: slot.y_in,
              width: slot.width_in,
              length: slot.length_in,
              units: actualUnits, // Use calculated actual units
              trayIndex: trayLayout.tray_id,
            };
          }),
          remainingSpace: totalArea - usedArea,
        };
      });

      // Update the dividers data with actual tray counts from backend
      const skuTrayCounts: { [key: string]: Set<number> } = {};
      backendTrays.forEach((tray) => {
        tray.slots.forEach((slot: any) => {
          if (!skuTrayCounts[slot.skuId]) {
            skuTrayCounts[slot.skuId] = new Set();
          }
          skuTrayCounts[slot.skuId].add(tray.id);
        });
      });

      // Update the dividers with actual tray counts
      safeDividers.forEach((divider) => {
        const actualTrays = skuTrayCounts[divider.sku_id]?.size || 1;
        divider.trays_needed = actualTrays;
        divider.on_shelf_units =
          actualTrays * (divider.layers || 1) * (divider.units_per_layer || 1);
      });

      return backendTrays;
    }

    // Fallback to frontend calculation for other models
    const allSlots: Array<{
      skuId: string;
      width: number;
      length: number;
      units: number;
      traysNeeded: number;
      trayIndex: number;
    }> = [];

    // Create slots for each SKU, accounting for multiple trays needed
    filteredDividers.forEach((divider) => {
      const units = divider.units_per_layer || divider.on_shelf_units || 1;
      const effectiveTrayWidth = trayWidth * bufferPct;
      const effectiveTrayLength = trayLength * bufferPct;

      // Use backend-calculated slot dimensions if available, otherwise calculate them
      if (divider.slot_w_in && divider.slot_l_in) {
        // Use backend-calculated dimensions with buffer applied
        const slotWidth = Math.min(divider.slot_w_in, effectiveTrayWidth);
        const slotLength = Math.min(divider.slot_l_in, effectiveTrayLength);

        // Calculate how many units can fit in this slot
        const dim1 = divider.grid_dim1 || 1;
        const dim2 = divider.grid_dim2 || 1;
        const safeDim1 = Math.max(dim1, 0.1);
        const safeDim2 = Math.max(dim2, 0.1);

        const maxUnitsInSlot =
          Math.floor(slotWidth / safeDim1) * Math.floor(slotLength / safeDim2);
        const actualUnits = Math.min(units, maxUnitsInSlot);

        allSlots.push({
          skuId: divider.sku_id || "N/A",
          width: slotWidth,
          length: slotLength,
          units: actualUnits,
          traysNeeded: 1,
          trayIndex: 1,
        });
      } else {
        // Fallback to frontend calculation
        const dim1 = divider.grid_dim1 || 1;
        const dim2 = divider.grid_dim2 || 1;

        // Ensure minimum dimensions to prevent division by zero
        const safeDim1 = Math.max(dim1, 0.1);
        const safeDim2 = Math.max(dim2, 0.1);

        const unitsPerRow = Math.max(
          1,
          Math.floor(effectiveTrayWidth / safeDim1)
        );
        const rowsPerTray = Math.max(
          1,
          Math.floor(effectiveTrayLength / safeDim2)
        );
        const unitsPerTray = unitsPerRow * rowsPerTray;

        // Ensure unitsPerTray is at least 1 to prevent division by zero
        const safeUnitsPerTray = Math.max(unitsPerTray, 1);
        const traysNeeded = Math.min(Math.ceil(units / safeUnitsPerTray), 1000); // Limit to 1000 trays max

        // Create a slot for each tray this SKU needs
        for (let trayIndex = 0; trayIndex < traysNeeded; trayIndex++) {
          const unitsInThisTray =
            trayIndex === traysNeeded - 1
              ? units % safeUnitsPerTray || safeUnitsPerTray
              : safeUnitsPerTray;
          const rowsInThisTray = Math.ceil(unitsInThisTray / unitsPerRow);
          const colsInThisTray = Math.min(unitsInThisTray, unitsPerRow);

          const slotWidth = Math.ceil(colsInThisTray * safeDim1);
          const slotLength = Math.ceil(rowsInThisTray * safeDim2);

          // Validate that slot dimensions don't exceed tray dimensions
          if (
            slotWidth > effectiveTrayWidth ||
            slotLength > effectiveTrayLength
          ) {
            console.error(
              `Slot ${divider.sku_id} is too large for tray: ${slotWidth}x${slotLength} vs ${effectiveTrayWidth}x${effectiveTrayLength}`
            );

            // Cap the slot dimensions to fit within the tray
            const cappedWidth = Math.min(slotWidth, effectiveTrayWidth);
            const cappedLength = Math.min(slotLength, effectiveTrayLength);

            // Recalculate units that can fit in the capped slot
            const maxUnitsInCappedSlot =
              Math.floor(cappedWidth / safeDim1) *
              Math.floor(cappedLength / safeDim2);
            const actualUnitsInThisTray = Math.min(
              unitsInThisTray,
              maxUnitsInCappedSlot
            );

            allSlots.push({
              skuId: divider.sku_id || "N/A",
              width: cappedWidth,
              length: cappedLength,
              units: actualUnitsInThisTray,
              traysNeeded: traysNeeded,
              trayIndex: trayIndex + 1,
            });
          } else {
            allSlots.push({
              skuId: divider.sku_id || "N/A",
              width: slotWidth,
              length: slotLength,
              units: unitsInThisTray,
              traysNeeded: traysNeeded,
              trayIndex: trayIndex + 1,
            });
          }
        }
      }
    });

    // Grid-based bin packing algorithm - guarantees no overlaps
    const effectiveTrayWidth = trayWidth * bufferPct;
    const effectiveTrayLength = trayLength * bufferPct;
    const trays: Array<{
      id: number;
      slots: Array<{
        skuId: string;
        x: number;
        y: number;
        width: number;
        length: number;
        units: number;
        trayIndex: number;
      }>;
      remainingSpace: number;
    }> = [];

    // Sort slots by area (largest first) for better packing
    const sortedSlots = [...allSlots].sort(
      (a, b) => b.width * b.length - a.width * a.length
    );

    // Helper function to check if a position is valid in a grid
    function isValidGridPosition(
      pos: { x: number; y: number },
      slot: { width: number; length: number },
      occupiedGrid: boolean[][],
      trayWidth: number,
      trayLength: number
    ) {
      // Check if position is within tray bounds
      if (
        pos.x < 0 ||
        pos.y < 0 ||
        pos.x + slot.width > trayWidth ||
        pos.y + slot.length > trayLength
      ) {
        return false;
      }

      // Check if all grid cells in the slot area are unoccupied
      for (let x = pos.x; x < pos.x + slot.width; x++) {
        for (let y = pos.y; y < pos.y + slot.length; y++) {
          if (occupiedGrid[x] && occupiedGrid[x][y]) {
            return false;
          }
        }
      }

      return true;
    }

    // Helper function to mark grid cells as occupied
    function markGridOccupied(
      pos: { x: number; y: number },
      slot: { width: number; length: number },
      occupiedGrid: boolean[][]
    ) {
      for (let x = pos.x; x < pos.x + slot.width; x++) {
        for (let y = pos.y; y < pos.y + slot.length; y++) {
          if (!occupiedGrid[x]) occupiedGrid[x] = [];
          occupiedGrid[x][y] = true;
        }
      }
    }

    // Helper function to find the best position for a slot using grid
    function findBestGridPosition(
      slot: {
        skuId: string;
        width: number;
        length: number;
        units: number;
        trayIndex: number;
      },
      occupiedGrid: boolean[][],
      trayWidth: number,
      trayLength: number
    ) {
      // Try positions systematically in a grid pattern
      for (let y = 0; y <= trayLength - slot.length; y++) {
        for (let x = 0; x <= trayWidth - slot.width; x++) {
          const pos = { x, y };
          if (
            isValidGridPosition(pos, slot, occupiedGrid, trayWidth, trayLength)
          ) {
            return pos;
          }
        }
      }
      return null;
    }

    for (const slot of sortedSlots) {
      let placed = false;

      // Try to place in existing trays
      for (let trayIndex = 0; trayIndex < trays.length; trayIndex++) {
        const tray = trays[trayIndex];

        // Check if slot fits in this tray
        if (
          slot.width <= effectiveTrayWidth &&
          slot.length <= effectiveTrayLength
        ) {
          // Create occupied grid for this tray
          const occupiedGrid: boolean[][] = [];
          for (const existingSlot of tray.slots) {
            for (
              let x = existingSlot.x;
              x < existingSlot.x + existingSlot.width;
              x++
            ) {
              for (
                let y = existingSlot.y;
                y < existingSlot.y + existingSlot.length;
                y++
              ) {
                if (!occupiedGrid[x]) occupiedGrid[x] = [];
                occupiedGrid[x][y] = true;
              }
            }
          }

          // Find the best position for this slot
          const position = findBestGridPosition(
            slot,
            occupiedGrid,
            effectiveTrayWidth,
            effectiveTrayLength
          );

          if (position) {
            tray.slots.push({
              skuId: slot.skuId,
              x: position.x,
              y: position.y,
              width: slot.width,
              length: slot.length,
              units: slot.units,
              trayIndex: slot.trayIndex,
            });
            tray.remainingSpace -= slot.width * slot.length;
            placed = true;
            break;
          }
        }
      }

      // If couldn't place in existing trays, create new tray
      if (!placed) {
        // Verify slot fits in a new tray
        if (
          slot.width <= effectiveTrayWidth &&
          slot.length <= effectiveTrayLength
        ) {
          const newTray = {
            id: trays.length + 1,
            slots: [
              {
                skuId: slot.skuId,
                x: 0,
                y: 0,
                width: slot.width,
                length: slot.length,
                units: slot.units,
                trayIndex: slot.trayIndex,
              },
            ],
            remainingSpace:
              effectiveTrayWidth * effectiveTrayLength -
              slot.width * slot.length,
          };
          trays.push(newTray);
        } else {
          console.error(
            `Slot ${slot.skuId} is too large for tray: ${slot.width}x${slot.length} vs ${effectiveTrayWidth}x${effectiveTrayLength}`
          );
        }
      }
    }

    return trays;
  };

  const trayPacking = calculateTrayPacking();

  // Calculate total compartments (slots) across all trays
  const totalCompartments = trayPacking.reduce(
    (sum, tray) => sum + tray.slots.length,
    0
  );

  // Calculate actual area utilization from tray packing
  const calculateActualAreaUtilization = () => {
    if (trayPacking.length === 0) return 0;

    const trayWidth =
      (configParams?.tray_width_in || trayDimensions?.tray_width_in) *
      (configParams?.buffer_pct || trayDimensions?.buffer_pct);
    const trayLength =
      (configParams?.tray_length_in || trayDimensions?.tray_length_in) *
      (configParams?.buffer_pct || trayDimensions?.buffer_pct);
    const totalTrayArea = trayPacking.length * trayWidth * trayLength;

    const totalUsedArea = trayPacking.reduce(
      (sum, tray) =>
        sum +
        tray.slots.reduce(
          (slotSum: number, slot: Slot) => slotSum + slot.width * slot.length,
          0
        ),
      0
    );

    return (totalUsedArea / totalTrayArea) * 100;
  };

  const actualAreaUtilization = calculateActualAreaUtilization();

  // Pagination logic
  const sortedData = getSortedData(filteredDividers);
  const totalPages = Math.ceil(sortedData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedData = sortedData.slice(startIndex, endIndex);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filters]);

  const exportToCSV = () => {
    if (!filteredDividers || filteredDividers.length === 0) return;

    const headers = [
      "SKU",
      "Description",
      "Length (in)",
      "Width (in)",
      "Height (in)",
      "Slot Width (in)",
      "Slot Length (in)",
      "Layers",
      "Trays Needed",
      "Units per Layer",
      "On-Shelf Units",
    ];

    const csvContent = [
      headers.join(","),
      ...filteredDividers.map((divider) =>
        [
          divider.sku_id,
          divider.description,
          divider.length_in,
          divider.width_in,
          divider.height_in,
          divider.slot_w_in || divider.slot_width_in || 0,
          divider.slot_l_in || divider.slot_length_in || 0,
          divider.layers || 0,
          divider.trays_needed || 0,
          Math.floor(
            (divider.slot_w_in || divider.slot_width_in || 0) /
              divider.length_in
          ) *
            Math.floor(
              (divider.slot_l_in || divider.slot_length_in || 0) /
                divider.width_in
            ),
          (divider.trays_needed || 0) *
            Math.floor(
              (divider.slot_w_in || divider.slot_width_in || 0) /
                divider.length_in
            ) *
            Math.floor(
              (divider.slot_l_in || divider.slot_length_in || 0) /
                divider.width_in
            ) *
            (divider.layers || 0),
        ].join(",")
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `divider_optimization_${model}_${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const handleTrayClick = (tray: any) => {
    setSelectedTray(tray);
    setShowTrayModal(true);
  };

  const closeTrayModal = () => {
    setShowTrayModal(false);
    setSelectedTray(null);
  };

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6" aria-label="Tabs">
            <button
              onClick={() => setActiveTab("table")}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === "table"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              SKU Table
            </button>
            <button
              onClick={() => setActiveTab("tray-summary")}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === "tray-summary"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              Tray Summary
            </button>
            <button
              onClick={() => setActiveTab("trays")}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === "trays"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              Tray Layouts ({trayPacking.length} trays)
            </button>
          </nav>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center space-x-2">
            <BarChart3 className="h-5 w-5 text-blue-600" />
            <h3 className="font-semibold text-gray-900">Volume Utilization</h3>
          </div>
          <p className="text-2xl font-bold text-blue-600">
            {(() => {
              // Get tray dimensions for volume calculation
              const trayDepth =
                configParams?.tray_height_in || trayDimensions?.tray_depth_in;

              // Calculate volume utilization based on actual item volumes
              const totalSlotVolume = trayPacking.reduce((sum, tray) => {
                return (
                  sum +
                  tray.slots.reduce((slotSum: number, slot: Slot) => {
                    // Find the divider to get item dimensions
                    const divider = safeDividers.find(
                      (d) => d.sku_id === slot.skuId
                    );

                    if (!divider) return slotSum;

                    // Calculate slot volume based on actual slot dimensions and tray depth
                    // This represents the actual space occupied by the slot in the tray
                    const slotVolume = slot.width * slot.length * trayDepth;

                    // Debug logging
                    console.log(`Volume calculation for ${slot.skuId}:`, {
                      slotWidth: slot.width || "undefined",
                      slotLength: slot.length || "undefined",
                      trayDepth: trayDepth || "undefined",
                      slotVolume: slotVolume || "undefined",
                      dividerLength: divider.length_in || "undefined",
                      dividerWidth: divider.width_in || "undefined",
                      dividerHeight: divider.height_in || "undefined",
                      layers: divider.layers || "undefined",
                    });

                    return slotSum + slotVolume;
                  }, 0)
                );
              }, 0);

              // Debug: Log the actual values being used
              console.log("Volume calculation debug:", {
                configParams,
                trayDimensions,
                trayPackingLength: trayPacking.length,
                width:
                  configParams?.tray_width_in ||
                  trayDimensions?.tray_width_in ||
                  "not set",
                length:
                  configParams?.tray_length_in ||
                  trayDimensions?.tray_length_in ||
                  "not set",
                height: configParams?.tray_height_in || "not set",
                depth: configParams?.tray_depth_in || "not set",
                trayDimensionsDepth: trayDimensions?.tray_depth_in || "not set",
              });

              // Ensure we have valid tray dimensions before calculating
              const trayWidth =
                configParams?.tray_width_in || trayDimensions?.tray_width_in;
              const trayLength =
                configParams?.tray_length_in || trayDimensions?.tray_length_in;

              if (!trayWidth || !trayLength || !trayDepth) {
                console.error(
                  "Missing tray dimensions for volume calculation:",
                  { trayWidth, trayLength, trayDepth }
                );
                return "0.0";
              }

              const totalTrayVolume =
                trayPacking.length * trayWidth * trayLength * trayDepth;

              const volumeUtilization =
                totalTrayVolume > 0
                  ? Math.min((totalSlotVolume / totalTrayVolume) * 100, 100)
                  : 0;

              // Debug the volume calculation
              console.log("Volume utilization calculation:", {
                totalSlotVolume,
                totalTrayVolume,
                calculatedPercentage: (totalSlotVolume / totalTrayVolume) * 100,
                finalPercentage: volumeUtilization,
              });

              return volumeUtilization.toFixed(1);
            })()}
            %
          </p>
          <p className="text-sm text-gray-500">
            {(() => {
              // Get tray dimensions for volume calculation
              const trayDepth =
                configParams?.tray_height_in || trayDimensions?.tray_depth_in;

              const totalSlotVolume = trayPacking.reduce((sum, tray) => {
                return (
                  sum +
                  tray.slots.reduce((slotSum: number, slot: Slot) => {
                    const divider = safeDividers.find(
                      (d) => d.sku_id === slot.skuId
                    );

                    if (!divider) return slotSum;

                    // Calculate slot volume based on actual slot dimensions and tray depth
                    // This represents the actual space occupied by the slot in the tray
                    const slotVolume = slot.width * slot.length * trayDepth;

                    // Debug logging for total volume display
                    console.log(`Total volume calculation for ${slot.skuId}:`, {
                      slotWidth: slot.width || "undefined",
                      slotLength: slot.length || "undefined",
                      trayDepth: trayDepth || "undefined",
                      slotVolume: slotVolume || "undefined",
                      dividerLength: divider.length_in || "undefined",
                      dividerWidth: divider.width_in || "undefined",
                      dividerHeight: divider.height_in || "undefined",
                      layers: divider.layers || "undefined",
                    });

                    return slotSum + slotVolume;
                  }, 0)
                );
              }, 0);

              return totalSlotVolume.toLocaleString();
            })()}{" "}
            /{" "}
            {(() => {
              const trayWidth =
                configParams?.tray_width_in || trayDimensions?.tray_width_in;
              const trayLength =
                configParams?.tray_length_in || trayDimensions?.tray_length_in;
              const trayDepth =
                configParams?.tray_height_in || trayDimensions?.tray_depth_in;

              if (!trayWidth || !trayLength || !trayDepth) {
                return "0";
              }

              return (
                trayPacking.length *
                trayWidth *
                trayLength *
                trayDepth
              ).toLocaleString();
            })()}{" "}
            in³
          </p>
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center space-x-2">
            <BarChart3 className="h-5 w-5 text-indigo-600" />
            <h3 className="font-semibold text-gray-900">Area Utilization</h3>
          </div>
          <p className="text-2xl font-bold text-indigo-600">
            {actualAreaUtilization.toFixed(1)}%
          </p>
          <p className="text-sm text-gray-500">
            {trayPacking
              .reduce(
                (sum, tray) =>
                  sum +
                  tray.slots.reduce(
                    (slotSum: number, slot: Slot) =>
                      slotSum + slot.width * slot.length,
                    0
                  ),
                0
              )
              .toLocaleString()}{" "}
            /{" "}
            {(() => {
              const trayWidth =
                configParams?.tray_width_in || trayDimensions?.tray_width_in;
              const trayLength =
                configParams?.tray_length_in || trayDimensions?.tray_length_in;

              if (!trayWidth || !trayLength) {
                return "0";
              }

              return (
                trayPacking.length *
                trayWidth *
                trayLength
              ).toLocaleString();
            })()}{" "}
            in²
          </p>
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center space-x-2">
            <Package className="h-5 w-5 text-green-600" />
            <h3 className="font-semibold text-gray-900">Total Trays</h3>
          </div>
          <p className="text-2xl font-bold text-green-600">
            {trayPacking.length}
          </p>
          <p className="text-sm text-gray-500">Trays needed</p>
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center space-x-2">
            <BarChart3 className="h-5 w-5 text-purple-600" />
            <h3 className="font-semibold text-gray-900">Total Compartments</h3>
          </div>
          <p className="text-2xl font-bold text-purple-600">
            {totalCompartments}
          </p>
          <p className="text-sm text-gray-500">Total slots</p>
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center space-x-2">
            <Package className="h-5 w-5 text-orange-600" />
            <h3 className="font-semibold text-gray-900">
              On-Shelf Units Total
            </h3>
          </div>
          <p className="text-2xl font-bold text-orange-600">
            {(safeKpis.total_units || 0).toLocaleString()}
          </p>
          <p className="text-sm text-gray-500">Total on-shelf units</p>
        </div>
      </div>

      {/* Content based on active tab */}
      {activeTab === "table" && (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th
                    className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider cursor-pointer ${
                      sortConfig?.key === "sku"
                        ? sortConfig.direction === "asc"
                          ? "bg-blue-50 text-blue-700"
                          : "bg-blue-50 text-blue-700"
                        : "text-gray-500"
                    }`}
                    onClick={() => handleSort("sku")}
                    title="Stock Keeping Unit identifier"
                  >
                    <div className="flex items-center space-x-1">
                      <span className="font-bold">Dimensions</span>
                      {sortConfig?.key === "sku" && (
                        <span className="text-xs">
                          {sortConfig.direction === "asc" ? "↑" : "↓"}
                        </span>
                      )}
                    </div>
                  </th>
                  <th
                    className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider cursor-pointer ${
                      sortConfig?.key === "description"
                        ? sortConfig.direction === "asc"
                          ? "bg-blue-50 text-blue-700"
                          : "bg-blue-50 text-blue-700"
                        : "text-gray-500"
                    }`}
                    onClick={() => handleSort("description")}
                    title="Product description or name"
                  >
                    <div className="flex items-center space-x-1">
                      <span className="font-bold">Description</span>
                      {sortConfig?.key === "description" && (
                        <span className="text-xs">
                          {sortConfig.direction === "asc" ? "↑" : "↓"}
                        </span>
                      )}
                    </div>
                  </th>
                  <th
                    className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider cursor-pointer ${
                      sortConfig?.key === "units"
                        ? sortConfig.direction === "asc"
                          ? "bg-blue-50 text-blue-700"
                          : "bg-blue-50 text-blue-700"
                        : "text-gray-500"
                    }`}
                    onClick={() => handleSort("units")}
                    title="Total on-shelf units required based on demand analysis"
                  >
                    <div className="flex items-center space-x-1">
                      <span className="font-bold">On-Shelf Units</span>
                      {sortConfig?.key === "units" && (
                        <span className="text-xs">
                          {sortConfig.direction === "asc" ? "↑" : "↓"}
                        </span>
                      )}
                    </div>
                  </th>
                  <th
                    className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider cursor-pointer ${
                      sortConfig?.key === "length"
                        ? sortConfig.direction === "asc"
                          ? "bg-blue-50 text-blue-700"
                          : "bg-blue-50 text-blue-700"
                        : "text-gray-500"
                    }`}
                    onClick={() => handleSort("length")}
                    title="Product dimensions in inches (Length × Width × Height)"
                  >
                    <div className="flex items-center space-x-1">
                      <span className="font-bold">Dimensions (L×W×H)</span>
                      {sortConfig?.key === "length" && (
                        <span className="text-xs">
                          {sortConfig.direction === "asc" ? "↑" : "↓"}
                        </span>
                      )}
                    </div>
                  </th>
                  <th
                    className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider cursor-pointer ${
                      sortConfig?.key === "layers"
                        ? sortConfig.direction === "asc"
                          ? "bg-blue-50 text-blue-700"
                          : "bg-blue-50 text-blue-700"
                        : "text-gray-500"
                    }`}
                    onClick={() => handleSort("layers")}
                    title="2D grid layout showing how units are arranged within the slot"
                  >
                    <div className="flex items-center space-x-1">
                      <span className="font-bold">2D Grid Layout</span>
                      {sortConfig?.key === "layers" && (
                        <span className="text-xs">
                          {sortConfig.direction === "asc" ? "↑" : "↓"}
                        </span>
                      )}
                    </div>
                  </th>
                  <th
                    className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider cursor-pointer ${
                      sortConfig?.key === "weight"
                        ? sortConfig.direction === "asc"
                          ? "bg-blue-50 text-blue-700"
                          : "bg-blue-50 text-blue-700"
                        : "text-gray-500"
                    }`}
                    onClick={() => handleSort("weight")}
                    title="Optimized slot dimensions to accommodate the required units"
                  >
                    <div className="flex items-center space-x-1">
                      <span className="font-bold">Slot Size</span>
                      {sortConfig?.key === "weight" && (
                        <span className="text-xs">
                          {sortConfig.direction === "asc" ? "↑" : "↓"}
                        </span>
                      )}
                    </div>
                  </th>
                  <th
                    className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider cursor-pointer ${
                      sortConfig?.key === "trays"
                        ? sortConfig.direction === "asc"
                          ? "bg-blue-50 text-blue-700"
                          : "bg-blue-50 text-blue-700"
                        : "text-gray-500"
                    }`}
                    onClick={() => handleSort("trays")}
                    title="Number of trays required to accommodate all units for this SKU"
                  >
                    <div className="flex items-center space-x-1">
                      <span className="font-bold">Tray Assignment</span>
                      {sortConfig?.key === "trays" && (
                        <span className="text-xs">
                          {sortConfig.direction === "asc" ? "↑" : "↓"}
                        </span>
                      )}
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {paginatedData.map((divider, index) => {
                  const skuId = divider.sku_id || "N/A";
                  const description = divider.description || "N/A";
                  const onShelfUnits = divider.on_shelf_units || 0;
                  const length = divider.length_in || 0;
                  const width = divider.width_in || 0;
                  const height = divider.height_in || 0;
                  const layers = divider.layers || 1;
                  const unitsPerLayer = divider.units_per_layer || onShelfUnits;
                  const gridDim1 = divider.grid_dim1 || 0;
                  const gridDim2 = divider.grid_dim2 || 0;
                  const heightOrientation =
                    divider.height_orientation ||
                    divider.layer_orientation ||
                    "height";

                  // Calculate which dimensions should be bolded based on height orientation
                  let lengthBold = false;
                  let widthBold = false;
                  let heightBold = false;

                  if (heightOrientation === "width") {
                    // Width used for height stacking, so length and height are used for 2D grid
                    lengthBold = true;
                    heightBold = true;
                  } else if (heightOrientation === "height") {
                    // Height used for height stacking, so length and width are used for 2D grid
                    lengthBold = true;
                    widthBold = true;
                  } else if (heightOrientation === "length") {
                    // Length used for height stacking, so width and height are used for 2D grid
                    widthBold = true;
                    heightBold = true;
                  }

                  // Calculate 2D grid optimization based on tray capacity
                  const calculate2DGrid = (
                    units: number,
                    dim1: number,
                    dim2: number,
                    trayWidth: number,
                    trayLength: number
                  ) => {
                    if (units <= 0 || dim1 <= 0 || dim2 <= 0)
                      return {
                        rows: 1,
                        cols: 1,
                        efficiency: 0,
                        traysNeeded: 1,
                        slotWidth: dim1,
                        slotLength: dim2,
                        gridLayout: "1×1",
                        unitsPerTray: 1,
                      };

                    // Calculate how many units can fit in one tray
                    const unitsPerRow = Math.floor(trayWidth / dim1);
                    const rowsPerTray = Math.floor(trayLength / dim2);
                    const unitsPerTray = unitsPerRow * rowsPerTray;

                    // Calculate how many trays we need
                    const traysNeeded = Math.ceil(units / unitsPerTray);

                    // Calculate the actual grid arrangement for the last tray
                    const unitsInLastTray =
                      units % unitsPerTray || unitsPerTray;
                    const rowsInLastTray = Math.ceil(
                      unitsInLastTray / unitsPerRow
                    );
                    const colsInLastTray = Math.min(
                      unitsInLastTray,
                      unitsPerRow
                    );

                    // Calculate slot size needed for this arrangement
                    // Use the last tray arrangement as it represents the actual space needed
                    const slotWidth = Math.ceil(colsInLastTray * dim1);
                    const slotLength = Math.ceil(rowsInLastTray * dim2);

                    // Calculate efficiency (units per tray area)
                    const trayArea = trayWidth * trayLength;
                    const efficiency = unitsPerTray / trayArea;

                    // Generate grid layout description
                    let gridLayout = `${rowsPerTray}×${unitsPerRow}`;
                    if (traysNeeded > 1) {
                      gridLayout += ` (${traysNeeded} trays)`;
                    }

                    return {
                      rows: rowsPerTray,
                      cols: unitsPerRow,
                      efficiency: efficiency,
                      traysNeeded: traysNeeded,
                      slotWidth: slotWidth,
                      slotLength: slotLength,
                      gridLayout: gridLayout,
                      unitsPerTray: unitsPerTray,
                      unitsInLastTray: unitsInLastTray,
                      rowsInLastTray: rowsInLastTray,
                      colsInLastTray: colsInLastTray,
                    };
                  };

                  // Get tray dimensions from props or use defaults
                  const trayWidth = trayDimensions?.tray_width_in;
                  const trayLength = trayDimensions?.tray_length_in;
                  const bufferPct = trayDimensions?.buffer_pct;
                  const effectiveTrayWidth = trayWidth * bufferPct;
                  const effectiveTrayLength = trayLength * bufferPct;

                  const gridResult = calculate2DGrid(
                    unitsPerLayer,
                    gridDim1,
                    gridDim2,
                    effectiveTrayWidth,
                    effectiveTrayLength
                  );

                  // Tray packing optimization - First Fit Decreasing algorithm
                  const packSlotsIntoTrays = (
                    slots: Array<{
                      skuId: string;
                      width: number;
                      length: number;
                      units: number;
                    }>
                  ) => {
                    const trayWidth = effectiveTrayWidth;
                    const trayLength = effectiveTrayLength;
                    const trays: Array<{
                      id: number;
                      slots: Array<{
                        skuId: string;
                        x: number;
                        y: number;
                        width: number;
                        length: number;
                        units: number;
                      }>;
                      remainingSpace: number;
                    }> = [];

                    // Sort slots by area (largest first) for better packing
                    const sortedSlots = [...slots].sort(
                      (a, b) => b.width * b.length - a.width * a.length
                    );

                    for (const slot of sortedSlots) {
                      let placed = false;

                      // Try to place in existing trays
                      for (
                        let trayIndex = 0;
                        trayIndex < trays.length;
                        trayIndex++
                      ) {
                        const tray = trays[trayIndex];

                        // Check if slot fits in this tray
                        if (
                          slot.width <= trayWidth &&
                          slot.length <= trayLength
                        ) {
                          // Simple placement: try to place at (0,0) first
                          const canPlace = !tray.slots.some(
                            (existingSlot) =>
                              0 < existingSlot.x + existingSlot.width &&
                              slot.width > existingSlot.x &&
                              0 < existingSlot.y + existingSlot.length &&
                              slot.length > existingSlot.y
                          );

                          if (canPlace) {
                            tray.slots.push({
                              ...slot,
                              x: 0,
                              y: 0,
                            });
                            tray.remainingSpace -= slot.width * slot.length;
                            placed = true;
                            break;
                          }
                        }
                      }

                      // If couldn't place in existing trays, create new tray
                      if (!placed) {
                        const newTray = {
                          id: trays.length + 1,
                          slots: [
                            {
                              ...slot,
                              x: 0,
                              y: 0,
                            },
                          ],
                          remainingSpace:
                            trayWidth * trayLength - slot.width * slot.length,
                        };
                        trays.push(newTray);
                      }
                    }

                    return trays;
                  };

                  return (
                    <tr key={index} className="hover:bg-gray-50 cursor-pointer">
                      <td className="px-6 py-4 text-sm font-medium text-gray-900 break-words">
                        {skuId}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 break-words">
                        {description}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {onShelfUnits.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        <span className={lengthBold ? "font-bold" : ""}>
                          {length.toFixed(1)}
                        </span>{" "}
                        ×{" "}
                        <span className={widthBold ? "font-bold" : ""}>
                          {width.toFixed(1)}
                        </span>{" "}
                        ×{" "}
                        <span className={heightBold ? "font-bold" : ""}>
                          {height.toFixed(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        <div className="space-y-1">
                          <div className="font-medium">
                            {gridResult.gridLayout}
                          </div>
                          <div className="text-xs text-gray-500">
                            {gridResult.unitsPerTray * layers} units capacity
                            per tray
                          </div>
                          <div className="text-xs text-gray-500">
                            ({gridResult.unitsPerTray} per layer × {layers}{" "}
                            layers)
                          </div>
                          <div className="text-xs text-gray-500">
                            {gridResult.traysNeeded > 1
                              ? `${gridResult.traysNeeded} trays needed`
                              : "Fits in 1 tray"}
                          </div>
                          <div className="text-xs text-gray-500">
                            Tray: {gridResult.slotWidth.toFixed(1)}" ×{" "}
                            {gridResult.slotLength.toFixed(1)}"
                          </div>
                          <div className="text-xs text-gray-500">
                            Unit: {gridDim1.toFixed(1)}" × {gridDim2.toFixed(1)}
                            "
                          </div>
                          <div className="text-xs text-gray-500">
                            Layers: {layers}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        <div className="font-medium">
                          {(() => {
                            // Get all slot sizes for this SKU from the tray packing
                            const skuSlots: Slot[] = trayPacking
                              .flatMap((tray) => tray.slots)
                              .filter((slot) => slot.skuId === skuId);

                            if (skuSlots.length === 0) {
                              return `${gridResult.slotWidth}" × ${gridResult.slotLength}"`;
                            }

                            // Group slots by their dimensions to show unique slot sizes
                            const uniqueSlotSizes = skuSlots.reduce(
                              (acc, slot: Slot) => {
                                const key = `${slot.width}×${slot.length}`;
                                if (!acc[key]) {
                                  acc[key] = {
                                    width: slot.width,
                                    length: slot.length,
                                    count: 0,
                                    totalUnits: 0,
                                  };
                                }
                                acc[key].count++;
                                // Get the divider to find layers
                                const divider = safeDividers.find(
                                  (d) => d.sku_id === slot.skuId
                                );
                                const layers = divider?.layers || 1;
                                // Total units = units per slot × layers
                                acc[key].totalUnits +=
                                  (slot.units || 0) * layers;
                                return acc;
                              },
                              {} as Record<
                                string,
                                {
                                  width: number;
                                  length: number;
                                  count: number;
                                  totalUnits: number;
                                }
                              >
                            );

                            const slotSizeEntries =
                              Object.values(uniqueSlotSizes);

                            if (slotSizeEntries.length === 1) {
                              const slot = slotSizeEntries[0];
                              return `${slot.width}" × ${slot.length}"`;
                            } else {
                              // Show multiple slot sizes
                              return slotSizeEntries
                                .map(
                                  (slot) => `${slot.width}" × ${slot.length}"`
                                )
                                .join(", ");
                            }
                          })()}
                        </div>
                        <div className="text-xs text-gray-500">
                          {(() => {
                            const skuSlots: Slot[] = trayPacking
                              .flatMap((tray) => tray.slots)
                              .filter((slot) => slot.skuId === skuId);

                            if (skuSlots.length === 0) {
                              const unitsInLastTray =
                                gridResult.unitsInLastTray ||
                                gridResult.unitsPerTray;
                              return `${unitsInLastTray * layers} units in last tray (${unitsInLastTray} per layer × ${layers} layers)`;
                            }

                            // Group by slot dimensions and show units for each
                            const uniqueSlotSizes = skuSlots.reduce(
                              (acc, slot: Slot) => {
                                const key = `${slot.width}×${slot.length}`;
                                if (!acc[key]) {
                                  acc[key] = {
                                    width: slot.width,
                                    length: slot.length,
                                    count: 0,
                                    totalUnits: 0,
                                  };
                                }
                                acc[key].count++;
                                // Get the divider to find layers
                                const divider = safeDividers.find(
                                  (d) => d.sku_id === slot.skuId
                                );
                                const layers = divider?.layers || 1;
                                // Total units = units per slot × layers
                                acc[key].totalUnits +=
                                  (slot.units || 0) * layers;
                                return acc;
                              },
                              {} as Record<
                                string,
                                {
                                  width: number;
                                  length: number;
                                  count: number;
                                  totalUnits: number;
                                }
                              >
                            );

                            const slotSizeEntries =
                              Object.values(uniqueSlotSizes);

                            if (slotSizeEntries.length === 1) {
                              const slot = slotSizeEntries[0];
                              return `${slot.totalUnits} units total`;
                            } else {
                              // Show units for each slot size
                              return slotSizeEntries
                                .map(
                                  (slot) =>
                                    `${slot.totalUnits} units (${slot.count} slots)`
                                )
                                .join(", ");
                            }
                          })()}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        <div className="font-medium">
                          {(() => {
                            const trayAssignments = trayPacking.filter((tray) =>
                              tray.slots.some(
                                (slot: Slot) => slot.skuId === skuId
                              )
                            );
                            if (trayAssignments.length === 0)
                              return "Unassigned";
                            if (trayAssignments.length === 1)
                              return `Tray ${trayAssignments[0].id}`;

                            // For multiple trays, show all tray numbers
                            const trayNumbers = trayAssignments
                              .map((tray) => tray.id)
                              .sort((a, b) => a - b);
                            return `Trays ${trayNumbers.join("/")}`;
                          })()}
                        </div>
                        <div className="text-xs text-gray-500">
                          {(() => {
                            const trayAssignments = trayPacking.filter((tray) =>
                              tray.slots.some(
                                (slot: Slot) => slot.skuId === skuId
                              )
                            );
                            if (trayAssignments.length > 0) {
                              // Calculate average area utilization
                              const avgAreaUtilization =
                                (trayAssignments.reduce((sum, tray) => {
                                  const trayWidth =
                                    configParams?.tray_width_in ||
                                    trayDimensions?.tray_width_in;
                                  const trayLength =
                                    configParams?.tray_length_in ||
                                    trayDimensions?.tray_length_in;
                                  const totalArea = trayWidth * trayLength;
                                  const usedArea = tray.slots.reduce(
                                    (slotSum: number, slot: Slot) =>
                                      slotSum + slot.width * slot.length,
                                    0
                                  );
                                  return sum + usedArea / totalArea;
                                }, 0) /
                                  trayAssignments.length) *
                                100;

                              // Calculate average volume utilization
                              const avgVolumeUtilization =
                                (trayAssignments.reduce((sum, tray) => {
                                  const trayWidth =
                                    configParams?.tray_width_in ||
                                    trayDimensions?.tray_width_in;
                                  const trayLength =
                                    configParams?.tray_length_in ||
                                    trayDimensions?.tray_length_in;
                                  const trayDepth =
                                    configParams?.tray_height_in ||
                                    trayDimensions?.tray_depth_in;
                                  const totalVolume =
                                    trayWidth * trayLength * trayDepth;

                                  const usedVolume = tray.slots.reduce(
                                    (slotSum: number, slot: Slot) => {
                                      const divider = safeDividers.find(
                                        (d) => d.sku_id === slot.skuId
                                      );

                                      if (!divider) return slotSum;

                                      // Calculate volume per unit: length × width × height
                                      const volumePerUnit =
                                        divider.length_in *
                                        divider.width_in *
                                        divider.height_in;

                                      // Total volume for this slot = volume per unit × number of units
                                      const slotVolume =
                                        volumePerUnit * (slot.units || 0);
                                      return slotSum + slotVolume;
                                    },
                                    0
                                  );
                                  return sum + usedVolume / totalVolume;
                                }, 0) /
                                  trayAssignments.length) *
                                100;

                              if (trayAssignments.length === 1) {
                                return `${avgAreaUtilization.toFixed(1)}% area, ${Math.min(avgVolumeUtilization, 100).toFixed(1)}% volume`;
                              } else {
                                return `${avgAreaUtilization.toFixed(1)}% avg area, ${Math.min(avgVolumeUtilization, 100).toFixed(1)}% avg volume`;
                              }
                            }
                            return "";
                          })()}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-700">
                    Showing {startIndex + 1} to{" "}
                    {Math.min(endIndex, sortedData.length)} of{" "}
                    {sortedData.length} results
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() =>
                        setCurrentPage(Math.max(1, currentPage - 1))
                      }
                      disabled={currentPage === 1}
                      className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Previous
                    </button>

                    <div className="flex items-center space-x-1">
                      {Array.from(
                        { length: Math.min(5, totalPages) },
                        (_, i) => {
                          let pageNum;
                          if (totalPages <= 5) {
                            pageNum = i + 1;
                          } else if (currentPage <= 3) {
                            pageNum = i + 1;
                          } else if (currentPage >= totalPages - 2) {
                            pageNum = totalPages - 4 + i;
                          } else {
                            pageNum = currentPage - 2 + i;
                          }

                          return (
                            <button
                              key={pageNum}
                              onClick={() => setCurrentPage(pageNum)}
                              className={`px-3 py-1 text-sm border rounded-md ${
                                currentPage === pageNum
                                  ? "bg-blue-600 text-white border-blue-600"
                                  : "border-gray-300 hover:bg-gray-50"
                              }`}
                            >
                              {pageNum}
                            </button>
                          );
                        }
                      )}
                    </div>

                    <button
                      onClick={() =>
                        setCurrentPage(Math.min(totalPages, currentPage + 1))
                      }
                      disabled={currentPage === totalPages}
                      className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Next
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tray Summary View */}
      {activeTab === "tray-summary" && (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-lg font-bold text-gray-900">
                  Tray Summary
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  Summary of tray allocation and optimization results
                </p>
              </div>
            </div>
          </div>
          <div className="p-6">
            {/* Tray Summary Table */}
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Tray ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      SKUs in Tray
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Total Slots
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Space Utilization
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Remaining Space
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {trayPacking.map((tray) => {
                    const trayWidth =
                      (configParams?.tray_width_in ||
                        trayDimensions?.tray_width_in ||
                        36) *
                      (configParams?.buffer_pct ||
                        trayDimensions?.buffer_pct ||
                        0.95);
                    const trayLength =
                      (configParams?.tray_length_in ||
                        trayDimensions?.tray_length_in ||
                        156) *
                      (configParams?.buffer_pct ||
                        trayDimensions?.buffer_pct ||
                        0.95);
                    const totalArea = trayWidth * trayLength;
                    const usedArea = tray.slots.reduce(
                      (sum: number, slot: Slot) =>
                        sum + slot.width * slot.length,
                      0
                    );
                    const utilization = (usedArea / totalArea) * 100;
                    const remainingSpace = totalArea - usedArea;

                    // Get unique SKUs in this tray
                    const uniqueSkus = [
                      ...new Set<string>(
                        tray.slots.map((slot: Slot) => slot.skuId)
                      ),
                    ];

                    // Get descriptions and actual units per tray for SKUs
                    const skuDetails = uniqueSkus.map((skuId: string) => {
                      const divider = safeDividers.find(
                        (d) => d.sku_id === skuId
                      );

                      // Count how many slots this SKU has in this specific tray
                      const slotsInThisTray = tray.slots.filter(
                        (slot: Slot) => slot.skuId === skuId
                      );

                      // Calculate actual units in this specific tray by summing slot units
                      const actualUnitsInTray = slotsInThisTray.reduce(
                        (sum: number, slot: Slot) => sum + (slot.units || 1),
                        0
                      );

                      return {
                        skuId,
                        description: divider?.description || "N/A",
                        units: actualUnitsInTray,
                      };
                    });

                    return (
                      <tr
                        key={tray.id}
                        className="hover:bg-gray-50 cursor-pointer transition-colors"
                        onClick={() => handleTrayClick(tray)}
                      >
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          Tray {tray.id}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          <div className="space-y-1">
                            {skuDetails.map((sku) => (
                              <div
                                key={sku.skuId}
                                className="flex items-center space-x-2"
                              >
                                <span className="font-medium text-blue-600">
                                  {sku.skuId}
                                </span>
                                <span className="text-gray-500">-</span>
                                <span className="text-gray-700">
                                  {sku.description}
                                </span>
                                <span className="text-gray-500">
                                  ({sku.units.toLocaleString()} units)
                                </span>
                              </div>
                            ))}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {tray.slots.length}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <div className="flex items-center space-x-2">
                            <div className="w-16 bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-blue-600 h-2 rounded-full"
                                style={{ width: `${utilization}%` }}
                              ></div>
                            </div>
                            <span className="text-sm font-medium">
                              {utilization.toFixed(1)}%
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {remainingSpace.toFixed(0)} in²
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {trayPacking.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <p>No tray data available.</p>
                  <p className="text-sm mt-2">
                    Run optimization to see tray allocation results.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tray Layouts View */}
      {activeTab === "trays" && (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-lg font-bold text-gray-900">
                  Tray Layouts ({trayPacking.length} trays)
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  Visual representation of how SKUs are packed into trays
                </p>
              </div>
            </div>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {trayPacking.map((tray) => {
                const trayWidth =
                  (configParams?.tray_width_in ||
                    trayDimensions?.tray_width_in ||
                    36) *
                  (configParams?.buffer_pct ||
                    trayDimensions?.buffer_pct ||
                    0.95);
                const trayLength =
                  (configParams?.tray_length_in ||
                    trayDimensions?.tray_length_in ||
                    156) *
                  (configParams?.buffer_pct ||
                    trayDimensions?.buffer_pct ||
                    0.95);
                const trayDepth =
                  configParams?.tray_height_in || trayDimensions?.tray_depth_in;
                const utilization = (
                  (tray.slots.reduce(
                    (sum: number, slot: Slot) => sum + slot.width * slot.length,
                    0
                  ) /
                    (trayWidth * trayLength)) *
                  100
                ).toFixed(1);

                return (
                  <TraySVGVisualization
                    key={tray.id}
                    trayId={tray.id}
                    slots={tray.slots}
                    trayWidth={trayWidth}
                    trayLength={trayLength}
                    utilization={utilization}
                    slotCount={tray.slots.length}
                    remainingSpace={tray.remainingSpace}
                    highlightSku={traySearchSku}
                  />
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Tray Detail Modal */}
      {showTrayModal && selectedTray && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <div>
                <h3 className="text-xl font-bold text-gray-900">
                  Tray {selectedTray.id} Details
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  Detailed view of tray contents and layout
                </p>
              </div>
              <button
                onClick={closeTrayModal}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left Column - Tray Information */}
                <div className="space-y-6">
                  {/* Tray Statistics */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="font-semibold text-gray-900 mb-3">
                      Tray Statistics
                    </h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">Total Slots:</span>
                        <span className="ml-2 font-medium">
                          {selectedTray.slots.length}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600">Unique SKUs:</span>
                        <span className="ml-2 font-medium">
                          {
                            [
                              ...new Set(
                                selectedTray.slots.map(
                                  (slot: Slot) => slot.skuId
                                )
                              ),
                            ].length
                          }
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600">
                          Space Utilization:
                        </span>
                        <span className="ml-2 font-medium">
                          {(() => {
                            const trayWidth =
                              (configParams?.tray_width_in ||
                                trayDimensions?.tray_width_in ||
                                36) *
                              (configParams?.buffer_pct ||
                                trayDimensions?.buffer_pct ||
                                0.95);
                            const trayLength =
                              (configParams?.tray_length_in ||
                                trayDimensions?.tray_length_in ||
                                156) *
                              (configParams?.buffer_pct ||
                                trayDimensions?.buffer_pct ||
                                0.95);
                            const totalArea = trayWidth * trayLength;
                            const usedArea = selectedTray.slots.reduce(
                              (sum: number, slot: Slot) =>
                                sum + slot.width * slot.length,
                              0
                            );
                            return (
                              ((usedArea / totalArea) * 100).toFixed(1) + "%"
                            );
                          })()}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600">Remaining Space:</span>
                        <span className="ml-2 font-medium">
                          {selectedTray.remainingSpace.toFixed(0)} in²
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* SKU Details Table */}
                  <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                    <div className="px-4 py-3 border-b border-gray-200">
                      <h4 className="font-semibold text-gray-900">
                        SKUs in Tray
                      </h4>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              SKU
                            </th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Description
                            </th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Slots
                            </th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Units
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {(() => {
                            const uniqueSkus = [
                              ...new Set<string>(
                                selectedTray.slots.map(
                                  (slot: Slot) => slot.skuId
                                )
                              ),
                            ];
                            return uniqueSkus.map((skuId: string) => {
                              const divider = safeDividers.find(
                                (d) => d.sku_id === skuId
                              );
                              const slotsInThisTray = selectedTray.slots.filter(
                                (slot: Slot) => slot.skuId === skuId
                              );
                              const actualUnitsInTray = slotsInThisTray.reduce(
                                (sum: number, slot: Slot) =>
                                  sum + (slot.units || 1),
                                0
                              );

                              return (
                                <tr key={skuId}>
                                  <td className="px-4 py-2 text-sm font-medium text-blue-600">
                                    {skuId}
                                  </td>
                                  <td className="px-4 py-2 text-sm text-gray-900">
                                    {divider?.description || "N/A"}
                                  </td>
                                  <td className="px-4 py-2 text-sm text-gray-900">
                                    {slotsInThisTray.length}
                                  </td>
                                  <td className="px-4 py-2 text-sm text-gray-900">
                                    {actualUnitsInTray.toLocaleString()}
                                  </td>
                                </tr>
                              );
                            });
                          })()}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Slot Details */}
                  <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                    <div className="px-4 py-3 border-b border-gray-200">
                      <h4 className="font-semibold text-gray-900">
                        Slot Details
                      </h4>
                    </div>
                    <div className="overflow-x-auto max-h-48 overflow-y-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50 sticky top-0">
                          <tr>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              SKU
                            </th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Position
                            </th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Size
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {selectedTray.slots.map(
                            (slot: Slot, index: number) => (
                              <tr key={index}>
                                <td className="px-4 py-2 text-sm font-medium text-blue-600">
                                  {slot.skuId}
                                </td>
                                <td className="px-4 py-2 text-sm text-gray-900">
                                  ({slot.x}, {slot.y})
                                </td>
                                <td className="px-4 py-2 text-sm text-gray-900">
                                  {slot.width}" × {slot.length}"
                                </td>
                              </tr>
                            )
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                {/* Right Column - Large Tray Visualization */}
                <div className="space-y-4">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="font-semibold text-gray-900 mb-3">
                      Tray Layout Visualization
                    </h4>

                    {/* Large Tray Visualization */}
                    <div className="border border-gray-200 rounded-lg p-4 bg-white">
                      {(() => {
                        const trayWidth =
                          (configParams?.tray_width_in ||
                            trayDimensions?.tray_width_in ||
                            36) *
                          (configParams?.buffer_pct ||
                            trayDimensions?.buffer_pct ||
                            0.95);
                        const trayLength =
                          (configParams?.tray_length_in ||
                            trayDimensions?.tray_length_in ||
                            156) *
                          (configParams?.buffer_pct ||
                            trayDimensions?.buffer_pct ||
                            0.95);
                        const trayDepth =
                          configParams?.tray_height_in ||
                          trayDimensions?.tray_depth_in;
                        const utilization = (
                          (selectedTray.slots.reduce(
                            (sum: number, slot: Slot) =>
                              sum + slot.width * slot.length,
                            0
                          ) /
                            (trayWidth * trayLength)) *
                          100
                        ).toFixed(1);

                        return (
                          <TraySVGVisualization
                            trayId={selectedTray.id}
                            slots={selectedTray.slots}
                            trayWidth={trayWidth}
                            trayLength={trayLength}
                            utilization={utilization}
                            slotCount={selectedTray.slots.length}
                            remainingSpace={selectedTray.remainingSpace}
                            highlightSku={undefined}
                          />
                        );
                      })()}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
