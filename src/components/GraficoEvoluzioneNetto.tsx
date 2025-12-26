import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import type { MonthlyData } from "../utils/chartsData";
import { formatCurrency } from "../utils/format";
import { useMemo } from "react";

interface Props {
    data: MonthlyData[];
    anno: number;
}

export function GraficoEvoluzioneNetto({ data, anno }: Props) {
    const cumulativeData = useMemo(() => {
        let cumulativeNetto = 0;
        return data.map(d => {
            cumulativeNetto += d.netto;
            return {
                ...d,
                nettoCumulativo: cumulativeNetto
            };
        });
    }, [data]);

    return (
        <Card>
            <CardHeader>
                <CardTitle>Andamento Netto {anno}</CardTitle>
                <CardDescription>Crescita del profitto netto cumulativo durante l'anno</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={cumulativeData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                            <defs>
                                <linearGradient id="colorNetto" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="hsl(142.1 76.2% 36.3%)" stopOpacity={0.8} />
                                    <stop offset="95%" stopColor="hsl(142.1 76.2% 36.3%)" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <XAxis dataKey="mese" className="text-muted-foreground" fontSize={12} />
                            <YAxis
                                className="text-muted-foreground"
                                fontSize={12}
                                tickFormatter={(value) => `€${(value / 1000).toFixed(0)}k`}
                            />
                            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                            <Tooltip
                                formatter={(value: any) => formatCurrency(Number(value))}
                                labelStyle={{ color: "black" }}
                                contentStyle={{ borderRadius: "8px", border: "1px solid #e2e8f0" }}
                            />
                            <Area
                                type="monotone"
                                dataKey="nettoCumulativo"
                                name="Netto Cumulativo"
                                stroke="hsl(142.1 76.2% 36.3%)"
                                fillOpacity={1}
                                fill="url(#colorNetto)"
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
    );
}
