/**
 * Card statistiche aggiuntive
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, Users, FileText, TrendingUp } from "lucide-react";
import { formatCurrency } from "../../utils/format";

interface Props {
  mediaFatturatoMensile: number;
  migliorCliente: { nome: string; importo: number };
  numeroFatture: number;
  numeroClienti: number;
}

export function StatsCards({
  mediaFatturatoMensile,
  migliorCliente,
  numeroFatture,
  numeroClienti,
}: Props) {
  return (
    <>
      {/* Media Mensile */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
            <Calendar className="h-4 w-4" />
            Media Mensile
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-xl font-bold">
            {formatCurrency(mediaFatturatoMensile)}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Fatturato medio per mese
          </p>
        </CardContent>
      </Card>

      {/* Miglior Cliente */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
            <TrendingUp className="h-4 w-4" />
            Miglior Cliente
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-xl font-bold truncate">{migliorCliente.nome}</div>
          <p className="text-xs text-muted-foreground mt-1">
            {formatCurrency(migliorCliente.importo)}
          </p>
        </CardContent>
      </Card>

      {/* Numero Fatture */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
            <FileText className="h-4 w-4" />
            Fatture
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-xl font-bold">{numeroFatture}</div>
          <p className="text-xs text-muted-foreground mt-1">Fatture emesse</p>
        </CardContent>
      </Card>

      {/* Numero Clienti */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
            <Users className="h-4 w-4" />
            Clienti
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-xl font-bold">{numeroClienti}</div>
          <p className="text-xs text-muted-foreground mt-1">Clienti unici</p>
        </CardContent>
      </Card>
    </>
  );
}
