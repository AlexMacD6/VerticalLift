"use client";
import { useState, useEffect, forwardRef, useImperativeHandle } from "react";
import { RefreshCw, Database } from "lucide-react";
import { useRouter } from "next/navigation";
import { API_ENDPOINTS } from "../lib/api";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface InventoryItem {
  id: number;
  sku_id: string;
  description: string;
  length_in: number;
  width_in: number;
  height_in: number;
  weight_lb: number;
  on_hand_units: number;
  annual_units_sold: number;
  daily_picks: number;
  demand_std_dev: number;
  toss_bin_candidate?: boolean;
}

export interface DataTableRef {
  fetchInventory: () => void;
}

const TEMPLATE_COLUMNS = [
  { header: "SKU", key: "sku_id", isCalculated: false },
  { header: "Product Name", key: "description", isCalculated: false },
  { header: "Length (in)", key: "length_in", isCalculated: false },
  { header: "Width (in)", key: "width_in", isCalculated: false },
  { header: "Height (in)", key: "height_in", isCalculated: false },
  { header: "Weight (lb)", key: "weight_lb", isCalculated: false },
  { header: "In Stock", key: "on_hand_units", isCalculated: false },
  { header: "Annual Sales", key: "annual_units_sold", isCalculated: false },
];

// Add calculated columns
const CALCULATED_COLUMNS = [
  { header: "Daily Picks", key: "daily_picks", isCalculated: true },
  { header: "Demand Variability", key: "demand_std_dev", isCalculated: true },
  { header: "Toss Bin", key: "toss_bin_candidate", isCalculated: true },
];

const ALL_COLUMNS = [...TEMPLATE_COLUMNS, ...CALCULATED_COLUMNS];

interface DataTableProps {
  inventoryListId?: string;
  onListSaved?: () => void;
  uploadedData?: { skuData?: any[]; dailyData?: any[] } | null;
  salesMode?: "annual" | "daily";
}

