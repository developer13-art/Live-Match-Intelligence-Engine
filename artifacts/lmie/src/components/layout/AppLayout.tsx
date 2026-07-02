import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { Activity, LayoutDashboard, Radar, Bot, Zap } from "lucide-react";

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const [location] = useLocation();

  const navLinks = [
    { href: "/", label: "Dashboard", icon: LayoutDashboard },
    { href: "/intelligence", label: "Intelligence", icon: Radar },
    { href: "/agent", label: "Agent", icon: Bot },
  ];

  return (
    <div className="min-h-screen w-full bg-background flex flex-col text-foreground font-sans dark">
      <header className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-screen-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-2 font-mono font-bold text-base cursor-pointer" data-testid="link-logo">
              <div className="flex items-center gap-1.5 text-primary">
                <Activity className="h-4 w-4" />
                <span className="tracking-tight">LMIE</span>
              </div>
              <span className="text-muted-foreground font-normal text-xs hidden sm:block">× TxLINE</span>
            </Link>
            <nav className="hidden md:flex items-center gap-0.5">
              {navLinks.map(({ href, label, icon: Icon }) => {
                const active = href === "/" ? location === "/" : location.startsWith(href);
                return (
                  <Link
                    key={href}
                    href={href}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                      active
                        ? "bg-primary/15 text-primary"
                        : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
                    }`}
                    data-testid={`link-nav-${label.toLowerCase()}`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {label}
                  </Link>
                );
              })}
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-1.5 text-xs font-mono text-muted-foreground">
              <Zap className="h-3 w-3 text-amber-400" />
              <span>FIFA World Cup 2026</span>
            </div>
            <div className="flex items-center gap-1.5 bg-green-950/50 border border-green-800/40 px-2.5 py-1 rounded-full">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-400" />
              </span>
              <span className="text-xs font-mono font-medium text-green-400 tracking-wider">LIVE</span>
            </div>
          </div>
        </div>
      </header>
      <main className="flex-1 max-w-screen-2xl mx-auto w-full px-4 py-6">
        {children}
      </main>
    </div>
  );
}
