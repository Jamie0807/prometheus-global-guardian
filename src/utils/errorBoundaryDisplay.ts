export interface ErrorBoundaryDisplay {
  message: string;
  details: string | null;
}

export function getErrorBoundaryDisplay(
  error: Error,
  componentStack: string | null,
  isProduction: boolean,
): ErrorBoundaryDisplay {
  if (isProduction) {
    return { message: "页面暂时无法显示，请重试。", details: null };
  }

  return { message: error.toString(), details: componentStack };
}
