"use client";
import { useState, useEffect } from "react";
import { BarChart3, TrendingUp, Package, Clock, Info } from "lucide-react";
import { API_ENDPOINTS } from "../lib/api";

interface ResultsAnalysisProps {
  kpis: any;
  model: string;
  plan: any[];
  inventoryListId: string;
}

interface RestockingAnalysis {
  sku: string;
  currentStock: number;
  dailyDemand: number;
  demandStdDev: number;
  daysUntilStockout: number;
  recommendedStock: number;
  safetyStock: number;
  reorderPoint: number;
  restockingFrequency: number; // days
  riskLevel: "low" | "medium" | "high";
  serviceLevel: number; // probability of not stocking out
  demandVariability: "low" | "medium" | "high";
}

// Simple Tooltip Component
const Tooltip = ({
  children,
  content,
}: {
  children: React.ReactNode;
  content: string;
}) => {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div className="relative inline-block">
      <div
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
        className="cursor-help"
      >
        {children}
      </div>
      {isVisible && (
        <div className="absolute z-50 w-80 p-3 text-sm text-white bg-gray-900 rounded-lg shadow-lg -top-2 left-full ml-2">
          {content}
          <div className="absolute top-3 -left-1 w-2 h-2 bg-gray-900 transform rotate-45"></div>
        </div>
      )}
    </div>
  );
};

