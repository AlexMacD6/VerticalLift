"use client";
import { useState, useEffect } from "react";
import DividerResults from "./DividerResults";
import {
  Play,
  ChevronLeft,
  ChevronRight,
  Settings,
  ChevronsLeft,
  ChevronsRight,
  Package,
} from "lucide-react";

interface DividerOptimizationProps {
  selectedDividerModel: string;
  selectedInventoryList: string;
  configParams: any;
  onOptimize: () => void;
  plan?: any[];
  kpis?: any;
  resultModel?: string;
}

export default function DividerOptimization({
  selectedDividerModel,
  selectedInventoryList,
  configParams,
  onOptimize,
  plan,
  kpis,
  resultModel,
}: DividerOptimizationProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [localResults, setLocalResults] = useState<any>(null);

  // Add keyboard shortcut for toggling parameters panel
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (event.key === "p" && (event.ctrlKey || event.metaKey)) {
        event.preventDefault();
        // setParamsPanelCollapsed((prev) => !prev); // This state is removed
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, []);

  // Get the correct data for DividerResults
  const getResultsData = () => {
    if (localResults) {
      // Backend returns "dividers" key, not "plan"
      return {
        dividers: localResults.dividers || [],
        kpis: localResults.kpis || {},
        model: localResults.model || "",
        trayLayouts: localResults.tray_layouts || [],
      };
    } else if (plan && plan.length > 0) {
      return {
        dividers: plan,
        kpis: kpis || {},
        model: resultModel || "",
        trayLayouts: [],
      };
    }
    return null;
  };

  const resultsData = getResultsData();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Main Content */}
      <div className="flex-1 min-w-0 overflow-y-auto">
        <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
          <header className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Results</h1>
            <p className="mt-2 text-gray-600">
              Divider optimization results showing slot dimensions, tray
              assignments, and area utilization for each SKU based on your
              selected parameters.
            </p>
          </header>

          {/* Loading State */}
          {loading && (
            <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#D4AF3D] mx-auto mb-4"></div>
              <p className="text-gray-600">Running divider optimization...</p>
            </div>
          )}

          {/* Results */}
          {resultsData &&
            resultsData.dividers &&
            resultsData.dividers.length > 0 && (
              <DividerResults
                dividers={resultsData.dividers || []}
                kpis={resultsData.kpis || {}}
                trayDimensions={configParams}
                model={resultsData.model || ""}
                trayLayouts={resultsData.trayLayouts || []}
                configParams={configParams}
              />
            )}

          {/* No Results State */}
          {!resultsData && !loading && (
            <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
              <div className="text-gray-400 mb-4">
                <Package className="h-12 w-12 mx-auto" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No Results Available
              </h3>
              <p className="text-gray-600 mb-4">
                Configure your parameters in the sidebar and click the Optimize
                button to generate divider optimization results.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
