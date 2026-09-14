import { Outlet } from "react-router-dom";
import Navbar from "../components/layout/Navbar";
import Footer from "../components/layout/Footer";

function PublicLayout() {
  return (
    <div className="public-layout">
      <Navbar />

      <main className="public-layout__main">
        <Outlet />
      </main>

      <Footer />
    </div>
  );
}

export default PublicLayout;