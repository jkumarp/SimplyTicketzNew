import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Users from "./pages/Users";
import Merchants from "./pages/Merchants.tsx";
import MerchantServices from "./pages/MerchantServices.tsx";
import MerchantTicketTimeslots from "./pages/MerchantTicketTimeslots.tsx";
import AdminDashboard from "./pages/AdminDashboard";
import MerchantDashboard from "./pages/MerchantDashboard";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/users" element={<Users />} />
          <Route path="/merchants" element={<Merchants />} />
          <Route path="/merchant-services" element={<MerchantServices />} />
          <Route path="/merchant-timeslots" element={<MerchantTicketTimeslots />} />
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
          <Route path="/merchant/dashboard" element={<MerchantDashboard />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;