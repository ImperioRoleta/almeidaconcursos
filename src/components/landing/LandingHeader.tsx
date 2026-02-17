import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Shield } from "lucide-react";

export default function LandingHeader() {
  return (
    <header className="border-b border-border/50 backdrop-blur-sm sticky top-0 z-50 bg-background/80">
      <div className="container mx-auto flex items-center justify-between py-4 px-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 gradient-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary/20">
            <Shield className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="font-heading font-bold text-lg">Almeida Concursos</span>
        </div>
        <nav className="hidden md:flex items-center gap-6 text-sm text-muted-foreground">
          <a href="#metodo" className="hover:text-foreground transition-colors">Método</a>
          <a href="#recursos" className="hover:text-foreground transition-colors">Recursos</a>
          <a href="#planos" className="hover:text-foreground transition-colors">Planos</a>
          <a href="#depoimentos" className="hover:text-foreground transition-colors">Depoimentos</a>
        </nav>
        <div className="flex gap-3">
          <Link to="/login">
            <Button variant="ghost" size="sm">Entrar</Button>
          </Link>
          <Link to="/cadastro">
            <Button size="sm" className="gradient-primary text-primary-foreground shadow-lg shadow-primary/20">Começar Grátis</Button>
          </Link>
        </div>
      </div>
    </header>
  );
}
