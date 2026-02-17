import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Cadastro from "./pages/Cadastro";
import AppLayout from "./layouts/AppLayout";
import Dashboard from "./pages/Dashboard";
import Aulas from "./pages/Aulas";
import Questoes from "./pages/Questoes";
import Simulados from "./pages/Simulados";
import IAChat from "./pages/IAChat";
import Perfil from "./pages/Perfil";
import PlanoEstudos from "./pages/PlanoEstudos";
import Revisoes from "./pages/Revisoes";
import Ranking from "./pages/Ranking";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminUsuarios from "./pages/admin/AdminUsuarios";
import AdminConteudo from "./pages/admin/AdminConteudo";
import AdminQuestoes from "./pages/admin/AdminQuestoes";
import AdminIA from "./pages/admin/AdminIA";
import AdminAssinaturas from "./pages/admin/AdminAssinaturas";
import AdminPagamentos from "./pages/admin/AdminPagamentos";
import AdminNotificacoes from "./pages/admin/AdminNotificacoes";
import AdminLogs from "./pages/admin/AdminLogs";
import Conquistas from "./pages/Conquistas";
import Assinatura from "./pages/Assinatura";
import Diagnostico from "./pages/Diagnostico";
import NotFound from "./pages/NotFound";
import AdminGuard from "./components/AdminGuard";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/cadastro" element={<Cadastro />} />

            <Route element={<AppLayout />}>
              <Route path="/diagnostico" element={<Diagnostico />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/aulas" element={<Aulas />} />
              <Route path="/questoes" element={<Questoes />} />
              <Route path="/simulados" element={<Simulados />} />
              <Route path="/ia" element={<IAChat />} />
              <Route path="/plano" element={<PlanoEstudos />} />
              <Route path="/revisoes" element={<Revisoes />} />
              <Route path="/ranking" element={<Ranking />} />
              <Route path="/conquistas" element={<Conquistas />} />
              <Route path="/assinatura" element={<Assinatura />} />
              <Route path="/perfil" element={<Perfil />} />
              <Route path="/admin" element={<AdminGuard><AdminDashboard /></AdminGuard>} />
              <Route path="/admin/usuarios" element={<AdminGuard><AdminUsuarios /></AdminGuard>} />
              <Route path="/admin/conteudo" element={<AdminGuard><AdminConteudo /></AdminGuard>} />
              <Route path="/admin/questoes" element={<AdminGuard><AdminQuestoes /></AdminGuard>} />
              <Route path="/admin/ia" element={<AdminGuard><AdminIA /></AdminGuard>} />
              <Route path="/admin/assinaturas" element={<AdminGuard><AdminAssinaturas /></AdminGuard>} />
              <Route path="/admin/pagamentos" element={<AdminGuard><AdminPagamentos /></AdminGuard>} />
              <Route path="/admin/notificacoes" element={<AdminGuard><AdminNotificacoes /></AdminGuard>} />
              <Route path="/admin/logs" element={<AdminGuard><AdminLogs /></AdminGuard>} />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
