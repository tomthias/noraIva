/**
 * Bar Chart con Recharts - stile moderno
 */

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { ChartTooltip } from "@/components/ui/chart-tooltip";

interface DataPoint {
  label: string;
  value: number;
}

interface Props {
  data: DataPoint[];
  color?: string;
  gradientId?: string;
  /** Cosa rappresentano i valori, mostrato nel tooltip (es. "Fatturato"). */
  etichetta?: string;
  /** Se true il tooltip mostra anche la percentuale sul totale delle barre. */
  mostraPercentuale?: boolean;
}

export function RechartsBarChart({
  data,
  color = "#22c55e",
  gradientId = "barGradientDefault",
  etichetta,
  mostraPercentuale = false,
}: Props) {
  // Trasforma i dati per recharts
  const chartData = data.map((d) => ({
    name: d.label,
    value: d.value,
  }));

  const totale = data.reduce((sum, d) => sum + d.value, 0);

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
        <BarChart data={chartData}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.8} />
              <stop offset="95%" stopColor={color} stopOpacity={0.3} />
            </linearGradient>
          </defs>
          <CartesianGrid
            strokeDasharray="3 3"
            vertical={false}
            stroke="var(--color-border)"
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
            cursor={{ fill: "rgba(255,255,255,0.1)" }}
            content={
              <ChartTooltip
                etichetta={etichetta}
                totale={mostraPercentuale ? totale : undefined}
              />
            }
          />
          <Bar
            dataKey="value"
            fill={`url(#${gradientId})`}
            radius={[4, 4, 0, 0]}
            barSize={32}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
