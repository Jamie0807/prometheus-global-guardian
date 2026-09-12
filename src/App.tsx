import React, { lazy, Suspense, useEffect } from "react";
import { authorize } from "./services/auth/authService";
import Header from "./components/Header";
import StatusPanel from "./components/StatusPanel";
import LegendPanel from "./components/LegendPanel";
import MapView from "./features/map/MapView";
import ErrorBoundary from "./components/ErrorBoundary";
import { createClientLogger } from "./utils/logger";
import { MapStateProvider } from "./features/map/state/MapStateContext";
import { UIStateProvider, useUIState } from "./state/UIStateContext";

// 使用 React.lazy() 懒加载大型组件
const AnalyticsPage = lazy(() => import("./components/AnalyticsPage"));
const SaveReportModal = lazy(() => import("./components/SaveReportModal"));
const SettingsModal = lazy(() => import("./components/SettingsModal"));
const AIChatAssistant = lazy(() => import("./components/AIChatAssistant"));
const logger = createClientLogger("app");

// 加载指示器组件
const LoadingFallback = () => (
  <div
    style={{
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      height: "100vh",
      fontSize: "18px",
      color: "#666",
    }}
  >
    加载中...
  </div>
);

function useAuthorization() {
  useEffect(() => {
    (async () => {
      try {
        await authorize();
      } catch {
        logger.warn("initial_authorization_failed");
        // App can still work with other data sources
      }
    })();
  }, []);
}

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

const App: React.FC = () => {
  useAuthorization();

  return (
    <UIStateProvider>
      <MapStateProvider>
        <AppContent />
      </MapStateProvider>
    </UIStateProvider>
  );
};

export default App;
