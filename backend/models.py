from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.dialects.postgresql import UUID
import uuid
import datetime

Base = declarative_base()

class InventoryList(Base):
    __tablename__ = "inventory_lists"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()), unique=True, index=True)
    name = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    inventories = relationship("Inventory", back_populates="inventory_list", cascade="all, delete-orphan")

class TrayConfig(Base):
    __tablename__ = "tray_configs"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)
    tray_length_in = Column(Float)
    tray_width_in = Column(Float)
    tray_depth_in = Column(Float)
    num_trays = Column(Integer)
    weight_limit_lb = Column(Float)

class Inventory(Base):
    __tablename__ = "inventory"
    id = Column(Integer, primary_key=True, index=True)
    sku_id = Column(String, index=True)
    description = Column(String)
    length_in = Column(Float)
    width_in = Column(Float)
    height_in = Column(Float)
    weight_lb = Column(Float)
    on_hand_units = Column(Integer)
    on_shelf_units = Column(Integer)  # Calculated optimal on-shelf units from analytics
    annual_units_sold = Column(Integer)
    daily_picks = Column(Float)
    demand_std_dev = Column(Float)
    inventory_list_id = Column(String, ForeignKey("inventory_lists.id", ondelete="CASCADE"), nullable=False)
    inventory_list = relationship("InventoryList", back_populates="inventories")
    
    # Composite unique constraint on (sku_id, inventory_list_id) - allows same SKU in different lists
    __table_args__ = (
        UniqueConstraint('sku_id', 'inventory_list_id', name='uq_inventory_sku_list'),
    )

class DailySales(Base):
    __tablename__ = "daily_sales"
    id = Column(Integer, primary_key=True, index=True)
    date = Column(DateTime, nullable=False)
    sku_id = Column(String, index=True, nullable=False)
    units_sold = Column(Integer, nullable=False)
    inventory_list_id = Column(String, ForeignKey("inventory_lists.id", ondelete="CASCADE"), nullable=False)
    inventory_list = relationship("InventoryList") 