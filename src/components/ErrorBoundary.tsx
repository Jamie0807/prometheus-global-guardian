import { Component } from "react";
import type { ErrorInfo, ReactNode } from "react";
import { createClientLogger } from "../utils/logger";
import { getErrorBoundaryDisplay } from "../utils/errorBoundaryDisplay";

const logger = createClientLogger("error-boundary");

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    logger.error("render_failed", { hasComponentStack: Boolean(errorInfo.componentStack) });
    this.setState({
      error,
      errorInfo,
    });
  }

  private handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const display = getErrorBoundaryDisplay(
        this.state.error ?? new Error("未知渲染错误"),
        this.state.errorInfo?.componentStack ?? null,
        import.meta.env.PROD,
      );

      return (
        <div className="error-boundary">
          <div className="error-boundary-content">
            <svg
              className="error-icon"
              width="64"
              height="64"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <h2>页面出现错误</h2>
            <p className="error-message">{display.message}</p>
            {display.details && (
              <details className="error-details">
                <summary>错误详情</summary>
                <pre>{display.details}</pre>
              </details>
            )}
            <button className="error-reset-btn" onClick={this.handleReset}>
              <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              重试
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
