import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import type { MonthlyData } from "../utils/chartsData";
import { formatCurrency } from "../utils/format";

interface Props {
    data: MonthlyData[];
    anno: number;
}

export function GraficoFlussoCassa({ data, anno }: Props) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Flusso di Cassa {anno}</CardTitle>
                <CardDescription>Confronto mensile tra Entrate (Fatturato) e Uscite (Spese + Tasse stim.)</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                            <XAxis dataKey="mese" className="text-muted-foreground" fontSize={12} />
                            <YAxis
                                className="text-muted-foreground"
                                fontSize={12}
                                tickFormatter={(value) => `€${(value / 1000).toFixed(0)}k`}
                            />
                            <Tooltip
                                formatter={(value: any) => formatCurrency(Number(value))}
                                labelStyle={{ color: "black" }}
                                contentStyle={{ borderRadius: "8px", border: "1px solid #e2e8f0" }}
                            />
                            <Legend />
                            <Bar dataKey="fatturato" name="Fatturato" fill="hsl(142.1 76.2% 36.3%)" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="uscite" name="Uscite" fill="hsl(346.8 77.2% 49.8%)" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
    );
}
