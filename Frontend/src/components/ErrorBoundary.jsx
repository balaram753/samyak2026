import React from 'react';
import { AlertCircle, RefreshCw, Home, ArrowLeft } from 'lucide-react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) {
      this.props.onReset();
    } else {
      window.location.reload();
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[60vh] w-full flex items-center justify-center p-6 text-center select-none">
          <div className="max-w-md w-full p-8 rounded-3xl cyber-card border border-red-500/40 bg-neutral-950/90 shadow-[0_0_35px_rgba(223,37,49,0.2)] space-y-5">
            <div className="w-14 h-14 rounded-2xl bg-red-950/60 border border-red-500/50 flex items-center justify-center text-red-500 mx-auto shadow-inner">
              <AlertCircle className="w-7 h-7 animate-pulse" />
            </div>

            <div>
              <div className="text-[10px] font-mono text-red-400 uppercase tracking-widest mb-1">
                SYSTEM RECOVERY INTERFACE
              </div>
              <h2 className="text-xl sm:text-2xl font-black font-heading text-white tracking-tight">
                An Unexpected Error Occurred
              </h2>
              <p className="mt-2 text-xs text-neutral-400 font-cyber leading-relaxed">
                {this.state.error?.message || 'A runtime error occurred in this view. Your session and data remain safe.'}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={this.handleReset}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:brightness-110 text-white font-heading font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer shadow-md"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Try Again</span>
              </button>

              <a
                href="/"
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-white border border-neutral-700 text-xs font-mono flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <Home className="w-3.5 h-3.5" />
                <span>Return Home</span>
              </a>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
