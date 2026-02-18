import { useAuth } from "@/contexts/AuthContext";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { AppSidebar } from "@/components/AppSidebar";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { GlobalTimerBadge } from "@/components/GlobalTimerBadge";
import { NotificationBell } from "@/components/NotificationBell";
import { StudyTimerProvider } from "@/contexts/StudyTimerContext";
import MobileBottomNav from "@/components/MobileBottomNav";
import ContinueButton from "@/components/ContinueButton";
import PendingCheckoutBanner from "@/components/PendingCheckoutBanner";

// Focus mode pages where we hide chrome for immersion
const FOCUS_PAGES = ["/questoes", "/simulados", "/revisoes", "/ia"];

export default function AppLayout() {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  const isFocusMode = FOCUS_PAGES.some(p => location.pathname.startsWith(p));

  return (
    <StudyTimerProvider>
      <SidebarProvider>
        <div className="min-h-screen flex w-full">
          <AppSidebar />
          <main className="flex-1 flex flex-col min-h-screen">
            <header className={`h-14 border-b border-border/50 flex items-center justify-between px-4 bg-background/80 backdrop-blur-sm sticky top-0 z-30 ${isFocusMode ? "md:flex" : ""}`}>
              <SidebarTrigger className="mr-4" />
              <div className="flex items-center gap-2">
                <GlobalTimerBadge />
                <NotificationBell />
              </div>
            </header>
            <div className="flex-1 p-3 md:p-6 overflow-auto pb-20 md:pb-6">
              <Outlet />
            </div>
          </main>
          {/* Mobile bottom nav */}
          <MobileBottomNav />
          <PendingCheckoutBanner />
        </div>
      </SidebarProvider>
    </StudyTimerProvider>
  );
}
