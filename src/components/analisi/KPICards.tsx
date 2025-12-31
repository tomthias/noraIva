/**
 * Card KPI per entrate, uscite e saldo
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Wallet } from "lucide-react";
import { formatCurrency } from "../../utils/format";

interface Props {
  totaleEntrate: number;
  totaleUscite: number;
  saldoNetto: number;
}

export function KPICards({ totaleEntrate, totaleUscite, saldoNetto }: Props) {
  return (
    <>
      {/* Entrate */}
      <Card className="border-green-500/30 bg-green-500/5">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-green-500" />
            <span className="text-muted-foreground">Entrate Totali</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-600 dark:text-green-400">
            {formatCurrency(totaleEntrate)}
          </div>
        </CardContent>
      </Card>

      {/* Uscite */}
      <Card className="border-red-500/30 bg-red-500/5">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <TrendingDown className="h-4 w-4 text-red-500" />
            <span className="text-muted-foreground">Uscite Totali</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-red-600 dark:text-red-400">
            {formatCurrency(totaleUscite)}
          </div>
        </CardContent>
      </Card>

      {/* Saldo */}
      <Card className="border-blue-500/30 bg-blue-500/5">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Wallet className="h-4 w-4 text-blue-500" />
            <span className="text-muted-foreground">Saldo Netto</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div
            className={`text-2xl font-bold ${
              saldoNetto >= 0
                ? "text-blue-600 dark:text-blue-400"
                : "text-red-600 dark:text-red-400"
            }`}
          >
            {formatCurrency(saldoNetto)}
          </div>
        </CardContent>
      </Card>
    </>
  );
}
