import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { MemberAuthProvider } from "@/contexts/MemberAuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { MemberProtectedRoute } from "@/components/member-portal/MemberProtectedRoute";
import { SubdomainRouter } from "@/components/SubdomainRouter";
import { ManifestManager } from "@/components/ManifestManager";
import { PWAInstallPrompt } from "@/components/pwa/PWAInstallPrompt";
import { queryClient } from "@/lib/queryClient";

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
import FingerprintDevices from "./pages/FingerprintDevices";
import GymChat from "./pages/GymChat";
import RenewalRequests from "./pages/RenewalRequests";
import Leads from "./pages/Leads";
import GmailLeads from "./pages/GmailLeads";

// Member portal pages
import MemberLogin from "./pages/member/MemberLogin";
import MemberSetupPin from "./pages/member/MemberSetupPin";
import MemberDashboard from "./pages/member/MemberDashboard";
import MemberQRCode from "./pages/member/MemberQRCode";
import MemberAttendance from "./pages/member/MemberAttendance";
import MemberPayments from "./pages/member/MemberPayments";
import MemberSettings from "./pages/member/MemberSettings";
import MemberWorkouts from "./pages/member/MemberWorkouts";
import MemberMeasurements from "./pages/member/MemberMeasurements";
import MemberAnnouncements from "./pages/member/MemberAnnouncements";
import MemberGoals from "./pages/member/MemberGoals";
import MemberClasses from "./pages/member/MemberClasses";
import MemberRenewal from "./pages/member/MemberRenewal";
import MemberSupport from "./pages/member/MemberSupport";
import MemberChat from "./pages/member/MemberChat";

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
            <Route path="/member/workouts" element={
              <MemberAuthProvider>
                <MemberProtectedRoute><MemberWorkouts /></MemberProtectedRoute>
              </MemberAuthProvider>
            } />
            <Route path="/member/measurements" element={
              <MemberAuthProvider>
                <MemberProtectedRoute><MemberMeasurements /></MemberProtectedRoute>
              </MemberAuthProvider>
            } />
            <Route path="/member/announcements" element={
              <MemberAuthProvider>
                <MemberProtectedRoute><MemberAnnouncements /></MemberProtectedRoute>
              </MemberAuthProvider>
            } />
            <Route path="/member/goals" element={
              <MemberAuthProvider>
                <MemberProtectedRoute><MemberGoals /></MemberProtectedRoute>
              </MemberAuthProvider>
            } />
            <Route path="/member/classes" element={
              <MemberAuthProvider>
                <MemberProtectedRoute><MemberClasses /></MemberProtectedRoute>
              </MemberAuthProvider>
            } />
            <Route path="/member/renewal" element={
              <MemberAuthProvider>
                <MemberProtectedRoute><MemberRenewal /></MemberProtectedRoute>
              </MemberAuthProvider>
            } />
            <Route path="/member/support" element={
              <MemberAuthProvider>
                <MemberProtectedRoute><MemberSupport /></MemberProtectedRoute>
              </MemberAuthProvider>
            } />
            <Route path="/member/chat" element={
              <MemberAuthProvider>
                <MemberProtectedRoute><MemberChat /></MemberProtectedRoute>
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
                  <Route path="/fingerprint-devices" element={<ProtectedRoute><FingerprintDevices /></ProtectedRoute>} />
                  <Route path="/chat" element={<ProtectedRoute><GymChat /></ProtectedRoute>} />
                  <Route path="/renewal-requests" element={<ProtectedRoute><RenewalRequests /></ProtectedRoute>} />
                  <Route path="/leads" element={<ProtectedRoute><Leads /></ProtectedRoute>} />
                  <Route path="/gmail-leads" element={<ProtectedRoute><GmailLeads /></ProtectedRoute>} />
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
