import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import type { Fattura, Prelievo, Uscita } from "../types/fattura";
import { aggregaPerMese, aggregaUscitePerCategoria, calcolaMetriche } from "../utils/chartsData";
import { formatCurrency } from "../utils/formatters";

interface Props {
  fatture: Fattura[];
  prelievi: Prelievo[];
  uscite: Uscita[];
}

const COLORS = {
  fatturato: "hsl(var(--primary))",
  prelievi: "hsl(var(--destructive))",
  uscite: "hsl(210, 100%, 60%)",
  netto: "hsl(142, 76%, 36%)",
};

const PIE_COLORS = [
  "hsl(220, 70%, 50%)",
  "hsl(260, 70%, 50%)",
  "hsl(310, 70%, 50%)",
  "hsl(30, 70%, 50%)",
  "hsl(160, 70%, 50%)",
];

export function Grafici({ fatture, prelievi, uscite }: Props) {
  const monthlyData = aggregaPerMese(fatture, prelievi, uscite);
  const categoryData = aggregaUscitePerCategoria(uscite);
  const metriche = calcolaMetriche(fatture, prelievi, uscite);

  return (
    <div className="space-y-8">
      {/* Metriche in evidenza */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardDescription>Proiezione Fatturato Annuale</CardDescription>
            <CardTitle className="text-3xl">
              {formatCurrency(metriche.proiezioni.fatturato)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Media mensile: {formatCurrency(metriche.medie.fatturato)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardDescription>Netto Disponibile</CardDescription>
            <CardTitle className="text-3xl">
              {formatCurrency(metriche.totali.nettoDisponibile)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Netto fatture: {formatCurrency(metriche.totali.nettoFatture)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardDescription>Totale Prelievi</CardDescription>
            <CardTitle className="text-3xl">
              {formatCurrency(metriche.totali.prelievi)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Media mensile: {formatCurrency(metriche.medie.prelievi)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Grafici */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Andamento mensile */}
        <Card>
          <CardHeader>
            <CardTitle>Andamento Mensile</CardTitle>
            <CardDescription>Fatturato vs Prelievi vs Uscite</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="mese"
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                />
                <YAxis
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                  tickFormatter={(value) => `€${(value / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "var(--radius)",
                  }}
                  formatter={(value) => value ? formatCurrency(Number(value)) : ""}
                />
                <Legend />
                <Bar dataKey="fatturato" fill={COLORS.fatturato} name="Fatturato" />
                <Bar dataKey="prelievi" fill={COLORS.prelievi} name="Prelievi" />
                <Bar dataKey="uscite" fill={COLORS.uscite} name="Uscite" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Trend netto */}
        <Card>
          <CardHeader>
            <CardTitle>Trend Netto</CardTitle>
            <CardDescription>Evoluzione netto mensile</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="mese"
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                />
                <YAxis
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                  tickFormatter={(value) => `€${(value / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "var(--radius)",
                  }}
                  formatter={(value) => value ? formatCurrency(Number(value)) : ""}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="netto"
                  stroke={COLORS.netto}
                  strokeWidth={2}
                  name="Netto"
                  dot={{ fill: COLORS.netto }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Uscite per categoria */}
        {categoryData.length > 0 && (
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Uscite per Categoria</CardTitle>
              <CardDescription>Distribuzione delle spese</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col md:flex-row items-center gap-8">
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={categoryData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={false}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="importo"
                    >
                      {categoryData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "var(--radius)",
                      }}
                      formatter={(value) => value ? formatCurrency(Number(value)) : ""}
                    />
                  </PieChart>
                </ResponsiveContainer>

                <div className="flex-1 space-y-2">
                  {categoryData.map((item, index) => (
                    <div key={item.categoria} className="flex items-center gap-3">
                      <div
                        className="w-4 h-4 rounded"
                        style={{ backgroundColor: PIE_COLORS[index % PIE_COLORS.length] }}
                      />
                      <div className="flex-1 flex justify-between items-center">
                        <span className="text-sm font-medium">{item.categoria}</span>
                        <span className="text-sm text-muted-foreground">
                          {formatCurrency(item.importo)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
