// API utility functions
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export const apiUrl = (endpoint: string) => {
  // Remove trailing slash from base URL and leading slash from endpoint
  const baseUrl = API_BASE_URL.replace(/\/$/, '');
  const cleanEndpoint = endpoint.replace(/^\//, '');
  return `${baseUrl}/${cleanEndpoint}`;
};

// Common API endpoints
export const API_ENDPOINTS = {
  trayConfigs: () => apiUrl('/tray-configs'),
  inventoryLists: () => apiUrl('/inventory-lists'),
  inventory: (inventoryListId?: string) => 
    inventoryListId ? apiUrl(`/inventory?inventory_list_id=${inventoryListId}`) : apiUrl('/inventory'),
  dailySales: (inventoryListId?: string) => 
    inventoryListId ? apiUrl(`/daily-sales?inventory_list_id=${inventoryListId}`) : apiUrl('/daily-sales'),
  optimize: () => apiUrl('/optimize'),
  optimizeDividers: () => apiUrl('/optimize-dividers'),
  importInventory: () => apiUrl('/import-inventory'),
  importDailySales: () => apiUrl('/import-daily-sales'),
  updateOnShelfUnits: (inventoryListId: string) => 
    apiUrl(`/inventory-lists/${inventoryListId}/update-on-shelf-units`),
  dailySalesBySku: (inventoryListId: string, skuId: string) => 
    apiUrl(`/daily-sales?inventory_list_id=${inventoryListId}&sku_id=${skuId}`),
}; 