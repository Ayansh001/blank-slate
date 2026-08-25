
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/providers/ThemeProvider";
import { AuthProvider } from "@/features/auth/hooks/useAuth";
import { ProtectedRoute } from "@/features/auth/components/ProtectedRoute";
import { AppLayout } from "@/components/layout/AppLayout";
import { QuickActions } from "@/components/notes/QuickActions";
import Index from "./pages/Index";
import Dashboard from "./pages/Dashboard";
import Notes from "./pages/Notes";
import { NoteEditor } from "./components/notes/NoteEditor";
import Files from "./pages/Files";
import StudyPlans from "./pages/StudyPlans";
import OCR from "./pages/OCR";
import AIChat from "./pages/AIChat";
import Learn from "./pages/Learn";
import SearchPage from "./pages/SearchPage";
import AIHistory from "./pages/AIHistory";
import AITestground from "./pages/AITestground";
import Profile from "./pages/Profile";
import Settings from "./pages/Settings";
import LoginPage from "./pages/auth/LoginPage";
import RegisterPage from "./pages/auth/RegisterPage";
import ForgotPasswordPage from "./pages/auth/ForgotPasswordPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider defaultTheme="light" storageKey="studyvault-ui-theme">
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <QuickActions />
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/auth/login" element={<LoginPage />} />
              <Route path="/auth/register" element={<RegisterPage />} />
              <Route path="/auth/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/" element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
                <Route path="dashboard" element={<Dashboard />} />
                <Route path="notes" element={<Notes />} />
                <Route path="notes/edit/:id" element={<NoteEditor />} />
                <Route path="files" element={<Files />} />
                <Route path="study-plans" element={<StudyPlans />} />
                <Route path="ocr" element={<OCR />} />
                <Route path="chat" element={<AIChat />} />
                <Route path="learn" element={<Learn />} />
                <Route path="search" element={<SearchPage />} />
                <Route path="ai-history" element={<AIHistory />} />
                <Route path="ai-testground" element={<AITestground />} />
                <Route path="profile" element={<Profile />} />
                <Route path="settings" element={<Settings />} />
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
