import { useAuth } from "@/contexts/AuthContext";
import { Navigate, Outlet } from "react-router-dom";
import { AppSidebar } from "@/components/AppSidebar";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { GlobalTimerBadge } from "@/components/GlobalTimerBadge";
import { NotificationBell } from "@/components/NotificationBell";
import { StudyTimerProvider } from "@/contexts/StudyTimerContext";

export default function AppLayout() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  return (
    <StudyTimerProvider>
      <SidebarProvider>
        <div className="min-h-screen flex w-full">
          <AppSidebar />
          <main className="flex-1 flex flex-col min-h-screen">
            <header className="h-14 border-b border-border/50 flex items-center justify-between px-4 bg-background/80 backdrop-blur-sm sticky top-0 z-30">
              <SidebarTrigger className="mr-4" />
              <div className="flex items-center gap-2">
                <GlobalTimerBadge />
                <NotificationBell />
              </div>
            </header>
            <div className="flex-1 p-4 md:p-6 overflow-auto">
              <Outlet />
            </div>
          </main>
        </div>
      </SidebarProvider>
    </StudyTimerProvider>
  );
}
