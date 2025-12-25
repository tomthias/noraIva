/**
 * Grafico del fatturato mensile per anno
 */

import { useMemo } from "react";
import type { Fattura } from "../types/fattura";
import { formatCurrency } from "../utils/format";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

interface Props {
  fatture: Fattura[];
  anno: number;
}

const MESI = [
  "Gen", "Feb", "Mar", "Apr", "Mag", "Giu",
  "Lug", "Ago", "Set", "Ott", "Nov", "Dic"
];

export function GraficoFatturato({ fatture, anno }: Props) {
  const datiMensili = useMemo(() => {
    // Inizializza tutti i mesi con 0
    const mesiData = MESI.map((mese, index) => ({
      mese,
      meseNum: index + 1,
      fatturato: 0,
      count: 0,
    }));

    // Filtra fatture per anno e raggruppa per mese
    fatture
      .filter((f) => f.data.startsWith(String(anno)))
      .forEach((f) => {
        const meseIndex = parseInt(f.data.substring(5, 7)) - 1;
        if (meseIndex >= 0 && meseIndex < 12) {
          mesiData[meseIndex].fatturato += f.importoLordo;
          mesiData[meseIndex].count += 1;
        }
      });

    return mesiData;
  }, [fatture, anno]);

  const totaleAnno = useMemo(
    () => datiMensili.reduce((sum, m) => sum + m.fatturato, 0),
    [datiMensili]
  );

  const meseMassimo = useMemo(() => {
    const max = Math.max(...datiMensili.map((m) => m.fatturato));
    return datiMensili.find((m) => m.fatturato === max);
  }, [datiMensili]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-popover border rounded-lg p-3 shadow-lg">
          <p className="font-medium">{label} {anno}</p>
          <p className="text-green-500 font-semibold">
            {formatCurrency(data.fatturato)}
          </p>
          <p className="text-xs text-muted-foreground">
            {data.count} {data.count === 1 ? "fattura" : "fatture"}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Fatturato Mensile {anno}</CardTitle>
        <CardDescription>
          Totale: {formatCurrency(totaleAnno)}
          {meseMassimo && meseMassimo.fatturato > 0 && (
            <span className="ml-2">
              • Mese migliore: {meseMassimo.mese} ({formatCurrency(meseMassimo.fatturato)})
            </span>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[250px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={datiMensili} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="mese"
                tick={{ fontSize: 12 }}
                className="text-muted-foreground"
              />
              <YAxis
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => `€${(value / 1000).toFixed(0)}k`}
                className="text-muted-foreground"
                width={50}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="fatturato" radius={[4, 4, 0, 0]}>
                {datiMensili.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.fatturato > 0 ? "hsl(142.1 76.2% 36.3%)" : "hsl(var(--muted))"}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
