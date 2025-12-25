import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Props {
  anni: number[];
  annoSelezionato: number | null;
  onChange: (anno: number | null) => void;
}

export function YearFilter({ anni, annoSelezionato, onChange }: Props) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-muted-foreground">Anno:</span>
      <div className="flex gap-1">
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "h-8 px-3",
            annoSelezionato === null && "bg-primary text-primary-foreground hover:bg-primary/90"
          )}
          onClick={() => onChange(null)}
        >
          Tutti
        </Button>
        {anni.map((anno) => (
          <Button
            key={anno}
            variant="ghost"
            size="sm"
            className={cn(
              "h-8 px-3",
              annoSelezionato === anno && "bg-primary text-primary-foreground hover:bg-primary/90"
            )}
            onClick={() => onChange(anno)}
          >
            {anno}
          </Button>
        ))}
      </div>
    </div>
  );
}
