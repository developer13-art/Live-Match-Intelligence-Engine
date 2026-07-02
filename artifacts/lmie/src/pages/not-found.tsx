import { AppLayout } from "@/components/layout/AppLayout";
import { AlertCircle } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <AppLayout>
      <div className="flex flex-col items-center justify-center py-32 text-center space-y-6 border border-dashed border-border rounded-lg bg-card/20 backdrop-blur">
        <div className="relative">
          <div className="absolute inset-0 rounded-full bg-destructive/20 blur-xl animate-pulse"></div>
          <AlertCircle className="h-16 w-16 text-destructive relative z-10 opacity-80" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-bold font-mono tracking-tight text-foreground">404: SYSTEM NOT FOUND</h2>
          <p className="text-muted-foreground max-w-md mx-auto">The requested intelligence module could not be located in the active registry.</p>
        </div>
        <Link href="/">
          <Button variant="outline" className="font-mono mt-4">
            RETURN TO DASHBOARD
          </Button>
        </Link>
      </div>
    </AppLayout>
  );
}
