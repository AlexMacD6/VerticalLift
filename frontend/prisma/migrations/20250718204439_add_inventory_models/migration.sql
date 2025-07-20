-- CreateTable
CREATE TABLE "TrayConfig" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "tray_length_in" INTEGER NOT NULL,
    "tray_width_in" INTEGER NOT NULL,
    "tray_depth_in" INTEGER NOT NULL,
    "num_trays" INTEGER NOT NULL,
    "weight_limit_lb" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TrayConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryList" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InventoryList_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Inventory" (
    "id" SERIAL NOT NULL,
    "sku_id" TEXT NOT NULL,
    "description" TEXT,
    "length_in" DOUBLE PRECISION,
    "width_in" DOUBLE PRECISION,
    "height_in" DOUBLE PRECISION,
    "weight_lb" DOUBLE PRECISION,
    "on_hand_units" INTEGER,
    "annual_units_sold" INTEGER,
    "daily_picks" DOUBLE PRECISION,
    "demand_std_dev" DOUBLE PRECISION,
    "inventory_list_id" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Inventory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailySales" (
    "id" SERIAL NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "sku_id" TEXT NOT NULL,
    "units_sold" INTEGER NOT NULL,
    "inventory_list_id" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DailySales_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Inventory_sku_id_inventory_list_id_key" ON "Inventory"("sku_id", "inventory_list_id");

-- AddForeignKey
ALTER TABLE "Inventory" ADD CONSTRAINT "Inventory_inventory_list_id_fkey" FOREIGN KEY ("inventory_list_id") REFERENCES "InventoryList"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailySales" ADD CONSTRAINT "DailySales_inventory_list_id_fkey" FOREIGN KEY ("inventory_list_id") REFERENCES "InventoryList"("id") ON DELETE CASCADE ON UPDATE CASCADE;
