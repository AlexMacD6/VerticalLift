"use client";

import React, { useState, useRef, useEffect } from "react";

interface Slot {
  skuId: string;
  width: number;
  length: number;
  x: number;
  y: number;
}

interface TraySVGVisualizationProps {
  trayId: number;
  slots: Slot[];
  trayWidth: number;
  trayLength: number;
  utilization: string;
  slotCount: number;
  remainingSpace: number;
  highlightSku?: string;
}

export default function TraySVGVisualization({
  trayId,
  slots,
  trayWidth,
  trayLength,
  utilization,
  slotCount,
  remainingSpace,
  highlightSku,
}: TraySVGVisualizationProps) {
  const [zoom, setZoom] = useState(3); // Start zoomed in
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const svgRef = useRef<SVGSVGElement>(null);

  // SVG dimensions - make it wide to accommodate the long tray
  const svgWidth = 800;
  const svgHeight = 300; // Increased height for better visibility
  const padding = 20;

  // Calculate base scale to fit the tray within SVG bounds
  const scaleX = (svgWidth - 2 * padding) / trayWidth;
  const scaleY = (svgHeight - 2 * padding) / trayLength;
  const baseScale = Math.min(scaleX, scaleY);

  // Apply zoom to the scale
  const scale = baseScale * zoom;

  // Calculate actual display dimensions
  const displayWidth = trayWidth * scale;
  const displayHeight = trayLength * scale;

  // Center the tray in the SVG with pan offset
  const offsetX = (svgWidth - displayWidth) / 2 + panX;
  const offsetY = (svgHeight - displayHeight) / 2 + panY;

  // Handle mouse events for panning
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - panX, y: e.clientY - panY });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setPanX(e.clientX - dragStart.x);
      setPanY(e.clientY - dragStart.y);
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Handle wheel events for zooming
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
    setZoom((prev) => Math.max(0.5, Math.min(10, prev * zoomFactor)));
  };

  // Reset view function
  const resetView = () => {
    setZoom(3);
    setPanX(0);
    setPanY(0);
  };

  return (
    <div className="border border-gray-300 rounded-lg p-4">
      <div className="flex justify-between items-center mb-3">
        <h4 className="font-semibold text-gray-900">
          Tray {trayId} (SVG View)
        </h4>
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-600">{utilization}% utilized</span>
          <div className="flex items-center space-x-1">
            <button
              onClick={() => setZoom((prev) => Math.max(0.5, prev - 0.5))}
              className="px-2 py-1 text-xs bg-gray-200 hover:bg-gray-300 rounded"
              title="Zoom Out"
            >
              -
            </button>
            <span className="text-xs text-gray-600 min-w-[40px] text-center">
              {zoom.toFixed(1)}x
            </span>
            <button
              onClick={() => setZoom((prev) => Math.min(10, prev + 0.5))}
              className="px-2 py-1 text-xs bg-gray-200 hover:bg-gray-300 rounded"
              title="Zoom In"
            >
              +
            </button>
            <button
              onClick={resetView}
              className="px-2 py-1 text-xs bg-blue-500 text-white hover:bg-blue-600 rounded"
              title="Reset View"
            >
              Reset
            </button>
          </div>
        </div>
      </div>

      {/* SVG Container */}
      <div className="flex justify-center mb-3">
        <svg
          ref={svgRef}
          width={svgWidth}
          height={svgHeight}
          className="border border-gray-200 rounded bg-gray-50 cursor-grab active:cursor-grabbing"
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onWheel={handleWheel}
          style={{ userSelect: "none" }}
        >
          {/* Tray outline */}
          <rect
            x={offsetX}
            y={offsetY}
            width={displayWidth}
            height={displayHeight}
            fill="none"
            stroke="#6b7280"
            strokeWidth="2"
            strokeDasharray="5,5"
          />

          {/* Tray background */}
          <rect
            x={offsetX}
            y={offsetY}
            width={displayWidth}
            height={displayHeight}
            fill="#f3f4f6"
            opacity="0.3"
          />

          {/* Slots */}
          {slots.map((slot, index) => {
            const slotX = offsetX + slot.x * scale;
            const slotY = offsetY + slot.y * scale;
            const slotWidth = slot.width * scale;
            const slotHeight = slot.length * scale;

            // Ensure slot doesn't exceed tray boundaries
            const maxX = Math.max(
              offsetX,
              Math.min(slotX, offsetX + displayWidth - slotWidth)
            );
            const maxY = Math.max(
              offsetY,
              Math.min(slotY, offsetY + displayHeight - slotHeight)
            );
            const maxWidth = Math.min(slotWidth, offsetX + displayWidth - maxX);
            const maxHeight = Math.min(
              slotHeight,
              offsetY + displayHeight - maxY
            );

            // Check if this slot should be highlighted
            const isHighlighted =
              highlightSku &&
              slot.skuId.toLowerCase().includes(highlightSku.toLowerCase());

            return (
              <g key={index}>
                {/* Slot rectangle */}
                <rect
                  x={maxX}
                  y={maxY}
                  width={maxWidth}
                  height={maxHeight}
                  fill={isHighlighted ? "#ef4444" : "#3b82f6"}
                  stroke={isHighlighted ? "#dc2626" : "#1d4ed8"}
                  strokeWidth={isHighlighted ? "3" : "1"}
                  opacity={isHighlighted ? "1" : "0.8"}
                />

                {/* Slot label */}
                {maxWidth > 20 && maxHeight > 10 && (
                  <text
                    x={maxX + maxWidth / 2}
                    y={maxY + maxHeight / 2}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fontSize={Math.max(8, Math.min(16, (10 * zoom) / 3))}
                    fill={isHighlighted ? "#ffffff" : "#ffffff"}
                    fontWeight={isHighlighted ? "900" : "bold"}
                  >
                    {slot.skuId.length > 6
                      ? slot.skuId.substring(0, 4) + "..."
                      : slot.skuId}
                  </text>
                )}

                {/* Tooltip area */}
                <rect
                  x={maxX}
                  y={maxY}
                  width={maxWidth}
                  height={maxHeight}
                  fill="transparent"
                  style={{ cursor: "pointer" }}
                >
                  <title>{`${slot.skuId} (${slot.width}" × ${slot.length}")`}</title>
                </rect>
              </g>
            );
          })}

          {/* Grid lines for better visualization - scale with zoom */}
          {Array.from(
            { length: Math.floor(displayWidth / (50 * zoom)) },
            (_, i) => (
              <line
                key={`v-${i}`}
                x1={offsetX + (i + 1) * 50 * zoom}
                y1={offsetY}
                x2={offsetX + (i + 1) * 50 * zoom}
                y2={offsetY + displayHeight}
                stroke="#e5e7eb"
                strokeWidth={1 / zoom}
                opacity="0.5"
              />
            )
          )}

          {Array.from(
            { length: Math.floor(displayHeight / (50 * zoom)) },
            (_, i) => (
              <line
                key={`h-${i}`}
                x1={offsetX}
                y1={offsetY + (i + 1) * 50 * zoom}
                x2={offsetX + displayWidth}
                y2={offsetY + (i + 1) * 50 * zoom}
                stroke="#e5e7eb"
                strokeWidth={1 / zoom}
                opacity="0.5"
              />
            )
          )}
        </svg>
      </div>

      {/* Tray Information */}
      <div className="text-xs text-gray-600 space-y-1">
        <p>
          Tray: {trayWidth.toFixed(1)}" × {trayLength.toFixed(1)}"
          <span className="ml-2 text-gray-400">(Zoom: {zoom.toFixed(1)}x)</span>
        </p>
        <p>Slots: {slotCount}</p>
        <p>Remaining: {remainingSpace.toFixed(0)} in²</p>
        <p className="text-gray-400 italic">
          Drag to pan • Scroll to zoom • Use +/- buttons for precise control
        </p>
      </div>
    </div>
  );
}
