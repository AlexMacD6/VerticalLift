"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import UploadBox from "./components/UploadBox";
import PlanTable from "./components/PlanTable";
import DataTable, { DataTableRef } from "./components/DataTable";
import ResultsPage from "./components/ResultsPage";
import ResultsAnalysis from "./components/ResultsAnalysis";
import Tray3DVisualization from "./components/Tray3DVisualization";
import React from "react";
import {
  Settings as SettingsIcon,
  ChevronLeft,
  Plus,
  Minus,
  ChevronsLeft,
  ChevronsRight,
  ChevronDown,
} from "lucide-react";

import UploadedDataDisplay from "./components/UploadedDataDisplay";
import InventoryAnalytics from "./components/InventoryAnalytics";
import DividerOptimization from "./components/DividerOptimization";
import { API_ENDPOINTS } from "./lib/api";

export default function Home() {
  const [activeTab, setActiveTab] = useState<"results" | "data" | "analytics">(
    "results"
  );

  const [salesMode, setSalesMode] = useState<"annual" | "daily">("annual");
  const [plan, setPlan] = useState<any[]>([]);
  const [trayConfigs, setTrayConfigs] = useState<any[]>([]);
  const dataTableRef = useRef<DataTableRef | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [selectedDividerModel, setSelectedDividerModel] = useState("rectpack");
  const [kpis, setKpis] = useState<any>(null);
  const [resultModel, setResultModel] = useState<string>("");
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [inventoryLists, setInventoryLists] = useState<any[]>([]);
  const [selectedInventoryList, setSelectedInventoryList] =
    useState<string>("");
  const [selectedTrayConfig, setSelectedTrayConfig] = useState<string>("");
  // Add tray configuration management state
  const [isNewConfig, setIsNewConfig] = useState(false);
  const [newConfigName, setNewConfigName] = useState("");
  const [selectedConfigId, setSelectedConfigId] = useState<number | null>(null);
  const [originalParams, setOriginalParams] = useState<any>(null);
  const [updateLoading, setUpdateLoading] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [updateSuccess, setUpdateSuccess] = useState(false);
  const [configParams, setConfigParams] = useState({
    tray_length_in: "",
    tray_width_in: "",
    tray_height_in: "",
    weight_limit_lb: "",
    buffer_pct: "0.95", // 95% as decimal
  });
  // Add 3D settings state
  const [show3DSettings, setShow3DSettings] = useState(false);
  const [tray3DSettings, setTray3DSettings] = useState({
    dividerThickness: 0.3,
    numVertical: 3,
    numHorizontal: 2,
    dividerColor: "#f59e42",
  });
  const [uploadMode, setUploadMode] = useState<"annual" | "daily" | "auto">(
    "annual"
  );
  const [uploadedData, setUploadedData] = useState<{
    skuData?: any[];
    dailyData?: any[];
  } | null>(null);
  const [paramsPanelCollapsed, setParamsPanelCollapsed] = useState(false);
  const [show3DPreview, setShow3DPreview] = useState(true);
  const [dimensionsPanelCollapsed, setDimensionsPanelCollapsed] =
    useState(true);
  const [analyticsData, setAnalyticsData] = useState<any[]>([]);
  const [analyticsComputed, setAnalyticsComputed] = useState(false);
  const [optimizing, setOptimizing] = useState(false);

  const fetchTrayConfigs = () => {
    fetch(API_ENDPOINTS.trayConfigs())
      .then((res) => res.json())
      .then((data) => setTrayConfigs(data))
      .catch((err) => console.error("Failed to fetch tray configs", err));
  };

  const fetchInventoryLists = () => {
    fetch(API_ENDPOINTS.inventoryLists())
      .then((res) => res.json())
      .then((data) => setInventoryLists(data))
      .catch((err) => console.error("Failed to fetch inventory lists", err));
  };

  useEffect(() => {
    fetchTrayConfigs();
    fetchInventoryLists();
  }, []);

  // Handle config selection and change detection
  useEffect(() => {
    if (selectedConfigId !== null && trayConfigs) {
      const config = trayConfigs.find((c) => c.id === selectedConfigId);
      if (config) {
        setOriginalParams({
          tray_length_in: config.tray_length_in,
          tray_width_in: config.tray_width_in,
          tray_height_in: config.tray_depth_in, // Map from backend field to UI field
          weight_limit_lb: config.weight_limit_lb,
          buffer_pct: config.buffer_pct || "0.95", // Load buffer from config if available
        });
      }
    }
  }, [selectedConfigId, trayConfigs]);

  // Helper to check if params differ from originalParams
  const paramsChanged =
    originalParams &&
    (configParams.tray_length_in !== originalParams.tray_length_in ||
      configParams.tray_width_in !== originalParams.tray_width_in ||
      configParams.tray_height_in !== originalParams.tray_height_in ||
      configParams.weight_limit_lb !== originalParams.weight_limit_lb ||
      configParams.buffer_pct !== originalParams.buffer_pct);

  // Handle config parameter changes
  const handleConfigParamChange = (key: string, value: string | number) => {
    setConfigParams((prev) => ({ ...prev, [key]: value }));
  };

  // Handle success message timeout
  useEffect(() => {
    if (updateSuccess) {
      const timer = setTimeout(() => setUpdateSuccess(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [updateSuccess]);

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

  const handleImportSuccess = (
    message: string,
    data?: { skuData?: any[]; dailyData?: any[] }
  ) => {
    setShowUploadModal(false);
    setSuccessMessage(message);
    setShowSuccessModal(true);
    setUploadedData(data || null);
    setTimeout(() => {
      setShowSuccessModal(false);
      setActiveTab("data");
    }, 2000);
    // Refresh the data table and inventory lists when import is successful
    if (dataTableRef.current) {
      dataTableRef.current.fetchInventory();
    }
    fetchInventoryLists();
  };

  const computeAnalytics = async () => {
    if (!selectedInventoryList) return;

    try {
      console.log("Computing inventory analytics...");

      // Fetch inventory and daily sales data
      const inventoryResponse = await fetch(
        API_ENDPOINTS.inventory(selectedInventoryList)
      );
      const dailySalesResponse = await fetch(
        API_ENDPOINTS.dailySales(selectedInventoryList)
      );

      if (!inventoryResponse.ok || !dailySalesResponse.ok) {
        throw new Error("Failed to fetch data for analytics");
      }

      const inventory = await inventoryResponse.json();
      const dailySales = await dailySalesResponse.json();

      // Compute rolling averages and analytics
      const analytics = computeRollingAverages(inventory, dailySales);

      // Save on-shelf units to database
      const onShelfData = analytics.map((item) => ({
        sku_id: item.sku_id,
        on_shelf_units: item.on_shelf_units,
      }));

      const updateResponse = await fetch(
        API_ENDPOINTS.updateOnShelfUnits(selectedInventoryList),
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ on_shelf_data: onShelfData }),
        }
      );

      if (updateResponse.ok) {
        setAnalyticsData(analytics);
        setAnalyticsComputed(true);
        console.log("Analytics computed and saved successfully");
      } else {
        console.error("Failed to save on-shelf units");
      }
    } catch (error) {
      console.error("Error computing analytics:", error);
    }
  };

  const computeRollingAverages = (inventory: any[], dailySales: any[]) => {
    const analytics: any[] = [];

    for (const item of inventory) {
      const skuSales = dailySales.filter((sale) => sale.sku_id === item.sku_id);

      if (skuSales.length === 0) {
        analytics.push({
          ...item,
          rolling_avg_std_dev: 0,
          total_sales: 0,
          avg_daily_sales: 0,
          volatility_score: 0,
          on_shelf_units: item.on_hand_units || 0,
          safety_stock: 0,
          cycle_stock: 0,
        });
        continue;
      }

      // Calculate rolling averages
      const salesValues = skuSales.map((s) => s.units_sold);
      const rollingStdDev = calculateRollingStdDev(salesValues, 30);
      const totalSales = salesValues.reduce((sum, val) => sum + val, 0);
      const avgDailySales = totalSales / salesValues.length;

      // Calculate on-shelf units (simplified version)
      const serviceLevelZ = 1.645; // 95% service level
      const cycleStock = avgDailySales * 7; // 7 days of coverage
      const safetyStock = serviceLevelZ * rollingStdDev * Math.sqrt(7);
      const onShelfUnits = Math.ceil(cycleStock + safetyStock);

      analytics.push({
        ...item,
        rolling_avg_std_dev: rollingStdDev,
        total_sales: totalSales,
        avg_daily_sales: avgDailySales,
        volatility_score: rollingStdDev / avgDailySales,
        on_shelf_units: onShelfUnits,
        safety_stock: Math.ceil(safetyStock),
        cycle_stock: Math.ceil(cycleStock),
      });
    }

    return analytics;
  };

  const calculateRollingStdDev = (values: number[], window: number): number => {
    if (values.length < window) return 0;

    const recentValues = values.slice(-window);
    const mean =
      recentValues.reduce((sum, val) => sum + val, 0) / recentValues.length;
    const variance =
      recentValues.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) /
      recentValues.length;

    return Math.sqrt(variance);
  };

  const handleOptimize = async () => {
    console.log("Starting optimization with database inventory");
    console.log("Parameters:", configParams);

    setOptimizing(true);

    try {
      // First, run inventory analytics to calculate on-shelf units
      if (selectedInventoryList && activeTab === "results") {
        await computeAnalytics();
      }

      // Check if we should run divider optimization (Results tab)
      const isDividerOptimization =
        activeTab === "results" &&
        selectedDividerModel &&
        selectedDividerModel !== "greedy";

      if (isDividerOptimization) {
        // Run divider optimization
        console.log(
          "Running divider optimization with model:",
          selectedDividerModel
        );

        const formData = new FormData();
        formData.append("tray_length_in", configParams.tray_length_in || "156");
        formData.append("tray_width_in", configParams.tray_width_in || "36");
        formData.append("tray_depth_in", configParams.tray_height_in || "18");
        formData.append("buffer_pct", configParams.buffer_pct || "0.95");
        formData.append("model", selectedDividerModel);
        if (selectedInventoryList) {
          formData.append("inventory_list_id", selectedInventoryList);
        }

        console.log("Sending divider optimization request to backend...");
        const response = await fetch(API_ENDPOINTS.optimizeDividers(), {
          method: "POST",
          body: formData,
        });

        console.log("Divider optimization response status:", response.status);

        if (response.ok) {
          const result = await response.json();
          setPlan(result.dividers || []);
          setKpis(result.kpis || null);
          setResultModel(result.model || "");
          setActiveTab("results"); // Redirect to Results tab instead of Optimize
        } else {
          const errorData = await response.json();
          alert(
            `Failed to run divider optimization: ${errorData.error || "Unknown error"}`
          );
        }
        return;
      }

      // Regular tray optimization - use rectpack instead of greedy
      const formData = new FormData();
      formData.append("tray_length_in", configParams.tray_length_in || "156");
      formData.append("tray_width_in", configParams.tray_width_in || "36");
      formData.append("tray_depth_in", configParams.tray_height_in || "18");
      formData.append("buffer_pct", configParams.buffer_pct || "0.95");
      formData.append("model", "rectpack"); // Use rectpack instead of greedy
      if (selectedInventoryList) {
        formData.append("inventory_list_id", selectedInventoryList);
      }

      console.log("Sending tray optimization request to backend...");
      const response = await fetch(API_ENDPOINTS.optimize(), {
        method: "POST",
        body: formData,
      });

      console.log("Tray optimization response status:", response.status);

      if (response.ok) {
        const result = await response.json();
        setPlan(result.plan || []);
        setKpis(result.kpis || null);
        setResultModel(result.model || "");
        setActiveTab("results");
      } else {
        const errorData = await response.json();
        alert(
          `Failed to run tray optimization: ${errorData.error || "Unknown error"}`
        );
      }
    } catch (error) {
      console.error("Optimization error:", error);
      alert(`Optimization error: ${error}`);
    } finally {
      setOptimizing(false);
    }
  };

  // Download template logic (moved from UploadBox)
  const downloadTemplate = async () => {
    try {
      const response = await fetch("/api/download-template");
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "Tray_Optimizer_Inventory_Template.xlsx";
        a.click();
        window.URL.revokeObjectURL(url);
      } else {
        const errorData = await response
          .json()
          .catch(() => ({ error: "Unknown error" }));
        if (response.status === 404) {
          const csvData = `SKU,Product Name,Length (in),Width (in),Height (in),Weight (lb),In Stock,Annual Sales,Daily Picks,Demand Variability\nSKU0001,Widget A,12.5,8.0,3.2,2.1,150,1200,4.5,1.2\nSKU0002,Gadget B,10.0,6.5,2.8,1.7,80,900,2.8,0.9`;
          const blob = new Blob([csvData], { type: "text/csv" });
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = "Tray_Optimizer_Inventory_Template.csv";
          a.click();
          window.URL.revokeObjectURL(url);
          alert(
            "Excel template not available. Downloaded CSV template instead. You can import CSV files as well."
          );
        } else {
          alert(
            `Failed to download template: ${errorData.error || "Unknown error"}`
          );
        }
      }
    } catch (error) {
      const csvData = `SKU,Product Name,Length (in),Width (in),Height (in),Weight (lb),In Stock,Annual Sales,Daily Picks,Demand Variability\nSKU0001,Widget A,12.5,8.0,3.2,2.1,150,1200,4.5,1.2\nSKU0002,Gadget B,10.0,6.5,2.8,1.7,80,900,2.8,0.9`;
      const blob = new Blob([csvData], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "Tray_Optimizer_Inventory_Template.csv";
      a.click();
      window.URL.revokeObjectURL(url);
      alert(
        "Network error. Downloaded CSV template instead. You can import CSV files as well."
      );
    }
  };

  // Template download handlers
  const downloadAnnualTemplate = () => {
    window.open("/api/download-template?type=annual", "_blank");
  };
  const downloadDailyTemplate = () => {
    window.open("/api/download-template?type=daily", "_blank");
  };

  return (
    <div className="h-screen bg-gradient-to-br from-[#fffbe6] to-[#f7f7fa] flex overflow-hidden">
      {/* Sidebar Overlay for Mobile */}
      {!paramsPanelCollapsed && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setParamsPanelCollapsed(true)}
        />
      )}

      {/* Sidebar */}
      {paramsPanelCollapsed ? (
        <div
          className="fixed top-0 left-0 h-screen bg-white border-r border-gray-200 shadow-xl z-50 flex flex-col items-start cursor-pointer transition-all duration-300 ease-in-out"
          style={{ width: "48px", minWidth: "48px" }}
          onClick={() => setParamsPanelCollapsed(false)}
        >
          <div className="flex flex-col items-center w-full pt-4">
            <ChevronsRight className="h-6 w-6 text-gray-500 mb-2" />
            <span
              className="text-xl font-semibold text-gray-900 select-none"
              style={{
                writingMode: "vertical-rl",
                transform: "rotate(180deg)",
                marginTop: 0,
              }}
            >
              Optimization Parameters
            </span>
          </div>
        </div>
      ) : (
        <div
          className={`fixed top-0 left-0 h-screen bg-white border-r border-gray-200 shadow-xl z-50 transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0 lg:shadow-none lg:block lg:w-[450px] lg:flex-shrink-0`}
          style={{ width: paramsPanelCollapsed ? "0px" : "450px" }}
        >
          {/* Sidebar Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <h3 className="text-xl font-semibold text-gray-900">
              Optimization Parameters
            </h3>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setParamsPanelCollapsed(!paramsPanelCollapsed)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-md transition-colors"
                title="Toggle Parameters Panel (Ctrl+P)"
              >
                {paramsPanelCollapsed ? (
                  <ChevronsRight className="h-5 w-5" />
                ) : (
                  <ChevronsLeft className="h-5 w-5" />
                )}
              </button>
            </div>
          </div>

          {/* Sidebar Content */}
          <div className="h-full overflow-y-auto">
            <div className="p-6">
              {/* Configuration Panel */}
              <ConfigurationPanel
                selectedDividerModel={selectedDividerModel}
                setSelectedDividerModel={setSelectedDividerModel}
                selectedInventoryList={selectedInventoryList}
                setSelectedInventoryList={setSelectedInventoryList}
                inventoryLists={inventoryLists}
                selectedTrayConfig={selectedTrayConfig}
                setSelectedTrayConfig={setSelectedTrayConfig}
                trayConfigs={trayConfigs}
                tray3DSettings={tray3DSettings}
                show3DPreview={show3DPreview}
                setShow3DPreview={setShow3DPreview}
                // Tray configuration management props
                isNewConfig={isNewConfig}
                setIsNewConfig={setIsNewConfig}
                newConfigName={newConfigName}
                setNewConfigName={setNewConfigName}
                selectedConfigId={selectedConfigId}
                setSelectedConfigId={setSelectedConfigId}
                configParams={configParams}
                setConfigParams={setConfigParams}
                updateLoading={updateLoading}
                setUpdateLoading={setUpdateLoading}
                updateError={updateError}
                setUpdateError={setUpdateError}
                updateSuccess={updateSuccess}
                setUpdateSuccess={setUpdateSuccess}
                paramsChanged={paramsChanged}
                handleConfigParamChange={handleConfigParamChange}
                fetchTrayConfigs={fetchTrayConfigs}
                originalParams={originalParams}
                setOriginalParams={setOriginalParams}
                dimensionsPanelCollapsed={dimensionsPanelCollapsed}
                setDimensionsPanelCollapsed={setDimensionsPanelCollapsed}
              />
              <OptimizeButton onClick={handleOptimize} loading={optimizing} />
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 min-w-0 overflow-y-auto">
        <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
          <header className="mb-8 flex flex-col items-center">
            <div className="flex items-center gap-3 mb-2">
              <span className="inline-block w-8 h-8 rounded-full bg-[#D4AF3D] shadow-lg" />
              <h1 className="text-4xl font-extrabold tracking-tight text-[#825E08] drop-shadow-sm">
                Tray Optimizer <span className="text-[#D4AF3D]">MVP</span>
              </h1>
            </div>
            <p className="text-lg text-[#825E08] font-medium text-center max-w-2xl">
              Optimize your warehouse tray allocation with ease. Upload your
              inventory, select tray parameters, and get instant results.
            </p>
          </header>

          {/* Upload/Download Buttons above tabs */}
          <div className="flex justify-end mb-6 gap-2">
            {/* Settings Button */}
            <button
              onClick={() => setShow3DSettings(true)}
              className="px-2 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 shadow flex items-center"
              title="3D Tray Settings"
            >
              <SettingsIcon className="h-5 w-5" />
            </button>
          </div>

          {/* Tab Navigation */}
          <div className="mb-8">
            <div className="border-b border-[#825E08]">
              <nav className="flex space-x-8">
                <button
                  onClick={() => setActiveTab("results")}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === "results"
                      ? "border-[#D4AF3D] text-[#D4AF3D]"
                      : "border-transparent text-[#825E08] hover:text-[#D4AF3D] hover:border-[#D4AF3D]"
                  }`}
                >
                  Results
                </button>
                <button
                  onClick={() => setActiveTab("data")}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === "data"
                      ? "border-[#D4AF3D] text-[#D4AF3D]"
                      : "border-transparent text-[#825E08] hover:text-[#D4AF3D] hover:border-[#D4AF3D]"
                  }`}
                >
                  Inventory Data
                </button>
                <button
                  onClick={() => setActiveTab("analytics")}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === "analytics"
                      ? "border-[#D4AF3D] text-[#D4AF3D]"
                      : "border-transparent text-[#825E08] hover:text-[#D4AF3D] hover:border-[#D4AF3D]"
                  }`}
                >
                  Inventory Analytics
                </button>
              </nav>
            </div>
          </div>

          {/* Tab Content */}
          {activeTab === "data" && (
            <div className="mb-10">
              {/* Sales Data Mode Toggle and Download/Upload Buttons */}
              <div className="mb-4 flex flex-col md:flex-row md:items-center gap-4">
                <div className="flex items-center gap-4">
                  <span className="font-medium text-[#825E08]">
                    Sales Data Type:
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() =>
                        setSalesMode(
                          salesMode === "annual" ? "daily" : "annual"
                        )
                      }
                      className="flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-[#D4AF3D] focus:ring-offset-2 rounded-lg p-1"
                    >
                      <div className="flex rounded-full shadow-sm overflow-hidden bg-white border border-[#D4AF3D] p-1">
                        <div
                          className={`w-8 h-8 rounded-full transition-all duration-300 ${
                            salesMode === "annual"
                              ? "bg-[#D4AF3D] shadow-inner transform translate-x-0" // Primary button style
                              : "bg-transparent" // Secondary button style
                          }`}
                        />
                        <div
                          className={`w-8 h-8 rounded-full transition-all duration-300 ${
                            salesMode === "daily"
                              ? "bg-[#D4AF3D] shadow-inner transform translate-x-0" // Primary button style
                              : "bg-transparent" // Secondary button style
                          }`}
                        />
                      </div>
                      <span className="text-sm font-medium text-[#825E08]">
                        {salesMode === "annual"
                          ? "Annual Sales"
                          : "Daily Sales"}
                      </span>
                    </button>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setUploadMode("auto");
                      setShowUploadModal(true);
                    }}
                    className="px-6 py-3 font-semibold bg-white text-[#825E08] border border-[#D4AF3D] rounded-full hover:bg-[#FFF8E1] transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#D4AF3D] focus:ring-offset-2"
                  >
                    Upload Inventory
                  </button>
                  <button
                    onClick={
                      salesMode === "annual"
                        ? downloadAnnualTemplate
                        : downloadDailyTemplate
                    }
                    title={
                      salesMode === "annual"
                        ? "Use this template if you only have total annual sales for each SKU"
                        : "Use this template if you have daily sales records for each SKU"
                    }
                    className="px-6 py-3 font-semibold bg-white text-[#825E08] border border-[#D4AF3D] rounded-full hover:bg-[#FFF8E1] transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#D4AF3D] focus:ring-offset-2"
                  >
                    {salesMode === "annual"
                      ? "Download Annual Sales Template"
                      : "Download Daily Sales Template"}
                  </button>
                </div>
              </div>
              {/* Display uploaded data if available */}
              {uploadedData && (
                <UploadedDataDisplay
                  data={uploadedData}
                  onClose={() => setUploadedData(null)}
                />
              )}
              <DataTable
                ref={dataTableRef}
                inventoryListId={selectedInventoryList}
                onListSaved={fetchInventoryLists}
                uploadedData={uploadedData}
                salesMode={salesMode}
              />
            </div>
          )}

          {activeTab === "analytics" && (
            <div className="mb-10">
              <InventoryAnalytics
                inventoryListId={selectedInventoryList}
                analyticsData={analyticsData}
                analyticsComputed={analyticsComputed}
                onComputeAnalytics={computeAnalytics}
              />
            </div>
          )}

          {activeTab === "results" && (
            <div className="mb-10">
              <DividerOptimization
                selectedDividerModel={selectedDividerModel}
                selectedInventoryList={selectedInventoryList}
                configParams={configParams}
                onOptimize={() => {}} // Empty function since component handles its own optimization
                plan={plan}
                kpis={kpis}
                resultModel={resultModel}
              />
            </div>
          )}

          {/* Upload Modal */}
          {showUploadModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
                <h3 className="text-lg font-semibold mb-4">
                  Upload Inventory Data
                </h3>
                <UploadBox
                  onSubmit={handleOptimize}
                  onImportSuccess={handleImportSuccess}
                  open={true}
                  onClose={() => setShowUploadModal(false)}
                  downloadTemplate={downloadTemplate}
                  uploadMode={uploadMode}
                />
                <button
                  onClick={() => setShowUploadModal(false)}
                  className="mt-4 w-full px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Success Modal */}
          {showSuccessModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 text-center">
                <div className="text-green-500 text-6xl mb-4">✓</div>
                <h3 className="text-lg font-semibold mb-2">Success!</h3>
                <p className="text-gray-600">{successMessage}</p>
              </div>
            </div>
          )}

          {/* 3D Settings Modal */}
          {show3DSettings && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
                <h3 className="text-lg font-semibold mb-4">3D Tray Settings</h3>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    setShow3DSettings(false);
                  }}
                >
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Divider Thickness (inches)
                      </label>
                      <input
                        type="number"
                        min="0.05"
                        step="0.05"
                        value={tray3DSettings.dividerThickness}
                        onChange={(e) =>
                          setTray3DSettings((s) => ({
                            ...s,
                            dividerThickness: parseFloat(e.target.value),
                          }))
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Number of Vertical Dividers
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="10"
                        value={tray3DSettings.numVertical}
                        onChange={(e) =>
                          setTray3DSettings((s) => ({
                            ...s,
                            numVertical: parseInt(e.target.value),
                          }))
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Number of Horizontal Dividers
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="10"
                        value={tray3DSettings.numHorizontal}
                        onChange={(e) =>
                          setTray3DSettings((s) => ({
                            ...s,
                            numHorizontal: parseInt(e.target.value),
                          }))
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Divider Color
                      </label>
                      <input
                        type="color"
                        value={tray3DSettings.dividerColor}
                        onChange={(e) =>
                          setTray3DSettings((s) => ({
                            ...s,
                            dividerColor: e.target.value,
                          }))
                        }
                        className="w-12 h-8 p-0 border-0 bg-transparent"
                      />
                    </div>
                    <button
                      type="submit"
                      className="w-full mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 shadow"
                    >
                      Save Settings
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

type ConfigurationPanelProps = {
  selectedDividerModel: string;
  setSelectedDividerModel: (v: string) => void;
  selectedInventoryList: string;
  setSelectedInventoryList: (v: string) => void;
  inventoryLists: { id: string; name: string }[];
  selectedTrayConfig: string;
  setSelectedTrayConfig: (v: string) => void;
  trayConfigs: {
    id: number;
    name: string;
    tray_length_in: number;
    tray_width_in: number;
    tray_depth_in: number;
    num_trays: number;
    weight_limit_lb: number;
    buffer_pct?: string;
  }[];
  tray3DSettings: {
    dividerThickness: number;
    numVertical: number;
    numHorizontal: number;
    dividerColor: string;
  };
  show3DPreview: boolean;
  setShow3DPreview: (show: boolean) => void;
  // Tray configuration management props
  isNewConfig: boolean;
  setIsNewConfig: (v: boolean) => void;
  newConfigName: string;
  setNewConfigName: (v: string) => void;
  selectedConfigId: number | null;
  setSelectedConfigId: (v: number | null) => void;
  configParams: any;
  setConfigParams: (v: any) => void;
  updateLoading: boolean;
  setUpdateLoading: (v: boolean) => void;
  updateError: string | null;
  setUpdateError: (v: string | null) => void;
  updateSuccess: boolean;
  setUpdateSuccess: (v: boolean) => void;
  paramsChanged: boolean;
  handleConfigParamChange: (key: string, value: string | number) => void;
  fetchTrayConfigs: () => void;
  originalParams: any;
  setOriginalParams: (v: any) => void;
  dimensionsPanelCollapsed: boolean;
  setDimensionsPanelCollapsed: (v: boolean) => void;
};

// Add OptimizeButton component
function OptimizeButton({
  onClick,
  disabled = false,
  loading = false,
}: {
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
}) {
  return (
    <div className="flex justify-center my-8">
      <button
        onClick={onClick}
        disabled={disabled || loading}
        className={`px-10 py-4 text-2xl font-bold bg-gradient-to-r from-[#D4AF3D] to-[#825E08] text-white rounded-lg shadow-lg hover:from-[#b8932f] hover:to-[#6a4806] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${
          loading ? "animate-pulse shadow-2xl" : ""
        }`}
      >
        {loading ? (
          <div className="flex items-center space-x-3">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
            <span>Optimizing...</span>
          </div>
        ) : (
          "Optimize"
        )}
      </button>
    </div>
  );
}

// 1. Extract InventorySelectionDropdown as a shared component
function InventorySelectionDropdown({
  inventoryLists,
  selectedInventoryList,
  setSelectedInventoryList,
  className = "",
}: {
  inventoryLists: { id: string; name: string }[];
  selectedInventoryList: string;
  setSelectedInventoryList: (v: string) => void;
  className?: string;
}) {
  return (
    <div
      className={`bg-white border border-gray-200 rounded-lg p-4 flex flex-col md:flex-row md:items-center gap-2 shadow-sm ${className}`}
    >
      <label className="block text-sm font-medium text-gray-700 mb-1 md:mb-0 md:mr-2">
        Inventory Selection
      </label>
      <select
        className="w-full md:w-auto px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        value={selectedInventoryList}
        onChange={(e) => setSelectedInventoryList(e.target.value)}
      >
        <option value="" disabled>
          Select an inventory list...
        </option>
        {inventoryLists.map((list: { id: string; name: string }) => (
          <option key={list.id} value={list.id}>
            {list.name}
          </option>
        ))}
      </select>
    </div>
  );
}

// 2. Use InventorySelectionDropdown in ConfigurationPanel (Optimize tab)
function ConfigurationPanel({
  selectedDividerModel,
  setSelectedDividerModel,
  selectedInventoryList,
  setSelectedInventoryList,
  inventoryLists,
  selectedTrayConfig,
  setSelectedTrayConfig,
  trayConfigs,
  tray3DSettings,
  show3DPreview,
  setShow3DPreview,
  // Tray configuration management props
  isNewConfig,
  setIsNewConfig,
  newConfigName,
  setNewConfigName,
  selectedConfigId,
  setSelectedConfigId,
  configParams,
  setConfigParams,
  updateLoading,
  setUpdateLoading,
  updateError,
  setUpdateError,
  updateSuccess,
  setUpdateSuccess,
  paramsChanged,
  handleConfigParamChange,
  fetchTrayConfigs,
  originalParams,
  setOriginalParams,
  dimensionsPanelCollapsed,
  setDimensionsPanelCollapsed,
}: ConfigurationPanelProps) {
  // Get the selected tray configuration data
  const selectedConfig = trayConfigs.find(
    (config) => config.id === parseInt(selectedTrayConfig)
  );

  // Calculate buffer percentage from configParams instead of hardcoded value
  const bufferPct = configParams.buffer_pct
    ? parseFloat(configParams.buffer_pct)
    : 0.95;
  const usableWidth = selectedConfig
    ? selectedConfig.tray_width_in * bufferPct
    : 0;
  const usableLength = selectedConfig
    ? selectedConfig.tray_length_in * bufferPct
    : 0;

  return (
    <div className="mb-4 flex flex-col gap-4">
      {/* Configuration dropdowns */}
      <div className="flex flex-col gap-2 w-full">
        {/* Unified configuration card */}
        <div className="bg-white border border-gray-200 rounded-lg p-6 flex flex-col gap-4 shadow-sm">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">
              Optimization Model
            </label>
            <select
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={selectedDividerModel}
              onChange={(e) => setSelectedDividerModel(e.target.value)}
            >
              <option value="rectpack">
                Maximal-Rectangles Algorithm (2D Bin Packing)
              </option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Inventory Selection
            </label>
            <select
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={selectedInventoryList}
              onChange={(e) => setSelectedInventoryList(e.target.value)}
            >
              <option value="" disabled>
                Select an inventory list...
              </option>
              {inventoryLists.map((list: { id: string; name: string }) => (
                <option key={list.id} value={list.id}>
                  {list.name}
                </option>
              ))}
            </select>
          </div>

          {/* Tray Configuration Management */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">
              Tray Configuration
            </label>
            <select
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              onChange={(e) => {
                if (e.target.value === "__new__") {
                  setIsNewConfig(true);
                  setSelectedConfigId(null);
                  setConfigParams({
                    tray_length_in: "",
                    tray_width_in: "",
                    tray_height_in: "",
                    weight_limit_lb: "",
                    buffer_pct: "0.95", // 95% as decimal
                  });
                  setOriginalParams(null);
                } else if (e.target.value === "") {
                  setIsNewConfig(false);
                  setSelectedConfigId(null);
                  setOriginalParams(null);
                } else {
                  setIsNewConfig(false);
                  const config = trayConfigs.find(
                    (c) => String(c.id) === e.target.value
                  );
                  if (config) {
                    setConfigParams({
                      tray_length_in: config.tray_length_in || "",
                      tray_width_in: config.tray_width_in || "",
                      tray_height_in: config.tray_depth_in || "",
                      weight_limit_lb: config.weight_limit_lb || "",
                      buffer_pct: config.buffer_pct || "0.95", // Load buffer from config if available
                    });
                    setSelectedConfigId(config.id);
                    setSelectedTrayConfig(e.target.value);
                  }
                }
              }}
              value={isNewConfig ? "__new__" : (selectedConfigId ?? "")}
            >
              <option value="" disabled>
                Select a configuration...
              </option>
              <option value="__new__">New Configuration</option>
              {trayConfigs.map((config) => (
                <option key={config.id} value={config.id}>
                  {config.name}
                </option>
              ))}
            </select>

            {isNewConfig && (
              <input
                type="text"
                placeholder="Configuration Name"
                value={newConfigName}
                onChange={(e) => setNewConfigName(e.target.value)}
                className="mt-2 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
            )}
          </div>

          {/* Dimensions Section - Collapsible */}
          {(isNewConfig ||
            selectedConfigId ||
            !trayConfigs ||
            trayConfigs.length === 0) && (
            <div className="border-t border-gray-200 pt-4">
              <button
                onClick={() =>
                  setDimensionsPanelCollapsed(!dimensionsPanelCollapsed)
                }
                className="flex items-center justify-between w-full text-left mb-2"
              >
                <span className="text-sm font-bold text-gray-700">
                  Dimensions
                </span>
                <ChevronDown
                  className={`h-4 w-4 text-gray-500 transition-transform duration-200 ${
                    dimensionsPanelCollapsed ? "" : "rotate-180"
                  }`}
                />
              </button>

              {!dimensionsPanelCollapsed && (
                <>
                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Tray Length (inches)
                      </label>
                      <input
                        type="number"
                        value={configParams.tray_length_in ?? ""}
                        onChange={(e) =>
                          handleConfigParamChange(
                            "tray_length_in",
                            e.target.value === ""
                              ? ""
                              : parseInt(e.target.value)
                          )
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Tray Width (inches)
                      </label>
                      <input
                        type="number"
                        value={configParams.tray_width_in ?? ""}
                        onChange={(e) =>
                          handleConfigParamChange(
                            "tray_width_in",
                            e.target.value === ""
                              ? ""
                              : parseInt(e.target.value)
                          )
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Tray Height (inches)
                      </label>
                      <input
                        type="number"
                        value={configParams.tray_height_in ?? ""}
                        onChange={(e) =>
                          handleConfigParamChange(
                            "tray_height_in",
                            e.target.value === ""
                              ? ""
                              : parseInt(e.target.value)
                          )
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Weight Limit (lbs)
                      </label>
                      <input
                        type="number"
                        value={configParams.weight_limit_lb ?? ""}
                        onChange={(e) =>
                          handleConfigParamChange(
                            "weight_limit_lb",
                            e.target.value === ""
                              ? ""
                              : parseInt(e.target.value)
                          )
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Buffer
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          value={
                            configParams.buffer_pct
                              ? (
                                  parseFloat(configParams.buffer_pct) * 100
                                ).toFixed(0)
                              : ""
                          }
                          onChange={(e) => {
                            const value = e.target.value.trim();
                            if (value === "") {
                              handleConfigParamChange("buffer_pct", "");
                            } else {
                              const numValue = parseFloat(value);
                              if (
                                !isNaN(numValue) &&
                                numValue >= 1 &&
                                numValue <= 100
                              ) {
                                handleConfigParamChange(
                                  "buffer_pct",
                                  (numValue / 100).toFixed(2)
                                );
                              }
                            }
                          }}
                          className="w-full px-3 py-2 pr-8 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                          placeholder="95"
                        />
                        <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none">
                          %
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Configuration Save/Update Buttons */}
                  <div className="flex gap-2 mt-4">
                    {/* Show create button when no configs exist */}
                    {(!trayConfigs || trayConfigs.length === 0) && (
                      <button
                        onClick={async () => {
                          // Validate all fields are filled
                          if (
                            configParams.tray_length_in === "" ||
                            configParams.tray_width_in === "" ||
                            configParams.tray_height_in === "" ||
                            configParams.weight_limit_lb === "" ||
                            configParams.buffer_pct === ""
                          ) {
                            setUpdateError(
                              "Please fill in all tray parameters and buffer percentage."
                            );
                            return;
                          }
                          setUpdateLoading(true);
                          setUpdateError(null);
                          setUpdateSuccess(false);
                          try {
                            const response = await fetch(
                              API_ENDPOINTS.trayConfigs(),
                              {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({
                                  tray_length_in: configParams.tray_length_in,
                                  tray_width_in: configParams.tray_width_in,
                                  tray_depth_in: configParams.tray_height_in,
                                  num_trays: 1, // Default to 1 for new configs
                                  weight_limit_lb: configParams.weight_limit_lb,
                                  buffer_pct: configParams.buffer_pct,
                                  name: "Default Configuration",
                                }),
                              }
                            );
                            if (response.ok) {
                              setUpdateSuccess(true);
                              fetchTrayConfigs();
                            } else {
                              const errorText = await response.text();
                              setUpdateError(errorText);
                            }
                          } catch (err: any) {
                            setUpdateError(err.message);
                          } finally {
                            setUpdateLoading(false);
                          }
                        }}
                        disabled={updateLoading}
                        className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium text-sm"
                      >
                        {updateLoading ? "Saving..." : "Create Default"}
                      </button>
                    )}

                    {selectedConfigId && (
                      <button
                        onClick={async () => {
                          setUpdateLoading(true);
                          setUpdateError(null);
                          setUpdateSuccess(false);
                          try {
                            const response = await fetch(
                              `${API_ENDPOINTS.trayConfigs()}/${selectedConfigId}`,
                              {
                                method: "PUT",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({
                                  tray_length_in: configParams.tray_length_in,
                                  tray_width_in: configParams.tray_width_in,
                                  tray_depth_in: configParams.tray_height_in,
                                  num_trays: 1, // Default to 1 for new configs
                                  weight_limit_lb: configParams.weight_limit_lb,
                                  buffer_pct: configParams.buffer_pct,
                                }),
                              }
                            );
                            if (response.ok) {
                              setUpdateSuccess(true);
                              setOriginalParams(configParams); // Reset change detection
                              fetchTrayConfigs();
                            } else {
                              const errorText = await response.text();
                              setUpdateError(errorText);
                            }
                          } catch (err: any) {
                            setUpdateError(err.message);
                          } finally {
                            setUpdateLoading(false);
                          }
                        }}
                        disabled={updateLoading || !paramsChanged}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium text-sm"
                      >
                        {updateLoading ? "Saving..." : "Update"}
                      </button>
                    )}

                    {isNewConfig && (
                      <button
                        onClick={async () => {
                          if (!newConfigName.trim()) {
                            setUpdateError(
                              "Please enter a name for the new configuration."
                            );
                            return;
                          }
                          // Validate all fields are filled
                          if (
                            configParams.tray_length_in === "" ||
                            configParams.tray_width_in === "" ||
                            configParams.tray_height_in === "" ||
                            configParams.weight_limit_lb === "" ||
                            configParams.buffer_pct === ""
                          ) {
                            setUpdateError(
                              "Please fill in all tray parameters and buffer percentage."
                            );
                            return;
                          }
                          setUpdateLoading(true);
                          setUpdateError(null);
                          setUpdateSuccess(false);
                          try {
                            const response = await fetch(
                              API_ENDPOINTS.trayConfigs(),
                              {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({
                                  tray_length_in: configParams.tray_length_in,
                                  tray_width_in: configParams.tray_width_in,
                                  tray_depth_in: configParams.tray_height_in,
                                  num_trays: 1, // Default to 1 for new configs
                                  weight_limit_lb: configParams.weight_limit_lb,
                                  buffer_pct: configParams.buffer_pct,
                                  name: newConfigName,
                                }),
                              }
                            );
                            if (response.ok) {
                              setUpdateSuccess(true);
                              setNewConfigName("");
                              setIsNewConfig(false);
                              fetchTrayConfigs();
                            } else {
                              const errorText = await response.text();
                              setUpdateError(errorText);
                            }
                          } catch (err: any) {
                            setUpdateError(err.message);
                          } finally {
                            setUpdateLoading(false);
                          }
                        }}
                        disabled={updateLoading}
                        className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium text-sm"
                      >
                        {updateLoading ? "Saving..." : "Save New"}
                      </button>
                    )}
                  </div>

                  {updateError && (
                    <div className="text-red-600 text-sm mt-2">
                      {updateError}
                    </div>
                  )}
                  {updateSuccess && (
                    <div className="text-green-600 text-sm mt-2">
                      Tray configuration updated!
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* 3D Preview Toggle Button */}
          {(selectedConfig ||
            (configParams.tray_width_in &&
              configParams.tray_length_in &&
              configParams.tray_height_in)) && (
            <div className="mt-3">
              <button
                onClick={() => setShow3DPreview(!show3DPreview)}
                className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 transition-colors"
              >
                {show3DPreview ? (
                  <>
                    <Minus className="h-4 w-4" />
                    Hide 3D Preview
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4" />
                    Show 3D Preview
                  </>
                )}
              </button>

              {/* 3D Visualization - Directly in Configuration Component */}
              {show3DPreview && (
                <div className="mt-4">
                  <Tray3DVisualization
                    trayId={selectedConfig?.id || 0}
                    slots={[]}
                    trayWidth={
                      selectedConfig?.tray_width_in ||
                      configParams.tray_width_in ||
                      36
                    }
                    trayLength={
                      selectedConfig?.tray_length_in ||
                      configParams.tray_length_in ||
                      156
                    }
                    trayDepth={
                      selectedConfig?.tray_depth_in ||
                      configParams.tray_height_in ||
                      18
                    }
                    utilization="0"
                    slotCount={0}
                    remainingSpace={usableWidth * usableLength}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
