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
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminUsuarios from "./pages/admin/AdminUsuarios";
import AdminConteudo from "./pages/admin/AdminConteudo";
import AdminQuestoes from "./pages/admin/AdminQuestoes";
import AdminIA from "./pages/admin/AdminIA";
import AdminAssinaturas from "./pages/admin/AdminAssinaturas";
import NotFound from "./pages/NotFound";

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
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/aulas" element={<Aulas />} />
              <Route path="/questoes" element={<Questoes />} />
              <Route path="/simulados" element={<Simulados />} />
              <Route path="/ia" element={<IAChat />} />
              <Route path="/plano" element={<PlanoEstudos />} />
              <Route path="/perfil" element={<Perfil />} />
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="/admin/usuarios" element={<AdminUsuarios />} />
              <Route path="/admin/conteudo" element={<AdminConteudo />} />
              <Route path="/admin/questoes" element={<AdminQuestoes />} />
              <Route path="/admin/ia" element={<AdminIA />} />
              <Route path="/admin/assinaturas" element={<AdminAssinaturas />} />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
