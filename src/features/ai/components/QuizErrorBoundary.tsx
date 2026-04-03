
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface QuizErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

interface QuizErrorBoundaryProps {
  children: React.ReactNode;
  onReset?: () => void;
  fallback?: React.ComponentType<{ error: Error; reset: () => void }>;
}

export class QuizErrorBoundary extends React.Component<QuizErrorBoundaryProps, QuizErrorBoundaryState> {
  constructor(props: QuizErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error: Error): Partial<QuizErrorBoundaryState> {
    return {
      hasError: true,
      error
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Quiz Error Boundary caught an error:', error, errorInfo);
    this.setState({
      error,
      errorInfo
    });
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });
    
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        const FallbackComponent = this.props.fallback;
        return (
          <FallbackComponent 
            error={this.state.error!} 
            reset={this.handleReset}
          />
        );
      }

      return (
        <Card className="max-w-2xl mx-auto">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-destructive rounded-full flex items-center justify-center mb-4">
              <AlertTriangle className="h-6 w-6 text-destructive-foreground" />
            </div>
            <CardTitle>Quiz Error</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                {this.state.error?.message || 'An unexpected error occurred while generating or taking the quiz.'}
              </AlertDescription>
            </Alert>

            <div className="flex gap-2 justify-center">
              <Button onClick={this.handleReset}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </Button>
              <Button variant="outline" onClick={() => window.location.reload()}>
                <Home className="h-4 w-4 mr-2" />
                Reload Page
              </Button>
            </div>

            <details className="text-sm text-muted-foreground">
              <summary className="cursor-pointer mb-2">Technical Details</summary>
              <pre className="whitespace-pre-wrap bg-muted p-2 rounded text-xs overflow-auto">
                {this.state.error?.stack}
              </pre>
            </details>
          </CardContent>
        </Card>
      );
    }

    return this.props.children;
  }
}
