/**
 * Line Chart (Area) con Recharts - stile moderno
 */

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { formatCurrency } from "../../utils/format";

interface DataPoint {
  label: string;
  value: number;
}

interface Props {
  data: DataPoint[];
  color?: string;
  gradientId?: string;
}

export function RechartsLineChart({
  data,
  color = "#8b5cf6",
  gradientId = "lineGradientDefault",
}: Props) {
  // Trasforma i dati per recharts
  const chartData = data.map((d) => ({
    name: d.label,
    value: d.value,
  }));

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[250px] text-muted-foreground text-sm">
        Nessun dato disponibile
      </div>
    );
  }

  return (
    <div className="h-[250px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.4} />
              <stop offset="95%" stopColor={color} stopOpacity={0.05} />
            </linearGradient>
          </defs>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="hsl(var(--border))"
            opacity={0.4}
          />
          <XAxis
            dataKey="name"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            tick={{ fill: "#a1a1aa" }}
            dy={10}
          />
          <YAxis
            fontSize={12}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) => `€${(value / 1000).toFixed(0)}k`}
            tick={{ fill: "#a1a1aa" }}
          />
          <Tooltip
            cursor={{ stroke: color, strokeWidth: 1, strokeDasharray: "3 3" }}
            contentStyle={{
              backgroundColor: "#000000",
              borderColor: "#333333",
              borderRadius: "8px",
              color: "#ffffff",
            }}
            itemStyle={{ color: "#ffffff" }}
            labelStyle={{ color: "#a1a1aa" }}
            formatter={(value) => [formatCurrency(Number(value)), "Saldo"]}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={2}
            fill={`url(#${gradientId})`}
            dot={{ fill: color, strokeWidth: 0, r: 3 }}
            activeDot={{ fill: color, strokeWidth: 0, r: 5 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
