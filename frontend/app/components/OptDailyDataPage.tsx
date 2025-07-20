"use client";
import { useState } from "react";
import { API_ENDPOINTS } from "../lib/api";

const mockData = [
  { date: "2024-06-01", sku: "SKU0001", units_sold: 5 },
  { date: "2024-06-01", sku: "SKU0002", units_sold: 2 },
  { date: "2024-06-02", sku: "SKU0001", units_sold: 3 },
  { date: "2024-06-02", sku: "SKU0002", units_sold: 4 },
];

function parseCSV(text: string) {
  const lines = text.trim().split("\n");
  const [header, ...rows] = lines;
  const keys = header.split(",").map((k) => k.trim());
  return rows.map((row) => {
    const values = row.split(",");
    return {
      date: values[0],
      sku: values[1],
      units_sold: Number(values[2]),
    };
  });
}

export default function OptDailyDataPage() {
  const [data, setData] = useState(mockData);
  const [error, setError] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<string | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    setFile(f || null);
    setImportResult(null);
    if (!f) return;
    try {
      const text = await f.text();
      const parsed = parseCSV(text);
      setData(parsed);
      setError(null);
    } catch (err) {
      setError(
        "Failed to parse CSV. Please ensure it has columns: date, sku, units_sold."
      );
    }
  };

  const handleImport = async () => {
    if (!file) return;
    setImporting(true);
    setImportResult(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      // You may want to adjust the endpoint as needed
      const response = await fetch(API_ENDPOINTS.importDailySales(), {
        method: "POST",
        body: formData,
      });
      if (response.ok) {
        setImportResult("Successfully imported daily sales data.");
      } else {
        const errorText = await response.text();
        setImportResult(`Import failed: ${errorText}`);
      }
    } catch (err) {
      setImportResult("Import error: " + err);
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Daily Sales Data</h1>
      <div className="mb-4">
        <label className="block mb-2 font-medium">Upload Daily Data CSV</label>
        <input
          type="file"
          accept=".csv"
          onChange={handleFileChange}
          className="block border border-gray-300 rounded px-3 py-2"
        />
        <button
          onClick={handleImport}
          disabled={!file || importing}
          className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          {importing ? "Importing..." : "Import"}
        </button>
        {importResult && (
          <div className="mt-2 text-sm text-green-700">{importResult}</div>
        )}
        {error && <div className="text-red-600 mt-2">{error}</div>}
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                date
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                sku
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                units_sold
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {data.map((row, i) => (
              <tr key={i}>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {row.date}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {row.sku}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {row.units_sold}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
