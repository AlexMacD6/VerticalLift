"use client";
import { useState } from "react";
import { Upload, FileText, Download, X } from "lucide-react";
import { API_ENDPOINTS } from "../lib/api";

interface UploadBoxProps {
  onSubmit: () => Promise<void>;
  onImportSuccess?: (
    message: string,
    data?: { skuData?: any[]; dailyData?: any[] }
  ) => void;
  open: boolean;
  onClose: () => void;
  downloadTemplate: () => Promise<void>;
  uploadMode: "annual" | "daily" | "auto";
}

export default function UploadBox({
  onSubmit,
  onImportSuccess,
  open,
  onClose,
  downloadTemplate,
  uploadMode,
}: UploadBoxProps) {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [listName, setListName] = useState("");

  if (!open) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (
      selectedFile &&
      (selectedFile.type === "text/csv" ||
        selectedFile.type ===
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
    ) {
      setFile(selectedFile);
    }
  };

  const handleClearFile = () => {
    setFile(null);
    // Reset the file input
    const fileInput = document.querySelector(
      'input[type="file"]'
    ) as HTMLInputElement;
    if (fileInput) {
      fileInput.value = "";
    }
    setListName("");
  };

  const handleImport = async () => {
    if (!file) return;
    if (!listName.trim()) {
      alert("Please enter a name for the inventory list.");
      return;
    }
    setImporting(true);
    try {
      // Parse the file to get both SKU and Daily data if present
      let skuData: any[] = [];
      let dailyData: any[] = [];

      if (
        file.type ===
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      ) {
        // Parse Excel file
        const arrayBuffer = await file.arrayBuffer();
        const ExcelJS = await import("exceljs");
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(arrayBuffer);

        const skuSheet = workbook.getWorksheet("SKU Master");
        const dailySheet = workbook.getWorksheet("Daily Sales");

        console.log("Excel sheets found:", {
          skuSheet: !!skuSheet,
          dailySheet: !!dailySheet,
          sheetNames: workbook.worksheets.map((ws) => ws.name),
        });

        if (skuSheet) {
          const rows = skuSheet.getRows(4, skuSheet.rowCount - 3);
          if (rows) {
            skuData = rows
              .map((row) => {
                const values = row.values as any[];
                return {
                  sku: values[1]?.toString() || "",
                  productName: values[2]?.toString() || "",
                  lengthIn: values[3]?.toString() || "",
                  widthIn: values[4]?.toString() || "",
                  heightIn: values[5]?.toString() || "",
                  weightLb: values[6]?.toString() || "",
                  inStock: values[7]?.toString() || "",
                  annualSales: values[8]?.toString() || "",
                };
              })
              .filter((item) => item.sku && item.sku.trim() !== "");
          }
        }

        if (dailySheet) {
          const rows = dailySheet.getRows(4, dailySheet.rowCount - 3);
          if (rows) {
            dailyData = rows
              .map((row) => {
                const values = row.values as any[];
                return {
                  date: values[1]?.toString() || "",
                  sku: values[2]?.toString() || "",
                  unitsSold: values[3]?.toString() || "",
                };
              })
              .filter(
                (item) =>
                  item.sku &&
                  item.sku.trim() !== "" &&
                  item.date &&
                  item.date.trim() !== ""
              );
          }
        }
      } else {
        // For CSV files, just parse as SKU data
        const text = await file.text();
        const lines = text.split("\n").filter((line) => line.trim() !== "");
        const dataLines = lines.slice(3); // Skip header rows

        skuData = dataLines
          .map((line) => {
            const values = line.split(",").map((v) => v.trim());
            return {
              sku: values[0] || "",
              productName: values[1] || "",
              lengthIn: values[2] || "",
              widthIn: values[3] || "",
              heightIn: values[4] || "",
              weightLb: values[5] || "",
              inStock: values[6] || "",
              annualSales: values[7] || "",
            };
          })
          .filter((item) => item.sku && item.sku.trim() !== "");
      }

      // 1. Create the inventory list
      const listResp = await fetch(API_ENDPOINTS.inventoryLists(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: listName }),
      });
      if (!listResp.ok) {
        const errorText = await listResp.text();
        alert(`Failed to create inventory list: ${errorText}`);
        setImporting(false);
        return;
      }
      const list = await listResp.json();

      // 2. Import inventory and associate with the new list
      const formData = new FormData();
      formData.append("file", file);
      formData.append("inventory_list_id", list.id);
      const response = await fetch(API_ENDPOINTS.importInventory(), {
        method: "POST",
        body: formData,
      });
      if (response.ok) {
        const result = await response.json();
        setFile(null); // Clear the file after successful import
        setListName("");
        console.log("Import successful, parsed data:", { skuData, dailyData });
        if (onImportSuccess) {
          onImportSuccess(`Successfully imported ${result.message}`, {
            skuData: skuData.length > 0 ? skuData : undefined,
            dailyData: dailyData.length > 0 ? dailyData : undefined,
          });
        }
        onClose();
      } else {
        const errorText = await response.text();
        alert(`Import failed: ${errorText}`);
      }
    } catch (error) {
      console.error("Import error:", error);
      alert(`Import error: ${error}`);
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30">
      <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md relative">
        <button
          onClick={onClose}
          className="absolute top-2 right-2 text-gray-400 hover:text-red-500"
          title="Close"
        >
          <span className="sr-only">Close</span>×
        </button>
        <div className="text-center">
          <Upload className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-lg font-semibold text-gray-900">
            Upload Inventory
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            {uploadMode === "annual"
              ? "Upload your inventory Excel file with annual sales by SKU."
              : uploadMode === "daily"
                ? "Upload your inventory Excel file with both SKU master and daily sales sheets."
                : "Upload your inventory Excel file. Either the Annual Sales or Daily Sales template is accepted and will be auto-detected."}
          </p>
        </div>
        <div className="mt-4 space-y-4">
          <div className="flex justify-center">
            <input
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={handleFileChange}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
          </div>
          {file && (
            <div className="flex flex-col items-center gap-2">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-700 font-medium">
                  {file.name}
                </span>
                <button
                  onClick={handleClearFile}
                  className="text-xs text-red-500 hover:underline"
                  type="button"
                >
                  Remove
                </button>
              </div>
              {/* Only show Inventory List Name input after file is loaded */}
              <input
                type="text"
                placeholder="Inventory List Name"
                value={listName}
                onChange={(e) => setListName(e.target.value)}
                className="mt-2 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={handleImport}
                disabled={importing || !listName.trim()}
                className="w-full mt-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 shadow disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {importing ? "Importing..." : "Import"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
