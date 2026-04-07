import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import IntelMap from "./pages/IntelMap";
import { SiteProvider } from "./contexts/SiteContext";

function Router() {
  return (
    <Switch>
      <Route path="/" component={IntelMap} />
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <SiteProvider>
          <TooltipProvider>
            <Toaster
              position="top-center"
              toastOptions={{
                style: {
                  background: 'oklch(0.14 0.015 260 / 95%)',
                  border: '1px solid oklch(1 0 0 / 10%)',
                  color: 'oklch(0.82 0.17 80)',
                  fontFamily: "'Inter', sans-serif",
                  backdropFilter: 'blur(20px)',
                },
              }}
            />
            <Router />
          </TooltipProvider>
        </SiteProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
