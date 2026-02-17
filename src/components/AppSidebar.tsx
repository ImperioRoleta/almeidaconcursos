import { useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/hooks/useSubscription";
import { NavLink } from "@/components/NavLink";
import UpgradePrompt from "@/components/UpgradePrompt";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";
import {
  LayoutDashboard,
  BookOpen,
  HelpCircle,
  FileText,
  MessageSquare,
  User,
  Shield,
  Users,
  Crown,
  LogOut,
  CalendarDays,
  Trophy,
  Award,
  CreditCard,
  Lock,
  Crosshair,
  Brain,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const studentItems = [
  { title: "Diagnóstico", url: "/diagnostico", icon: Crosshair, premium: false },
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard, premium: false },
  { title: "Aulas", url: "/aulas", icon: BookOpen, premium: false },
  { title: "Questões", url: "/questoes", icon: HelpCircle, premium: false },
  { title: "Simulados", url: "/simulados", icon: FileText, premium: true },
  { title: "Revisões", url: "/revisoes", icon: Brain, premium: false },
  { title: "Plano de Estudos", url: "/plano", icon: CalendarDays, premium: true },
  { title: "Ranking", url: "/ranking", icon: Trophy, premium: false },
  { title: "Conquistas", url: "/conquistas", icon: Award, premium: false },
  { title: "IA Assistente", url: "/ia", icon: MessageSquare, premium: true },
  { title: "Assinatura", url: "/assinatura", icon: Crown, premium: false },
  { title: "Perfil", url: "/perfil", icon: User, premium: false },
];

const adminItems = [
  { title: "Painel Admin", url: "/admin", icon: LayoutDashboard },
  { title: "Usuários", url: "/admin/usuarios", icon: Users },
  { title: "Conteúdo", url: "/admin/conteudo", icon: BookOpen },
  { title: "Questões", url: "/admin/questoes", icon: HelpCircle },
  { title: "IA Admin", url: "/admin/ia", icon: MessageSquare },
  { title: "Assinaturas", url: "/admin/assinaturas", icon: Crown },
  { title: "Pagamentos", url: "/admin/pagamentos", icon: CreditCard },
];

export function AppSidebar() {
  const { isAdmin, profile, signOut } = useAuth();
  const { isActive, planLabel, daysLeft } = useSubscription();
  const location = useLocation();

  const levelName = profile?.levels?.name || "Recruta";

  return (
    <Sidebar>
      <SidebarHeader className="p-4 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 gradient-primary rounded-xl flex items-center justify-center shrink-0 shadow-md shadow-primary/20">
            <Shield className="w-5 h-5 text-primary-foreground" />
          </div>
          <div className="min-w-0">
            <h2 className="font-heading font-bold text-sm tracking-tight truncate">Almeida Concursos</h2>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-[10px] text-muted-foreground truncate">{levelName}</span>
              {isActive && (
                <Badge className="h-4 px-1.5 text-[8px] font-bold bg-accent/10 text-accent border-accent/20">
                  PRO
                </Badge>
              )}
            </div>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-[10px] uppercase tracking-widest text-muted-foreground/60">
            Estudos
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {studentItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={location.pathname === item.url}>
                    <NavLink to={item.url} end>
                      <item.icon className="w-4 h-4" />
                      <span className="flex-1">{item.title}</span>
                      {item.premium && !isActive && (
                        <Lock className="w-3 h-3 text-accent/60" />
                      )}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {isAdmin && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-[10px] uppercase tracking-widest text-muted-foreground/60">
              Administração
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {adminItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={location.pathname === item.url}>
                      <NavLink to={item.url} end>
                        <item.icon className="w-4 h-4" />
                        <span>{item.title}</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border">
        <UpgradePrompt variant="sidebar" />
        <div className="px-4 pb-4">
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-muted-foreground hover:text-foreground text-xs"
            onClick={signOut}
          >
            <LogOut className="w-3.5 h-3.5 mr-2" />
            Sair
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}