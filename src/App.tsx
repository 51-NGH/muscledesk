import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { MemberAuthProvider } from "@/contexts/MemberAuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { MemberProtectedRoute } from "@/components/member-portal/MemberProtectedRoute";
import { SubdomainRouter } from "@/components/SubdomainRouter";
import { ManifestManager } from "@/components/ManifestManager";
import { PWAInstallPrompt } from "@/components/pwa/PWAInstallPrompt";

// Admin pages
import Dashboard from "./pages/Dashboard";
import Members from "./pages/Members";
import Plans from "./pages/Plans";
import Attendance from "./pages/Attendance";
import Analytics from "./pages/Analytics";
import Payments from "./pages/Payments";
import Expenses from "./pages/Expenses";
import Settings from "./pages/Settings";
import SuperAdmin from "./pages/SuperAdmin";
import Reminders from "./pages/Reminders";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";
import Equipment from "./pages/Equipment";

// Member portal pages
import MemberLogin from "./pages/member/MemberLogin";
import MemberSetupPin from "./pages/member/MemberSetupPin";
import MemberDashboard from "./pages/member/MemberDashboard";
import MemberQRCode from "./pages/member/MemberQRCode";
import MemberAttendance from "./pages/member/MemberAttendance";
import MemberPayments from "./pages/member/MemberPayments";
import MemberSettings from "./pages/member/MemberSettings";

// Ultra-fast QueryClient - zero stale time for instant real-time updates
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // CRITICAL: Zero stale time - any invalidation triggers immediate refetch
      staleTime: 0,
      // Keep data in cache for quick display while refetching
      gcTime: 2 * 60 * 1000, // 2 minutes
      // Single retry on failure
      retry: 1,
      // Don't refetch on window focus - realtime subscriptions handle this
      refetchOnWindowFocus: false,
      // Always refetch fresh data on mount
      refetchOnMount: 'always',
      // Refetch when network reconnects to sync any missed updates
      refetchOnReconnect: true,
      // Always attempt network requests
      networkMode: 'always',
    },
    mutations: {
      // Single retry for mutations
      retry: 1,
      networkMode: 'always',
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider defaultTheme="system" storageKey="muscledesk-theme">
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <ManifestManager />
          <PWAInstallPrompt />
          <SubdomainRouter>
            <Routes>
              {/* Member Portal Routes - uses MemberAuthProvider */}
            <Route path="/member/login" element={
              <MemberAuthProvider>
                <MemberLogin />
              </MemberAuthProvider>
            } />
            <Route path="/member/setup-pin" element={
              <MemberSetupPin />
            } />
            <Route path="/member" element={
              <MemberAuthProvider>
                <MemberProtectedRoute><MemberDashboard /></MemberProtectedRoute>
              </MemberAuthProvider>
            } />
            <Route path="/member/dashboard" element={
              <MemberAuthProvider>
                <MemberProtectedRoute><MemberDashboard /></MemberProtectedRoute>
              </MemberAuthProvider>
            } />
            <Route path="/member/qr" element={
              <MemberAuthProvider>
                <MemberProtectedRoute><MemberQRCode /></MemberProtectedRoute>
              </MemberAuthProvider>
            } />
            <Route path="/member/attendance" element={
              <MemberAuthProvider>
                <MemberProtectedRoute><MemberAttendance /></MemberProtectedRoute>
              </MemberAuthProvider>
            } />
            <Route path="/member/payments" element={
              <MemberAuthProvider>
                <MemberProtectedRoute><MemberPayments /></MemberProtectedRoute>
              </MemberAuthProvider>
            } />
            <Route path="/member/settings" element={
              <MemberAuthProvider>
                <MemberProtectedRoute><MemberSettings /></MemberProtectedRoute>
              </MemberAuthProvider>
            } />

            {/* Admin Routes - wrapped in AuthProvider */}
            <Route path="/*" element={
              <AuthProvider>
                <Routes>
                  <Route path="/login" element={<Login />} />
                  <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                  <Route path="/members" element={<ProtectedRoute><Members /></ProtectedRoute>} />
                  <Route path="/plans" element={<ProtectedRoute><Plans /></ProtectedRoute>} />
                  <Route path="/attendance" element={<ProtectedRoute><Attendance /></ProtectedRoute>} />
                  <Route path="/analytics" element={<ProtectedRoute><Analytics /></ProtectedRoute>} />
                  <Route path="/payments" element={<ProtectedRoute><Payments /></ProtectedRoute>} />
                  <Route path="/expenses" element={<ProtectedRoute><Expenses /></ProtectedRoute>} />
                  <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
                  <Route path="/equipment" element={<ProtectedRoute><Equipment /></ProtectedRoute>} />
                  <Route path="/reminders" element={<ProtectedRoute><Reminders /></ProtectedRoute>} />
                  <Route path="/super-admin" element={<ProtectedRoute requireRole="super_admin"><SuperAdmin /></ProtectedRoute>} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </AuthProvider>
            } />
            </Routes>
          </SubdomainRouter>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
