import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Users from "./pages/Users";
import Merchants from "./pages/Merchants.tsx";
import MerchantServices from "./pages/MerchantServices.tsx";
import MerchantSubscription from "./pages/MerchantSubscription.tsx";
import AdminDashboard from "./pages/AdminDashboard";
import MerchantDashboard from "./pages/MerchantDashboard";
import MerchantTicketBooking from "./pages/MerchantTicketBooking";
import MerchantManageTickets from "./pages/MerchantManageTickets";
import MerchantPrintTicket from "./pages/MerchantPrintTicket";
import CustomerTicketBooking from "./pages/CustomerTicketBooking";
import ViewSiteMap from "./pages/ViewSiteMap";
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
          <Route path="/merchant-subscriptions" element={<MerchantSubscription />} />
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
          <Route path="/merchant/dashboard" element={<MerchantDashboard />} />
          <Route path="/merchant/book/:serviceId" element={<MerchantTicketBooking />} />
          <Route path="/merchant/manage/:serviceId" element={<MerchantManageTickets />} />
          <Route path="/merchant/print/:ticketId" element={<MerchantPrintTicket />} />
          <Route path="/book" element={<CustomerTicketBooking />} />
          <Route path="/view-site-map" element={<ViewSiteMap />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;