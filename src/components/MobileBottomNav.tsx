import { useLocation, Link } from "react-router-dom";
import { LayoutDashboard, HelpCircle, BookOpen, Trophy, Sparkles } from "lucide-react";

const navItems = [
  { url: "/dashboard", icon: LayoutDashboard, label: "Início" },
  { url: "/aulas", icon: BookOpen, label: "Aulas" },
  { url: "/questoes", icon: HelpCircle, label: "Questões" },
  { url: "/ranking", icon: Trophy, label: "Ranking" },
  { url: "/ia", icon: Sparkles, label: "Tutor" },
];

export default function MobileBottomNav() {
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-card/95 backdrop-blur-lg border-t border-border/60 safe-area-bottom">
      <div className="flex items-center justify-around h-14">
        {navItems.map(item => {
          const isActive = location.pathname === item.url || location.pathname.startsWith(item.url + "/");
          return (
            <Link
              key={item.url}
              to={item.url}
              className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg transition-colors ${
                isActive
                  ? "text-primary"
                  : "text-muted-foreground"
              }`}
            >
              <item.icon className={`w-5 h-5 ${isActive ? "text-primary" : ""}`} />
              <span className="text-[10px] font-medium leading-none">{item.label}</span>
              {isActive && (
                <div className="w-1 h-1 rounded-full bg-primary mt-0.5" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
