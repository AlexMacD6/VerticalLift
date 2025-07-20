"use client";
import { useState, useEffect } from "react";

interface UploadedDataDisplayProps {
  data: { skuData?: any[]; dailyData?: any[] };
  onClose: () => void;
}

export default function UploadedDataDisplay({
  data,
  onClose,
}: UploadedDataDisplayProps) {
  const [activeTab, setActiveTab] = useState<"sku" | "daily">("sku");
  const [skuPage, setSkuPage] = useState(1);
  const [dailyPage, setDailyPage] = useState(1);
  const PAGE_SIZE = 50;

  useEffect(() => {
    setSkuPage(1);
    setDailyPage(1);
  }, [activeTab]);

  // Helper to paginate data
  function paginate(arr: any[] | undefined, page: number) {
    const safeArr = arr || [];
    const start = (page - 1) * PAGE_SIZE;
    return safeArr.slice(start, start + PAGE_SIZE);
  }

  const hasSkuData = data.skuData && data.skuData.length > 0;
  const hasDailyData = data.dailyData && data.dailyData.length > 0;

  if (!hasSkuData && !hasDailyData) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-900">
          Uploaded Data Preview
        </h3>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-red-500"
          title="Close"
        >
          <span className="sr-only">Close</span>×
        </button>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 mb-4">
        <nav className="-mb-px flex space-x-8">
          {hasSkuData && (
            <button
              onClick={() => setActiveTab("sku")}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === "sku"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              SKU Master Data ({(data.skuData || []).length || 0} items)
            </button>
          )}
          {hasDailyData && (
            <button
              onClick={() => setActiveTab("daily")}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === "daily"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              Daily Sales Data ({(data.dailyData || []).length || 0} records)
            </button>
          )}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === "sku" && hasSkuData && (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  SKU
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Product Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Length (in)
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Width (in)
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Height (in)
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Weight (lb)
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  In Stock
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Annual Sales
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {paginate(data.skuData, skuPage).map((item, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {item.sku}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {item.productName}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {item.lengthIn}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {item.widthIn}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {item.heightIn}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {item.weightLb}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {item.inStock}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {item.annualSales}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {/* Pagination controls for SKU Master */}
          {(data.skuData || []).length > PAGE_SIZE && (
            <div className="flex items-center justify-between mt-2">
              <span className="text-xs text-gray-500">
                Rows {(skuPage - 1) * PAGE_SIZE + 1} -{" "}
                {Math.min(skuPage * PAGE_SIZE, (data.skuData || []).length)} of{" "}
                {(data.skuData || []).length}
              </span>
              <div className="flex gap-2">
                <button
                  className="px-2 py-1 text-xs bg-gray-100 rounded disabled:opacity-50"
                  onClick={() => setSkuPage((p) => Math.max(1, p - 1))}
                  disabled={skuPage === 1}
                >
                  Previous
                </button>
                <button
                  className="px-2 py-1 text-xs bg-gray-100 rounded disabled:opacity-50"
                  onClick={() => setSkuPage((p) => p + 1)}
                  disabled={skuPage * PAGE_SIZE >= (data.skuData || []).length}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === "daily" && hasDailyData && (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  SKU
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Units Sold
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {paginate(data.dailyData, dailyPage).map((item, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {(() => {
                      const val = item.date;
                      if (!val) return "";
                      // Try to parse as date
                      const d = new Date(val);
                      if (!isNaN(d.getTime())) {
                        return d.toLocaleDateString("en-US");
                      }
                      // If already MM/DD/YYYY or similar, just show
                      if (
                        typeof val === "string" &&
                        /\d{1,2}\/\d{1,2}\/\d{4}/.test(val)
                      ) {
                        return val;
                      }
                      return val;
                    })()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {item.sku}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {item.unitsSold}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {/* Pagination controls for Daily Sales */}
          {(data.dailyData || []).length > PAGE_SIZE && (
            <div className="flex items-center justify-between mt-2">
              <span className="text-xs text-gray-500">
                Rows {(dailyPage - 1) * PAGE_SIZE + 1} -{" "}
                {Math.min(dailyPage * PAGE_SIZE, (data.dailyData || []).length)}{" "}
                of {(data.dailyData || []).length}
              </span>
              <div className="flex gap-2">
                <button
                  className="px-2 py-1 text-xs bg-gray-100 rounded disabled:opacity-50"
                  onClick={() => setDailyPage((p) => Math.max(1, p - 1))}
                  disabled={dailyPage === 1}
                >
                  Previous
                </button>
                <button
                  className="px-2 py-1 text-xs bg-gray-100 rounded disabled:opacity-50"
                  onClick={() => setDailyPage((p) => p + 1)}
                  disabled={
                    dailyPage * PAGE_SIZE >= (data.dailyData || []).length
                  }
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
