import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Shield, Eye, EyeOff, Sparkles, CheckCircle } from "lucide-react";

export default function Cadastro() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast.error("A senha deve ter pelo menos 6 caracteres");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name } },
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Conta criada com sucesso!");
      navigate("/dashboard");
    }
  };

  const benefits = [
    "Acesso a todas as aulas do edital",
    "Banco de questões com correção por IA",
    "Plano de estudos personalizado",
    "Ranking e competição com outros alunos",
    "Simulados cronometrados",
  ];

  return (
    <div className="min-h-screen flex bg-background">
      {/* Left panel - form */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md space-y-8">
          <div className="lg:hidden text-center space-y-3">
            <div className="mx-auto w-14 h-14 gradient-primary rounded-2xl flex items-center justify-center shadow-xl shadow-primary/20">
              <Shield className="w-7 h-7 text-primary-foreground" />
            </div>
          </div>

          <div className="space-y-2">
            <h2 className="font-heading text-2xl font-bold">Crie sua conta</h2>
            <p className="text-muted-foreground">Comece a estudar agora — é gratuito</p>
          </div>

          <form onSubmit={handleSignup} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="name">Nome completo</Label>
              <Input id="name" value={name} onChange={e => setName(e.target.value)} placeholder="Seu nome" required className="h-12" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="seu@email.com" required className="h-12" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <div className="relative">
                <Input id="password" type={showPass ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} placeholder="Mínimo 6 caracteres" required className="h-12 pr-12" />
                <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <Button type="submit" className="w-full h-12 gradient-primary text-primary-foreground text-base font-semibold shadow-lg shadow-primary/20" disabled={loading}>
              {loading ? "Criando conta..." : "Criar Conta Grátis"}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground">
            Já tem conta?{" "}
            <Link to="/login" className="text-primary hover:underline font-semibold">Entrar</Link>
          </p>
        </div>
      </div>

      {/* Right panel - benefits */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-bl from-accent/15 via-background to-primary/10" />
        <div className="absolute top-1/3 right-1/4 w-56 h-56 bg-accent/10 rounded-full blur-3xl" />

        <div className="relative z-10 flex flex-col justify-center px-12 xl:px-20 space-y-8">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 gradient-gold rounded-xl flex items-center justify-center shadow-xl shadow-accent/20">
              <Sparkles className="w-6 h-6 text-background" />
            </div>
            <span className="font-heading font-bold text-2xl">Almeida Concursos</span>
          </div>

          <div className="space-y-3">
            <h1 className="font-heading text-4xl font-extrabold leading-tight">
              Junte-se a<br />
              <span className="bg-gradient-to-r from-accent to-[hsl(43,90%,65%)] bg-clip-text text-transparent">quem vai passar</span>
            </h1>
            <p className="text-muted-foreground text-lg max-w-md leading-relaxed">
              Tudo que você precisa em uma só plataforma, com tecnologia que se adapta a você.
            </p>
          </div>

          <div className="space-y-3">
            {benefits.map((b, i) => (
              <div key={i} className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-accent shrink-0" />
                <span className="text-muted-foreground">{b}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
