/**
 * Pie Chart (Donut) con Recharts - stile moderno
 */

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { formatCurrency } from "../../utils/format";

interface DataPoint {
  label: string;
  value: number;
}

interface Props {
  data: DataPoint[];
  colors?: string[];
}

const DEFAULT_COLORS = [
  "#22c55e", // green-500
  "#3b82f6", // blue-500
  "#f59e0b", // amber-500
  "#ef4444", // red-500
  "#8b5cf6", // violet-500
  "#ec4899", // pink-500
  "#06b6d4", // cyan-500
  "#f97316", // orange-500
];

export function RechartsPieChart({ data, colors = DEFAULT_COLORS }: Props) {
  // Trasforma i dati per recharts
  const chartData = data.map((d) => ({
    name: d.label,
    value: d.value,
  }));

  const total = data.reduce((sum, d) => sum + d.value, 0);

  if (data.length === 0 || total === 0) {
    return (
      <div className="flex items-center justify-center h-[250px] text-muted-foreground text-sm">
        Nessun dato disponibile
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="h-[250px] w-full flex items-center justify-center">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={85}
              paddingAngle={3}
              dataKey="value"
              stroke="none"
            >
              {chartData.map((_, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={colors[index % colors.length]}
                />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: "#000000",
                borderColor: "#333333",
                borderRadius: "8px",
                color: "#ffffff",
              }}
              itemStyle={{ color: "#ffffff" }}
              labelStyle={{ color: "#a1a1aa" }}
              formatter={(value, name) => [
                formatCurrency(Number(value)),
                String(name),
              ]}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-x-4 gap-y-2 justify-center max-h-[100px] overflow-y-auto px-2">
        {chartData.map((entry, index) => (
          <div
            key={index}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <div
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: colors[index % colors.length] }}
            />
            <span>{entry.name}</span>
            <span className="font-medium">
              ({((entry.value / total) * 100).toFixed(0)}%)
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
