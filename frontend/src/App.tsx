import { Navigate, Route, Routes } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { ActivityPage } from "@/pages/ActivityPage";
import { BulkEmailPage } from "@/pages/BulkEmailPage";
import { ContactsPage } from "@/pages/ContactsPage";
import { DashboardPage } from "@/pages/DashboardPage";
import { ListingsPage } from "@/pages/ListingsPage";
import { LoginPage } from "@/pages/LoginPage";
import { PipelinePage } from "@/pages/PipelinePage";
import { ReportsPage } from "@/pages/ReportsPage";
import { SettingsPage } from "@/pages/SettingsPage";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LoginPage />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/contacts" element={<ContactsPage />} />
          <Route path="/pipeline" element={<PipelinePage />} />
          <Route path="/listings" element={<ListingsPage />} />
          <Route path="/email" element={<BulkEmailPage />} />
          <Route path="/activity" element={<ActivityPage />} />
          <Route path="/reports" element={<ReportsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
