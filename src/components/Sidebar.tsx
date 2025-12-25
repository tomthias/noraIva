import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  FileText,
  ArrowDownUp,
  Calculator,
  LogOut
} from "lucide-react";
import { Button } from "@/components/ui/button";

export type SidebarSection = "dashboard" | "fatture" | "movimenti" | "simulatore";

interface SidebarProps {
  activeSection: SidebarSection;
  onSectionChange: (section: SidebarSection) => void;
  onLogout: () => void;
}

const menuItems: { id: SidebarSection; label: string; icon: React.ReactNode }[] = [
  { id: "dashboard", label: "Dashboard", icon: <LayoutDashboard className="h-5 w-5" /> },
  { id: "fatture", label: "Fatture", icon: <FileText className="h-5 w-5" /> },
  { id: "movimenti", label: "Movimenti", icon: <ArrowDownUp className="h-5 w-5" /> },
  { id: "simulatore", label: "Simulatore", icon: <Calculator className="h-5 w-5" /> },
];

export function Sidebar({ activeSection, onSectionChange, onLogout }: SidebarProps) {
  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-card border-r flex flex-col">
      <div className="p-6 border-b">
        <h1 className="text-xl font-bold">Partita IVA</h1>
        <p className="text-sm text-muted-foreground">Regime Forfettario</p>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onSectionChange(item.id)}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors",
              activeSection === item.id
                ? "bg-primary text-primary-foreground"
                : "hover:bg-muted text-muted-foreground hover:text-foreground"
            )}
          >
            {item.icon}
            <span className="font-medium">{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="p-4 border-t">
        <Button
          variant="ghost"
          className="w-full justify-start gap-3 text-muted-foreground hover:text-foreground"
          onClick={onLogout}
        >
          <LogOut className="h-5 w-5" />
          Esci
        </Button>
      </div>
    </aside>
  );
}
