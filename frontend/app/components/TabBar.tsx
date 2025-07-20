"use client";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

export default function TabBar() {
  const pathname = usePathname();
  const [showDailyTab, setShowDailyTab] = useState(false);

  useEffect(() => {
    setShowDailyTab(localStorage.getItem("showDailyTab") === "true");
    // Listen for changes in localStorage (e.g., from other tabs)
    const handler = () =>
      setShowDailyTab(localStorage.getItem("showDailyTab") === "true");
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, []);

  const activeClass = "text-blue-600 font-bold underline";
  const inactiveClass = "text-gray-700 font-semibold hover:text-blue-600";

  return (
    <div className="w-full flex justify-center border-b border-gray-200 bg-white">
      <div className="flex space-x-6 py-4">
        <a href="/" className={pathname === "/" ? activeClass : inactiveClass}>
          Optimize
        </a>
        <a
          href="/inventory-data"
          className={
            pathname === "/inventory-data" ? activeClass : inactiveClass
          }
        >
          Inventory Data
        </a>
        {showDailyTab && (
          <a
            href="/opt-daily-data"
            className={
              pathname === "/opt-daily-data" ? activeClass : inactiveClass
            }
          >
            Opt. Daily Data
          </a>
        )}
        <a
          href="/tray-parameters"
          className={
            pathname === "/tray-parameters" ? activeClass : inactiveClass
          }
        >
          Tray Parameters
        </a>
        <a
          href="/results"
          className={pathname === "/results" ? activeClass : inactiveClass}
        >
          Results
        </a>
      </div>
    </div>
  );
}
