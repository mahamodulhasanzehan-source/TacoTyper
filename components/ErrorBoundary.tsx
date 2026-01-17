import React, { ErrorInfo, ReactNode } from "react";

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div style={{ color: "white", padding: "20px", textAlign: "center", fontFamily: "sans-serif" }}>
          <h1>Something went wrong.</h1>
          <p>Please check the console for details.</p>
          <pre style={{ textAlign: "left", background: "#333", padding: "10px", overflow: "auto" }}>
            {this.state.error?.toString()}
          </pre>
          <button 
            onClick={() => window.location.reload()}
            style={{ padding: "10px 20px", marginTop: "20px", cursor: "pointer" }}
          >
            Reload Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}