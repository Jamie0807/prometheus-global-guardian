/**
 * 提供应用根组件并组织主要界面区域。
 */
import React, { lazy, Suspense, useEffect } from "react";
import Header from "./components/Header";
import StatusPanel from "./components/StatusPanel";
import LegendPanel from "./components/LegendPanel";
import MapView from "./features/map/MapView";
import ErrorBoundary from "./components/ErrorBoundary";
import { MapStateProvider } from "./features/map/state/MapStateContext";
import { UIStateProvider, useUIState } from "./state/UIStateContext";
import { AuthProvider, useAuth } from "./state/AuthContext";
import AuthScreen from "./components/AuthScreen";

// 使用 React.lazy() 懒加载大型组件
const AnalyticsPage = lazy(() => import("./components/AnalyticsPage"));
const SaveReportModal = lazy(() => import("./components/SaveReportModal"));
const SettingsModal = lazy(() => import("./components/SettingsModal"));
const AIChatAssistant = lazy(() => import("./components/AIChatAssistant"));
// 加载指示器组件
const LoadingFallback = () => <div className="auth-loading-shell">正在恢复登录状态…</div>;

function AppContent() {
  const { activeView, closeEscapableModal } = useUIState();

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        closeEscapableModal();
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [closeEscapableModal]);

  return (
    <>
      <Header />
      <main>
        {activeView === "analytics" ? (
          <ErrorBoundary>
            <Suspense fallback={<LoadingFallback />}>
              <AnalyticsPage />
            </Suspense>
          </ErrorBoundary>
        ) : (
          <>
            <MapView />
            <StatusPanel />
            <LegendPanel />
          </>
        )}

        <Suspense fallback={null}>
          <SaveReportModal />
        </Suspense>

        <Suspense fallback={null}>
          <SettingsModal />
        </Suspense>

        <Suspense fallback={null}>
          <AIChatAssistant />
        </Suspense>
      </main>
    </>
  );
}

const AuthenticatedApplication: React.FC = () => {
  const { status } = useAuth();
  if (status === "loading") return <LoadingFallback />;
  if (status === "unauthenticated") return <AuthScreen />;

  return (
    <UIStateProvider>
      <MapStateProvider>
        <AppContent />
      </MapStateProvider>
    </UIStateProvider>
  );
};

const App: React.FC = () => (
  <AuthProvider>
    <AuthenticatedApplication />
  </AuthProvider>
);

export default App;
