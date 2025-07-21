"use client";
import { useState, useEffect, useRef } from "react";
import {
  BarChart3,
  TrendingUp,
  Database,
  Info,
  X,
  Plus,
  Minus,
  ChevronDown,
} from "lucide-react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  PointElement,
  LineElement,
} from "chart.js";
import { Bar, Line } from "react-chartjs-2";
import { API_ENDPOINTS } from "../lib/api";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  PointElement,
  LineElement
);

interface InventoryAnalyticsProps {
  inventoryListId?: string;
  analyticsData?: any[];
  analyticsComputed?: boolean;
  onComputeAnalytics?: () => Promise<void>;
}

interface SKUAnalytics {
  sku_id: string;
  description: string;
  rolling_avg_std_dev: number;
  total_sales: number;
  avg_daily_sales: number;
  volatility_score: number;
  on_shelf_units: number;
  safety_stock: number;
  cycle_stock: number;
  current_inventory: number;
  unit_volume_cubic_inches?: number;
  total_volume_cubic_inches?: number;
  length_in?: number;
  width_in?: number;
  height_in?: number;
}

interface MonthlyData {
  month: string;
  rolling_std_dev: number;
  total_sales: number;
  avg_sales: number;
  volatility_score: number;
  on_shelf_units: number;
  on_shelf_units_raw?: number; // Added for raw unrounded value
}