const DataTable = forwardRef<DataTableRef, DataTableProps>((props, ref) => {
  const {
    inventoryListId,
    onListSaved,
    uploadedData = null,
    salesMode = "annual",
  } = props;
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [dailySales, setDailySales] = useState<any[]>([]);
  const [skuPage, setSkuPage] = useState(1);
  const [dailyPage, setDailyPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sortField, setSortField] = useState<string>("");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [chartView, setChartView] = useState<boolean>(false);
  const [selectedSkus, setSelectedSkus] = useState<string[]>([]);
  const router = useRouter();
  const PAGE_SIZE = 50;

  // Only fetch if inventoryListId is set
  const fetchInventory = async () => {
    if (!inventoryListId) {
      setInventory([]);
      setLoading(false);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(API_ENDPOINTS.inventory(inventoryListId));
      if (response.ok) {
        const data = await response.json();
        setInventory(data);
      } else {
        setError("Failed to fetch inventory data");
      }
    } catch (error) {
      setError("Network error while fetching inventory");
      console.error("Error fetching inventory:", error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch daily sales data
  const fetchDailySales = async () => {
    if (!inventoryListId) {
      setDailySales([]);
      return;
    }
    try {
      const response = await fetch(API_ENDPOINTS.dailySales(inventoryListId));
      if (response.ok) {
        const data = await response.json();
        setDailySales(data);
      } else {
        console.error("Failed to fetch daily sales data");
      }
    } catch (error) {
      console.error("Error fetching daily sales:", error);
    }
  };

  // Helper to determine if an SKU is a Toss Bin candidate
  const isTossBinCandidate = (item: InventoryItem): boolean => {
    // Calculate volume in cubic inches
    const volume = item.length_in * item.width_in * item.height_in;

    // Toss Bin criteria:
    // 1. Small volume (less than 50 cubic inches)
    // 2. Low weight (less than 2 lbs)
    return volume < 50 && item.weight_lb < 2;
  };

  // Helper to paginate data
  function paginate(arr: any[] | undefined, page: number) {
    const safeArr = arr || [];
    const start = (page - 1) * PAGE_SIZE;
    return safeArr.slice(start, start + PAGE_SIZE);
  }

  // Sorting function
  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  // Sort data based on current sort field and direction
  const getSortedData = (data: any[]) => {
    if (!sortField) return data;

    return [...data].sort((a, b) => {
      let aVal = a[sortField];
      let bVal = b[sortField];

      // Handle numeric values
      if (typeof aVal === "number" && typeof bVal === "number") {
        return sortDirection === "asc" ? aVal - bVal : bVal - aVal;
      }

      // Handle string values
      aVal = String(aVal || "").toLowerCase();
      bVal = String(bVal || "").toLowerCase();

      if (sortDirection === "asc") {
        return aVal.localeCompare(bVal);
      } else {
        return bVal.localeCompare(aVal);
      }
    });
  };

  // Process daily sales data for chart
  const processChartData = () => {
    if (!dailySales.length) return [];

    // Group sales by month and SKU
    const monthlyData = new Map<string, any>();

    dailySales.forEach((sale) => {
      const date = new Date(sale.date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      const monthName = date.toLocaleDateString("en-US", {
        month: "short",
        year: "numeric",
      });

      if (!monthlyData.has(monthKey)) {
        monthlyData.set(monthKey, {
          month: monthName,
          monthKey: monthKey,
          data: new Map(),
        });
      }

      const monthEntry = monthlyData.get(monthKey);
      const skuId = sale.sku_id;

      if (!monthEntry.data.has(skuId)) {
        monthEntry.data.set(skuId, 0);
      }

      monthEntry.data.set(skuId, monthEntry.data.get(skuId) + sale.units_sold);
    });

    // Convert to chart format
    const chartData = Array.from(monthlyData.values())
      .sort((a, b) => a.monthKey.localeCompare(b.monthKey))
      .map((month) => {
        const dataPoint: any = { month: month.month };

        // Add each SKU's sales to the data point
        month.data.forEach((sales: number, skuId: string) => {
          dataPoint[skuId] = sales;
        });

        return dataPoint;
      });

    return chartData;
  };

  // Get unique SKUs for chart colors
  const getUniqueSkus = () => {
    const skuSet = new Set<string>();
    dailySales.forEach((sale) => skuSet.add(sale.sku_id));
    return Array.from(skuSet).slice(0, 10); // Limit to first 10 SKUs for readability
  };

  // Get all unique SKUs
  const getAllUniqueSkus = () => {
    const skuSet = new Set<string>();
    dailySales.forEach((sale) => skuSet.add(sale.sku_id));
    return Array.from(skuSet).sort();
  };

  // Initialize selected SKUs when daily sales data changes
  useEffect(() => {
    if (dailySales.length > 0 && selectedSkus.length === 0) {
      const allSkus = getAllUniqueSkus();
      setSelectedSkus(allSkus.slice(0, 5)); // Default to first 5 SKUs
    }
  }, [dailySales]);

  // Handle SKU selection
  const handleSkuSelection = (sku: string, isSelected: boolean) => {
    if (isSelected) {
      setSelectedSkus((prev) => [...prev, sku]);
    } else {
      setSelectedSkus((prev) => prev.filter((s) => s !== sku));
    }
  };

  // Select all SKUs
  const selectAllSkus = () => {
    setSelectedSkus(getAllUniqueSkus());
  };

  // Clear all SKU selections
  const clearAllSkus = () => {
    setSelectedSkus([]);
  };

  // Reset pages when switching tabs
  useEffect(() => {
    setSkuPage(1);
    setDailyPage(1);
  }, [salesMode]);

  useImperativeHandle(ref, () => ({
    fetchInventory,
  }));

  useEffect(() => {
    if (inventoryListId) {
      fetchInventory();
      fetchDailySales();
    } else {
      setInventory([]);
      setDailySales([]);
      setError(null);
      setLoading(false);
    }
  }, [inventoryListId]);

  // If no inventory list is selected, show prompt
  if (!inventoryListId) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No Inventory List Selected
          </h3>
          <p className="text-gray-600 mb-4">
            Please select an inventory list above to view its data.
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="h-6 w-6 animate-spin text-blue-600" />
        <span className="ml-2 text-gray-600">Loading inventory data...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <Database className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={fetchInventory}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Check if we should show empty state based on sales mode
  const shouldShowEmptyState =
    salesMode === "annual" ? inventory.length === 0 : dailySales.length === 0;

  if (shouldShowEmptyState) {
    // If uploadedData is present and has data, do not show empty state
    if (
      uploadedData &&
      ((uploadedData.skuData && uploadedData.skuData.length > 0) ||
        (uploadedData.dailyData && uploadedData.dailyData.length > 0))
    ) {
      return null;
    }
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="flex items-center justify-center p-8">
          <div className="text-center">
            <Database className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {salesMode === "annual"
                ? "No SKU Master Data"
                : "No Daily Sales Data"}
            </h3>
            <p className="text-gray-600 mb-4">
              {salesMode === "annual"
                ? "Import inventory data using the Upload tab to see it displayed here."
                : "Import daily sales data using the Upload tab to see it displayed here."}
            </p>
            <button
              onClick={
                salesMode === "annual" ? fetchInventory : fetchDailySales
              }
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="px-6 py-4 border-b border-gray-200 flex items-center gap-4">
        <div className="flex-1 flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900">
            {salesMode === "annual"
              ? `Annual Sales (${inventory.length} SKUs)`
              : `Daily Sales (${dailySales.length} records)`}
          </h3>
          <div className="flex items-center space-x-2">
            <button
              onClick={
                salesMode === "annual" ? fetchInventory : fetchDailySales
              }
              className="flex items-center space-x-2 px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
            >
              <RefreshCw className="h-4 w-4" />
              <span>Refresh</span>
            </button>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        {salesMode === "annual" ? (
          // SKU Master Data Table
          <div>
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                {/* Calculated header row */}
                <tr>
                  {ALL_COLUMNS.map((col) => (
                    <th
                      key={col.key + "-calc"}
                      colSpan={1}
                      className={`px-4 py-2 text-center text-xs font-bold uppercase tracking-wider border-b border-gray-200 ${
                        col.isCalculated
                          ? "bg-yellow-100 text-yellow-800"
                          : "bg-gray-50 text-gray-700"
                      }`}
                    >
                      {col.isCalculated ? "Calculated" : ""}
                    </th>
                  ))}
                </tr>
                {/* Column headers with sorting */}
                <tr className="bg-gray-50">
                  {ALL_COLUMNS.map((col) => (
                    <th
                      key={col.key}
                      onClick={() => handleSort(col.key)}
                      className={`px-4 py-3 text-center text-xs font-bold text-gray-700 uppercase tracking-wider border-b border-gray-200 cursor-pointer hover:bg-gray-100 transition-colors ${
                        col.isCalculated ? "bg-yellow-50" : ""
                      }`}
                      title={
                        col.key === "toss_bin_candidate"
                          ? "SKUs that are small (volume < 50 in³) and light (weight < 2 lbs). These physical characteristics make them better suited for simple bin storage rather than organized divider optimization."
                          : ""
                      }
                    >
                      <div className="flex items-center justify-center space-x-1">
                        <span>{col.header}</span>
                        {col.key === "toss_bin_candidate" && (
                          <span className="text-gray-400 ml-1">ℹ️</span>
                        )}
                        {sortField === col.key && (
                          <span className="text-gray-500">
                            {sortDirection === "asc" ? "↑" : "↓"}
                          </span>
                        )}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {paginate(getSortedData(inventory), skuPage).map((item) => {
                  // Calculate values
                  const dailyPicks = item.annual_units_sold
                    ? item.annual_units_sold / 365
                    : 0;
                  const demandStdDev = dailyPicks * 0.3;
                  const tossBinCandidate = isTossBinCandidate(item);

                  return (
                    <tr key={item.id} className="hover:bg-gray-50">
                      {ALL_COLUMNS.map((col) => (
                        <td
                          key={col.key}
                          className={`px-4 py-3 text-center text-sm border-b border-gray-100 ${
                            col.isCalculated
                              ? "bg-yellow-50 font-semibold"
                              : "text-gray-900"
                          }`}
                        >
                          {(() => {
                            if (col.key === "daily_picks") {
                              return dailyPicks.toFixed(3);
                            }
                            if (col.key === "demand_std_dev") {
                              return demandStdDev.toFixed(3);
                            }
                            if (col.key === "toss_bin_candidate") {
                              return tossBinCandidate ? (
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                                  Toss Bin
                                </span>
                              ) : (
                                <span className="text-gray-400">-</span>
                              );
                            }
                            const value = item[col.key as keyof typeof item];
                            if (
                              col.key === "length_in" ||
                              col.key === "width_in" ||
                              col.key === "height_in"
                            ) {
                              return value !== undefined && value !== null
                                ? Number(value).toFixed(2)
                                : "";
                            }
                            if (col.key === "weight_lb") {
                              return value !== undefined && value !== null
                                ? Number(value).toFixed(2)
                                : "";
                            }
                            if (
                              col.key === "on_hand_units" ||
                              col.key === "annual_units_sold"
                            ) {
                              return value !== undefined && value !== null
                                ? Number(value).toLocaleString()
                                : "";
                            }
                            return value !== undefined && value !== null
                              ? value
                              : "";
                          })()}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {/* Pagination controls for SKU Master */}
            {inventory.length > PAGE_SIZE && (
              <div className="flex items-center justify-between mt-2 px-6 py-2 border-t border-gray-200">
                <span className="text-xs text-gray-500">
                  Rows {(skuPage - 1) * PAGE_SIZE + 1} -{" "}
                  {Math.min(skuPage * PAGE_SIZE, inventory.length)} of{" "}
                  {inventory.length}
                </span>
                <div className="flex gap-2">
                  <button
                    className="px-2 py-1 text-xs bg-gray-100 rounded disabled:opacity-50 hover:bg-gray-200"
                    onClick={() => setSkuPage((p) => Math.max(1, p - 1))}
                    disabled={skuPage === 1}
                  >
                    Previous
                  </button>
                  <button
                    className="px-2 py-1 text-xs bg-gray-100 rounded disabled:opacity-50 hover:bg-gray-200"
                    onClick={() => setSkuPage((p) => p + 1)}
                    disabled={skuPage * PAGE_SIZE >= inventory.length}
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          // Daily Sales Data Table
          <div>
            {/* Chart/Table Toggle */}
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <span className="font-medium text-[#825E08]">View:</span>
                <div className="flex items-center gap-2">
                  <div className="flex rounded-lg shadow-sm overflow-hidden border border-gray-300">
                    <button
                      onClick={() => setChartView(false)}
                      className={`px-4 py-2 text-sm font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#D4AF3D] focus:ring-offset-2 ${
                        !chartView
                          ? "bg-[#D4AF3D] text-white shadow-inner" // Primary button style
                          : "bg-white text-gray-700 hover:bg-gray-50 border-r border-gray-300" // Secondary button style
                      }`}
                    >
                      Table
                    </button>
                    <button
                      onClick={() => setChartView(true)}
                      className={`px-4 py-2 text-sm font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#D4AF3D] focus:ring-offset-2 ${
                        chartView
                          ? "bg-[#D4AF3D] text-white shadow-inner" // Primary button style
                          : "bg-white text-gray-700 hover:bg-gray-50" // Secondary button style
                      }`}
                    >
                      Chart
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {chartView ? (
              // Chart View
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Monthly Sales by SKU
                  </h3>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">
                      {selectedSkus.length} of {getAllUniqueSkus().length} SKUs
                      selected
                    </span>
                  </div>
                </div>

                {/* SKU Selector */}
                <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium text-gray-900">
                      Select SKUs to Display
                    </h4>
                    <div className="flex gap-2">
                      <button
                        onClick={selectAllSkus}
                        className="px-3 py-1 text-xs bg-[#D4AF3D] text-white rounded hover:bg-[#b8932f] transition-colors"
                      >
                        Select All
                      </button>
                      <button
                        onClick={clearAllSkus}
                        className="px-3 py-1 text-xs bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
                      >
                        Clear All
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 max-h-32 overflow-y-auto">
                    {getAllUniqueSkus().map((sku) => (
                      <label
                        key={sku}
                        className="flex items-center space-x-2 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={selectedSkus.includes(sku)}
                          onChange={(e) =>
                            handleSkuSelection(sku, e.target.checked)
                          }
                          className="rounded border-gray-300 text-[#D4AF3D] focus:ring-[#D4AF3D]"
                        />
                        <span className="text-sm text-gray-700">{sku}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {dailySales.length === 0 ? (
                  <div className="flex items-center justify-center h-64">
                    <div className="text-center">
                      <Database className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500">
                        No daily sales data available for this inventory list.
                      </p>
                    </div>
                  </div>
                ) : selectedSkus.length === 0 ? (
                  <div className="flex items-center justify-center h-64">
                    <div className="text-center">
                      <p className="text-gray-500">
                        Please select at least one SKU to display in the chart.
                      </p>
                    </div>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={400}>
                    <LineChart data={processChartData()}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="month"
                        tick={{ fontSize: 12 }}
                        angle={-45}
                        textAnchor="end"
                        height={80}
                      />
                      <YAxis
                        tick={{ fontSize: 12 }}
                        label={{
                          value: "Units Sold",
                          angle: -90,
                          position: "insideLeft",
                        }}
                      />
                      <Tooltip
                        formatter={(value, name) => [value, `SKU: ${name}`]}
                        labelFormatter={(label) => `Month: ${label}`}
                      />
                      <Legend />
                      {selectedSkus.map((sku, index) => (
                        <Line
                          key={sku}
                          type="monotone"
                          dataKey={sku}
                          stroke={`hsl(${(index * 137.5) % 360}, 70%, 50%)`}
                          strokeWidth={2}
                          dot={{ r: 4 }}
                          activeDot={{ r: 6 }}
                        />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>
            ) : (
              // Table View
              <div>
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th
                        onClick={() => handleSort("date")}
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                      >
                        <div className="flex items-center space-x-1">
                          <span>Date</span>
                          {sortField === "date" && (
                            <span className="text-gray-500">
                              {sortDirection === "asc" ? "↑" : "↓"}
                            </span>
                          )}
                        </div>
                      </th>
                      <th
                        onClick={() => handleSort("sku_id")}
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                      >
                        <div className="flex items-center space-x-1">
                          <span>SKU</span>
                          {sortField === "sku_id" && (
                            <span className="text-gray-500">
                              {sortDirection === "asc" ? "↑" : "↓"}
                            </span>
                          )}
                        </div>
                      </th>
                      <th
                        onClick={() => handleSort("units_sold")}
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                      >
                        <div className="flex items-center space-x-1">
                          <span>Units Sold</span>
                          {sortField === "units_sold" && (
                            <span className="text-gray-500">
                              {sortDirection === "asc" ? "↑" : "↓"}
                            </span>
                          )}
                        </div>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {dailySales.length === 0 ? (
                      <tr>
                        <td
                          colSpan={3}
                          className="px-6 py-4 text-center text-gray-500"
                        >
                          No daily sales data available for this inventory list.
                        </td>
                      </tr>
                    ) : (
                      paginate(getSortedData(dailySales), dailyPage).map(
                        (sale, index) => (
                          <tr key={index} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {new Date(sale.date).toLocaleDateString()}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {sale.sku_id}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {sale.units_sold}
                            </td>
                          </tr>
                        )
                      )
                    )}
                  </tbody>
                </table>
                {/* Pagination controls for Daily Sales */}
                {dailySales.length > PAGE_SIZE && (
                  <div className="flex items-center justify-between mt-2 px-6 py-2 border-t border-gray-200">
                    <span className="text-xs text-gray-500">
                      Rows {(dailyPage - 1) * PAGE_SIZE + 1} -{" "}
                      {Math.min(dailyPage * PAGE_SIZE, dailySales.length)} of{" "}
                      {dailySales.length}
                    </span>
                    <div className="flex gap-2">
                      <button
                        className="px-2 py-1 text-xs bg-gray-100 rounded disabled:opacity-50 hover:bg-gray-200"
                        onClick={() => setDailyPage((p) => Math.max(1, p - 1))}
                        disabled={dailyPage === 1}
                      >
                        Previous
                      </button>
                      <button
                        className="px-2 py-1 text-xs bg-gray-100 rounded disabled:opacity-50 hover:bg-gray-200"
                        onClick={() => setDailyPage((p) => p + 1)}
                        disabled={dailyPage * PAGE_SIZE >= dailySales.length}
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
});

export default DataTable;
