/**
 * Grafico a barre con Canvas
 */

import { useRef, useEffect, useState } from "react";

interface DataPoint {
  label: string;
  value: number;
}

interface Props {
  data: DataPoint[];
  orientation?: "vertical" | "horizontal";
  color?: string;
  title?: string;
}

export function BarChartCanvas({
  data,
  orientation = "vertical",
  color = "#3b82f6",
  title,
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

    const maxValue = Math.max(...data.map((d) => d.value));

    // Draw grid
    const gridColor = getComputedStyle(document.documentElement)
      .getPropertyValue("--border")
      .trim() || "#e5e7eb";
    ctx.strokeStyle = gridColor;
    ctx.lineWidth = 1;

    if (orientation === "vertical") {
      // Vertical bars
      const barWidth = chartWidth / data.length;
      const barPadding = barWidth * 0.2;

      // Draw bars
      data.forEach((point, index) => {
        const barHeight = (point.value / maxValue) * chartHeight;
        const x = padding.left + index * barWidth + barPadding / 2;
        const y = padding.top + chartHeight - barHeight;
        const width = barWidth - barPadding;

        // Bar
        ctx.fillStyle =
          hoveredIndex === index ? lightenColor(color, 20) : color;
        ctx.fillRect(x, y, width, barHeight);

        // Label
        ctx.fillStyle = getComputedStyle(document.documentElement)
          .getPropertyValue("--foreground")
          .trim() || "#1f2937";
        ctx.font = "11px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(
          point.label,
          x + width / 2,
          padding.top + chartHeight + 20
        );

        // Value on hover
        if (hoveredIndex === index) {
          ctx.font = "bold 12px sans-serif";
          ctx.fillText(
            `€${point.value.toLocaleString("it-IT")}`,
            x + width / 2,
            y - 5
          );
        }
      });

      // Y-axis
      ctx.strokeStyle = gridColor;
      ctx.beginPath();
      ctx.moveTo(padding.left, padding.top);
      ctx.lineTo(padding.left, padding.top + chartHeight);
      ctx.stroke();

      // X-axis
      ctx.beginPath();
      ctx.moveTo(padding.left, padding.top + chartHeight);
      ctx.lineTo(padding.left + chartWidth, padding.top + chartHeight);
      ctx.stroke();
    } else {
      // Horizontal bars
      const barHeight = chartHeight / data.length;
      const barPadding = barHeight * 0.2;

      // Draw bars
      data.forEach((point, index) => {
        const barLength = (point.value / maxValue) * chartWidth;
        const x = padding.left;
        const y = padding.top + index * barHeight + barPadding / 2;
        const height = barHeight - barPadding;

        // Bar
        ctx.fillStyle =
          hoveredIndex === index ? lightenColor(color, 20) : color;
        ctx.fillRect(x, y, barLength, height);

        // Label
        ctx.fillStyle = getComputedStyle(document.documentElement)
          .getPropertyValue("--foreground")
          .trim() || "#1f2937";
        ctx.font = "11px sans-serif";
        ctx.textAlign = "right";
        ctx.fillText(point.label, padding.left - 10, y + height / 2 + 4);

        // Value on hover
        if (hoveredIndex === index) {
          ctx.font = "bold 12px sans-serif";
          ctx.textAlign = "left";
          ctx.fillText(
            `€${point.value.toLocaleString("it-IT")}`,
            x + barLength + 5,
            y + height / 2 + 4
          );
        }
      });

      // X-axis
      ctx.strokeStyle = gridColor;
      ctx.beginPath();
      ctx.moveTo(padding.left, padding.top + chartHeight);
      ctx.lineTo(padding.left + chartWidth, padding.top + chartHeight);
      ctx.stroke();

      // Y-axis
      ctx.beginPath();
      ctx.moveTo(padding.left, padding.top);
      ctx.lineTo(padding.left, padding.top + chartHeight);
      ctx.stroke();
    }
  }, [data, dimensions, hoveredIndex, orientation, color]);

  // Mouse hover
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const padding = { top: 20, right: 20, bottom: 40, left: 60 };
    const chartWidth = dimensions.width - padding.left - padding.right;
    const chartHeight = dimensions.height - padding.top - padding.bottom;

    if (orientation === "vertical") {
      const barWidth = chartWidth / data.length;
      const index = Math.floor((x - padding.left) / barWidth);
      if (index >= 0 && index < data.length) {
        setHoveredIndex(index);
      } else {
        setHoveredIndex(null);
      }
    } else {
      const barHeight = chartHeight / data.length;
      const index = Math.floor((y - padding.top) / barHeight);
      if (index >= 0 && index < data.length) {
        setHoveredIndex(index);
      } else {
        setHoveredIndex(null);
      }
    }
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
