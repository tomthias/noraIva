/**
 * Grafico a torta (donut) con Canvas
 */

import { useRef, useEffect, useState } from "react";

interface DataPoint {
  label: string;
  value: number;
  color?: string;
}

interface Props {
  data: DataPoint[];
  colors?: string[];
  title?: string;
}

const DEFAULT_COLORS = [
  "#f87171", // red-400
  "#fb923c", // orange-400
  "#fbbf24", // amber-400
  "#a3e635", // lime-400
  "#34d399", // emerald-400
  "#22d3ee", // cyan-400
  "#818cf8", // indigo-400
  "#e879f9", // fuchsia-400
];

export function PieChartCanvas({ data, colors = DEFAULT_COLORS, title }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  // Calcola totale
  const total = data.reduce((sum, d) => sum + d.value, 0);

  // Prepara dati con angoli e colori
  const segments = data.map((d, i) => ({
    ...d,
    percentage: total > 0 ? (d.value / total) * 100 : 0,
    color: d.color || colors[i % colors.length],
  }));

  // Responsive resize
  useEffect(() => {
    if (!containerRef.current) return;

    const observer = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      setDimensions({ width, height });
    });

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Draw chart
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || dimensions.width === 0) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = dimensions.width * dpr;
    canvas.height = dimensions.height * dpr;
    canvas.style.width = `${dimensions.width}px`;
    canvas.style.height = `${dimensions.height}px`;
    ctx.scale(dpr, dpr);

    // Clear
    ctx.clearRect(0, 0, dimensions.width, dimensions.height);

    if (data.length === 0 || total === 0) {
      // Messaggio vuoto
      ctx.fillStyle = getComputedStyle(document.documentElement)
        .getPropertyValue("--muted-foreground")
        .trim() || "#6b7280";
      ctx.font = "14px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(
        "Nessun dato disponibile",
        dimensions.width / 2,
        dimensions.height / 2
      );
      return;
    }

    const centerX = dimensions.width / 2;
    const centerY = dimensions.height / 2;
    const radius = Math.min(dimensions.width, dimensions.height) / 2 - 20;
    const holeRadius = radius * 0.6; // Donut hole

    let currentAngle = -Math.PI / 2; // Start at top

    segments.forEach((segment, index) => {
      const sliceAngle = (segment.percentage / 100) * 2 * Math.PI;

      // Draw slice
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, currentAngle, currentAngle + sliceAngle);
      ctx.arc(
        centerX,
        centerY,
        holeRadius,
        currentAngle + sliceAngle,
        currentAngle,
        true
      );
      ctx.closePath();

      // Fill with color (brighter if hovered)
      ctx.fillStyle =
        hoveredIndex === index
          ? lightenColor(segment.color, 20)
          : segment.color;
      ctx.fill();

      // Border
      ctx.strokeStyle = getComputedStyle(document.documentElement)
        .getPropertyValue("--background")
        .trim() || "#ffffff";
      ctx.lineWidth = 2;
      ctx.stroke();

      currentAngle += sliceAngle;
    });

    // Draw center text (total)
    ctx.fillStyle = getComputedStyle(document.documentElement)
      .getPropertyValue("--foreground")
      .trim() || "#1f2937";
    ctx.font = "bold 16px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(
      `€${total.toLocaleString("it-IT", { maximumFractionDigits: 0 })}`,
      centerX,
      centerY
    );
  }, [data, dimensions, hoveredIndex, total, segments]);

  // Mouse hover
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const centerX = dimensions.width / 2;
    const centerY = dimensions.height / 2;
    const radius = Math.min(dimensions.width, dimensions.height) / 2 - 20;
    const holeRadius = radius * 0.6;

    const dx = x - centerX;
    const dy = y - centerY;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // Check if inside donut ring
    if (distance >= holeRadius && distance <= radius) {
      let angle = Math.atan2(dy, dx) + Math.PI / 2;
      if (angle < 0) angle += 2 * Math.PI;

      let currentAngle = 0;
      for (let i = 0; i < segments.length; i++) {
        const sliceAngle = (segments[i].percentage / 100) * 2 * Math.PI;
        if (angle >= currentAngle && angle < currentAngle + sliceAngle) {
          setHoveredIndex(i);
          return;
        }
        currentAngle += sliceAngle;
      }
    }

    setHoveredIndex(null);
  };

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
        Nessun dato disponibile
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {title && <h3 className="text-sm font-medium">{title}</h3>}

      <div ref={containerRef} className="relative h-64">
        <canvas
          ref={canvasRef}
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setHoveredIndex(null)}
          className="cursor-pointer"
        />
      </div>

      {/* Legend */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        {segments.map((segment, index) => (
          <div
            key={index}
            className={`flex items-center gap-2 p-2 rounded transition-colors ${
              hoveredIndex === index ? "bg-muted" : ""
            }`}
            onMouseEnter={() => setHoveredIndex(index)}
            onMouseLeave={() => setHoveredIndex(null)}
          >
            <div
              className="w-3 h-3 rounded-full flex-shrink-0"
              style={{ backgroundColor: segment.color }}
            />
            <div className="flex-1 min-w-0">
              <div className="truncate font-medium">{segment.label}</div>
              <div className="text-muted-foreground">
                €{segment.value.toLocaleString("it-IT")} (
                {segment.percentage.toFixed(1)}%)
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Utility: lighten color
 */
function lightenColor(color: string, percent: number): string {
  const num = parseInt(color.replace("#", ""), 16);
  const amt = Math.round(2.55 * percent);
  const R = (num >> 16) + amt;
  const G = ((num >> 8) & 0x00ff) + amt;
  const B = (num & 0x0000ff) + amt;
  return (
    "#" +
    (
      0x1000000 +
      (R < 255 ? (R < 1 ? 0 : R) : 255) * 0x10000 +
      (G < 255 ? (G < 1 ? 0 : G) : 255) * 0x100 +
      (B < 255 ? (B < 1 ? 0 : B) : 255)
    )
      .toString(16)
      .slice(1)
  );
}
