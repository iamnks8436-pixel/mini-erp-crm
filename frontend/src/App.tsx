import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/layout/ProtectedRoute';
import { AppLayout } from './components/layout/AppLayout';

import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { CustomersPage } from './pages/CustomersPage';
import { CustomerDetailPage } from './pages/CustomerDetailPage';
import { ProductsPage } from './pages/ProductsPage';
import { InventoryPage } from './pages/InventoryPage';
import { ChallansPage } from './pages/ChallansPage';
import { ChallanCreatePage } from './pages/ChallanCreatePage';
import { ChallanDetailPage } from './pages/ChallanDetailPage';

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Authentication Route */}
          <Route path="/login" element={<LoginPage />} />

          {/* Protected Routes Container */}
          <Route element={<ProtectedRoute />}>
            <Route element={<AppLayout />}>
              {/* Default Redirect */}
              <Route path="/" element={<Navigate to="/dashboard" replace />} />

              {/* Dashboard: All authenticated users */}
              <Route path="/dashboard" element={<DashboardPage />} />

              {/* Customers: Admin, Sales, Accounts */}
              <Route element={<ProtectedRoute allowedRoles={['Admin', 'Sales', 'Accounts']} />}>
                <Route path="/customers" element={<CustomersPage />} />
                <Route path="/customers/:id" element={<CustomerDetailPage />} />
              </Route>

              {/* Products: All roles can view (Warehouse & Admin can modify) */}
              <Route path="/products" element={<ProductsPage />} />

              {/* Inventory / Stock Movements: Admin, Warehouse, Accounts */}
              <Route element={<ProtectedRoute allowedRoles={['Admin', 'Warehouse', 'Accounts']} />}>
                <Route path="/inventory" element={<InventoryPage />} />
              </Route>

              {/* Sales Challans: All roles can view */}
              <Route path="/challans" element={<ChallansPage />} />
              <Route path="/challans/:id" element={<ChallanDetailPage />} />

              {/* Create Challan: Admin and Sales only */}
              <Route element={<ProtectedRoute allowedRoles={['Admin', 'Sales']} />}>
                <Route path="/challans/new" element={<ChallanCreatePage />} />
              </Route>
            </Route>
          </Route>

          {/* Catch-all fallback */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;
