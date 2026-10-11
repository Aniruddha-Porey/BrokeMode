import React, { lazy, Suspense, useEffect } from 'react';
import { Link, Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom';
import { Home, WalletCards } from 'lucide-react';
import { useAuth } from './context/AuthContext.jsx';
import { useFinance } from './context/FinanceContext.jsx';
import AppShell from './components/layout/AppShell.jsx';
const Landing = lazy(() => import('./pages/Landing.jsx'));
const Login = lazy(() => import('./pages/Login.jsx'));
const SignUp = lazy(() => import('./pages/SignUp.jsx'));
const Onboarding = lazy(() => import('./pages/Onboarding.jsx'));
const Dashboard = lazy(() => import('./pages/Dashboard.jsx'));
const DecisionLab = lazy(() => import('./pages/DecisionLab.jsx'));
const Transactions = lazy(() => import('./pages/Transactions.jsx'));
const Budgets = lazy(() => import('./pages/Budgets.jsx'));
const SavingsGoals = lazy(() => import('./pages/SavingsGoals.jsx'));
const BillsSubscriptions = lazy(() => import('./pages/BillsSubscriptions.jsx'));
const Insights = lazy(() => import('./pages/Insights.jsx'));
const Settings = lazy(() => import('./pages/Settings.jsx'));
const renderPage = (Page) => <Suspense fallback={<div className="route-loading" role="status">Loading your money workspace…</div>}><Page /></Suspense>;

function RequireAuth() {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />;
}

function GuestOnly() {
  const { isAuthenticated } = useAuth();
  const { state } = useFinance();
  if (!isAuthenticated) return <Outlet />;
  return <Navigate to={state.onboardingComplete ? '/dashboard' : '/onboarding'} replace />;
}

function HomeRoute() {
  return renderPage(Landing);
}

function RequireOnboardingComplete() {
  const { state } = useFinance();
  return state.onboardingComplete ? <Outlet /> : <Navigate to="/onboarding" replace />;
}

function OnboardingRoute() {
  const { state } = useFinance();
  return state.onboardingComplete ? <Navigate to="/dashboard" replace /> : renderPage(Onboarding);
}

function NotFound() {
  const { isAuthenticated } = useAuth();
  return <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 22 }}>
    <div className="panel" style={{ width: 'min(420px,100%)', textAlign: 'center', padding: 32 }}>
      <span className="brand-mark" style={{ margin: '0 auto 15px' }}><WalletCards size={19} /></span>
      <div className="eyebrow">404 · WRONG TURN</div><h1 style={{ margin: 0, fontSize: 24, letterSpacing: '-.05em' }}>This page isn’t in the plan.</h1><p className="muted" style={{ fontSize: 11, margin: '8px 0 20px' }}>The route may have moved. Your money data is still right where you left it.</p>
      <Link className="btn btn-primary btn-md" to={isAuthenticated ? '/dashboard' : '/login'}><Home size={16} /><span>Back to {isAuthenticated ? 'overview' : 'sign in'}</span></Link>
    </div>
  </div>;
}

function RouteEffects() {
  const location = useLocation();
  const { state } = useFinance();
  useEffect(() => {
    document.documentElement.dataset.theme = state.preferences?.appearance || 'dark';
  }, [state.preferences?.appearance]);
  useEffect(() => {
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, [location.pathname]);
  return null;
}

export default function App() {
  return <>
    <RouteEffects />
    <Routes>
      <Route path="/" element={<HomeRoute />} />
      <Route element={<GuestOnly />}>
        <Route path="/login" element={renderPage(Login)} />
        <Route path="/signup" element={renderPage(SignUp)} />
      </Route>
      <Route element={<RequireAuth />}>
        <Route path="/onboarding" element={<OnboardingRoute />} />
        <Route element={<RequireOnboardingComplete />}>
          <Route element={<AppShell><Outlet /></AppShell>}>
            <Route path="/dashboard" element={renderPage(Dashboard)} />
            <Route path="/decision-lab" element={renderPage(DecisionLab)} />
            <Route path="/transactions" element={renderPage(Transactions)} />
            <Route path="/budgets" element={renderPage(Budgets)} />
            <Route path="/savings-goals" element={renderPage(SavingsGoals)} />
            <Route path="/bills-subscriptions" element={renderPage(BillsSubscriptions)} />
            <Route path="/insights" element={renderPage(Insights)} />
            <Route path="/settings" element={renderPage(Settings)} />
          </Route>
        </Route>
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  </>;
}
