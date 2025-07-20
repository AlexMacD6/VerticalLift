"use client";

import React, { useState, useRef, useEffect } from "react";

interface Slot {
  skuId: string;
  width: number;
  length: number;
  x: number;
  y: number;
}

interface Tray3DVisualizationProps {
  trayId: number;
  slots: Slot[];
  trayWidth: number;
  trayLength: number;
  trayDepth: number;
  utilization: string;
  slotCount: number;
  remainingSpace: number;
  highlightSku?: string;
}

export default function Tray3DVisualization({
  trayId,
  slots,
  trayWidth,
  trayLength,
  trayDepth,
  utilization,
  slotCount,
  remainingSpace,
  highlightSku,
}: Tray3DVisualizationProps) {
  const [zoom, setZoom] = useState(1);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [showBuffer, setShowBuffer] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Calculate buffer dimensions (95% of each side)
  const bufferWidth = trayWidth * 0.95;
  const bufferLength = trayLength * 0.95;
  const bufferDepth = trayDepth * 0.95;

  // Use either full or buffer dimensions based on toggle
  const displayWidth = showBuffer ? bufferWidth : trayWidth;
  const displayLength = showBuffer ? bufferLength : trayLength;
  const displayDepth = showBuffer ? bufferDepth : trayDepth;

  // Calculate the aspect ratio for proper scaling
  const aspectRatio = displayWidth / displayLength;

  // Base dimensions for the 3D visualization
  const baseWidth = 400;
  const baseHeight = 200;

  // Calculate dimensions that maintain aspect ratio
  let visualWidth = baseWidth;
  let visualHeight = baseWidth / aspectRatio;

  // If height would be too small, adjust based on height
  if (visualHeight < 80) {
    visualHeight = 80;
    visualWidth = visualHeight * aspectRatio;
  }

  // If height would be too large, cap it
  if (visualHeight > baseHeight) {
    visualHeight = baseHeight;
    visualWidth = visualHeight * aspectRatio;
  }

  // Apply zoom to visual dimensions
  const scaledWidth = visualWidth * zoom;
  const scaledHeight = visualHeight * zoom;
  const scaledDepth = visualHeight * 0.15 * zoom;

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
    setZoom((prev) => Math.max(0.5, Math.min(3, prev * zoomFactor)));
  };

  // Reset view
  const resetView = () => {
    setZoom(1);
    setPanX(0);
    setPanY(0);
  };

  return (
    <div className="border border-gray-300 rounded-lg p-4 bg-white">
      <div className="flex justify-between items-center mb-3">
        <h4 className="font-semibold text-gray-900">
          Tray Configuration Schematic
        </h4>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowBuffer(!showBuffer)}
            className={`px-2 py-1 text-xs rounded ${
              showBuffer
                ? "bg-blue-500 text-white"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
          >
            {showBuffer ? "Buffer" : "Full"}
          </button>
          <button
            onClick={resetView}
            className="px-2 py-1 text-xs bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
            title="Reset view"
          >
            Reset
          </button>
        </div>
      </div>

      {/* 3D Scene Container */}
      <div className="flex justify-center mb-3">
        <div
          ref={containerRef}
          className="relative border border-gray-200 rounded bg-gray-50 cursor-grab active:cursor-grabbing"
          style={{
            width: `${baseWidth + 100}px`,
            height: `${baseHeight + 100}px`,
            perspective: "1000px",
            overflow: "hidden",
          }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onWheel={handleWheel}
        >
          {/* 3D Tray Container */}
          <div
            className="absolute"
            style={{
              width: `${scaledWidth}px`,
              height: `${scaledHeight}px`,
              left: `${50 + panX}px`,
              top: `${50 + panY}px`,
              transform: "rotateX(20deg) rotateY(-30deg) rotateZ(0deg)",
              transformStyle: "preserve-3d",
            }}
          >
            {/* Bottom Face */}
            <div
              className="absolute bg-gray-200 border-2 border-gray-400"
              style={{
                width: `${scaledWidth}px`,
                height: `${scaledHeight}px`,
                transform: "translateZ(0px)",
              }}
            />

            {/* Top Face */}
            <div
              className="absolute bg-gray-100 border-2 border-gray-400"
              style={{
                width: `${scaledWidth}px`,
                height: `${scaledHeight}px`,
                transform: `translateZ(${scaledDepth}px)`,
              }}
            />

            {/* Left Face */}
            <div
              className="absolute bg-gray-300 border-2 border-gray-400"
              style={{
                width: `${scaledDepth}px`,
                height: `${scaledHeight}px`,
                left: "0px",
                top: "0px",
                transform: "rotateY(-90deg) translateZ(0px)",
                transformOrigin: "left center",
              }}
            />

            {/* Right Face */}
            <div
              className="absolute bg-gray-300 border-2 border-gray-400"
              style={{
                width: `${scaledDepth}px`,
                height: `${scaledHeight}px`,
                left: `${scaledWidth}px`,
                top: "0px",
                transform: "rotateY(90deg) translateZ(0px)",
                transformOrigin: "right center",
              }}
            />

            {/* Front Face */}
            <div
              className="absolute bg-gray-400 border-2 border-gray-500"
              style={{
                width: `${scaledWidth}px`,
                height: `${scaledDepth}px`,
                left: "0px",
                top: `${scaledHeight}px`,
                transform: "rotateX(-90deg) translateZ(0px)",
                transformOrigin: "top center",
              }}
            />

            {/* Back Face */}
            <div
              className="absolute bg-gray-400 border-2 border-gray-500"
              style={{
                width: `${scaledWidth}px`,
                height: `${scaledDepth}px`,
                left: "0px",
                top: "0px",
                transform: "rotateX(90deg) translateZ(0px)",
                transformOrigin: "bottom center",
              }}
            />
          </div>

          {/* Dimension Lines and Labels */}
          {/* Width dimension line */}
          <div
            className="absolute border-t-2 border-blue-500"
            style={{
              width: `${scaledWidth}px`,
              top: `${20 + panY}px`,
              left: `${50 + panX}px`,
            }}
          />
          <div
            className="absolute text-xs text-blue-600 font-medium bg-white px-1 rounded"
            style={{
              top: `${10 + panY}px`,
              left: `${50 + panX + scaledWidth / 2}px`,
              transform: "translateX(-50%)",
            }}
          >
            {displayWidth.toFixed(1)}"
          </div>

          {/* Length dimension line */}
          <div
            className="absolute border-l-2 border-green-500"
            style={{
              height: `${scaledHeight}px`,
              left: `${20 + panX}px`,
              top: `${50 + panY}px`,
            }}
          />
          <div
            className="absolute text-xs text-green-600 font-medium bg-white px-1 rounded"
            style={{
              left: `${10 + panX}px`,
              top: `${50 + panY + scaledHeight / 2}px`,
              transform: "translateY(-50%) rotate(-90deg)",
            }}
          >
            {displayLength.toFixed(1)}"
          </div>

          {/* Height dimension line */}
          <div
            className="absolute border-l-2 border-red-500"
            style={{
              height: `${scaledDepth}px`,
              left: `${50 + panX + scaledWidth + 10}px`,
              top: `${50 + panY + scaledHeight - scaledDepth}px`,
            }}
          />
          <div
            className="absolute text-xs text-red-600 font-medium bg-white px-1 rounded"
            style={{
              left: `${50 + panX + scaledWidth + 20}px`,
              top: `${50 + panY + scaledHeight - scaledDepth / 2}px`,
              transform: "translateY(-50%)",
            }}
          >
            {displayDepth.toFixed(1)}"
          </div>

          {/* Zoom indicator */}
          <div className="absolute top-2 right-2 text-xs text-gray-500 bg-white px-2 py-1 rounded">
            {zoom.toFixed(1)}x
          </div>
        </div>
      </div>

      {/* Tray Information */}
      <div className="text-xs text-gray-600 space-y-1">
        <p>
          {showBuffer ? "Buffer" : "Full"} Dimensions: {displayWidth.toFixed(1)}
          " × {displayLength.toFixed(1)}" × {displayDepth.toFixed(1)}"
        </p>
        <p>Remaining: {remainingSpace.toFixed(0)} in²</p>
        <p className="text-gray-400 italic">
          Drag to pan • Scroll to zoom • Use buttons for precise control
        </p>
      </div>
    </div>
  );
}
