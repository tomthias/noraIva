import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  FileText,
  ArrowDownUp,
  Calculator,
  LogOut,
  Menu,
  X
} from "lucide-react";
import { Button } from "@/components/ui/button";

export type SidebarSection = "dashboard" | "fatture" | "movimenti" | "simulatore";

interface SidebarProps {
  activeSection: SidebarSection;
  onSectionChange: (section: SidebarSection) => void;
  onLogout: () => void;
  isOpen: boolean;
  onToggle: () => void;
}

const menuItems: { id: SidebarSection; label: string; icon: React.ReactNode }[] = [
  { id: "dashboard", label: "Dashboard", icon: <LayoutDashboard className="h-5 w-5" /> },
  { id: "fatture", label: "Fatture", icon: <FileText className="h-5 w-5" /> },
  { id: "movimenti", label: "Movimenti", icon: <ArrowDownUp className="h-5 w-5" /> },
  { id: "simulatore", label: "Simulatore", icon: <Calculator className="h-5 w-5" /> },
];

export function Sidebar({ activeSection, onSectionChange, onLogout, isOpen, onToggle }: SidebarProps) {
  const handleSectionChange = (section: SidebarSection) => {
    onSectionChange(section);
    // Chiudi sidebar su mobile dopo selezione
    if (window.innerWidth < 768) {
      onToggle();
    }
  };

  return (
    <>
      {/* Hamburger button - solo mobile */}
      <button
        onClick={onToggle}
        className="md:hidden fixed top-4 left-4 z-50 p-2 bg-card border rounded-lg"
        aria-label="Toggle menu"
      >
        {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
      </button>

      {/* Overlay - solo mobile quando aperto */}
      {isOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/50 z-40"
          onClick={onToggle}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed left-0 top-0 h-screen w-64 bg-card border-r flex flex-col z-50 transition-transform duration-300",
          // Mobile: nascosta di default, visibile quando isOpen
          "max-md:-translate-x-full",
          isOpen && "max-md:translate-x-0",
          // Desktop: sempre visibile
          "md:translate-x-0"
        )}
      >
        <div className="p-6 border-b">
          <h1 className="text-xl font-bold">Partita IVA</h1>
          <p className="text-sm text-muted-foreground">Regime Forfettario</p>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => handleSectionChange(item.id)}
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
    </>
  );
}
