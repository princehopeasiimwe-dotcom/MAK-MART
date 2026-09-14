import { Routes, Route, Navigate } from "react-router-dom";

import PublicLayout from "../Layouts/publicLayout";
import VendorLayout from "../Layouts/vendorLayout";
import AdminLayout from "../Layouts/AdminLayout";

import Home from "../pages/marketplace/home";
import Products from "../pages/marketplace/products";
import ProductDetails from "../pages/marketplace/productDetails";
import Vendors from "../pages/marketplace/vendors";
import VendorProfile from "../pages/marketplace/vendorprofile";
import Events from "../pages/events/Events";
import EventDetails from "../pages/events/EventDetails";

import Services from "../pages/services/services";
import ServiceDetails from "../pages/services/serviceDetails";
import ProviderProfile from "../pages/services/ProviderProfile";

import VendorLogin from "../pages/auth/VendorLogin";
import VendorSignup from "../pages/auth/VendorSignup";
import ResetPassword from "../pages/auth/ResetPassword";

import VendorDashboard from "../pages/vendor/VendorDashboard";
import VendorProducts from "../pages/vendor/VendorProducts";
import VendorOrders from "../pages/vendor/VendorOrders";
import VendorEvents from "../pages/vendor/VendorEvents";
import VendorProfilePage from "../pages/vendor/VendorProfile";

import AdminDashboard from "../pages/admin/AdminDashboard";
import AdminProducts from "../pages/admin/AdminProducts";
import AdminVendors from "../pages/admin/AdminVendors";
import AdminEvents from "../pages/admin/AdminEvents";
import AdminServices from "../pages/admin/AdminServices";
import AdminOrders from "../pages/admin/AdminOrders";
import AdminReports from "../pages/admin/AdminReports";

import ProtectedRoute from "../routes/ProtectedRoutes";

function AppRoutes() {
  return (
    <Routes>
      {/* =========================
          PUBLIC MARKETPLACE
      ========================== */}

      <Route element={<PublicLayout />}>
        <Route path="/" element={<Home />} />

        <Route path="/marketplace" element={<Home />} />

        <Route path="/marketplace/products" element={<Products />} />

        <Route
          path="/marketplace/products/:productId"
          element={<ProductDetails />}
        />

        <Route
          path="/marketplace/vendors"
          element={<Vendors />}
        />

        <Route
          path="/marketplace/vendors/:vendorId"
          element={<VendorProfile />}
        />

        <Route
          path="/marketplace/events"
          element={<Events />}
        />

        <Route
          path="/marketplace/events/:eventId"
          element={<EventDetails />}
        />

        <Route path="/services" element={<Services />} />

        <Route
          path="/services/:serviceId"
          element={<ServiceDetails />}
        />

        <Route
          path="/providers/:providerId"
          element={<ProviderProfile />}
        />
      </Route>

      {/* =========================
          AUTH
      ========================== */}

      <Route path="/vendor/login" element={<VendorLogin />} />

      <Route path="/vendor/signup" element={<VendorSignup />} />

      <Route
        path="/vendor/reset-password"
        element={<ResetPassword />}
      />

      {/* =========================
          VENDOR DASHBOARD
      ========================== */}

      <Route
        path="/vendor"
        element={
          <ProtectedRoute allowedRoles={["vendor", "admin"]}>
            <VendorLayout />
          </ProtectedRoute>
        }
      >
        <Route
          index
          element={<Navigate to="/vendor/dashboard" replace />}
        />

        <Route
          path="dashboard"
          element={<VendorDashboard />}
        />

        <Route
          path="products"
          element={<VendorProducts />}
        />

        <Route
          path="orders"
          element={<VendorOrders />}
        />

        <Route
          path="events"
          element={<VendorEvents />}
        />

        <Route
          path="profile"
          element={<VendorProfilePage />}
        />
      </Route>

      {/* =========================
          ADMIN DASHBOARD
      ========================== */}

      <Route
        path="/admin"
        element={
          <ProtectedRoute allowedRoles={["admin"]}>
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route
          index
          element={<Navigate to="/admin/dashboard" replace />}
        />

        <Route
          path="dashboard"
          element={<AdminDashboard />}
        />

        <Route
          path="products"
          element={<AdminProducts />}
        />

        <Route
          path="vendors"
          element={<AdminVendors />}
        />

        <Route
          path="events"
          element={<AdminEvents />}
        />

        <Route
          path="services"
          element={<AdminServices />}
        />

        <Route
          path="orders"
          element={<AdminOrders />}
        />

        <Route
          path="reports"
          element={<AdminReports />}
        />
      </Route>

      {/* =========================
          FALLBACK
      ========================== */}

      <Route
        path="*"
        element={<Navigate to="/" replace />}
      />
    </Routes>
  );
}

export default AppRoutes;