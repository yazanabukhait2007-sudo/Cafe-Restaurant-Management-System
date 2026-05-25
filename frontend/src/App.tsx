import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "sonner";

// Layouts
import AdminLayout from "@/layouts/AdminLayout";
import POSLayout from "@/layouts/POSLayout";
import KDSLayout from "@/layouts/KDSLayout";

// Auth Pages
import LoginPage from "@/pages/auth/Login";

// Admin Pages
import DashboardPage from "@/pages/admin/Dashboard";
import InventoryPage from "@/pages/admin/Inventory";
import EmployeesPage from "@/pages/admin/Employees";
import PayrollPage from "@/pages/admin/Payroll";
import AttendancePage from "@/pages/admin/Attendance";
import SettingsPage from "@/pages/admin/Settings";
import ReportsPage from "@/pages/admin/Reports";

// POS Pages
import POSPage from "@/pages/pos/POS";
import TablesPage from "@/pages/pos/Tables";
import OrderHistoryPage from "@/pages/pos/OrderHistory";
import MenuManagementPage from "@/pages/pos/MenuManagement";
import KDSPage from "@/pages/kds/KDS";
// Customer Pages
import CustomerView from "@/pages/customer/CustomerView";
import { useUIStore } from "@/store/ui";
import { Loader2 } from "lucide-react";

import { useTranslation } from "react-i18next";

function GlobalLoader() {
  const isChangingLanguage = useUIStore(state => state.isChangingLanguage);
  const { t } = useTranslation();
  
  if (!isChangingLanguage) return null;
  
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/50 backdrop-blur-md transition-all duration-300">
      <div className="flex flex-col items-center space-y-4 p-8 bg-card rounded-2xl shadow-2xl border border-amber-900/10">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
        <p className="text-lg font-medium text-foreground tracking-tight">{t('Updating language...') || 'Updating language...'}</p>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <GlobalLoader />
      <Routes>
        {/* Auth */}
        <Route path="/login" element={<LoginPage />} />
        
        {/* Admin Interface */}
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="inventory" element={<InventoryPage />} />
          <Route path="employees" element={<EmployeesPage />} />
          <Route path="payroll" element={<PayrollPage />} />
          <Route path="attendance" element={<AttendancePage />} />
          <Route path="reports" element={<ReportsPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>

        {/* POS Interface */}
        <Route path="/pos" element={<POSLayout />}>
          <Route index element={<Navigate to="tables" replace />} />
          <Route path="tables" element={<TablesPage />} />
          <Route path="order" element={<POSPage />} />
          <Route path="history" element={<OrderHistoryPage />} />
          <Route path="menu" element={<MenuManagementPage />} />
        </Route>

        {/* KDS Interface */}
        <Route path="/kds" element={<KDSLayout />}>
          <Route index element={<KDSPage />} />
        </Route>

        {/* Customer Self-Service Interface */}
        <Route path="/customer/:tableToken" element={<CustomerView />} />

        {/* Fallback */}
        <Route path="/" element={<Navigate to="/admin/dashboard" replace />} />
      </Routes>
      <Toaster 
        position="top-right" 
        toastOptions={{
          classNames: {
            toast: 'group toast group-[.toaster]:bg-orange-50 group-[.toaster]:text-stone-900 group-[.toaster]:border-orange-200 group-[.toaster]:shadow-lg',
            description: 'group-[.toast]:text-stone-600',
            actionButton: 'group-[.toast]:bg-primary group-[.toast]:text-primary-foreground',
            cancelButton: 'group-[.toast]:bg-orange-100 group-[.toast]:text-stone-600',
            closeButton: 'bg-orange-100 text-stone-600 border-orange-200 hover:bg-orange-200 hover:text-stone-900',
          },
        }}
        closeButton 
      />
    </Router>
  );
}
