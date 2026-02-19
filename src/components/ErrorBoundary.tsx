import React, { Component, ErrorInfo, ReactNode } from "react";

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, info: ErrorInfo) {
        console.error("[ErrorBoundary] Caught:", error, info.componentStack);
    }

    handleReload = () => {
        this.setState({ hasError: false, error: null });
        window.location.reload();
    };

    render() {
        if (this.state.hasError) {
            if (this.props.fallback) return this.props.fallback;

            return (
                <div className="min-h-screen flex items-center justify-center bg-background p-6">
                    <div className="text-center space-y-6 max-w-md">
                        <div className="w-16 h-16 rounded-2xl bg-destructive/10 flex items-center justify-center mx-auto">
                            <span className="text-3xl">⚠️</span>
                        </div>
                        <div className="space-y-2">
                            <h1 className="text-2xl font-heading font-bold">Algo deu errado</h1>
                            <p className="text-muted-foreground text-sm">
                                Ocorreu um erro inesperado. Recarregue a página para continuar.
                            </p>
                            {this.state.error && (
                                <details className="mt-2 text-left">
                                    <summary className="text-xs text-muted-foreground cursor-pointer">Detalhes do erro</summary>
                                    <pre className="text-xs bg-muted p-3 rounded-lg mt-2 overflow-auto max-h-40 text-left">
                                        {this.state.error.message}
                                    </pre>
                                </details>
                            )}
                        </div>
                        <button
                            onClick={this.handleReload}
                            className="px-6 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-opacity"
                        >
                            Recarregar Página
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
