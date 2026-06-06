import { Suspense, lazy } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { LoadingState } from "@/components/Loading";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { PermissionRoute } from "@/components/rbac/PermissionRoute";
import { LoginPage } from "@/pages/LoginPage";
import { ROUTE_PERMISSIONS } from "@/rbac/accessMatrix";

const ActivityPage = lazy(() => import("@/pages/ActivityPage").then((module) => ({ default: module.ActivityPage })));
const BulkEmailPage = lazy(() => import("@/pages/BulkEmailPage").then((module) => ({ default: module.BulkEmailPage })));
const ContactsPage = lazy(() => import("@/pages/ContactsPage").then((module) => ({ default: module.ContactsPage })));
const DashboardPage = lazy(() => import("@/pages/DashboardPage").then((module) => ({ default: module.DashboardPage })));
const ListingsPage = lazy(() => import("@/pages/ListingsPage").then((module) => ({ default: module.ListingsPage })));
const LeadsPage = lazy(() => import("@/pages/LeadsPage").then((module) => ({ default: module.LeadsPage })));
const ReportsPage = lazy(() => import("@/pages/ReportsPage").then((module) => ({ default: module.ReportsPage })));
const SettingsPage = lazy(() => import("@/pages/SettingsPage").then((module) => ({ default: module.SettingsPage })));

export default function App() {
  return (
    <Suspense fallback={<LoadingState className="m-4 border bg-white" label="Loading page" />}>
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route element={<PermissionRoute anyOf={ROUTE_PERMISSIONS["/contacts"]} />}>
              <Route path="/contacts" element={<ContactsPage />} />
            </Route>
            <Route element={<PermissionRoute anyOf={ROUTE_PERMISSIONS["/listings"]} />}>
              <Route path="/listings" element={<ListingsPage />} />
            </Route>
            <Route element={<PermissionRoute anyOf={ROUTE_PERMISSIONS["/leads"]} />}>
              <Route path="/leads" element={<LeadsPage />} />
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
    </Suspense>
  );
}
