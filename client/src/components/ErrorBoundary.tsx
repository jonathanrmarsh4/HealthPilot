import { Component, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { AlertTriangle } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: string | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null
    };
  }

  componentDidCatch(error: Error, errorInfo: { componentStack?: string; [key: string]: unknown }) {
    console.error('ErrorBoundary caught error:', error, errorInfo);
    this.setState({
      error,
      errorInfo: errorInfo?.componentStack || JSON.stringify(errorInfo)
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen w-full flex items-center justify-center p-4 bg-background">
          <Card className="w-full max-w-2xl">
            <CardHeader>
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-6 w-6 text-destructive" />
                <CardTitle>Something Went Wrong</CardTitle>
              </div>
              <CardDescription>
                The application encountered an error. Details below:
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">Error Message:</h3>
                <pre className="bg-muted p-3 rounded text-sm overflow-auto">
                  {this.state.error?.toString() || 'Unknown error'}
                </pre>
              </div>
              {this.state.errorInfo && (
                <div>
                  <h3 className="font-semibold mb-2">Component Stack:</h3>
                  <pre className="bg-muted p-3 rounded text-xs overflow-auto max-h-64">
                    {this.state.errorInfo}
                  </pre>
                </div>
              )}
              {this.state.error?.stack && (
                <div>
                  <h3 className="font-semibold mb-2">Stack Trace:</h3>
                  <pre className="bg-muted p-3 rounded text-xs overflow-auto max-h-64">
                    {this.state.error.stack}
                  </pre>
                </div>
              )}
            </CardContent>
            <CardFooter className="gap-2">
              <Button 
                onClick={() => window.location.reload()}
                data-testid="button-reload"
              >
                Reload Page
              </Button>
              <Button 
                variant="outline"
                onClick={() => {
                  localStorage.clear();
                  window.location.reload();
                }}
                data-testid="button-clear-cache"
              >
                Clear Cache & Reload
              </Button>
            </CardFooter>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}