// Modal component for detailed analytics
const AnalyticsModal = ({
  isOpen,
  onClose,
  skuData,
  monthlyData,
  calculateSafetyStock,
}: {
  isOpen: boolean;
  onClose: () => void;
  skuData: SKUAnalytics;
  monthlyData: MonthlyData[];
  calculateSafetyStock: (dailyPicks: number, demandStdDev: number) => any;
}) => {
  const [showDataTable, setShowDataTable] = useState(false);

  if (!isOpen) return null;

  const months = monthlyData.map((d) => d.month.split("-")[1]); // Extract just the month (MM)
  const year = monthlyData.length > 0 ? monthlyData[0].month.split("-")[0] : ""; // Extract year
  const totalSalesData = monthlyData.map((d) => d.total_sales);
  const salesData = monthlyData.map((d) => d.avg_sales);
  const volatilityData = monthlyData.map((d) => d.volatility_score);
  const onShelfData = monthlyData.map((d) =>
    d.on_shelf_units_raw !== undefined ? d.on_shelf_units_raw : d.on_shelf_units
  );
  const onShelfDataRounded = monthlyData.map((d) => d.on_shelf_units);

  // Calculate safety stock range from monthly data
  const safetyStockData = monthlyData.map((d) => {
    const stockCalculations = calculateSafetyStock(
      d.avg_sales,
      d.rolling_std_dev
    );
    return stockCalculations.safety_stock;
  });

  const restockFrequencyData = monthlyData.map((d) => {
    // Calculate restock frequency based on daily demand and current stock levels
    const dailyDemand = d.avg_sales;
    const currentStock =
      d.on_shelf_units_raw !== undefined
        ? d.on_shelf_units_raw
        : d.on_shelf_units;
    const daysUntilRestock = currentStock / dailyDemand;
    const restockFreq = 30 / daysUntilRestock; // times per month
    return Math.min(restockFreq, 10); // Cap at 10 times per month for readability
  });

  const maxValue = Math.max(
    ...totalSalesData,
    ...salesData,
    ...volatilityData,
    ...onShelfData
  );

  const renderBarChart = (data: number[], title: string, color: string) => {
    // Calculate yearly total/average
    let yearlyStat = 0;
    let yearlyLabel = "";
    if (title.includes("Total Sales")) {
      yearlyStat = data.reduce((sum, val) => sum + val, 0) / data.length;
      yearlyLabel = "Monthly Avg";
    } else if (title.includes("Average Sales")) {
      yearlyStat = data.reduce((sum, val) => sum + val, 0) / data.length;
      yearlyLabel = "Monthly Avg";
    } else if (title.includes("On-Shelf")) {
      yearlyStat = data.reduce((sum, val) => sum + val, 0) / data.length;
      yearlyLabel = "Monthly Avg";
    }

    // Smart rounding for y-axis maximum
    const maxData = Math.max(...data, yearlyStat);
    let roundedMax = maxData;
    if (title.includes("Total Sales")) {
      roundedMax = Math.ceil(maxData / 10) * 10;
    } else if (title.includes("Average Sales")) {
      roundedMax = Math.ceil(maxData * 10) / 10;
    } else if (title.includes("On-Shelf")) {
      roundedMax = Math.ceil(maxData);
    }

    // Convert Tailwind colors to RGBA
    const getColorRGBA = (color: string, alpha: number) => {
      const colorMap: { [key: string]: string } = {
        "bg-red-500": `rgba(239, 68, 68, ${alpha})`,
        "bg-green-500": `rgba(34, 197, 94, ${alpha})`,
        "bg-blue-500": `rgba(59, 130, 246, ${alpha})`,
        "bg-purple-500": `rgba(168, 85, 247, ${alpha})`,
      };
      return colorMap[color] || `rgba(156, 163, 175, ${alpha})`;
    };

    const chartData = {
      labels: [...months, yearlyLabel],
      datasets: [
        {
          label: title,
          data: [...data, yearlyStat],
          backgroundColor: data
            .map(() => getColorRGBA(color, 0.8))
            .concat(getColorRGBA(color, 0.6)),
          borderColor: data
            .map(() => getColorRGBA(color, 1))
            .concat(getColorRGBA(color, 0.8)),
          borderWidth: 1,
          borderRadius: 4,
        },
      ],
    };

    const options = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false,
        },
        tooltip: {
          callbacks: {
            label: function (context: any) {
              const value = context.parsed.y;
              if (title.includes("On-Shelf")) {
                return `${context.label}: ${value.toFixed(1)}`;
              } else if (title.includes("Total Sales")) {
                return `${context.label}: ${value.toFixed(0)}`;
              } else {
                return `${context.label}: ${value.toFixed(2)}`;
              }
            },
          },
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          max: roundedMax * 1.1,
          ticks: {
            callback: function (value: any) {
              if (title.includes("On-Shelf")) {
                return value.toFixed(1);
              } else if (title.includes("Total Sales")) {
                return value.toFixed(0);
              } else {
                return value.toFixed(1);
              }
            },
          },
        },
        x: {
          grid: {
            display: false,
          },
        },
      },
    };

    return (
      <div className="mb-8">
        <h4 className="text-sm font-semibold text-gray-700 mb-4">{title}</h4>
        <div style={{ height: "200px" }}>
          <Bar data={chartData} options={options} />
        </div>
      </div>
    );
  };

  const renderRestockFrequencyChart = (
    restockFrequencyData: number[],
    title: string,
    color: string
  ) => {
    // Convert Tailwind colors to RGBA
    const getColorRGBA = (color: string, alpha: number) => {
      const colorMap: { [key: string]: string } = {
        "bg-red-500": `rgba(239, 68, 68, ${alpha})`,
        "bg-green-500": `rgba(34, 197, 94, ${alpha})`,
        "bg-blue-500": `rgba(59, 130, 246, ${alpha})`,
        "bg-purple-500": `rgba(168, 85, 247, ${alpha})`,
      };
      return colorMap[color] || `rgba(156, 163, 175, ${alpha})`;
    };

    // Calculate yearly average
    const avgRestockFreq =
      restockFrequencyData.reduce((sum, val) => sum + val, 0) /
      restockFrequencyData.length;

    const chartData = {
      labels: [...months, "Monthly Avg"],
      datasets: [
        {
          label: "Restock Frequency (times/month)",
          data: [...restockFrequencyData, avgRestockFreq],
          backgroundColor: restockFrequencyData
            .map(() => getColorRGBA(color, 0.8))
            .concat(getColorRGBA(color, 0.6)),
          borderColor: restockFrequencyData
            .map(() => getColorRGBA(color, 1))
            .concat(getColorRGBA(color, 0.8)),
          borderWidth: 1,
          borderRadius: 4,
        },
      ],
    };

    const options = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false,
        },
        tooltip: {
          callbacks: {
            label: function (context: any) {
              const value = context.parsed.y;
              return `${context.label}: ${value.toFixed(1)} times/month`;
            },
          },
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          title: {
            display: true,
            text: "Restock Frequency (times/month)",
          },
          ticks: {
            callback: function (value: any) {
              return value.toFixed(1);
            },
          },
        },
        x: {
          grid: {
            display: false,
          },
        },
      },
    };

    return (
      <div className="mb-8">
        <h4 className="text-sm font-semibold text-gray-700 mb-4">{title}</h4>
        <div style={{ height: "200px" }}>
          <Bar data={chartData} options={options} />
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[95vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              {skuData.sku_id} - {skuData.description}
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Monthly Analytics Overview - {year}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <div className="p-6">
          {/* SKU Details */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">
                  Dimensions
                </h3>
                <div className="text-sm text-gray-900">
                  <div>Length: {(skuData.length_in || 0).toFixed(2)}"</div>
                  <div>Width: {(skuData.width_in || 0).toFixed(2)}"</div>
                  <div>Height: {(skuData.height_in || 0).toFixed(2)}"</div>
                </div>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">
                  Volume per Unit
                </h3>
                <div className="text-sm text-gray-900">
                  {(skuData.unit_volume_cubic_inches || 0).toFixed(1)} in³
                </div>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">
                  Total Volume Required
                </h3>
                <div className="text-sm text-gray-900">
                  {(skuData.total_volume_cubic_inches || 0).toFixed(0)} in³
                </div>
              </div>
            </div>
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-red-50 p-4 rounded-lg cursor-help group relative">
              <div className="text-sm text-red-600 font-medium">
                Total Sales
              </div>
              <div className="text-2xl font-bold text-red-900">
                {totalSalesData
                  .reduce((a: number, b: number) => a + b, 0)
                  .toFixed(0)}
              </div>
              <div className="text-xs text-red-600 mt-1">
                Range: {Math.min(...totalSalesData).toFixed(0)} -{" "}
                {Math.max(...totalSalesData).toFixed(0)}
              </div>
              {/* Tooltip */}
              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-black text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                Sum of all monthly sales:{" "}
                {totalSalesData
                  .map((val, i) => `${val.toFixed(0)}`)
                  .join(" + ")}{" "}
                = {totalSalesData.reduce((a, b) => a + b, 0).toFixed(0)}
                <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-black"></div>
              </div>
            </div>
            <div className="bg-blue-50 p-4 rounded-lg cursor-help group relative">
              <div className="text-sm text-blue-600 font-medium">
                Restock Frequency
              </div>
              <div className="text-2xl font-bold text-blue-900">
                {(
                  restockFrequencyData.reduce((a, b) => a + b, 0) /
                  restockFrequencyData.length
                ).toFixed(1)}
                <span className="text-lg"> times/month</span>
              </div>
              <div className="text-xs text-blue-600 mt-1">
                Range: {Math.min(...restockFrequencyData).toFixed(1)} -{" "}
                {Math.max(...restockFrequencyData).toFixed(1)} times/month
              </div>
              {/* Tooltip */}
              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-black text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                Average restock frequency:{" "}
                {restockFrequencyData
                  .map((val, i) => `${val.toFixed(1)}`)
                  .join(" + ")}{" "}
                ÷ {restockFrequencyData.length} ={" "}
                {(
                  restockFrequencyData.reduce((a, b) => a + b, 0) /
                  restockFrequencyData.length
                ).toFixed(1)}{" "}
                times/month
                <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-black"></div>
              </div>
            </div>
            <div className="bg-green-50 p-4 rounded-lg cursor-help group relative">
              <div className="text-sm text-green-600 font-medium">
                Avg Daily Sales
              </div>
              <div className="text-2xl font-bold text-green-900">
                {(
                  salesData.reduce((a, b) => a + b, 0) / salesData.length
                ).toFixed(2)}
              </div>
              <div className="text-xs text-green-600 mt-1">
                Range: {Math.min(...salesData).toFixed(2)} -{" "}
                {Math.max(...salesData).toFixed(2)}
              </div>
              {/* Tooltip */}
              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-black text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                Average daily sales:{" "}
                {salesData.map((val, i) => `${val.toFixed(2)}`).join(" + ")} ÷{" "}
                {salesData.length} ={" "}
                {(
                  salesData.reduce((a, b) => a + b, 0) / salesData.length
                ).toFixed(2)}
                <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-black"></div>
              </div>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg cursor-help group relative">
              <div className="text-sm text-purple-600 font-medium">
                On-Shelf Units
              </div>
              <div className="text-2xl font-bold text-purple-900">
                {Math.ceil(Math.max(...onShelfData)).toLocaleString()}
              </div>
              <div className="text-xs text-purple-600 mt-1">
                Peak recommendation (max monthly value)
              </div>
              {/* Tooltip */}
              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-black text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 max-w-sm">
                <div className="font-semibold mb-1">
                  On-Shelf Units Calculation:
                </div>
                <div className="mb-1">
                  Monthly values:{" "}
                  {onShelfData.map((val, i) => `${val.toFixed(1)}`).join(", ")}
                </div>
                <div className="mb-1">
                  Max value: {Math.max(...onShelfData).toFixed(1)}
                </div>
                <div className="mb-1">
                  Rounded up:{" "}
                  {Math.ceil(Math.max(...onShelfData)).toLocaleString()}
                </div>
                <div className="text-xs mt-2">
                  <div>Formula: Cycle Stock + Safety Stock</div>
                  <div>
                    Cycle Stock = Avg Daily Sales ×{" "}
                    {skuData.cycle_stock / skuData.avg_daily_sales} days
                  </div>
                  <div>Safety Stock = Z-Score × Std Dev × √Lead Time</div>
                </div>
                <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-black"></div>
              </div>
            </div>
          </div>

          {/* Monthly Charts */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {renderBarChart(
              totalSalesData,
              "Total Sales by Month",
              "bg-red-500"
            )}
            {renderBarChart(
              salesData,
              "Average Daily Sales per Month",
              "bg-green-500"
            )}
            {renderRestockFrequencyChart(
              restockFrequencyData,
              "Restock Frequency by Month",
              "bg-blue-500"
            )}
            {renderBarChart(
              onShelfData,
              "On-Shelf Units by Month",
              "bg-purple-500"
            )}
          </div>

          {/* Data Table */}
          <div className="mt-6">
            <button
              onClick={() => setShowDataTable(!showDataTable)}
              className="flex items-center space-x-2 text-sm font-semibold text-gray-700 mb-3 hover:text-gray-900 transition-colors"
            >
              {showDataTable ? (
                <Minus className="h-4 w-4" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              <span>Monthly Data Table</span>
            </button>

            {showDataTable && (
              <div className="overflow-x-auto border border-gray-200 rounded-lg">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Month
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Rolling Std Dev
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Avg Sales
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Volatility Score
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        On-Shelf Units
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Monthly Avg Daily Sales
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {monthlyData.map((data, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-gray-900">
                          {data.month}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">
                          {data.rolling_std_dev.toFixed(2)}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">
                          {data.avg_sales.toFixed(2)}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">
                          {data.volatility_score.toFixed(1)}%
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">
                          {data.on_shelf_units_raw !== undefined
                            ? data.on_shelf_units_raw.toFixed(1)
                            : data.on_shelf_units}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">
                          {data.avg_sales.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Tooltip component for column explanations
const ColumnTooltip = ({
  children,
  tooltip,
}: {
  children: React.ReactNode;
  tooltip: string;
}) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);

  const handleMouseEnter = () => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setPosition({
        x: rect.left + rect.width / 2,
        y: rect.top - 10,
      });
    }
    setShowTooltip(true);
  };

  const handleMouseLeave = () => {
    setShowTooltip(false);
  };

  return (
    <>
      <div
        ref={triggerRef}
        className="inline-flex items-center cursor-help"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {children}
      </div>
      {showTooltip && (
        <div
          className="fixed z-[9999] px-4 py-3 bg-white text-gray-800 text-xs rounded-lg shadow-xl border border-gray-200 pointer-events-none max-w-sm leading-relaxed"
          style={{
            left: position.x,
            top: position.y,
            transform: "translateX(-50%) translateY(-100%)",
          }}
        >
          {tooltip}
          <div
            className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-white"
            style={{ borderTopColor: "white" }}
          ></div>
        </div>
      )}
    </>
  );
};

export default function InventoryAnalytics({
  inventoryListId,
  analyticsData = [],
  analyticsComputed = false,
  onComputeAnalytics,
}: InventoryAnalyticsProps) {
  const [analytics, setAnalytics] = useState<SKUAnalytics[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Use passed analytics data if available
  useEffect(() => {
    if (analyticsComputed && analyticsData.length > 0) {
      setAnalytics(analyticsData);
    }
  }, [analyticsComputed, analyticsData]);
  const [sortBy, setSortBy] = useState<
    | "sku"
    | "total_sales"
    | "avg_daily_sales"
    | "on_shelf_units"
    | "rolling_avg_std_dev"
    | "unit_volume_cubic_inches"
  >("on_shelf_units");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [selectedSku, setSelectedSku] = useState<SKUAnalytics | null>(null);
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [modalLoading, setModalLoading] = useState(false);
  const [isParametersCollapsed, setIsParametersCollapsed] = useState(false);

  // Configurable parameters
  const [daysOfCover, setDaysOfCover] = useState(7);
  const [serviceLevel, setServiceLevel] = useState(95);
  const [leadTimeDays, setLeadTimeDays] = useState(0.5);

  // Input state variables (not debounced)
  const [inputDaysOfCover, setInputDaysOfCover] = useState(7);
  const [inputServiceLevel, setInputServiceLevel] = useState(95);
  const [inputLeadTimeDays, setInputLeadTimeDays] = useState(0.5);

  // Convert service level percentage to z-score
  const getZScore = (serviceLevelPercent: number): number => {
    const zScores: { [key: number]: number } = {
      80: 0.84,
      85: 1.04,
      90: 1.28,
      95: 1.65,
      97: 1.88,
      98: 2.05,
      99: 2.33,
      99.5: 2.58,
      99.9: 3.09,
    };
    return zScores[serviceLevelPercent] || 1.65; // Default to 95% if not found
  };

  // Safety stock calculation function based on the provided script
  const calculateSafetyStock = (dailyPicks: number, demandStdDev: number) => {
    const serviceLevelZ = getZScore(serviceLevel);
    const cycleStock = dailyPicks * daysOfCover;
    const safetyStock = serviceLevelZ * demandStdDev * Math.sqrt(leadTimeDays);
    const onShelfUnitsRaw = cycleStock + safetyStock;
    const onShelfUnits = Math.ceil(onShelfUnitsRaw);

    return {
      on_shelf_units: onShelfUnits,
      on_shelf_units_raw: onShelfUnitsRaw,
      safety_stock: Math.ceil(safetyStock),
      cycle_stock: Math.ceil(cycleStock),
    };
  };

  // Function to update parameters and recalculate
  const updateParametersAndRecalculate = async () => {
    setDaysOfCover(inputDaysOfCover);
    setServiceLevel(inputServiceLevel);
    setLeadTimeDays(inputLeadTimeDays);

    // Fetch data to recalculate with new parameters
    await fetchData();

    // After recalculation, save the on-shelf units to the database
    try {
      const onShelfData = analytics.map((item) => ({
        sku_id: item.sku_id,
        on_shelf_units: item.on_shelf_units,
      }));

      if (!inventoryListId) {
        throw new Error("Inventory list ID is required");
      }
      const response = await fetch(
        API_ENDPOINTS.updateOnShelfUnits(inventoryListId),
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ on_shelf_data: onShelfData }),
        }
      );

      if (response.ok) {
        alert(
          "On-shelf units updated successfully! The divider optimizer will now use these calculated values."
        );
      } else {
        const error = await response.text();
        alert(`Failed to update on-shelf units: ${error}`);
      }
    } catch (error) {
      alert(`Error updating on-shelf units: ${error}`);
    }
  };

  const fetchData = async () => {
    if (!inventoryListId) {
      setAnalytics([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const inventoryResponse = await fetch(
        API_ENDPOINTS.inventory(inventoryListId)
      );
      const dailySalesResponse = await fetch(
        API_ENDPOINTS.dailySales(inventoryListId)
      );

      if (!inventoryResponse.ok || !dailySalesResponse.ok) {
        throw new Error("Failed to fetch data");
      }

      const inventory = await inventoryResponse.json();
      const dailySales = await dailySalesResponse.json();

      // Process the data to compute rolling averages
      const analyticsData = computeRollingAverages(inventory, dailySales);
      setAnalytics(analyticsData);

      // Automatically save the calculated on-shelf units to the database
      try {
        const onShelfData = analyticsData.map((item) => ({
          sku_id: item.sku_id,
          on_shelf_units: item.on_shelf_units,
        }));

        if (!inventoryListId) {
          throw new Error("Inventory list ID is required");
        }
        const updateResponse = await fetch(
          API_ENDPOINTS.updateOnShelfUnits(inventoryListId),
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ on_shelf_data: onShelfData }),
          }
        );

        if (updateResponse.ok) {
          console.log("On-shelf units automatically updated in database");
        } else {
          console.error("Failed to automatically update on-shelf units");
        }
      } catch (updateError) {
        console.error(
          "Error automatically updating on-shelf units:",
          updateError
        );
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      setError(error instanceof Error ? error.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  // Function to run analytics that can be called from parent components
  const runAnalytics = async () => {
    if (!inventoryListId) {
      throw new Error("No inventory list selected");
    }
    await fetchData();
  };

  // Expose the runAnalytics function to parent components
  useEffect(() => {
    if (typeof window !== "undefined") {
      (window as any).runInventoryAnalytics = runAnalytics;
    }

    // Cleanup function to remove the function from window when component unmounts
    return () => {
      if (typeof window !== "undefined") {
        delete (window as any).runInventoryAnalytics;
      }
    };
  }, [inventoryListId, daysOfCover, serviceLevel, leadTimeDays]);

  const fetchAnalytics = fetchData;

  const computeRollingAverages = (
    inventory: any[],
    dailySales: any[]
  ): SKUAnalytics[] => {
    const analytics: SKUAnalytics[] = [];

    // Group daily sales by SKU
    const salesBySku = new Map<string, any[]>();
    dailySales.forEach((sale) => {
      if (!salesBySku.has(sale.sku_id)) {
        salesBySku.set(sale.sku_id, []);
      }
      salesBySku.get(sale.sku_id)!.push(sale);
    });

    // Process each SKU
    inventory.forEach((item) => {
      const skuSales = salesBySku.get(item.sku_id) || [];

      if (skuSales.length === 0) {
        // No sales data, use calculated values
        const avgDailySales = item.annual_units_sold / 365;
        const volatilityScore = avgDailySales * 0.3; // Default volatility
        const demandStdDev = volatilityScore;

        // Calculate safety stock
        const stockCalculations = calculateSafetyStock(
          avgDailySales,
          demandStdDev
        );

        // Calculate volume
        const unitVolume =
          (item.length_in || 0) * (item.width_in || 0) * (item.height_in || 0);
        const totalVolume = unitVolume * stockCalculations.on_shelf_units;

        analytics.push({
          sku_id: item.sku_id,
          description: item.description,
          rolling_avg_std_dev: volatilityScore,
          total_sales: item.annual_units_sold,
          avg_daily_sales: avgDailySales,
          volatility_score: volatilityScore,
          current_inventory: item.current_inventory || 0,
          on_shelf_units: stockCalculations.on_shelf_units,
          safety_stock: stockCalculations.safety_stock,
          cycle_stock: stockCalculations.cycle_stock,
          unit_volume_cubic_inches: unitVolume,
          total_volume_cubic_inches: totalVolume,
          length_in: item.length_in,
          width_in: item.width_in,
          height_in: item.height_in,
        });
        return;
      }

      // Sort sales by date
      const sortedSales = skuSales.sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
      );

      // Compute 30-day rolling standard deviation
      const rollingStdDevs: number[] = [];
      const windowSize = 30;

      for (let i = windowSize - 1; i < sortedSales.length; i++) {
        const window = sortedSales.slice(i - windowSize + 1, i + 1);
        const values = window.map((sale) => sale.units_sold);

        // Calculate standard deviation
        const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
        const variance =
          values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) /
          values.length;
        const stdDev = Math.sqrt(variance);

        rollingStdDevs.push(stdDev);
      }

      // Calculate average of rolling standard deviations
      const avgRollingStdDev =
        rollingStdDevs.length > 0
          ? rollingStdDevs.reduce((sum, val) => sum + val, 0) /
            rollingStdDevs.length
          : 0;

      // Calculate total sales and average daily sales
      const totalSales = sortedSales.reduce(
        (sum, sale) => sum + sale.units_sold,
        0
      );
      const avgDailySales = totalSales / sortedSales.length;

      // Calculate volatility score (as percentage)
      const volatilityScore =
        avgDailySales > 0 ? (avgRollingStdDev / avgDailySales) * 100 : 0;

      // Calculate safety stock using the rolling standard deviation
      const stockCalculations = calculateSafetyStock(
        avgDailySales,
        avgRollingStdDev
      );

      // Calculate monthly on-shelf units to find the peak recommendation
      const monthlyOnShelfUnits: number[] = [];

      // Group sales by month (same logic as fetchMonthlyData)
      const monthlySales = new Map<string, any[]>();
      sortedSales.forEach((sale) => {
        const date = new Date(sale.date);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

        if (!monthlySales.has(monthKey)) {
          monthlySales.set(monthKey, []);
        }
        monthlySales.get(monthKey)!.push(sale);
      });

      // Calculate on-shelf units for each month (same logic as fetchMonthlyData)
      monthlySales.forEach((monthData) => {
        const salesValues = monthData.map((sale) => sale.units_sold);
        const totalSales = salesValues.reduce(
          (a: number, b: number) => a + b,
          0
        );
        const avgSales = totalSales / salesValues.length;

        // Calculate standard deviation for this month (same logic as fetchMonthlyData)
        const mean =
          salesValues.reduce((sum, val) => sum + val, 0) / salesValues.length;
        const variance =
          salesValues.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) /
          salesValues.length;
        const rollingStdDev = Math.sqrt(variance);

        // Calculate on-shelf units for this month using current parameters
        const monthStockCalculations = calculateSafetyStock(
          avgSales,
          rollingStdDev
        );
        monthlyOnShelfUnits.push(monthStockCalculations.on_shelf_units);
      });

      // Use the maximum monthly value rounded up as the recommendation (same as modal)
      const peakRecommendation =
        monthlyOnShelfUnits.length > 0
          ? Math.ceil(Math.max(...monthlyOnShelfUnits))
          : stockCalculations.on_shelf_units;

      // Calculate volume
      const unitVolume =
        (item.length_in || 0) * (item.width_in || 0) * (item.height_in || 0);
      const totalVolume = unitVolume * peakRecommendation;

      analytics.push({
        sku_id: item.sku_id,
        description: item.description,
        rolling_avg_std_dev: avgRollingStdDev,
        total_sales: totalSales,
        avg_daily_sales: avgDailySales,
        volatility_score: volatilityScore,
        current_inventory: item.current_inventory || 0,
        on_shelf_units: peakRecommendation,
        safety_stock: stockCalculations.safety_stock,
        cycle_stock: stockCalculations.cycle_stock,
        unit_volume_cubic_inches: unitVolume,
        total_volume_cubic_inches: totalVolume,
        length_in: item.length_in,
        width_in: item.width_in,
        height_in: item.height_in,
      });
    });

    return analytics;
  };

  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(column as any);
      setSortOrder("desc");
    }
  };

  const getSortIcon = (column: string) => {
    if (sortBy !== column) return null;
    return sortOrder === "asc" ? " ↑" : " ↓";
  };

  const sortedAnalytics = [...analytics].sort((a, b) => {
    let comparison = 0;

    switch (sortBy) {
      case "sku":
        comparison = a.sku_id.localeCompare(b.sku_id);
        break;
      case "total_sales":
        comparison = a.total_sales - b.total_sales;
        break;
      case "avg_daily_sales":
        comparison = a.avg_daily_sales - b.avg_daily_sales;
        break;
      case "on_shelf_units":
        comparison = a.on_shelf_units - b.on_shelf_units;
        break;
      case "rolling_avg_std_dev":
        comparison = a.rolling_avg_std_dev - b.rolling_avg_std_dev;
        break;
      case "unit_volume_cubic_inches":
        comparison =
          (a.unit_volume_cubic_inches || 0) - (b.unit_volume_cubic_inches || 0);
        break;
      default:
        comparison = a.total_sales - b.total_sales;
    }

    return sortOrder === "asc" ? comparison : -comparison;
  });

  // Remove automatic analytics computation - it will be triggered by the optimize button instead
  // useEffect(() => {
  //   fetchData();
  // }, [inventoryListId]);

  // Re-run analytics when parameters change (only if analytics have been computed)
  // useEffect(() => {
  //   if (inventoryListId) {
  //     fetchData();
  //   }
  // }, [daysOfCover, serviceLevel, leadTimeDays, inventoryListId]);

  // Function to fetch monthly data for a specific SKU
  const fetchMonthlyData = async (skuId: string) => {
    if (!inventoryListId) return;

    setModalLoading(true);
    try {
      // Fetch daily sales data for the specific SKU only
      const response = await fetch(
        API_ENDPOINTS.dailySalesBySku(inventoryListId, skuId)
      );

      if (!response.ok) {
        throw new Error("Failed to fetch monthly data");
      }

      const dailySales = await response.json();

      // Filter to ensure we only have data for the specific SKU
      const skuSales = dailySales.filter((sale: any) => sale.sku_id === skuId);

      // Group sales by month and calculate monthly metrics
      const monthlyDataMap = new Map<string, any[]>();

      skuSales.forEach((sale: any) => {
        const date = new Date(sale.date);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

        if (!monthlyDataMap.has(monthKey)) {
          monthlyDataMap.set(monthKey, []);
        }
        monthlyDataMap.get(monthKey)!.push(sale);
      });

      const monthlyAnalytics: MonthlyData[] = [];

      monthlyDataMap.forEach((sales, monthKey) => {
        const salesValues = sales.map((s: any) => s.units_sold);
        const totalSales = salesValues.reduce(
          (a: number, b: number) => a + b,
          0
        );
        const avgSales = totalSales / salesValues.length;

        // Calculate standard deviation for this month's data
        const mean =
          salesValues.reduce((sum, val) => sum + val, 0) / salesValues.length;
        const variance =
          salesValues.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) /
          salesValues.length;
        const rollingStdDev = Math.sqrt(variance);

        // Calculate volatility score (as percentage)
        const volatilityScore =
          avgSales > 0 ? (rollingStdDev / avgSales) * 100 : 0;

        // Calculate on-shelf units for this month using current parameters
        const stockCalculations = calculateSafetyStock(avgSales, rollingStdDev);

        monthlyAnalytics.push({
          month: monthKey,
          rolling_std_dev: rollingStdDev,
          total_sales: totalSales,
          avg_sales: avgSales,
          volatility_score: volatilityScore,
          on_shelf_units: stockCalculations.on_shelf_units,
          on_shelf_units_raw: stockCalculations.on_shelf_units_raw, // Add raw value
        });
      });

      // Sort by month
      monthlyAnalytics.sort((a, b) => a.month.localeCompare(b.month));

      setMonthlyData(monthlyAnalytics);
    } catch (err) {
      console.error("Error fetching monthly data:", err);
      setMonthlyData([]);
    } finally {
      setModalLoading(false);
    }
  };

  // Helper function to calculate rolling standard deviation
  const calculateRollingStdDev = (values: number[], window: number): number => {
    if (values.length < window) {
      return Math.sqrt(
        values.reduce(
          (sum, val) =>
            sum +
            Math.pow(
              val - values.reduce((a, b) => a + b, 0) / values.length,
              2
            ),
          0
        ) / values.length
      );
    }

    let sum = 0;
    let sumSq = 0;

    for (let i = 0; i < window; i++) {
      sum += values[i];
      sumSq += values[i] * values[i];
    }

    const mean = sum / window;
    const variance = sumSq / window - mean * mean;

    return Math.sqrt(Math.max(variance, 0));
  };

  // Handle row click to open modal
  const handleRowClick = async (sku: SKUAnalytics) => {
    setSelectedSku(sku);
    await fetchMonthlyData(sku.sku_id);
  };

  if (!inventoryListId) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
        <div className="text-center">
          <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No Inventory List Selected
          </h3>
          <p className="text-gray-600">
            Please select an inventory list to view analytics.
          </p>
        </div>
      </div>
    );
  }

  // Show message when analytics haven't been computed yet
  if (!analyticsComputed && analytics.length === 0 && !loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
        <div className="text-center">
          <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Analytics Not Computed
          </h3>
          <p className="text-gray-600 mb-4">
            Click the "Optimize" button to compute inventory analytics and
            calculate on-shelf units.
          </p>
          {onComputeAnalytics && (
            <button
              onClick={onComputeAnalytics}
              className="px-4 py-2 bg-[#D4AF3D] text-white rounded-md hover:bg-[#b8932f] transition-colors text-sm font-medium"
            >
              Compute Analytics
            </button>
          )}
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-gray-600">Computing analytics...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
        <div className="text-center">
          <Database className="h-12 w-12 text-red-400 mx-auto mb-4" />
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={fetchData}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <BarChart3 className="h-5 w-5 text-gray-600" />
            <h2 className="text-lg font-semibold text-gray-900">
              Inventory Analytics
            </h2>
          </div>
        </div>
        <p className="text-sm text-gray-600 mt-2">
          Analyze demand patterns and calculate optimal on-shelf inventory
          levels using 30-day rolling volatility analysis. Click on any SKU row
          to view detailed monthly analytics and charts.
        </p>
      </div>

      {/* Parameter Configuration Section */}
      <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium text-gray-700">
            On-Shelf Parameters
          </h3>
          <button
            onClick={() => setIsParametersCollapsed(!isParametersCollapsed)}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <ChevronDown
              className={`h-5 w-5 transition-transform ${
                isParametersCollapsed ? "rotate-180" : ""
              }`}
            />
          </button>
        </div>
        {!isParametersCollapsed && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <label className="block text-xs font-medium text-gray-600">
                  Days of Cover (R)
                </label>
                <ColumnTooltip tooltip="The number of days of inventory to maintain as regular working stock. This represents the cycle stock that covers normal demand between replenishment cycles.">
                  <Info className="inline h-3 w-3 text-gray-400" />
                </ColumnTooltip>
              </div>
              <input
                type="number"
                value={inputDaysOfCover}
                onChange={(e) => setInputDaysOfCover(Number(e.target.value))}
                min="1"
                max="30"
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <label className="block text-xs font-medium text-gray-600">
                  Service Level (%)
                </label>
                <ColumnTooltip tooltip="The probability of not experiencing a stockout during the lead time period. Higher service levels require more safety stock but reduce the risk of running out of inventory.">
                  <Info className="inline h-3 w-3 text-gray-400" />
                </ColumnTooltip>
              </div>
              <select
                value={inputServiceLevel}
                onChange={(e) => setInputServiceLevel(Number(e.target.value))}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value={80}>80%</option>
                <option value={85}>85%</option>
                <option value={90}>90%</option>
                <option value={95}>95%</option>
                <option value={97}>97%</option>
                <option value={98}>98%</option>
                <option value={99}>99%</option>
                <option value={99.5}>99.5%</option>
                <option value={99.9}>99.9%</option>
              </select>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <label className="block text-xs font-medium text-gray-600">
                  Lead Time (days)
                </label>
                <ColumnTooltip tooltip="The time required to replenish inventory from when an order is placed until it arrives. This affects safety stock calculations to cover demand during the replenishment period.">
                  <Info className="inline h-3 w-3 text-gray-400" />
                </ColumnTooltip>
              </div>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={inputLeadTimeDays}
                  onChange={(e) => setInputLeadTimeDays(Number(e.target.value))}
                  min="0.1"
                  max="30"
                  step="0.1"
                  className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={updateParametersAndRecalculate}
                  disabled={!inventoryListId || sortedAnalytics.length === 0}
                  className="px-4 py-2 bg-[#D4AF3D] text-white rounded-md hover:bg-[#b8932f] transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                >
                  Update
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="overflow-x-auto relative">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                onClick={() => handleSort("sku")}
              >
                <ColumnTooltip tooltip="Stock Keeping Unit identifier">
                  SKU <Info className="inline h-3 w-3 ml-1 text-gray-400" />
                </ColumnTooltip>
                <span className="text-blue-600">{getSortIcon("sku")}</span>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <ColumnTooltip tooltip="Product description from inventory data">
                  Description{" "}
                  <Info className="inline h-3 w-3 ml-1 text-gray-400" />
                </ColumnTooltip>
              </th>
              <th
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                onClick={() => handleSort("rolling_avg_std_dev")}
              >
                <ColumnTooltip tooltip="Average of 30-day rolling standard deviations of daily sales. Calculated using sliding windows of 30 days each, measuring demand variability over time.">
                  <div className="whitespace-normal leading-tight">
                    30-Day Rolling
                    <br />
                    Std Dev{" "}
                    <Info className="inline h-3 w-3 ml-1 text-gray-400" />
                  </div>
                </ColumnTooltip>
                <span className="text-blue-600">
                  {getSortIcon("rolling_avg_std_dev")}
                </span>
              </th>
              <th
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                onClick={() => handleSort("avg_daily_sales")}
              >
                <ColumnTooltip tooltip="Mean daily sales volume. For SKUs with daily sales data: total sales ÷ number of days. For SKUs without daily data: annual sales ÷ 365.">
                  Avg Daily Sales{" "}
                  <Info className="inline h-3 w-3 ml-1 text-gray-400" />
                </ColumnTooltip>
                <span className="text-blue-600">
                  {getSortIcon("avg_daily_sales")}
                </span>
              </th>
              <th
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                onClick={() => handleSort("total_sales")}
              >
                <ColumnTooltip tooltip="Total units sold across all available data. For SKUs with daily sales: sum of all daily sales. For SKUs without daily data: annual sales volume.">
                  Total Sales{" "}
                  <Info className="inline h-3 w-3 ml-1 text-gray-400" />
                </ColumnTooltip>
                <span className="text-blue-600">
                  {getSortIcon("total_sales")}
                </span>
              </th>
              <th
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                onClick={() => handleSort("unit_volume_cubic_inches")}
              >
                <ColumnTooltip tooltip="Volume per unit calculated from product dimensions. Calculated as: Length × Width × Height (in cubic inches).">
                  Volume / Unit (in³){" "}
                  <Info className="inline h-3 w-3 ml-1 text-gray-400" />
                </ColumnTooltip>
                <span className="text-blue-600">
                  {getSortIcon("unit_volume_cubic_inches")}
                </span>
              </th>
              <th
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                onClick={() => handleSort("on_shelf_units")}
              >
                <ColumnTooltip tooltip="Peak recommendation: Maximum monthly on-shelf units rounded up to nearest integer. Represents the highest inventory level needed during the year.">
                  On-Shelf Units{" "}
                  <Info className="inline h-3 w-3 ml-1 text-gray-400" />
                </ColumnTooltip>
                <span className="text-blue-600">
                  {getSortIcon("on_shelf_units")}
                </span>
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {sortedAnalytics.map((item) => (
              <tr
                key={item.sku_id}
                className="hover:bg-gray-50 cursor-pointer transition-colors"
                onClick={() => handleRowClick(item)}
              >
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {item.sku_id}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {item.description}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {item.rolling_avg_std_dev.toFixed(2)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {item.avg_daily_sales.toFixed(2)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {item.total_sales.toLocaleString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {item.unit_volume_cubic_inches
                    ? item.unit_volume_cubic_inches.toFixed(1)
                    : "N/A"}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-green-700">
                  {item.on_shelf_units.toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Total Volume Summary */}
      <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-gray-700">
              Total On-Shelf Units:
            </span>
            <span className="text-lg font-bold text-green-600">
              {sortedAnalytics
                .reduce((total, item) => total + item.on_shelf_units, 0)
                .toLocaleString()}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-gray-700">
              Total Volume Required:
            </span>
            <span className="text-lg font-bold text-gray-900">
              {sortedAnalytics
                .reduce(
                  (total, item) =>
                    total + (item.total_volume_cubic_inches || 0),
                  0
                )
                .toFixed(0)}{" "}
              in³
            </span>
          </div>
        </div>
      </div>

      {sortedAnalytics.length === 0 && (
        <div className="px-6 py-8 text-center">
          <Database className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">
            No analytics data available for this inventory list.
          </p>
        </div>
      )}

      {selectedSku && (
        <AnalyticsModal
          isOpen={!!selectedSku}
          onClose={() => setSelectedSku(null)}
          skuData={selectedSku}
          monthlyData={monthlyData}
          calculateSafetyStock={calculateSafetyStock}
        />
      )}

      {/* Loading overlay for modal */}
      {modalLoading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9998]">
          <div className="bg-white rounded-lg p-6 flex items-center space-x-3">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            <span className="text-gray-700">Loading monthly analytics...</span>
          </div>
        </div>
      )}
    </div>
  );
}
