import { Navigate, Route, Routes } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { PermissionRoute } from "@/components/rbac/PermissionRoute";
import { ActivityPage } from "@/pages/ActivityPage";
import { BulkEmailPage } from "@/pages/BulkEmailPage";
import { ContactsPage } from "@/pages/ContactsPage";
import { DashboardPage } from "@/pages/DashboardPage";
import { ListingsPage } from "@/pages/ListingsPage";
import { LoginPage } from "@/pages/LoginPage";
import { PipelinePage } from "@/pages/PipelinePage";
import { ReportsPage } from "@/pages/ReportsPage";
import { SettingsPage } from "@/pages/SettingsPage";
import { ROUTE_PERMISSIONS } from "@/rbac/accessMatrix";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LoginPage />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route element={<PermissionRoute anyOf={ROUTE_PERMISSIONS["/contacts"]} />}>
            <Route path="/contacts" element={<ContactsPage />} />
          </Route>
          <Route element={<PermissionRoute anyOf={ROUTE_PERMISSIONS["/pipeline"]} />}>
            <Route path="/pipeline" element={<PipelinePage />} />
          </Route>
          <Route element={<PermissionRoute anyOf={ROUTE_PERMISSIONS["/listings"]} />}>
            <Route path="/listings" element={<ListingsPage />} />
          </Route>
          <Route element={<PermissionRoute anyOf={ROUTE_PERMISSIONS["/email"]} />}>
            <Route path="/email" element={<BulkEmailPage />} />
          </Route>
          <Route element={<PermissionRoute anyOf={ROUTE_PERMISSIONS["/activity"]} />}>
            <Route path="/activity" element={<ActivityPage />} />
          </Route>
          <Route element={<PermissionRoute anyOf={ROUTE_PERMISSIONS["/reports"]} />}>
            <Route path="/reports" element={<ReportsPage />} />
          </Route>
          <Route element={<PermissionRoute anyOf={ROUTE_PERMISSIONS["/settings"]} />}>
            <Route path="/settings" element={<SettingsPage />} />
          </Route>
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
