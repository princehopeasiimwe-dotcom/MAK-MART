import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { CartProvider } from "./context/CartContext";
import AppRoutes from "./routes/AppRoutes";
import DebugReporter from "./components/common/DebugReporter";
import "./App.css";

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <CartProvider>
          <DebugReporter />
          <AppRoutes />
        </CartProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;