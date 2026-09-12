import { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { PropsWithChildren } from "react";

export type ActiveView = "map" | "analytics";
export type ActiveModal = "save-report" | "settings" | "ai" | null;

export type UIStateValue = {
  activeView: ActiveView;
  activeModal: ActiveModal;
  openView(view: ActiveView): void;
  closeView(): void;
  openModal(modal: Exclude<ActiveModal, null>): void;
  closeModal(): void;
  closeEscapableModal(): void;
};

const UIStateContext = createContext<UIStateValue | undefined>(undefined);

export function UIStateProvider({ children }: PropsWithChildren): React.JSX.Element {
  const [activeView, setActiveView] = useState<ActiveView>("map");
  const [activeModal, setActiveModal] = useState<ActiveModal>(null);

  const openView = useCallback((view: ActiveView) => {
    setActiveView(view);
  }, []);
  const closeView = useCallback(() => {
    setActiveView("map");
  }, []);
  const openModal = useCallback((modal: Exclude<ActiveModal, null>) => {
    setActiveModal(modal);
  }, []);
  const closeModal = useCallback(() => {
    setActiveModal(null);
  }, []);
  const closeEscapableModal = useCallback(() => {
    setActiveModal((modal) => (modal === "save-report" || modal === "settings" ? null : modal));
  }, []);

  const value = useMemo<UIStateValue>(
    () => ({
      activeView,
      activeModal,
      openView,
      closeView,
      openModal,
      closeModal,
      closeEscapableModal,
    }),
    [activeModal, activeView, closeEscapableModal, closeModal, closeView, openModal, openView],
  );

  return <UIStateContext.Provider value={value}>{children}</UIStateContext.Provider>;
}

// The hook and provider intentionally share the UI-state module as one public API.
// eslint-disable-next-line react-refresh/only-export-components
export function useUIState(): UIStateValue {
  const value = useContext(UIStateContext);
  if (!value) throw new Error("useUIState must be used within UIStateProvider");
  return value;
}
