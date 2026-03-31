import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import LabelGenerator from "@/pages/label-generator";

function Router() {
  return (
    <Switch>
      <Route path="/" component={LabelGenerator} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <div className="print:hidden"><Toaster /></div>
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
