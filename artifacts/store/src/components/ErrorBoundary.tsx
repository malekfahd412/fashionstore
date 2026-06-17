import { Component, type ReactNode, type ErrorInfo } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[ErrorBoundary]", error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-8 bg-background">
          <div className="text-center max-w-sm">
            <h1 className="text-2xl font-medium tracking-tight mb-3">Something went wrong</h1>
            <p className="text-muted-foreground text-sm mb-8">
              An unexpected error occurred. Please refresh the page to continue.
            </p>
            <button
              className="px-8 py-3 bg-foreground text-background text-xs uppercase tracking-widest hover:opacity-80 transition-opacity"
              onClick={() => window.location.reload()}
            >
              Refresh Page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
