import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { MainLayout } from "./components/layout/MainLayout";
import { AuthProvider } from "./contexts/AuthContext";
import { ProtectedRoute } from "./components/auth/ProtectedRoute";
import Dashboard from "./pages/Dashboard";
import Vocabulary from "./pages/Vocabulary";
import BulkUpload from "./pages/BulkUpload";
import OpenAiStudio from './pages/OpenAiStudio';
import GeminiStudio from './pages/GeminiStudio';
import Resources from "./pages/Resources";
import Blogs from "./pages/Blogs";
import Practice from "./pages/Practice";
import Settings from "./pages/Settings";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* Public Route */}
            <Route path="/login" element={<Login />} />

            {/* Protected Routes */}
            <Route
              path="/*"
              element={
                <ProtectedRoute>
                  <MainLayout>
                    <Routes>
                      <Route path="/" element={<Dashboard />} />
                      <Route path="/openai-studio" element={<OpenAiStudio />} />
                      <Route path="/gemini-studio" element={<GeminiStudio />} />
                      <Route path="/vocabulary" element={<Vocabulary />} />
                      <Route path="/bulk-upload" element={<BulkUpload />} />
                      <Route path="/resources" element={<Resources />} />
                      <Route path="/blogs" element={<Blogs />} />
                      <Route path="/practice" element={<Practice />} />
                      <Route path="/settings" element={<Settings />} />
                      <Route path="*" element={<NotFound />} />
                    </Routes>
                  </MainLayout>
                </ProtectedRoute>
              }
            />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
