import { Routes, Route, Navigate } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import Expenses from './pages/Expenses';
import Analytics from './pages/Analytics';
import Activities from './pages/Activities';
import Payments from './pages/Payments';
import Alarms from './pages/Alarms';
import Sidebar from './components/Layout/Sidebar';
import BottomNav from './components/Layout/BottomNav';
import Nutrition from './pages/Nutrition';
import Body from './pages/Body';
import { ExpenseProvider } from './store/ExpenseContext';
import { BankProvider } from './store/BankContext';
import { PaymentProvider } from './store/PaymentContext';
import { ActivityProvider } from './store/ActivityContext';
import { AlarmProvider } from './store/AlarmContext';
import { NutritionProvider } from './store/NutritionContext';
import { BodyProvider } from './store/BodyContext';
import { ThemeProvider } from './store/ThemeContext';
import { AuthProvider, useAuth } from './store/AuthContext';
import './App.css';

// A wrapper that requires the user to be logged in
function ProtectedRoute({ children }) {
  const { currentUser, isLoading } = useAuth();

  if (isLoading) {
    return <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }} className="brand-font">Loading...</div>;
  }

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

// Layout for authenticated users: Sidebar + Content + BottomNav
function ProtectedLayout() {
  return (
    <div className="app-container">
      <Sidebar />
      <main className="main-content">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/expenses" element={<Expenses />} />
          <Route path="/payments" element={<Payments />} />
          <Route path="/activities" element={<Activities />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/nutrition" element={<Nutrition />} />
          <Route path="/body" element={<Body />} />
          <Route path="/alarms" element={<Alarms />} />
        </Routes>
      </main>
      <BottomNav />
    </div>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BankProvider>
          <PaymentProvider>
            <ExpenseProvider>
              <ActivityProvider>
                <AlarmProvider>
                  <NutritionProvider>
                    <BodyProvider>
                      <Routes>
                        {/* Public Route */}
                        <Route path="/login" element={<Login />} />

                        {/* Protected Routes (Everything else) */}
                        <Route path="/*" element={
                          <ProtectedRoute>
                            <ProtectedLayout />
                          </ProtectedRoute>
                        } />
                      </Routes>
                    </BodyProvider>
                  </NutritionProvider>
                </AlarmProvider>
              </ActivityProvider>
            </ExpenseProvider>
          </PaymentProvider>
        </BankProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
