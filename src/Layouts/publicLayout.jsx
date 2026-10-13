import { Outlet, useLocation } from "react-router-dom";
import { useEffect } from "react";
import Navbar from "../components/layout/Navbar";
import Footer from "../components/layout/Footer";
import MobileTabBar from "../components/layout/MobileTabBar";

function PublicLayout() {
  const { pathname } = useLocation();

  // Start every page at the top when navigating.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return (
    <div className="public-layout mm-shell">
      <Navbar />

      <main className="public-layout__main">
        <Outlet />
      </main>

      <Footer />
      <MobileTabBar />
    </div>
  );
}

export default PublicLayout;