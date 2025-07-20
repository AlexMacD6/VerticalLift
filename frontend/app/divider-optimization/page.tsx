"use client";
import { useState, useEffect } from "react";
import ParamForm from "../components/ParamForm";
import DividerResults from "../components/DividerResults";
import { Play, ChevronLeft, ChevronRight, Settings } from "lucide-react";
import { API_ENDPOINTS } from "../lib/api";

export default function DividerOptimizationPage() {
  const [configs, setConfigs] = useState<any[]>([]);
  const [inventoryLists, setInventoryLists] = useState<any[]>([]);
  const [results, setResults] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paramsPanelCollapsed, setParamsPanelCollapsed] = useState(false);

  // Load configurations and inventory lists on component mount
  useEffect(() => {
    console.log("DividerOptimizationPage mounted, loading data...");
    loadConfigs();
    loadInventoryLists();
  }, []);

  // Add keyboard shortcut for toggling parameters panel
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (event.key === "p" && (event.ctrlKey || event.metaKey)) {
        event.preventDefault();
        setParamsPanelCollapsed((prev) => !prev);
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, []);

  const loadConfigs = async () => {
    try {
      const response = await fetch(API_ENDPOINTS.trayConfigs());
      if (response.ok) {
        const data = await response.json();
        setConfigs(data);
      }
    } catch (err) {
      console.error("Failed to load configurations:", err);
    }
  };

  const loadInventoryLists = async () => {
    try {
      console.log("Loading inventory lists...");
      const response = await fetch(API_ENDPOINTS.inventoryLists());
      console.log("Inventory lists response status:", response.status);
      if (response.ok) {
        const data = await response.json();
        console.log("Inventory lists data:", data);
        setInventoryLists(data);
      } else {
        const errorText = await response.text();
        console.error("Failed to load inventory lists:", errorText);
      }
    } catch (err) {
      console.error("Failed to load inventory lists:", err);
    }
  };

  const createTestInventoryList = async () => {
    try {
      console.log("Creating test inventory list...");
      const response = await fetch(API_ENDPOINTS.inventoryLists(), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: "Test Inventory List" }),
      });

      if (response.ok) {
        const newList = await response.json();
        console.log("Test inventory list created successfully:", newList);
        loadInventoryLists(); // Reload the lists

        // Add some test inventory data
        await addTestInventoryData(newList.id);
      } else {
        const errorText = await response.text();
        console.error("Failed to create test inventory list:", errorText);
      }
    } catch (err) {
      console.error("Failed to create test inventory list:", err);
    }
  };

  const addTestInventoryData = async (inventoryListId: string) => {
    try {
      console.log("Adding test inventory data...");

      // Create a simple CSV with test data that includes high-quantity SKUs for multi-tray testing
      const csvData = `sku_id,description,length_in,width_in,height_in,weight_lb,on_hand_units,annual_units_sold,daily_picks,demand_std_dev
SKU0001,Small Box,8,6,4,2.5,100,1200,3.3,1.2
SKU0002,Medium Box,12,10,8,5.0,500,900,2.5,0.8
SKU0003,Large Box,16,14,12,8.0,50,600,1.6,0.5
SKU0004,Extra Large Box,20,18,16,12.0,25,300,0.8,0.3
SKU0005,Tiny Item,2,2,1,0.5,1000,2400,6.6,2.0
SKU0006,High Volume Item,4,4,3,1.0,800,3600,9.9,3.0`;

      const formData = new FormData();
      formData.append(
        "file",
        new Blob([csvData], { type: "text/csv" }),
        "test_inventory.csv"
      );
      formData.append("inventory_list_id", inventoryListId);

      const response = await fetch(API_ENDPOINTS.importInventory(), {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        console.log("Test inventory data imported successfully");
      } else {
        const errorText = await response.text();
        console.error("Failed to import test inventory data:", errorText);
      }
    } catch (err) {
      console.error("Failed to add test inventory data:", err);
    }
  };

  const handleOptimize = async (params: any) => {
    setLoading(true);
    setError(null);
    setResults(null);

    try {
      const formData = new FormData();
      formData.append("tray_length_in", params.tray_length_in.toString());
      formData.append("tray_width_in", params.tray_width_in.toString());
      formData.append("tray_depth_in", params.tray_depth_in.toString());
      formData.append("buffer_pct", params.buffer_pct.toString());
      formData.append("model", params.model);
      if (params.inventory_list_id) {
        formData.append("inventory_list_id", params.inventory_list_id);
      }

      // Debug: Log what we're sending
      console.log("Sending to /optimize-dividers:", {
        tray_length_in: params.tray_length_in,
        tray_width_in: params.tray_width_in,
        tray_depth_in: params.tray_depth_in,
        buffer_pct: params.buffer_pct,
        model: params.model,
        inventory_list_id: params.inventory_list_id,
      });

      const response = await fetch(API_ENDPOINTS.optimizeDividers(), {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        console.log("Backend response:", data);
        console.log(
          "Tray layouts available:",
          data.tray_layouts ? data.tray_layouts.length : 0
        );
        console.log("Tray layouts data:", data.tray_layouts);
        console.log("Model used:", data.model);
        setResults(data);
      } else {
        const errorText = await response.text();
        console.error("Backend error response:", errorText);
        setError(`Optimization failed: ${errorText}`);
      }
    } catch (err: any) {
      setError(`Optimization error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar Overlay for Mobile */}
      {!paramsPanelCollapsed && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setParamsPanelCollapsed(true)}
        />
      )}

      {/* Sidebar */}
      <div
        className={`fixed top-0 left-0 h-full bg-white border-r border-gray-200 shadow-xl z-50 transition-transform duration-300 ease-in-out ${
          paramsPanelCollapsed ? "-translate-x-full" : "translate-x-0"
        } lg:relative lg:translate-x-0 lg:shadow-none lg:block lg:w-[450px] lg:flex-shrink-0`}
        style={{ width: paramsPanelCollapsed ? "0px" : "450px" }}
      >
        {/* Sidebar Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h3 className="text-xl font-semibold text-gray-900">
            Optimization Parameters
          </h3>
          <button
            onClick={() => setParamsPanelCollapsed(true)}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-md transition-colors lg:hidden"
            title="Close Sidebar (Ctrl+P)"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
        </div>

        {/* Sidebar Content */}
        <div className="h-full overflow-y-auto">
          <div className="p-6">
            <ParamForm
              optimizationType="dividers"
              configs={configs}
              inventoryLists={inventoryLists}
              onConfigSaved={loadConfigs}
              onSubmit={handleOptimize}
            />
            {/* Debug info */}
            <div className="mt-4 p-4 bg-gray-100 rounded text-xs">
              <p>Debug Info:</p>
              <p>Configs loaded: {configs.length}</p>
              <p>Inventory lists loaded: {inventoryLists.length}</p>
              <p>Inventory lists: {JSON.stringify(inventoryLists, null, 2)}</p>
              {inventoryLists.length === 0 && (
                <div className="mt-2">
                  <p className="text-red-600 font-semibold">
                    No inventory lists found!
                  </p>
                  <button
                    onClick={createTestInventoryList}
                    className="mt-2 px-3 py-1 bg-blue-500 text-white rounded text-xs hover:bg-blue-600"
                  >
                    Create Test Inventory List
                  </button>
                </div>
              )}
            </div>

            {/* Error Display */}
            {error && (
              <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-md">
                <p className="text-red-800">{error}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 min-w-0">
        <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
          {/* Header with Toggle Button */}
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Divider Optimization
              </h1>
              <p className="mt-2 text-gray-600">
                Optimize slot dimensions for each SKU using advanced
                mathematical optimization algorithms.
              </p>
            </div>

            {/* Toggle Button - Always Visible */}
            <button
              onClick={() => setParamsPanelCollapsed(!paramsPanelCollapsed)}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
              title="Toggle Parameters Sidebar (Ctrl+P)"
            >
              <Settings className="h-4 w-4" />
              <span>{paramsPanelCollapsed ? "Show" : "Hide"} Parameters</span>
            </button>
          </div>

          {/* Results Content */}
          <div className="w-full">
            {loading && (
              <div className="flex items-center justify-center h-64">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="mt-4 text-gray-600">
                    Running divider optimization...
                  </p>
                </div>
              </div>
            )}

            {results && !loading && (
              <DividerResults
                dividers={results.dividers}
                kpis={results.kpis}
                trayDimensions={results.tray_dimensions}
                model={results.model}
                trayLayouts={results.tray_layouts}
              />
            )}

            {!results && !loading && (
              <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
                <div className="text-gray-400 mb-4">
                  <svg
                    className="mx-auto h-12 w-12"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                    />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No Results Yet
                </h3>
                <p className="text-gray-500">
                  Configure your parameters and run the optimization to see
                  results.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
