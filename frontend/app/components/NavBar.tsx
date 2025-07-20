"use client";
import { usePathname } from "next/navigation";

export default function NavBar() {
  const pathname = usePathname();
  const activeClass = "font-bold text-blue-600";
  const inactiveClass = "text-gray-600 hover:text-blue-600";

  return (
    <nav className="flex space-x-4">
      <a href="/" className={pathname === "/" ? activeClass : inactiveClass}>
        Optimize
      </a>
      <a
        href="/inventory-data"
        className={pathname === "/inventory-data" ? activeClass : inactiveClass}
      >
        Inventory Data
      </a>
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
      <a
        href="/opt-daily-data"
        className={pathname === "/opt-daily-data" ? activeClass : inactiveClass}
      >
        Opt. Daily Data
      </a>
      <a
        href="/divider-optimization"
        className={
          pathname === "/divider-optimization" ? activeClass : inactiveClass
        }
      >
        Divider Optimization
      </a>
    </nav>
  );
}
