// filepath: c:\MiniProject\agri-assist-village\src\App.tsx
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { CartProvider } from "./contexts/CartContext";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { LanguageProvider } from "./contexts/LanguageContext";
import { ToastProvider } from "./components/Toast";
import HelpAssistant from "./components/HelpAssistant";
import Index from "./pages/Index";
import Checkout from "./pages/Checkout";
import OrderConfirmation from "./pages/OrderConfirmation";
import Login from "./pages/Login";
import Alerts from "./pages/Alerts";
import PlantScanner from "./pages/PlantScanner";
import CropGuide from "./pages/CropGuide";
import KnowledgeHub from "./pages/KnowledgeHub";
import JobPosting from "./pages/JobPosting";
import LaborerProfile from "./pages/LaborerProfile";
import LaborMarketplace from "./pages/LaborMarketplace";
import JobMatches from "./pages/JobMatches";
import FarmerProfile from "./pages/FarmerProfile";
import LocalLabor from "./pages/LocalLabor";
import Marketplace from "./pages/Marketplace";
import AddListing from "./pages/AddListing";
import RoverMonitoring from "./pages/RoverMonitoring";
import NotFound from "./pages/NotFound";
import { RoverProvider } from "./contexts/RoverContext";

// Protected Route Component
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
};

function App() {
  return (
    <ToastProvider>
      <LanguageProvider>
        <AuthProvider>
          <CartProvider>
            <RoverProvider>
              <Router>
                <HelpAssistant />
                <Routes>
                  <Route path="/login" element={<Login />} />
                  <Route path="/" element={<Index />} />
                  <Route path="/checkout" element={
                    <ProtectedRoute>
                      <Checkout />
                    </ProtectedRoute>
                  } />
                <Route path="/order-confirmation" element={
                  <ProtectedRoute>
                    <OrderConfirmation />
                  </ProtectedRoute>
                } />
                <Route path="/alerts" element={
                  <ProtectedRoute>
                    <Alerts />
                  </ProtectedRoute>
                } />
                <Route path="/scanner" element={
                  <ProtectedRoute>
                    <PlantScanner />
                  </ProtectedRoute>
                } />
                <Route path="/crop-guide" element={
                  <ProtectedRoute>
                    <CropGuide />
                  </ProtectedRoute>
                } />
                <Route path="/rover-monitoring" element={
                  <ProtectedRoute>
                    <RoverMonitoring />
                  </ProtectedRoute>
                } />
                <Route path="/knowledge-hub" element={<KnowledgeHub />} />
                <Route path="/post-job" element={
                  <ProtectedRoute>
                    <JobPosting />
                  </ProtectedRoute>
                } />
                <Route path="/labourer-profile" element={
                  <ProtectedRoute>
                    <LaborerProfile />
                  </ProtectedRoute>
                } />
                <Route path="/labour-marketplace" element={
                  <ProtectedRoute>
                    <LaborMarketplace />
                  </ProtectedRoute>
                } />
                <Route path="/job-matches" element={
                  <ProtectedRoute>
                    <JobMatches />
                  </ProtectedRoute>
                } />
                <Route path="/farmer-profile" element={
                  <ProtectedRoute>
                    <FarmerProfile />
                  </ProtectedRoute>
                } />
                <Route path="/local-labour" element={
                  <ProtectedRoute>
                    <LocalLabor />
                  </ProtectedRoute>
                } />
                <Route path="/marketplace" element={
                  <ProtectedRoute>
                    <Marketplace />
                  </ProtectedRoute>
                } />
                <Route path="/add-listing" element={
                  <ProtectedRoute>
                    <AddListing />
                  </ProtectedRoute>
                } />
                {/* Fallback route */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Router>
          </RoverProvider>
          </CartProvider>
        </AuthProvider>
      </LanguageProvider>
    </ToastProvider>
  );
}

export default App;