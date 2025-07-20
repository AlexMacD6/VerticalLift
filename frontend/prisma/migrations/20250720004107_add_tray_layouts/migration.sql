-- CreateTable
CREATE TABLE "tray_configs" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR,
    "tray_length_in" DOUBLE PRECISION,
    "tray_width_in" DOUBLE PRECISION,
    "tray_depth_in" DOUBLE PRECISION,
    "num_trays" INTEGER,
    "weight_limit_lb" DOUBLE PRECISION,

    CONSTRAINT "tray_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_lists" (
    "id" VARCHAR NOT NULL,
    "name" VARCHAR NOT NULL,
    "created_at" TIMESTAMP(6),

    CONSTRAINT "inventory_lists_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory" (
    "id" SERIAL NOT NULL,
    "sku_id" VARCHAR,
    "description" VARCHAR,
    "length_in" DOUBLE PRECISION,
    "width_in" DOUBLE PRECISION,
    "height_in" DOUBLE PRECISION,
    "weight_lb" DOUBLE PRECISION,
    "on_hand_units" INTEGER,
    "on_shelf_units" INTEGER,
    "annual_units_sold" INTEGER,
    "daily_picks" DOUBLE PRECISION,
    "demand_std_dev" DOUBLE PRECISION,
    "inventory_list_id" VARCHAR NOT NULL,

    CONSTRAINT "inventory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "daily_sales" (
    "id" SERIAL NOT NULL,
    "date" TIMESTAMP(6) NOT NULL,
    "sku_id" VARCHAR NOT NULL,
    "units_sold" INTEGER NOT NULL,
    "inventory_list_id" VARCHAR NOT NULL,

    CONSTRAINT "daily_sales_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tray_layouts" (
    "id" SERIAL NOT NULL,
    "tray_id" INTEGER NOT NULL,
    "inventory_list_id" VARCHAR NOT NULL,
    "optimization_model" VARCHAR NOT NULL,
    "tray_width_in" DOUBLE PRECISION NOT NULL,
    "tray_length_in" DOUBLE PRECISION NOT NULL,
    "tray_depth_in" DOUBLE PRECISION NOT NULL,
    "buffer_pct" DOUBLE PRECISION NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tray_layouts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tray_slots" (
    "id" SERIAL NOT NULL,
    "tray_layout_id" INTEGER NOT NULL,
    "sku_id" VARCHAR NOT NULL,
    "x_in" DOUBLE PRECISION NOT NULL,
    "y_in" DOUBLE PRECISION NOT NULL,
    "width_in" DOUBLE PRECISION NOT NULL,
    "length_in" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "tray_slots_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ix_tray_configs_name" ON "tray_configs"("name");

-- CreateIndex
CREATE INDEX "ix_tray_configs_id" ON "tray_configs"("id");

-- CreateIndex
CREATE UNIQUE INDEX "ix_inventory_lists_id" ON "inventory_lists"("id");

-- CreateIndex
CREATE INDEX "ix_inventory_id" ON "inventory"("id");

-- CreateIndex
CREATE INDEX "ix_inventory_sku_id" ON "inventory"("sku_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_inventory_sku_list" ON "inventory"("sku_id", "inventory_list_id");

-- CreateIndex
CREATE INDEX "ix_daily_sales_id" ON "daily_sales"("id");

-- CreateIndex
CREATE INDEX "ix_daily_sales_sku_id" ON "daily_sales"("sku_id");

-- CreateIndex
CREATE INDEX "ix_tray_layouts_id" ON "tray_layouts"("id");

-- CreateIndex
CREATE INDEX "ix_tray_layouts_tray_id" ON "tray_layouts"("tray_id");

-- CreateIndex
CREATE INDEX "ix_tray_layouts_inventory_list_id" ON "tray_layouts"("inventory_list_id");

-- CreateIndex
CREATE INDEX "ix_tray_slots_id" ON "tray_slots"("id");

-- CreateIndex
CREATE INDEX "ix_tray_slots_sku_id" ON "tray_slots"("sku_id");

-- CreateIndex
CREATE INDEX "ix_tray_slots_tray_layout_id" ON "tray_slots"("tray_layout_id");

-- AddForeignKey
ALTER TABLE "inventory" ADD CONSTRAINT "inventory_inventory_list_id_fkey" FOREIGN KEY ("inventory_list_id") REFERENCES "inventory_lists"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "daily_sales" ADD CONSTRAINT "daily_sales_inventory_list_id_fkey" FOREIGN KEY ("inventory_list_id") REFERENCES "inventory_lists"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "tray_layouts" ADD CONSTRAINT "tray_layouts_inventory_list_id_fkey" FOREIGN KEY ("inventory_list_id") REFERENCES "inventory_lists"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "tray_slots" ADD CONSTRAINT "tray_slots_tray_layout_id_fkey" FOREIGN KEY ("tray_layout_id") REFERENCES "tray_layouts"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
