/**
 * Grafico a linee con Canvas
 */

import { useRef, useEffect, useState } from "react";

interface DataPoint {
  label: string;
  value: number;
}

interface Props {
  data: DataPoint[];
  color?: string;
  title?: string;
  fillGradient?: boolean;
}

export function LineChartCanvas({
  data,
  color = "#22c55e",
  title,
  fillGradient = true,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

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

    if (data.length === 0) {
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

    const padding = { top: 20, right: 20, bottom: 40, left: 60 };
    const chartWidth = dimensions.width - padding.left - padding.right;
    const chartHeight = dimensions.height - padding.top - padding.bottom;

    const maxValue = Math.max(...data.map((d) => d.value), 0);
    const minValue = Math.min(...data.map((d) => d.value), 0);
    const range = maxValue - minValue || 1;

    // Draw grid lines
    const gridColor = getComputedStyle(document.documentElement)
      .getPropertyValue("--border")
      .trim() || "#e5e7eb";
    ctx.strokeStyle = gridColor;
    ctx.lineWidth = 1;

    // Horizontal grid lines
    const numLines = 5;
    for (let i = 0; i <= numLines; i++) {
      const y = padding.top + (chartHeight / numLines) * i;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(padding.left + chartWidth, y);
      ctx.stroke();

      // Value label
      const value = maxValue - (range / numLines) * i;
      ctx.fillStyle = getComputedStyle(document.documentElement)
        .getPropertyValue("--muted-foreground")
        .trim() || "#6b7280";
      ctx.font = "10px sans-serif";
      ctx.textAlign = "right";
      ctx.fillText(
        `€${value.toLocaleString("it-IT", { maximumFractionDigits: 0 })}`,
        padding.left - 5,
        y + 4
      );
    }

    // Draw line and fill
    const points: { x: number; y: number }[] = [];

    data.forEach((point, index) => {
      const x = padding.left + (chartWidth / (data.length - 1)) * index;
      const normalizedValue = (point.value - minValue) / range;
      const y = padding.top + chartHeight - normalizedValue * chartHeight;
      points.push({ x, y });
    });

    // Fill gradient
    if (fillGradient && points.length > 0) {
      const gradient = ctx.createLinearGradient(
        0,
        padding.top,
        0,
        padding.top + chartHeight
      );
      gradient.addColorStop(0, color + "40"); // 25% opacity
      gradient.addColorStop(1, color + "00"); // 0% opacity

      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.moveTo(points[0].x, padding.top + chartHeight);
      points.forEach((p) => ctx.lineTo(p.x, p.y));
      ctx.lineTo(points[points.length - 1].x, padding.top + chartHeight);
      ctx.closePath();
      ctx.fill();
    }

    // Draw line
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.lineJoin = "round";
    ctx.beginPath();
    points.forEach((p, i) => {
      if (i === 0) {
        ctx.moveTo(p.x, p.y);
      } else {
        ctx.lineTo(p.x, p.y);
      }
    });
    ctx.stroke();

    // Draw points
    points.forEach((p, index) => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, hoveredIndex === index ? 5 : 3, 0, Math.PI * 2);
      ctx.fillStyle = hoveredIndex === index ? lightenColor(color, 20) : color;
      ctx.fill();
      ctx.strokeStyle = getComputedStyle(document.documentElement)
        .getPropertyValue("--background")
        .trim() || "#ffffff";
      ctx.lineWidth = 2;
      ctx.stroke();

      // Show value on hover
      if (hoveredIndex === index) {
        ctx.fillStyle = getComputedStyle(document.documentElement)
          .getPropertyValue("--foreground")
          .trim() || "#1f2937";
        ctx.font = "bold 12px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(
          `€${data[index].value.toLocaleString("it-IT")}`,
          p.x,
          p.y - 15
        );
      }
    });

    // Draw X-axis labels (show only a few to avoid clutter)
    const labelStep = Math.max(1, Math.floor(data.length / 6));
    ctx.fillStyle = getComputedStyle(document.documentElement)
      .getPropertyValue("--foreground")
      .trim() || "#1f2937";
    ctx.font = "10px sans-serif";
    ctx.textAlign = "center";

    data.forEach((point, index) => {
      if (index % labelStep === 0 || index === data.length - 1) {
        const x = padding.left + (chartWidth / (data.length - 1)) * index;
        ctx.fillText(point.label, x, padding.top + chartHeight + 15);
      }
    });

    // Axes
    ctx.strokeStyle = gridColor;
    ctx.lineWidth = 2;

    // Y-axis
    ctx.beginPath();
    ctx.moveTo(padding.left, padding.top);
    ctx.lineTo(padding.left, padding.top + chartHeight);
    ctx.stroke();

    // X-axis
    ctx.beginPath();
    ctx.moveTo(padding.left, padding.top + chartHeight);
    ctx.lineTo(padding.left + chartWidth, padding.top + chartHeight);
    ctx.stroke();
  }, [data, dimensions, hoveredIndex, color, fillGradient]);

  // Mouse hover
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;

    const padding = { top: 20, right: 20, bottom: 40, left: 60 };
    const chartWidth = dimensions.width - padding.left - padding.right;

    if (x >= padding.left && x <= padding.left + chartWidth) {
      const relativeX = x - padding.left;
      const index = Math.round((relativeX / chartWidth) * (data.length - 1));
      if (index >= 0 && index < data.length) {
        setHoveredIndex(index);
        return;
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
