/**
 * Sezione con consigli finanziari personalizzati
 * basati sui dati dell'utente
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  Shield,
  Coins,
} from "lucide-react";
import { formatCurrency } from "../../utils/format";

interface Props {
  nettoDisponibile: number;
  tasseDaAccantonare: number;
  mediaFatturatoMensile: number;
  mediaUsciteMensili: number;
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
      descrizione: `${mesiCopertura.toFixed(1)} mesi di copertura (obiettivo: 6 mesi)`,
    });
  } else if (mesiCopertura >= 6) {
    consigli.push({
      tipo: "success",
      titolo: "Fondo emergenza OK",
      descrizione: `${mesiCopertura.toFixed(1)} mesi di copertura`,
    });
  } else {
    consigli.push({
      tipo: "info",
      titolo: "Fondo emergenza in costruzione",
      descrizione: `${mesiCopertura.toFixed(1)} mesi (mancano ${formatCurrency(fondoEmergenzaIdeale - nettoSicuro)})`,
    });
  }

  // Tasse
  if (tasseDaAccantonare > 0 && nettoSicuro < 0) {
    consigli.push({
      tipo: "warning",
      titolo: "Attenzione tasse!",
      descrizione: `${formatCurrency(tasseDaAccantonare)} da accantonare, netto insufficiente`,
    });
  } else if (tasseDaAccantonare > 0) {
    consigli.push({
      tipo: "success",
      titolo: "Tasse coperte",
      descrizione: `${formatCurrency(tasseDaAccantonare)} da accantonare`,
    });
  }

  // Concentrazione clienti
  if (numeroClienti <= 2 && mediaFatturatoMensile > 0) {
    consigli.push({
      tipo: "warning",
      titolo: "Diversifica clienti",
      descrizione: `Solo ${numeroClienti} cliente/i attivo/i`,
    });
  } else if (numeroClienti >= 5) {
    consigli.push({
      tipo: "success",
      titolo: "Clienti diversificati",
      descrizione: `${numeroClienti} clienti attivi`,
    });
  }

  const getIcon = (tipo: Consiglio["tipo"]) => {
    switch (tipo) {
      case "warning":
        return <AlertTriangle className="h-4 w-4 text-amber-500" />;
      case "success":
        return <CheckCircle className="h-4 w-4 text-emerald-500" />;
      case "info":
        return <TrendingUp className="h-4 w-4 text-blue-500" />;
      case "tip":
        return <Coins className="h-4 w-4 text-purple-500" />;
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Shield className="h-4 w-4 text-indigo-500" />
          Consigli Finanziari
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Consigli in lista compatta */}
        <div className="space-y-2">
          {consigli.map((consiglio, i) => (
            <div
              key={i}
              className="flex items-center gap-3 py-1.5"
            >
              {getIcon(consiglio.tipo)}
              <div className="flex-1 min-w-0">
                <span className="font-medium text-sm">{consiglio.titolo}</span>
                <span className="text-muted-foreground text-sm"> · {consiglio.descrizione}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Obiettivi in griglia compatta */}
        <div className="grid grid-cols-3 gap-3 pt-2 border-t">
          <div className="text-center">
            <p className="text-xs text-muted-foreground">Fondo emergenza</p>
            <p className="text-sm font-semibold">{formatCurrency(fondoEmergenzaIdeale)}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground">Risparmio/mese</p>
            <p className="text-sm font-semibold">{formatCurrency(mediaFatturatoMensile * 0.2)}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground">Tasse da accantonare</p>
            <p className="text-sm font-semibold">{formatCurrency(tasseDaAccantonare)}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
