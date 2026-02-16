import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { User, Award, Clock, Target } from "lucide-react";

export default function Perfil() {
  const { user, profile } = useAuth();
  const levelName = profile?.levels?.name || "Recruta";

  return (
    <div className="space-y-6 animate-fade-in max-w-lg">
      <h1 className="font-heading text-2xl font-bold">Perfil</h1>

      <Card className="glass-card">
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="w-8 h-8 text-primary" />
            </div>
            <div>
              <h2 className="font-heading font-bold text-lg">{profile?.name || "Aluno"}</h2>
              <p className="text-sm text-muted-foreground">{user?.email}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-gold">
            <Award className="w-5 h-5" />
            <span className="font-heading font-semibold">{levelName}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
