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
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";

// Member portal pages
import MemberLogin from "./pages/member/MemberLogin";
import MemberDashboard from "./pages/member/MemberDashboard";
import MemberQRCode from "./pages/member/MemberQRCode";
import MemberAttendance from "./pages/member/MemberAttendance";
import MemberPayments from "./pages/member/MemberPayments";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider defaultTheme="system" storageKey="muscledesk-theme">
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* Member Portal Routes */}
            <Route path="/member/login" element={
              <MemberAuthProvider>
                <MemberLogin />
              </MemberAuthProvider>
            } />
            <Route path="/member" element={
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

            {/* Admin Routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/" element={
              <AuthProvider>
                <ProtectedRoute><Dashboard /></ProtectedRoute>
              </AuthProvider>
            } />
            <Route path="/members" element={
              <AuthProvider>
                <ProtectedRoute><Members /></ProtectedRoute>
              </AuthProvider>
            } />
            <Route path="/plans" element={
              <AuthProvider>
                <ProtectedRoute><Plans /></ProtectedRoute>
              </AuthProvider>
            } />
            <Route path="/attendance" element={
              <AuthProvider>
                <ProtectedRoute><Attendance /></ProtectedRoute>
              </AuthProvider>
            } />
            <Route path="/analytics" element={
              <AuthProvider>
                <ProtectedRoute><Analytics /></ProtectedRoute>
              </AuthProvider>
            } />
            <Route path="/payments" element={
              <AuthProvider>
                <ProtectedRoute><Payments /></ProtectedRoute>
              </AuthProvider>
            } />
            <Route path="/expenses" element={
              <AuthProvider>
                <ProtectedRoute><Expenses /></ProtectedRoute>
              </AuthProvider>
            } />
            <Route path="/settings" element={
              <AuthProvider>
                <ProtectedRoute><Settings /></ProtectedRoute>
              </AuthProvider>
            } />
            <Route path="/super-admin" element={
              <AuthProvider>
                <ProtectedRoute requireRole="super_admin"><SuperAdmin /></ProtectedRoute>
              </AuthProvider>
            } />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
