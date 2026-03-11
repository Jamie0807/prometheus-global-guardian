import React, { useState, useEffect, lazy, Suspense } from "react";
import { authorize } from "./api/auth";
import { notify } from "./utils/notifications";
import Header from "./components/Header";
import StatusPanel from "./components/StatusPanel";
import LegendPanel from "./components/LegendPanel";
import MapView from "./components/MapView";
import ErrorBoundary from "./components/ErrorBoundary";
import type { Hazard, SaveReportPayload } from "./types";

// 使用 React.lazy() 懒加载大型组件
const AnalyticsPage = lazy(() => import("./components/AnalyticsPage"));
const SaveReportModal = lazy(() => import("./components/SaveReportModal"));
const SettingsModal = lazy(() => import("./components/SettingsModal"));
const AIChatAssistant = lazy(() => import("./components/AIChatAssistant"));

// 加载指示器组件
const LoadingFallback = () => (
  <div style={{ 
    display: 'flex', 
    justifyContent: 'center', 
    alignItems: 'center', 
    height: '100vh',
    fontSize: '18px',
    color: '#666'
  }}>
    加载中...
  </div>
);

const App: React.FC = () => {
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isAnalyticsOpen, setIsAnalyticsOpen] = useState(false);
  const [isAIOpen, setIsAIOpen] = useState(false);
  const [selectedStyle, setSelectedStyle] = useState("dark-v11");
  const [disasters, setDisasters] = useState<Hazard[]>([]);
  const [filter, setFilter] = useState("ALL");

  useEffect(() => {
    (async () => {
      try {
        await authorize();
      } catch (error) {
        console.error("Initial authorization failed:", error);
        // App can still work with other data sources
      }
    })();
  }, []);

  // Handle updates from MapView
  const handleDisastersUpdate = (data: Hazard[]) => {
    const previousCount = disasters.length;
    setDisasters(data);
    
    // 发送通知
    if (data.length > previousCount) {
      const newCount = data.length - previousCount;
      notify.info('数据更新', `检测到 ${newCount} 条新灾害记录`);
    } else if (data.length > 0 && previousCount === 0) {
      notify.success('数据加载完成', `成功加载 ${data.length} 条灾害记录`);
    }
  };

  const handleStyleChange = (style: string) => {
    setSelectedStyle(style);
  };

  // Handle download report
  const handleDownloadReport = (payload: SaveReportPayload) => {
    // 可以在这里添加下载逻辑，比如发送到后端或生成文件
    console.log("Download report:", payload);
  };

  // Handle global key press for Escape to close modals
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsSaveModalOpen(false);
        setIsSettingsModalOpen(false);
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  return (
    <>
      <Header
        onOpenSaveModal={() => setIsSaveModalOpen(true)}
        onOpenSettingsModal={() => setIsSettingsModalOpen(true)}
        onOpenAnalytics={() => setIsAnalyticsOpen(true)}
        onOpenAI={() => setIsAIOpen(true)}
      />
      <main>
        {isAnalyticsOpen ? (
          <ErrorBoundary>
            <Suspense fallback={<LoadingFallback />}>
              <AnalyticsPage 
                hazards={disasters} 
                onClose={() => setIsAnalyticsOpen(false)}
                onRefresh={handleDisastersUpdate}
              />
            </Suspense>
          </ErrorBoundary>
        ) : (
          <>
            <MapView
              mapStyle={selectedStyle}
              onDataUpdate={handleDisastersUpdate}
              filter={filter}
            />
            <StatusPanel
              filter={filter}
              onFilterChange={newFilter => setFilter(newFilter)}
              onRefresh={() => window.location.reload()}
              totalCount={disasters.length}
            />
            <LegendPanel />
          </>
        )}

        <Suspense fallback={null}>
          <SaveReportModal
            isOpen={isSaveModalOpen}
            onClose={() => setIsSaveModalOpen(false)}
            onDownload={handleDownloadReport}
            disasters={disasters}
            filter={filter}
          />
        </Suspense>

        <Suspense fallback={null}>
          <SettingsModal
            isOpen={isSettingsModalOpen}
            onClose={() => setIsSettingsModalOpen(false)}
            onStyleChange={handleStyleChange}
          />
        </Suspense>

        <Suspense fallback={null}>
          <AIChatAssistant
            isOpen={isAIOpen}
            onClose={() => setIsAIOpen(false)}
            hazards={disasters}
          />
        </Suspense>
      </main>
    </>
  );
};

export default App;
