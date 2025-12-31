/**
 * Card con la regola 60/20/20 per il budget personale
 * 60% Bisogni essenziali
 * 20% Desideri
 * 20% Risparmio/Investimenti
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Home, Heart, PiggyBank, Lightbulb } from "lucide-react";
import { formatCurrency } from "../../utils/format";

interface Props {
  stipendioMensile: number;
}

interface BudgetCategory {
  nome: string;
  percentuale: number;
  importo: number;
  icon: React.ElementType;
  color: string;
  bgColor: string;
  descrizione: string;
  esempi: string[];
}

export function BudgetRule({ stipendioMensile }: Props) {
  const categories: BudgetCategory[] = [
    {
      nome: "Bisogni",
      percentuale: 60,
      importo: stipendioMensile * 0.6,
      icon: Home,
      color: "text-blue-600 dark:text-blue-400",
      bgColor: "bg-blue-500",
      descrizione: "Spese essenziali e fisse",
      esempi: ["Affitto/Mutuo", "Bollette", "Spesa", "Trasporti", "Assicurazioni"],
    },
    {
      nome: "Desideri",
      percentuale: 20,
      importo: stipendioMensile * 0.2,
      icon: Heart,
      color: "text-pink-600 dark:text-pink-400",
      bgColor: "bg-pink-500",
      descrizione: "Piaceri e svago",
      esempi: ["Ristoranti", "Shopping", "Hobby", "Streaming", "Viaggi"],
    },
    {
      nome: "Risparmio",
      percentuale: 20,
      importo: stipendioMensile * 0.2,
      icon: PiggyBank,
      color: "text-emerald-600 dark:text-emerald-400",
      bgColor: "bg-emerald-500",
      descrizione: "Futuro e sicurezza",
      esempi: ["Fondo emergenza", "Investimenti", "Pensione integrativa"],
    },
  ];

  if (stipendioMensile <= 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-amber-500" />
            Regola 60/20/20
          </CardTitle>
          <CardDescription>
            Inserisci uno stipendio per vedere la suddivisione consigliata
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Lightbulb className="h-5 w-5 text-amber-500" />
          Regola 60/20/20
        </CardTitle>
        <CardDescription>
          Come suddividere il tuo stipendio di {formatCurrency(stipendioMensile)}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Barra riassuntiva */}
        <div className="flex h-4 rounded-full overflow-hidden">
          {categories.map((cat, i) => (
            <div
              key={i}
              className={`${cat.bgColor} transition-all`}
              style={{ width: `${cat.percentuale}%` }}
            />
          ))}
        </div>

        {/* Dettagli categorie */}
        <div className="grid gap-4">
          {categories.map((cat, i) => (
            <div
              key={i}
              className="flex items-start gap-4 p-4 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
            >
              <div className={`p-2 rounded-full bg-muted ${cat.color}`}>
                <cat.icon className="h-5 w-5" />
              </div>
              <div className="flex-1 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className={`font-semibold ${cat.color}`}>
                      {cat.nome} ({cat.percentuale}%)
                    </h4>
                    <p className="text-xs text-muted-foreground">
                      {cat.descrizione}
                    </p>
                  </div>
                  <span className="text-lg font-bold">
                    {formatCurrency(cat.importo)}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {cat.esempi.map((esempio, j) => (
                    <span
                      key={j}
                      className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground"
                    >
                      {esempio}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Tip */}
        <div className="flex items-start gap-3 p-4 rounded-lg bg-amber-500/10 border border-amber-500/20">
          <Lightbulb className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-medium text-amber-600 dark:text-amber-400">
              Consiglio
            </p>
            <p className="text-muted-foreground">
              Inizia dal risparmio: appena ricevi lo stipendio, metti subito da parte il 20%.
              "Paga prima te stesso" è la regola d'oro per costruire ricchezza.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
