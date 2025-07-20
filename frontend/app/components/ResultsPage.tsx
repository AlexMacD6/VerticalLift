import React, { useState } from "react";
import { Info as InfoIcon } from "lucide-react";

interface ResultsPageProps {
  kpis: Record<string, any>;
  model: string;
}

const KPI_LABELS: Record<string, string> = {
  tray_utilization_rate: "Tray Utilization Rate",
  number_of_trays_used: "Number of Trays Used",
  average_picks_per_tray: "Average Picks per Tray",
  space_utilization_efficiency: "Space Utilization Efficiency",
  weight_distribution_variance: "Weight Distribution Variance",
  sku_fragmentation: "SKU Fragmentation",
  total_unused_space: "Total Unused Space",
  total_unused_weight_capacity: "Total Unused Weight Capacity",
  max_tray_utilization: "Max Tray Utilization",
  min_tray_utilization: "Min Tray Utilization",
  average_skus_per_tray: "Average SKUs per Tray",
};

const KPI_DEFINITIONS: Record<string, string> = {
  "Tray Utilization Rate":
    "The fraction of the total tray volume that is actually used by inventory (volume utilization).",
  "Number of Trays Used":
    "The total number of trays that were used in the optimization.",
  "Average Picks per Tray":
    "The average number of picks (items picked) per tray.",
  "Space Utilization Efficiency":
    "The fraction of the tray’s area that is used by inventory (area utilization).",
  "Weight Distribution Variance":
    "The variance in total weight between trays. A lower value means trays are more evenly loaded by weight.",
  "SKU Fragmentation":
    "The average number of trays that each SKU (product) is split across. Lower is better for picking efficiency.",
  "Total Unused Space":
    "The total unused volume in all trays (in cubic inches).",
  "Total Unused Weight Capacity":
    "The total unused weight capacity in all trays (in pounds).",
  "Max Tray Utilization":
    "The maximum ratio of tray weight to tray weight limit (should be <= 1.0 if not overloaded).",
  "Min Tray Utilization":
    "The minimum ratio of tray weight to tray weight limit.",
  "Average SKUs per Tray": "The average number of unique SKUs in each tray.",
};

function Tooltip({ text }: { text: string }) {
  const [show, setShow] = useState(false);
  return (
    <span className="relative inline-block align-middle">
      <InfoIcon
        className="inline h-4 w-4 ml-1 text-blue-400 cursor-pointer hover:text-blue-600"
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        aria-label="Info"
      />
      {show && (
        <span className="absolute z-50 left-6 top-1/2 -translate-y-1/2 bg-gray-900 text-white text-xs rounded px-2 py-1 shadow-lg whitespace-pre-line min-w-[180px] max-w-xs">
          {text}
        </span>
      )}
    </span>
  );
}

export default function ResultsPage({ kpis, model }: ResultsPageProps) {
  if (!kpis || Object.keys(kpis).length === 0) {
    return (
      <div className="text-gray-500">No KPIs available for this model.</div>
    );
  }
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 mt-6">
      <h2 className="text-xl font-bold mb-4 text-blue-700">
        Results for Model: {model}
      </h2>
      <table className="min-w-full divide-y divide-gray-200">
        <tbody>
          {Object.entries(kpis).map(([key, value]) => (
            <tr key={key}>
              <td className="py-2 px-4 font-medium text-gray-700">
                {KPI_LABELS[key] || key}{" "}
                <Tooltip text={KPI_DEFINITIONS[KPI_LABELS[key] || key] || ""} />
              </td>
              <td className="py-2 px-4 text-right text-gray-900">
                {typeof value === "number" ? value.toFixed(3) : String(value)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
