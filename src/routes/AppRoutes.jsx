import { lazy, Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";

import Loader from "../components/common/loader";
import ProtectedRoute from "./ProtectedRoutes";

import PublicLayout from "../Layouts/publicLayout";

// Everything below is code-split: each page is only downloaded
// when somebody visits it, which keeps the first load small.
const VendorLayout = lazy(() => import("../Layouts/vendorLayout"));
const AdminLayout = lazy(() => import("../Layouts/AdminLayout"));
const ProviderLayout = lazy(() => import("../Layouts/providerLayout"));

const Home = lazy(() => import("../pages/marketplace/home"));
const Products = lazy(() => import("../pages/marketplace/products"));
const ProductDetails = lazy(() => import("../pages/marketplace/productDetails"));
const Vendors = lazy(() => import("../pages/marketplace/vendors"));
const VendorProfile = lazy(() => import("../pages/marketplace/vendorprofile"));
const Cart = lazy(() => import("../pages/marketplace/Cart"));
const Account = lazy(() => import("../pages/account/Account"));
const Events = lazy(() => import("../pages/events/Events"));
const EventDetails = lazy(() => import("../pages/events/EventDetails"));

const Services = lazy(() => import("../pages/services/services"));
const ServiceDetails = lazy(() => import("../pages/services/serviceDetails"));
const ProviderProfile = lazy(() => import("../pages/services/ProviderProfile"));

const Login = lazy(() => import("../pages/auth/VendorLogin"));
const VendorSignup = lazy(() => import("../pages/auth/VendorSignup"));
const CustomerSignup = lazy(() => import("../pages/auth/CustomerSignup"));
const ResetPassword = lazy(() => import("../pages/auth/ResetPassword"));
const UpdatePassword = lazy(() => import("../pages/auth/UpdatePassword"));

const VendorDashboard = lazy(() => import("../pages/vendor/VendorDashboard"));
const VendorProducts = lazy(() => import("../pages/vendor/VendorProducts"));
const VendorOrders = lazy(() => import("../pages/vendor/VendorOrders"));
const ProviderRequests = lazy(() => import("../pages/provider/ProviderRequests"));
const ProviderInsights = lazy(() => import("../pages/provider/ProviderInsights"));
const VendorInsights = lazy(() => import("../pages/vendor/VendorInsights"));
const AdminReviews = lazy(() => import("../pages/admin/AdminReviews"));
const VendorEvents = lazy(() => import("../pages/vendor/VendorEvents"));
const VendorProfilePage = lazy(() => import("../pages/vendor/VendorProfile"));

const ProviderDashboard = lazy(() => import("../pages/provider/ProviderDashboard"));
const ProviderServices = lazy(() => import("../pages/provider/ProviderServices"));
const ProviderAccount = lazy(() => import("../pages/provider/ProviderAccount"));

const AdminDashboard = lazy(() => import("../pages/admin/AdminDashboard"));
const AdminProducts = lazy(() => import("../pages/admin/AdminProducts"));
const AdminVendors = lazy(() => import("../pages/admin/AdminVendors"));
const AdminEvents = lazy(() => import("../pages/admin/AdminEvents"));
const AdminServices = lazy(() => import("../pages/admin/AdminServices"));
const AdminOrders = lazy(() => import("../pages/admin/AdminOrders"));
const AdminReports = lazy(() => import("../pages/admin/AdminReports"));
const AdminCategories = lazy(() => import("../pages/admin/AdminCategories"));
const AdminSettings = lazy(() => import("../pages/admin/AdminSettings"));

function AppRoutes() {
  return (
    <Suspense fallback={<Loader fullScreen message="Loading..." />}>
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
                <Route path="/cart" element={<Cart />} />
        <Route path="/account" element={<Account />} />
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

      <Route path="/login" element={<Login />} />
      <Route path="/vendor/login" element={<Login />} />
      <Route path="/provider/login" element={<Login />} />

      <Route path="/signup" element={<CustomerSignup />} />
      <Route path="/vendor/signup" element={<VendorSignup />} />
      <Route
        path="/provider/signup"
        element={<VendorSignup accountType="service_provider" />}
      />

      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/vendor/reset-password" element={<Navigate to="/reset-password" replace />} />
      <Route path="/update-password" element={<UpdatePassword />} />

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
          path="insights"
          element={<VendorInsights />}
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
          SERVICE PROVIDER DASHBOARD
      ========================== */}

      <Route
        path="/provider"
        element={
          <ProtectedRoute allowedRoles={["service_provider", "vendor", "admin"]}>
            <ProviderLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/provider/dashboard" replace />} />
        <Route path="dashboard" element={<ProviderDashboard />} />
        <Route path="services" element={<ProviderServices />} />
        <Route path="requests" element={<ProviderRequests />} />
        <Route path="insights" element={<ProviderInsights />} />
        <Route path="profile" element={<ProviderAccount />} />
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
          path="settings"
          element={<AdminSettings />}
        />
                <Route
          path="categories"
          element={<AdminCategories />}
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

        <Route
          path="reviews"
          element={<AdminReviews />}
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
    </Suspense>
  );
}

export default AppRoutes;