/**
 * Sezione con consigli finanziari personalizzati
 * basati sui dati dell'utente
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  Target,
  Shield,
  Coins,
  ArrowRight,
} from "lucide-react";
import { formatCurrency } from "../../utils/format";

interface Props {
  nettoDisponibile: number;
  tasseDaAccantonare: number;
  mediaFatturatoMensile: number;
  mediaUsciteMensili: number;
  percentualeRisparmiata: number;
  numeroClienti: number;
}

interface Consiglio {
  tipo: "warning" | "success" | "info" | "tip";
  titolo: string;
  descrizione: string;
  azione?: string;
}

export function ConsigliFinanziari({
  nettoDisponibile,
  tasseDaAccantonare,
  mediaFatturatoMensile,
  mediaUsciteMensili,
  percentualeRisparmiata,
  numeroClienti,
}: Props) {
  const consigli: Consiglio[] = [];

  // Analizza la situazione e genera consigli personalizzati
  const nettoSicuro = nettoDisponibile - tasseDaAccantonare;
  const mesiCopertura = mediaUsciteMensili > 0
    ? nettoSicuro / mediaUsciteMensili
    : 0;
  const fondoEmergenzaIdeale = mediaUsciteMensili * 6;

  // Fondo emergenza
  if (mesiCopertura < 3) {
    consigli.push({
      tipo: "warning",
      titolo: "Fondo emergenza insufficiente",
      descrizione: `Hai solo ${mesiCopertura.toFixed(1)} mesi di copertura. L'ideale sono 6 mesi (${formatCurrency(fondoEmergenzaIdeale)}).`,
      azione: "Riduci le spese non essenziali finché non raggiungi almeno 3 mesi.",
    });
  } else if (mesiCopertura >= 6) {
    consigli.push({
      tipo: "success",
      titolo: "Ottimo fondo emergenza!",
      descrizione: `Hai ${mesiCopertura.toFixed(1)} mesi di copertura. Sei al sicuro!`,
    });
  } else {
    consigli.push({
      tipo: "info",
      titolo: "Fondo emergenza in costruzione",
      descrizione: `Hai ${mesiCopertura.toFixed(1)} mesi di copertura. Ancora ${formatCurrency(fondoEmergenzaIdeale - nettoSicuro)} per raggiungere i 6 mesi.`,
    });
  }

  // Tasse
  if (tasseDaAccantonare > 0 && nettoSicuro < 0) {
    consigli.push({
      tipo: "warning",
      titolo: "Attenzione alle tasse!",
      descrizione: `Devi accantonare ${formatCurrency(tasseDaAccantonare)} ma il tuo netto è insufficiente.`,
      azione: "Evita nuovi prelievi e cerca di aumentare le entrate.",
    });
  } else if (tasseDaAccantonare > 0) {
    consigli.push({
      tipo: "info",
      titolo: "Tasse sotto controllo",
      descrizione: `Hai ${formatCurrency(tasseDaAccantonare)} da accantonare per le tasse e puoi coprirle.`,
    });
  }

  // Risparmio
  if (percentualeRisparmiata < 10) {
    consigli.push({
      tipo: "warning",
      titolo: "Risparmio troppo basso",
      descrizione: `Stai risparmiando solo il ${percentualeRisparmiata.toFixed(0)}% delle entrate. L'obiettivo minimo è 20%.`,
      azione: "Prova la regola 50/30/20: 50% bisogni, 30% desideri, 20% risparmio.",
    });
  } else if (percentualeRisparmiata >= 30) {
    consigli.push({
      tipo: "success",
      titolo: "Grande risparmiatore!",
      descrizione: `Stai risparmiando il ${percentualeRisparmiata.toFixed(0)}% delle entrate. Continua così!`,
    });
  }

  // Concentrazione clienti
  if (numeroClienti <= 2 && mediaFatturatoMensile > 0) {
    consigli.push({
      tipo: "warning",
      titolo: "Rischio concentrazione clienti",
      descrizione: `Hai solo ${numeroClienti} cliente/i. Se ne perdi uno, perdi tutto.`,
      azione: "Diversifica cercando almeno 3-4 clienti stabili.",
    });
  } else if (numeroClienti >= 5) {
    consigli.push({
      tipo: "success",
      titolo: "Buona diversificazione",
      descrizione: `Hai ${numeroClienti} clienti, il tuo reddito è ben diversificato.`,
    });
  }

  // Consiglio generico
  consigli.push({
    tipo: "tip",
    titolo: "Automatizza i risparmi",
    descrizione: "Imposta un bonifico automatico verso un conto separato appena ricevi un pagamento.",
    azione: "Il 20-30% del fatturato dovrebbe andare subito in risparmio + tasse.",
  });

  const getIcon = (tipo: Consiglio["tipo"]) => {
    switch (tipo) {
      case "warning":
        return <AlertTriangle className="h-5 w-5 text-amber-500" />;
      case "success":
        return <CheckCircle className="h-5 w-5 text-emerald-500" />;
      case "info":
        return <TrendingUp className="h-5 w-5 text-blue-500" />;
      case "tip":
        return <Coins className="h-5 w-5 text-purple-500" />;
    }
  };

  const getBgColor = (tipo: Consiglio["tipo"]) => {
    switch (tipo) {
      case "warning":
        return "bg-amber-500/10 border-amber-500/20";
      case "success":
        return "bg-emerald-500/10 border-emerald-500/20";
      case "info":
        return "bg-blue-500/10 border-blue-500/20";
      case "tip":
        return "bg-purple-500/10 border-purple-500/20";
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Shield className="h-5 w-5 text-indigo-500" />
          Consigli Finanziari Personalizzati
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {consigli.map((consiglio, i) => (
          <div
            key={i}
            className={`p-4 rounded-lg border ${getBgColor(consiglio.tipo)}`}
          >
            <div className="flex items-start gap-3">
              {getIcon(consiglio.tipo)}
              <div className="flex-1 space-y-1">
                <h4 className="font-medium">{consiglio.titolo}</h4>
                <p className="text-sm text-muted-foreground">
                  {consiglio.descrizione}
                </p>
                {consiglio.azione && (
                  <div className="flex items-center gap-2 text-sm font-medium mt-2">
                    <ArrowRight className="h-4 w-4" />
                    {consiglio.azione}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}

        {/* Obiettivi */}
        <div className="mt-6 p-4 rounded-lg bg-muted/30">
          <h4 className="font-medium flex items-center gap-2 mb-3">
            <Target className="h-5 w-5 text-indigo-500" />
            I tuoi obiettivi
          </h4>
          <div className="grid gap-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Fondo emergenza (6 mesi)</span>
              <span className="font-medium">{formatCurrency(fondoEmergenzaIdeale)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Risparmio mensile (20%)</span>
              <span className="font-medium">{formatCurrency(mediaFatturatoMensile * 0.2)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Accantonamento tasse</span>
              <span className="font-medium">{formatCurrency(tasseDaAccantonare)}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
