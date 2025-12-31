/**
 * Timeline ultimi movimenti
 */

import { ArrowUpCircle, ArrowDownCircle } from "lucide-react";
import { formatCurrency, formatDate } from "../../utils/format";

interface Movimento {
  id: string;
  data: string;
  descrizione: string;
  importo: number;
  tipo: "fattura" | "entrata" | "uscita" | "prelievo";
}

interface Props {
  movimenti: Movimento[];
}

const TIPO_CONFIG = {
  fattura: { label: "Fattura", color: "text-green-600 dark:text-green-400" },
  entrata: { label: "Entrata", color: "text-green-600 dark:text-green-400" },
  uscita: { label: "Uscita", color: "text-red-600 dark:text-red-400" },
  prelievo: { label: "Prelievo", color: "text-purple-600 dark:text-purple-400" },
};

export function TimelineMovimenti({ movimenti }: Props) {
  if (movimenti.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-8 text-sm">
        Nessun movimento recente
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {movimenti.map((movimento) => {
        const isPositive = movimento.importo >= 0;
        const config = TIPO_CONFIG[movimento.tipo];

        return (
          <div
            key={movimento.id}
            className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors"
          >
            {/* Icon */}
            <div className={config.color}>
              {isPositive ? (
                <ArrowUpCircle className="h-5 w-5" />
              ) : (
                <ArrowDownCircle className="h-5 w-5" />
              )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline justify-between gap-2">
                <p className="font-medium truncate">{movimento.descrizione}</p>
                <span className={`font-bold ${config.color} whitespace-nowrap`}>
                  {isPositive ? "+" : ""}
                  {formatCurrency(movimento.importo)}
                </span>
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <p className="text-xs text-muted-foreground">
                  {formatDate(movimento.data)}
                </p>
                <span className="text-xs text-muted-foreground">•</span>
                <p className="text-xs text-muted-foreground">{config.label}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
