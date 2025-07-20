"use client";
import { useState, useEffect } from "react";
import { Settings, Play } from "lucide-react";
import { API_ENDPOINTS } from "../lib/api";

interface ParamFormProps {
  onSubmit: (plan: any[]) => void;
  onParamsChange?: (params: {
    tray_length_in: number;
    tray_width_in: number;
    tray_depth_in: number;
    num_trays: number;
    weight_limit_lb: number;
    buffer_pct: number;
    model: string;
    inventory_list_id?: string;
  }) => void;
  configs?: any[];
  inventoryLists?: any[];
  onConfigSaved?: () => void;
  optimizationType?: "tray" | "dividers";
}

export default function ParamForm({
  onSubmit,
  onParamsChange,
  configs,
  inventoryLists,
  onConfigSaved,
  optimizationType = "tray",
}: ParamFormProps) {
  const [params, setParams] = useState<{
    tray_length_in: number | "";
    tray_width_in: number | "";
    tray_depth_in: number | "";
    num_trays: number | "";
    weight_limit_lb: number | "";
    buffer_pct: number | "";
    model: string;
    inventory_list_id: string;
  }>({
    tray_length_in: 156,
    tray_width_in: 36,
    tray_depth_in: 18,
    num_trays: 20,
    weight_limit_lb: 2205,
    buffer_pct: 0.95,
    model: optimizationType === "dividers" ? "rectpack" : "greedy",
    inventory_list_id: "",
  });
  const [loading, setLoading] = useState(false);
  const [selectedConfigId, setSelectedConfigId] = useState<number | null>(null);
  const [originalParams, setOriginalParams] = useState<typeof params | null>(
    null
  );
  const [updateLoading, setUpdateLoading] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [updateSuccess, setUpdateSuccess] = useState(false);
  const [isNewConfig, setIsNewConfig] = useState(false);
  const [newConfigName, setNewConfigName] = useState("");

  // When a config is selected, store its id and params for change detection
  useEffect(() => {
    if (selectedConfigId !== null && configs) {
      const config = configs.find((c) => c.id === selectedConfigId);
      if (config) {
        setOriginalParams({
          tray_length_in: config.tray_length_in,
          tray_width_in: config.tray_width_in,
          tray_depth_in: config.tray_depth_in,
          num_trays: config.num_trays,
          weight_limit_lb: config.weight_limit_lb,
          buffer_pct: params.buffer_pct,
          model: params.model,
          inventory_list_id: params.inventory_list_id,
        });
      }
    }
  }, [selectedConfigId, configs]);

  // Helper to check if params differ from originalParams
  const paramsChanged =
    originalParams &&
    (params.tray_length_in !== originalParams.tray_length_in ||
      params.tray_width_in !== originalParams.tray_width_in ||
      params.tray_depth_in !== originalParams.tray_depth_in ||
      params.num_trays !== originalParams.num_trays ||
      params.weight_limit_lb !== originalParams.weight_limit_lb);

  const handleParamChange = (
    key: keyof typeof params,
    value: number | string | ""
  ) => {
    setParams((prev) => {
      const updated = { ...prev, [key]: value };
      return updated;
    });
  };

  // Only call onParamsChange when explicitly needed (e.g., when config is loaded)
  // This prevents infinite loops and unnecessary calls

  const handleSubmit = async () => {
    setLoading(true);

    // This would typically be called with a file, but for now we'll just show the structure
    // In a real implementation, this would be integrated with the UploadBox component
    console.log("Parameters updated:", params);
    setLoading(false);
  };

  useEffect(() => {
    if (updateSuccess) {
      const timer = setTimeout(() => setUpdateSuccess(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [updateSuccess]);

  const optimizationModels =
    optimizationType === "dividers"
      ? [
          {
            value: "rectpack",
            label:
              "Maximal-Rectangles Algorithm (2D Bin Packing with Database Storage)",
          },
          {
            value: "cvxpy_continuous",
            label: "CVXPY Continuous (Area Minimization)",
          },
          { value: "cvxpy_discrete", label: "CVXPY Discrete (1-inch Grid)" },
        ]
      : [
          { value: "greedy", label: "Greedy Algorithm" },
          { value: "cvxpy_continuous", label: "CVXPY Continuous" },
          { value: "cvxpy_discrete", label: "CVXPY Discrete" },
        ];

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <div className="flex items-center space-x-2 mb-4">
        <Settings className="h-5 w-5 text-gray-600" />
        <h2 className="text-lg font-semibold text-gray-900">
          {optimizationType === "dividers"
            ? "Divider Optimization"
            : "Tray Optimization"}{" "}
          Parameters
        </h2>
      </div>

      {/* Inventory List Selection */}
      {inventoryLists && inventoryLists.length > 0 && (
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Inventory List
          </label>
          <select
            className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            value={params.inventory_list_id}
            onChange={(e) =>
              handleParamChange("inventory_list_id", e.target.value)
            }
          >
            <option value="">Select an inventory list...</option>
            {inventoryLists.map((list) => (
              <option key={list.id} value={list.id}>
                {list.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Optimization Model Selection */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Optimization Model
        </label>
        <select
          className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          value={params.model}
          onChange={(e) => handleParamChange("model", e.target.value)}
        >
          {optimizationModels.map((model) => (
            <option key={model.value} value={model.value}>
              {model.label}
            </option>
          ))}
        </select>
      </div>

      {configs && configs.length > 0 && (
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Load Tray Configuration
          </label>
          <select
            className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            onChange={(e) => {
              if (e.target.value === "__new__") {
                setIsNewConfig(true);
                setSelectedConfigId(null);
                setParams((prev) => ({
                  ...prev,
                  tray_length_in: "",
                  tray_width_in: "",
                  tray_depth_in: "",
                  num_trays: "",
                  weight_limit_lb: "",
                }));
                setOriginalParams(null);
              } else if (e.target.value === "") {
                setIsNewConfig(false);
                setSelectedConfigId(null);
                setOriginalParams(null);
              } else {
                setIsNewConfig(false);
                const config = configs.find(
                  (c) => String(c.id) === e.target.value
                );
                if (config) {
                  setParams((prev) => ({
                    ...prev,
                    tray_length_in: config.tray_length_in || "",
                    tray_width_in: config.tray_width_in || "",
                    tray_depth_in: config.tray_depth_in || "",
                    num_trays: config.num_trays || "",
                    weight_limit_lb: config.weight_limit_lb || "",
                  }));
                  setSelectedConfigId(config.id);
                }
              }
            }}
            value={isNewConfig ? "__new__" : (selectedConfigId ?? "")}
          >
            <option value="" disabled>
              Select a configuration...
            </option>
            <option value="__new__">New Configuration</option>
            {configs.map((config) => (
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
              className="mt-2 w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
          )}
        </div>
      )}

      {/* Show parameter fields if a config is selected, creating new, or no configs exist */}
      {(isNewConfig ||
        selectedConfigId ||
        !configs ||
        configs.length === 0) && (
        <div className="grid grid-cols-1 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tray Length (inches)
            </label>
            <input
              type="number"
              value={params.tray_length_in ?? ""}
              onChange={(e) =>
                handleParamChange(
                  "tray_length_in",
                  e.target.value === "" ? "" : parseInt(e.target.value)
                )
              }
              className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tray Width (inches)
            </label>
            <input
              type="number"
              value={params.tray_width_in ?? ""}
              onChange={(e) =>
                handleParamChange(
                  "tray_width_in",
                  e.target.value === "" ? "" : parseInt(e.target.value)
                )
              }
              className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tray Depth (inches)
            </label>
            <input
              type="number"
              value={params.tray_depth_in ?? ""}
              onChange={(e) =>
                handleParamChange(
                  "tray_depth_in",
                  e.target.value === "" ? "" : parseInt(e.target.value)
                )
              }
              className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </div>

          {optimizationType === "tray" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Number of Trays
              </label>
              <input
                type="number"
                value={params.num_trays ?? ""}
                onChange={(e) =>
                  handleParamChange(
                    "num_trays",
                    e.target.value === "" ? "" : parseInt(e.target.value)
                  )
                }
                className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>
          )}

          {optimizationType === "tray" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Weight Limit (lbs)
              </label>
              <input
                type="number"
                value={params.weight_limit_lb ?? ""}
                onChange={(e) =>
                  handleParamChange(
                    "weight_limit_lb",
                    e.target.value === "" ? "" : parseInt(e.target.value)
                  )
                }
                className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Buffer Percentage (0.8 - 1.0)
            </label>
            <input
              type="number"
              step="0.01"
              min="0.8"
              max="1.0"
              value={params.buffer_pct ?? ""}
              onChange={(e) =>
                handleParamChange(
                  "buffer_pct",
                  e.target.value === "" ? "" : parseFloat(e.target.value)
                )
              }
              className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
            <p className="text-xs text-gray-500 mt-1">
              Safety margin for tray dimensions (95% = 0.95)
            </p>
          </div>
        </div>
      )}

      <div className="mt-8 flex gap-3">
        {/* Show create button when no configs exist */}
        {(!configs || configs.length === 0) && (
          <button
            onClick={async () => {
              // Validate all fields are filled
              if (
                params.tray_length_in === "" ||
                params.tray_width_in === "" ||
                params.tray_depth_in === "" ||
                (optimizationType === "tray" && params.num_trays === "") ||
                (optimizationType === "tray" && params.weight_limit_lb === "")
              ) {
                setUpdateError("Please fill in all tray parameters.");
                return;
              }
              setUpdateLoading(true);
              setUpdateError(null);
              setUpdateSuccess(false);
              try {
                const response = await fetch(API_ENDPOINTS.trayConfigs(), {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    tray_length_in: params.tray_length_in,
                    tray_width_in: params.tray_width_in,
                    tray_depth_in: params.tray_depth_in,
                    num_trays: params.num_trays,
                    weight_limit_lb: params.weight_limit_lb,
                    name: "Default Configuration",
                  }),
                });
                if (response.ok) {
                  setUpdateSuccess(true);
                  if (onConfigSaved) onConfigSaved();
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
            className={`px-6 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium`}
          >
            {updateLoading ? "Saving..." : "Create Default Configuration"}
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
                      tray_length_in: params.tray_length_in,
                      tray_width_in: params.tray_width_in,
                      tray_depth_in: params.tray_depth_in,
                      num_trays: params.num_trays,
                      weight_limit_lb: params.weight_limit_lb,
                    }),
                  }
                );
                if (response.ok) {
                  setUpdateSuccess(true);
                  setOriginalParams(params); // Reset change detection
                  if (onConfigSaved) onConfigSaved();
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
            className={`px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium`}
          >
            {updateLoading ? "Saving..." : "Update Parameters"}
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
                params.tray_length_in === "" ||
                params.tray_width_in === "" ||
                params.tray_depth_in === "" ||
                (optimizationType === "tray" && params.num_trays === "") ||
                (optimizationType === "tray" && params.weight_limit_lb === "")
              ) {
                setUpdateError("Please fill in all tray parameters.");
                return;
              }
              setUpdateLoading(true);
              setUpdateError(null);
              setUpdateSuccess(false);
              try {
                const response = await fetch(API_ENDPOINTS.trayConfigs(), {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    tray_length_in: params.tray_length_in,
                    tray_width_in: params.tray_width_in,
                    tray_depth_in: params.tray_depth_in,
                    num_trays: params.num_trays,
                    weight_limit_lb: params.weight_limit_lb,
                    name: newConfigName,
                  }),
                });
                if (response.ok) {
                  setUpdateSuccess(true);
                  setNewConfigName("");
                  setIsNewConfig(false);
                  if (onConfigSaved) onConfigSaved();
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
            className={`px-6 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium`}
          >
            {updateLoading ? "Saving..." : "Save New Configuration"}
          </button>
        )}
      </div>
      {updateError && <div className="text-red-600 mt-2">{updateError}</div>}
      {updateSuccess && (
        <div className="text-green-600 mt-2">Tray configuration updated!</div>
      )}

      {/* Submit Button for Optimization */}
      {optimizationType === "dividers" && (
        <div className="mt-8">
          <button
            onClick={() => {
              // Validate all required fields
              const requiredFields = [
                "tray_length_in",
                "tray_width_in",
                "tray_depth_in",
                "buffer_pct",
                "model",
              ];
              const allValid = requiredFields.every((field) => {
                const value = params[field as keyof typeof params];

                // Handle string fields (model, inventory_list_id)
                if (field === "model" || field === "inventory_list_id") {
                  return value !== "" && value !== null && value !== undefined;
                }

                // Handle numeric fields
                return (
                  value !== "" &&
                  value !== null &&
                  value !== undefined &&
                  !isNaN(Number(value))
                );
              });

              if (!allValid) {
                // Debug: Check which fields are invalid
                const invalidFields = requiredFields.filter((field) => {
                  const value = params[field as keyof typeof params];
                  return (
                    value === "" ||
                    value === null ||
                    value === undefined ||
                    isNaN(Number(value))
                  );
                });
                console.log(
                  "Invalid fields:",
                  invalidFields,
                  "Current params:",
                  params
                );
                setUpdateError(
                  `Please fill in all required parameters. Missing: ${invalidFields.join(", ")}`
                );
                return;
              }

              if (onSubmit) {
                onSubmit(params as any);
              }
            }}
            disabled={loading}
            className="w-full flex items-center justify-center space-x-2 px-6 py-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium text-base"
          >
            <Play className="h-4 w-4" />
            <span>
              {loading ? "Optimizing..." : "Run Divider Optimization"}
            </span>
          </button>
        </div>
      )}
    </div>
  );
}
