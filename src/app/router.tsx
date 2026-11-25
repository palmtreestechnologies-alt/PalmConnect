import { BrowserRouter, Route, Routes } from "react-router-dom";
import Landing from "@/pages/Landing";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import NotFound from "@/pages/NotFound";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Overview from "@/pages/dashboard/Overview";
import Routers from "@/pages/dashboard/Routers";
import Packages from "@/pages/dashboard/Packages";
import Vouchers from "@/pages/dashboard/Vouchers";
import StaffAccess from "@/pages/dashboard/StaffAccess";
import Settings from "@/pages/dashboard/Settings";
import CaptivePortal from "@/pages/dashboard/CaptivePortal";
import HotspotUsers from "@/pages/dashboard/HotspotUsers";
import Sessions from "@/pages/dashboard/Sessions";
import Billing from "@/pages/dashboard/Billing";
import Properties from "@/pages/dashboard/Properties";
import SuperAdmin from "@/pages/dashboard/SuperAdmin";
import WifiSelfCare from "@/pages/public/WifiSelfCare";
import Checkout from "@/pages/Checkout";
import { Analytics, Logs } from "@/pages/dashboard/Placeholders";
import NetworkValidator from "@/pages/dashboard/NetworkValidator";
import { Marketplace, PalmAI, Notifications, Downloads, HelpCenter } from "@/pages/dashboard/FoundationStubs";

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/dashboard" element={<ProtectedRoute><Overview /></ProtectedRoute>} />
        <Route path="/dashboard/routers" element={<ProtectedRoute><Routers /></ProtectedRoute>} />
        <Route path="/dashboard/packages" element={<ProtectedRoute><Packages /></ProtectedRoute>} />
        <Route path="/dashboard/vouchers" element={<ProtectedRoute><Vouchers /></ProtectedRoute>} />
        <Route path="/dashboard/staff-access" element={<ProtectedRoute><StaffAccess /></ProtectedRoute>} />
        <Route path="/dashboard/users" element={<ProtectedRoute><HotspotUsers /></ProtectedRoute>} />
        <Route path="/dashboard/sessions" element={<ProtectedRoute><Sessions /></ProtectedRoute>} />
        <Route path="/dashboard/billing" element={<ProtectedRoute><Billing /></ProtectedRoute>} />
        <Route path="/dashboard/properties" element={<ProtectedRoute><Properties /></ProtectedRoute>} />
        <Route path="/checkout" element={<ProtectedRoute><Checkout /></ProtectedRoute>} />
        <Route path="/wifi/check" element={<WifiSelfCare />} />
        <Route path="/buy/:businessId" element={<WifiSelfCare />} />
        <Route path="/dashboard/analytics" element={<ProtectedRoute><Analytics /></ProtectedRoute>} />
        <Route path="/dashboard/network-check" element={<ProtectedRoute><NetworkValidator /></ProtectedRoute>} />
        <Route path="/dashboard/portal" element={<ProtectedRoute><CaptivePortal /></ProtectedRoute>} />
        <Route path="/dashboard/logs" element={<ProtectedRoute><Logs /></ProtectedRoute>} />
        <Route path="/dashboard/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
        {/* Foundation stubs — module pages will replace these */}
        <Route path="/dashboard/marketplace" element={<ProtectedRoute><Marketplace /></ProtectedRoute>} />
        <Route path="/dashboard/ai" element={<ProtectedRoute><PalmAI /></ProtectedRoute>} />
        <Route path="/dashboard/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
        <Route path="/dashboard/downloads" element={<ProtectedRoute><Downloads /></ProtectedRoute>} />
        <Route path="/dashboard/help" element={<ProtectedRoute><HelpCenter /></ProtectedRoute>} />
        <Route path="/admin" element={<ProtectedRoute role="super_admin"><SuperAdmin /></ProtectedRoute>} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}
