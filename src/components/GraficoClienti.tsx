/**
 * Grafico che mostra i migliori clienti per fatturato
 */

import { useMemo } from "react";
import type { Fattura } from "../types/fattura";
import { formatCurrency } from "../utils/format";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartTooltip } from "@/components/ui/chart-tooltip";
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
  anno?: number | null;
}

const COLORS = [
  "hsl(142.1 76.2% 36.3%)", // green (best)
  "hsl(142.1 60% 45%)",
  "hsl(142.1 50% 50%)",
  "hsl(142.1 40% 55%)",
  "hsl(142.1 30% 60%)",
  // era `hsl(var(--muted))`: variabile inesistente nel tema Tailwind v4 → barra invisibile
  "var(--color-muted)",
];

export function GraficoClienti({ fatture, anno }: Props) {
  const datiClienti = useMemo(() => {
    // Filtra per anno se specificato
    const fattureFiltrate = anno
      ? fatture.filter((f) => f.data.startsWith(String(anno)))
      : fatture;

    // Raggruppa per cliente
    const clientiMap = new Map<string, { totale: number; count: number }>();
    fattureFiltrate.forEach((f) => {
      const cliente = f.cliente || "Non specificato";
      const current = clientiMap.get(cliente) || { totale: 0, count: 0 };
      clientiMap.set(cliente, {
        totale: current.totale + f.importoLordo,
        count: current.count + 1,
      });
    });

    // Converti a array e ordina per totale decrescente
    return Array.from(clientiMap.entries())
      .map(([nome, data]) => ({
        nome: nome.length > 20 ? nome.substring(0, 18) + "..." : nome,
        nomeCompleto: nome,
        totale: data.totale,
        count: data.count,
      }))
      .sort((a, b) => b.totale - a.totale)
      .slice(0, 6); // Top 6 clienti
  }, [fatture, anno]);

  const migliorCliente = datiClienti[0];
  const totaleFatturato = datiClienti.reduce((sum, c) => sum + c.totale, 0);

  if (datiClienti.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Clienti per Fatturato {anno && `(${anno})`}</CardTitle>
        <CardDescription>
          {migliorCliente && (
            <>
              Miglior cliente: <span className="font-medium text-green-500">{migliorCliente.nomeCompleto}</span>
              {" "}({formatCurrency(migliorCliente.totale)})
            </>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[250px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={datiClienti}
              layout="vertical"
              margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" horizontal={false} />
              <XAxis
                type="number"
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => `€${(value / 1000).toFixed(0)}k`}
                className="text-muted-foreground"
              />
              <YAxis
                type="category"
                dataKey="nome"
                tick={{ fontSize: 12 }}
                className="text-muted-foreground"
                width={100}
              />
              <Tooltip
                cursor={{ fill: "var(--color-muted)", fillOpacity: 0.3 }}
                content={
                  <ChartTooltip
                    titoloKey="nomeCompleto"
                    totale={totaleFatturato}
                    dettaglio={(d) =>
                      `${d.count} ${d.count === 1 ? "fattura" : "fatture"}`
                    }
                  />
                }
              />
              <Bar dataKey="totale" radius={[0, 4, 4, 0]}>
                {datiClienti.map((_, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={COLORS[Math.min(index, COLORS.length - 1)]}
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