export default function ResultsAnalysis({
  kpis,
  model,
  plan,
  inventoryListId,
}: ResultsAnalysisProps) {
  const [inventoryData, setInventoryData] = useState<any[]>([]);
  const [restockingAnalysis, setRestockingAnalysis] = useState<
    RestockingAnalysis[]
  >([]);
  const [loading, setLoading] = useState(true);

  // Fetch inventory data for the selected list
  useEffect(() => {
    if (inventoryListId) {
      fetchInventoryData();
    }
  }, [inventoryListId]);

  const fetchInventoryData = async () => {
    try {
      const response = await fetch(API_ENDPOINTS.inventory(inventoryListId));
      if (response.ok) {
        const data = await response.json();
        setInventoryData(data);
        analyzeRestockingFrequency(data);
      }
    } catch (error) {
      console.error("Error fetching inventory data:", error);
    } finally {
      setLoading(false);
    }
  };

  const analyzeRestockingFrequency = (inventory: any[]) => {
    const analysis: RestockingAnalysis[] = inventory.map((item) => {
      // Use exact daily demand from data or calculate from annual sales
      const dailyDemand = item.daily_picks || item.annual_units_sold / 365;
      const demandStdDev = item.demand_std_dev || dailyDemand * 0.3; // Default to 30% of demand if not provided
      const currentStock = item.on_hand_units || 0;

      // Calculate demand variability level
      const coefficientOfVariation =
        dailyDemand > 0 ? demandStdDev / dailyDemand : 0;
      let demandVariability: "low" | "medium" | "high" = "low";
      if (coefficientOfVariation > 0.5) demandVariability = "high";
      else if (coefficientOfVariation > 0.2) demandVariability = "medium";

      // Service level (probability of not stocking out) - adjust based on demand variability
      let serviceLevel = 0.95; // 95% default
      if (demandVariability === "high")
        serviceLevel = 0.98; // Higher service level for high variability
      else if (demandVariability === "low") serviceLevel = 0.9; // Lower service level for low variability

      // Z-score for service level (simplified approximation)
      const zScore =
        serviceLevel === 0.98 ? 2.05 : serviceLevel === 0.95 ? 1.65 : 1.28;

      // Lead time (assume 7 days for restocking)
      const leadTime = 7;

      // Safety stock calculation incorporating demand variability
      // Don't round up - use exact calculation for more accurate planning
      const safetyStock = zScore * demandStdDev * Math.sqrt(leadTime);

      // Reorder point calculation - use exact values
      const reorderPoint = dailyDemand * leadTime + safetyStock;

      // Recommended stock level (30 days of demand + safety stock)
      const cycleStock = dailyDemand * 30;
      const recommendedStock = cycleStock + safetyStock;

      // Days until stockout (considering demand variability)
      const daysUntilStockout =
        dailyDemand > 0 ? currentStock / dailyDemand : 999;

      // Calculate restocking frequency (how often you'd need to restock)
      const restockingFrequency =
        dailyDemand > 0 ? cycleStock / dailyDemand : 999;

      // Enhanced risk assessment incorporating demand variability
      let riskLevel: "low" | "medium" | "high" = "low";
      const stockoutRisk =
        daysUntilStockout < leadTime + safetyStock / dailyDemand;

      if (daysUntilStockout < 7 || stockoutRisk) riskLevel = "high";
      else if (daysUntilStockout < 14 || currentStock < reorderPoint)
        riskLevel = "medium";

      return {
        sku: item.sku_id,
        currentStock,
        dailyDemand: dailyDemand.toFixed(1), // Keep exact value, no rounding
        demandStdDev: demandStdDev.toFixed(1), // Keep exact value, no rounding
        daysUntilStockout: daysUntilStockout, // Keep exact value, no rounding
        recommendedStock: Math.ceil(recommendedStock), // Only round up final recommendation for practical ordering
        safetyStock: Math.ceil(safetyStock), // Only round up safety stock for practical buffer
        reorderPoint: Math.ceil(reorderPoint), // Only round up reorder point for practical trigger
        restockingFrequency: restockingFrequency, // Keep exact value, no rounding
        riskLevel,
        serviceLevel: Math.round(serviceLevel * 100),
        demandVariability,
      };
    });

    // Sort by risk level (high to low) then by days until stockout
    analysis.sort((a, b) => {
      const riskOrder = { high: 3, medium: 2, low: 1 };
      if (riskOrder[a.riskLevel] !== riskOrder[b.riskLevel]) {
        return riskOrder[b.riskLevel] - riskOrder[a.riskLevel];
      }
      return a.daysUntilStockout - b.daysUntilStockout;
    });

    setRestockingAnalysis(analysis);
  };

  const getRiskLevelColor = (riskLevel: string) => {
    switch (riskLevel) {
      case "high":
        return "text-red-600 bg-red-100";
      case "medium":
        return "text-yellow-600 bg-yellow-100";
      case "low":
        return "text-green-600 bg-green-100";
      default:
        return "text-gray-600 bg-gray-100";
    }
  };

  const getRiskLevelIcon = (riskLevel: string) => {
    switch (riskLevel) {
      case "high":
        return "🔴";
      case "medium":
        return "🟡";
      case "low":
        return "🟢";
      default:
        return "⚪";
    }
  };

  const getDemandVariabilityColor = (variability: string) => {
    switch (variability) {
      case "high":
        return "text-red-600 bg-red-100";
      case "medium":
        return "text-yellow-600 bg-yellow-100";
      case "low":
        return "text-green-600 bg-green-100";
      default:
        return "text-gray-600 bg-gray-100";
    }
  };

  const getDemandVariabilityIcon = (variability: string) => {
    switch (variability) {
      case "high":
        return "📈";
      case "medium":
        return "📊";
      case "low":
        return "📉";
      default:
        return "📋";
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4 animate-pulse" />
          <p className="text-gray-600">Loading analysis...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center gap-3 mb-4">
          <BarChart3 className="h-8 w-8 text-blue-600" />
          <h2 className="text-2xl font-bold text-gray-900">Results Analysis</h2>
        </div>
        <p className="text-gray-600">
          Analysis for <span className="font-semibold">{model}</span>{" "}
          optimization model
        </p>
      </div>

      {/* SKU Restocking Frequency Analysis */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center gap-3 mb-6">
          <TrendingUp className="h-6 w-6 text-green-600" />
          <h3 className="text-xl font-semibold text-gray-900">
            SKU Restocking Frequency Analysis
          </h3>
        </div>

        <div className="mb-6 grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">
              {
                restockingAnalysis.filter((item) => item.riskLevel === "high")
                  .length
              }
            </div>
            <div className="text-sm text-blue-700">High Risk SKUs</div>
          </div>
          <div className="bg-yellow-50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-yellow-600">
              {
                restockingAnalysis.filter((item) => item.riskLevel === "medium")
                  .length
              }
            </div>
            <div className="text-sm text-yellow-700">Medium Risk SKUs</div>
          </div>
          <div className="bg-green-50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-green-600">
              {
                restockingAnalysis.filter((item) => item.riskLevel === "low")
                  .length
              }
            </div>
            <div className="text-sm text-green-700">Low Risk SKUs</div>
          </div>
          <div className="bg-purple-50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-purple-600">
              {
                restockingAnalysis.filter(
                  (item) => item.demandVariability === "high"
                ).length
              }
            </div>
            <div className="text-sm text-purple-700">High Variability SKUs</div>
          </div>
        </div>

        {/* Analysis Table */}
        <div className="mb-4 p-4 bg-blue-50 rounded-lg">
          <div className="flex items-start gap-2">
            <Info className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-1">About Daily Demand Values:</p>
              <p>
                Daily demand is calculated from annual sales data (annual units
                ÷ 365) or from actual daily pick data. Fractional values (e.g.,
                0.5 units/day) are perfectly valid and represent average daily
                consumption. For example, an item that sells 182 units annually
                has a daily demand of 0.5 units/day. This precision allows for
                more accurate inventory planning and prevents overstocking.
              </p>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              {/* Calculated/Input header row */}
              <tr>
                <th className="px-6 py-2 text-center text-xs font-bold uppercase tracking-wider border-b border-gray-200 bg-blue-50 text-blue-800">
                  Input
                </th>
                <th className="px-6 py-2 text-center text-xs font-bold uppercase tracking-wider border-b border-gray-200 bg-blue-50 text-blue-800">
                  Input
                </th>
                <th className="px-6 py-2 text-center text-xs font-bold uppercase tracking-wider border-b border-gray-200 bg-yellow-100 text-yellow-800">
                  Calculated
                </th>
                <th className="px-6 py-2 text-center text-xs font-bold uppercase tracking-wider border-b border-gray-200 bg-yellow-100 text-yellow-800">
                  Calculated
                </th>
                <th className="px-6 py-2 text-center text-xs font-bold uppercase tracking-wider border-b border-gray-200 bg-yellow-100 text-yellow-800">
                  Calculated
                </th>
                <th className="px-6 py-2 text-center text-xs font-bold uppercase tracking-wider border-b border-gray-200 bg-yellow-100 text-yellow-800">
                  Calculated
                </th>
                <th className="px-6 py-2 text-center text-xs font-bold uppercase tracking-wider border-b border-gray-200 bg-yellow-100 text-yellow-800">
                  Calculated
                </th>
                <th className="px-6 py-2 text-center text-xs font-bold uppercase tracking-wider border-b border-gray-200 bg-yellow-100 text-yellow-800">
                  Calculated
                </th>
                <th className="px-6 py-2 text-center text-xs font-bold uppercase tracking-wider border-b border-gray-200 bg-yellow-100 text-yellow-800">
                  Calculated
                </th>
                <th className="px-6 py-2 text-center text-xs font-bold uppercase tracking-wider border-b border-gray-200 bg-yellow-100 text-yellow-800">
                  Calculated
                </th>
                <th className="px-6 py-2 text-center text-xs font-bold uppercase tracking-wider border-b border-gray-200 bg-yellow-100 text-yellow-800">
                  Calculated
                </th>
              </tr>
              <tr className="bg-gray-50">
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  SKU
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Current Stock
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-yellow-50">
                  <div className="flex items-center gap-1">
                    Daily Demand
                    <Tooltip
                      content={
                        "Calculated as: annual sales ÷ 365 (or from daily picks if available). Fractional values are valid and represent average daily consumption."
                      }
                    >
                      <Info className="inline h-4 w-4 text-blue-500" />
                    </Tooltip>
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-yellow-50">
                  <div className="flex items-center gap-1">
                    Demand Std Dev
                    <Tooltip
                      content={
                        "Estimated as: Daily Demand × 0.3 (30% of average daily demand). Represents demand variability (standard deviation)."
                      }
                    >
                      <Info className="inline h-4 w-4 text-blue-500" />
                    </Tooltip>
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-yellow-50">
                  <div className="flex items-center gap-1">
                    Days Until Stockout
                    <Tooltip
                      content={
                        "Current Stock ÷ Daily Demand. Shows how many days until inventory is depleted at the current demand rate."
                      }
                    >
                      <Info className="inline h-4 w-4 text-blue-500" />
                    </Tooltip>
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-yellow-50">
                  <div className="flex items-center gap-1">
                    Safety Stock
                    <Tooltip
                      content={
                        "Calculated using demand variability, lead time, and service level. Formula: Z × Std Dev × √Lead Time."
                      }
                    >
                      <Info className="inline h-4 w-4 text-blue-500" />
                    </Tooltip>
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-yellow-50">
                  <div className="flex items-center gap-1">
                    Reorder Point
                    <Tooltip
                      content={
                        "Daily Demand × Lead Time + Safety Stock. The stock level at which you should reorder."
                      }
                    >
                      <Info className="inline h-4 w-4 text-blue-500" />
                    </Tooltip>
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-yellow-50">
                  <div className="flex items-center gap-1">
                    Recommended Stock
                    <Tooltip
                      content={
                        "(Daily Demand × 30) + Safety Stock. Suggests a 30-day cycle stock plus buffer."
                      }
                    >
                      <Info className="inline h-4 w-4 text-blue-500" />
                    </Tooltip>
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-yellow-50">
                  <div className="flex items-center gap-1">
                    Service Level
                    <Tooltip
                      content={
                        "Probability of not stocking out. Adjusted for demand variability: 98% for high, 95% for medium, 90% for low."
                      }
                    >
                      <Info className="inline h-4 w-4 text-blue-500" />
                    </Tooltip>
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-yellow-50">
                  <div className="flex items-center gap-1">
                    Risk Level
                    <Tooltip
                      content={
                        "Assesses stockout risk based on days until stockout, reorder point, and demand variability."
                      }
                    >
                      <Info className="inline h-4 w-4 text-blue-500" />
                    </Tooltip>
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-yellow-50">
                  <div className="flex items-center gap-1">
                    Variability
                    <Tooltip
                      content={
                        "Demand variability classification: high (>0.5), medium (0.2-0.5), low (<0.2) coefficient of variation."
                      }
                    >
                      <Info className="inline h-4 w-4 text-blue-500" />
                    </Tooltip>
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {restockingAnalysis.map((item, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {item.sku}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {item.currentStock}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold bg-yellow-50">
                    {item.dailyDemand}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold bg-yellow-50">
                    {item.demandStdDev}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold bg-yellow-50">
                    {item.daysUntilStockout.toFixed(1)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold bg-yellow-50">
                    {item.safetyStock}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold bg-yellow-50">
                    {item.reorderPoint}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold bg-yellow-50">
                    {item.recommendedStock}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold bg-yellow-50">
                    {item.serviceLevel}%
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap bg-yellow-50">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRiskLevelColor(item.riskLevel)}`}
                    >
                      {getRiskLevelIcon(item.riskLevel)}{" "}
                      {item.riskLevel.charAt(0).toUpperCase() +
                        item.riskLevel.slice(1)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap bg-yellow-50">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getDemandVariabilityColor(item.demandVariability)}`}
                    >
                      {getDemandVariabilityIcon(item.demandVariability)}{" "}
                      {item.demandVariability.charAt(0).toUpperCase() +
                        item.demandVariability.slice(1)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Enhanced Summary Recommendations */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center gap-3 mb-4">
          <Package className="h-6 w-6 text-purple-600" />
          <h3 className="text-xl font-semibold text-gray-900">
            Enhanced Stock Level Recommendations
          </h3>
        </div>

        <div className="space-y-4">
          <Tooltip content="High Priority Restocking: SKUs that will stock out within 7 days or are below the calculated reorder point. These items require immediate attention to prevent stockouts. The reorder point considers lead time and safety stock based on demand variability. For high variability items, safety stock is increased to maintain service levels. Daily demand uses exact fractional values for precision.">
            <div className="bg-red-50 border-l-4 border-red-400 p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <span className="text-red-400">⚠️</span>
                </div>
                <div className="ml-3">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-medium text-red-800">
                      High Priority Restocking
                    </h4>
                    <Info className="h-4 w-4 text-red-600" />
                  </div>
                  <p className="mt-1 text-sm text-red-700">
                    {
                      restockingAnalysis.filter(
                        (item) => item.riskLevel === "high"
                      ).length
                    }{" "}
                    SKUs need immediate attention. These items will stock out
                    within 7 days or are below reorder point. Consider demand
                    variability when restocking.
                  </p>
                </div>
              </div>
            </div>
          </Tooltip>

          <Tooltip content="Medium Priority Monitoring: SKUs that should be monitored closely but aren't at immediate risk. These items have 7-14 days until stockout or are approaching the reorder point. For items with high demand variability, consider increasing safety stock levels to account for demand uncertainty and maintain desired service levels. Calculations use exact daily demand values for accuracy.">
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <span className="text-yellow-400">⚡</span>
                </div>
                <div className="ml-3">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-medium text-yellow-800">
                      Medium Priority Monitoring
                    </h4>
                    <Info className="h-4 w-4 text-yellow-600" />
                  </div>
                  <p className="mt-1 text-sm text-yellow-700">
                    {
                      restockingAnalysis.filter(
                        (item) => item.riskLevel === "medium"
                      ).length
                    }{" "}
                    SKUs should be monitored closely. For high variability
                    items, consider increasing safety stock levels.
                  </p>
                </div>
              </div>
            </div>
          </Tooltip>

          <Tooltip content="Well Stocked: SKUs with adequate stock levels that are above the reorder point and have more than 14 days until potential stockout. Safety stock calculations incorporate demand variability using statistical inventory management principles. Service levels are adjusted based on demand variability: higher service levels (98%) for high variability items, standard (95%) for medium, and lower (90%) for low variability items. Only final recommendations are rounded up for practical ordering.">
            <div className="bg-green-50 border-l-4 border-green-400 p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <span className="text-green-400">✅</span>
                </div>
                <div className="ml-3">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-medium text-green-800">
                      Well Stocked
                    </h4>
                    <Info className="h-4 w-4 text-green-600" />
                  </div>
                  <p className="mt-1 text-sm text-green-700">
                    {
                      restockingAnalysis.filter(
                        (item) => item.riskLevel === "low"
                      ).length
                    }{" "}
                    SKUs have adequate stock levels. Safety stock calculations
                    account for demand variability to maintain service levels.
                  </p>
                </div>
              </div>
            </div>
          </Tooltip>

          <Tooltip content="Demand Variability Insights: SKUs with high demand variability (coefficient of variation > 0.5) require special attention. These items have unpredictable demand patterns and need higher safety stock levels to maintain service levels. The coefficient of variation is calculated as standard deviation divided by mean demand. High variability items get 98% service level, medium (0.2-0.5 CV) get 95%, and low (<0.2 CV) get 90% service level. Fractional daily demand values provide more precise calculations.">
            <div className="bg-purple-50 border-l-4 border-purple-400 p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <span className="text-purple-400">📊</span>
                </div>
                <div className="ml-3">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-medium text-purple-800">
                      Demand Variability Insights
                    </h4>
                    <Info className="h-4 w-4 text-purple-600" />
                  </div>
                  <p className="mt-1 text-sm text-purple-700">
                    {
                      restockingAnalysis.filter(
                        (item) => item.demandVariability === "high"
                      ).length
                    }{" "}
                    SKUs have high demand variability. These items require
                    higher safety stock levels and more frequent monitoring to
                    maintain service levels.
                  </p>
                </div>
              </div>
            </div>
          </Tooltip>
        </div>
      </div>
    </div>
  );
}
