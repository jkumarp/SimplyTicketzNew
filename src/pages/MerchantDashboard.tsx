"use client";

import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Briefcase,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Clock,
  DollarSign,
  Loader2,
  PlusCircle,
  Settings,
  Ticket,
  Users,
  CalendarX,
  Image as ImageIcon,
  IndianRupee,
  Tag,
  ShieldCheck,
  AlertTriangle,
  TrendingUp,
} from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip as ChartTooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

const API_URL = "http://localhost:5000/api";
const COLORS = ["#6366f1", "#3b82f6", "#10b981", "#f59e0b", "#ec4899", "#8b5cf6", "#14b8a6"];

const MerchantDashboard = () => {
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const merchantId = user.merchant_id;
  const [dateFilter, setDateFilter] = useState("month");

  const getAuthHeader = () => ({
    "Authorization": `Bearer ${localStorage.getItem("token")}`,
  });

  // Calculate Date Ranges
  const dateRange = useMemo(() => {
    const end = new Date();
    const start = new Date();
    start.setHours(0, 0, 0, 0);

    if (dateFilter === "today") {
      // Start of today, end of today
    } else if (dateFilter === "5days") {
      start.setDate(start.getDate() - 5);
    } else if (dateFilter === "15days") {
      start.setDate(start.getDate() - 15);
    } else if (dateFilter === "month") {
      start.setMonth(start.getMonth() - 1);
    }

    return {
      startDate: start.toISOString(),
      endDate: end.toISOString(),
    };
  }, [dateFilter]);

  // Fetch Services
  const { data: services, isLoading: isLoadingServices } = useQuery({
    queryKey: ["merchant-services", merchantId],
    queryFn: async () => {
      if (!merchantId) return [];
      const res = await fetch(
        `${API_URL}/merchant-services?merchantId=${merchantId}`,
        {
          headers: getAuthHeader(),
        },
      );
      if (!res.ok) throw new Error("Failed to fetch services");
      return (await res.json()).data;
    },
    enabled: !!merchantId,
  });

  // Fetch all categories for lookup
  const { data: allCategories } = useQuery({
    queryKey: ["all-categories", merchantId],
    queryFn: async () => {
      if (!merchantId) return [];
      const res = await fetch(`${API_URL}/ticket-categories`, {
        headers: getAuthHeader(),
      });
      return (await res.json()).data;
    },
    enabled: !!merchantId,
  });

  // Fetch Subscriptions
  const { data: subscriptions, isLoading: isLoadingSubs } = useQuery({
    queryKey: ["merchant-subscriptions", merchantId],
    queryFn: async () => {
      if (!merchantId) return [];
      const res = await fetch(
        `${API_URL}/merchant-subscriptions?merchantId=${merchantId}`,
        {
          headers: getAuthHeader(),
        },
      );
      if (!res.ok) throw new Error("Failed to fetch subscriptions");
      return (await res.json()).data;
    },
    enabled: !!merchantId,
  });

  // Fetch Ticket Details by Merchant and Date Filter
  const { data: ticketDetails, isLoading: isLoadingTickets } = useQuery({
    queryKey: ["ticket-details-by-merchant", merchantId, dateFilter],
    queryFn: async () => {
      if (!merchantId) return [];
      const res = await fetch(
        `${API_URL}/ticket-details-by-merchantid?merchantId=${merchantId}&startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`,
        { headers: getAuthHeader() }
      );
      if (!res.ok) throw new Error("Failed to fetch ticket details");
      return (await res.json()).data || [];
    },
    enabled: !!merchantId,
  });

  // Fetch Invoice Details by Merchant and Date Filter
  const { data: invoiceDetails, isLoading: isLoadingInvoices } = useQuery({
    queryKey: ["invoice-details-by-merchant", merchantId, dateFilter],
    queryFn: async () => {
      if (!merchantId) return [];
      const res = await fetch(
        `${API_URL}/invoice-details-by-merchantid?merchantId=${merchantId}&startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`,
        { headers: getAuthHeader() }
      );
      if (!res.ok) throw new Error("Failed to fetch invoice details");
      return (await res.json()).data || [];
    },
    enabled: !!merchantId,
  });

  const getServiceSubscription = (serviceId: number) => {
    return subscriptions?.find((s: any) => s.merchant_service_id === serviceId && s.status_sw);
  };

  const isSubscriptionActive = (sub: any) => {
    if (!sub) return false;
    const today = new Date().toISOString().split("T")[0];
    return today >= sub.start_date && today <= sub.end_date;
  };

  // Dynamic Statistics
  const ticketsSold = useMemo(() => {
    return ticketDetails?.reduce(
      (sum: number, det: any) => sum + (det.adult_count || 0) + (det.child_count || 0),
      0
    ) || 0;
  }, [ticketDetails]);

  const totalRevenue = useMemo(() => {
    return invoiceDetails?.reduce(
      (sum: number, det: any) => sum + (parseFloat(det.total_amount) || 0),
      0
    ) || 0;
  }, [invoiceDetails]);

  const attendees = useMemo(() => {
    return ticketDetails?.reduce(
      (sum: number, det: any) =>
        sum + (det.scanned_sw ? ((det.adult_count || 0) + (det.child_count || 0)) : 0),
      0
    ) || 0;
  }, [ticketDetails]);

  // Aggregated Data for Charts
  const ticketsByService = useMemo(() => {
    if (!ticketDetails || !services) return [];
    const map: Record<string, number> = {};
    ticketDetails.forEach((det: any) => {
      const serviceId = det.ticket?.merchant_service_id;
      const serviceName = services.find((s: any) => s.id === serviceId)?.name || `Service #${serviceId}`;
      const count = (det.adult_count || 0) + (det.child_count || 0);
      map[serviceName] = (map[serviceName] || 0) + count;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [ticketDetails, services]);

  const ticketsByCategory = useMemo(() => {
    if (!ticketDetails || !allCategories) return [];
    const map: Record<string, number> = {};
    ticketDetails.forEach((det: any) => {
      const categoryId = det.ticket_category_id;
      const categoryName = allCategories.find((c: any) => c.id === categoryId)?.name || `Category #${categoryId}`;
      const count = (det.adult_count || 0) + (det.child_count || 0);
      map[categoryName] = (map[categoryName] || 0) + count;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [ticketDetails, allCategories]);

  const revenueByService = useMemo(() => {
    if (!invoiceDetails || !services) return [];
    const map: Record<string, number> = {};
    invoiceDetails.forEach((det: any) => {
      const serviceId = det.invoice?.merchant_service_id;
      const serviceName = services.find((s: any) => s.id === serviceId)?.name || `Service #${serviceId}`;
      const amount = parseFloat(det.total_amount) || 0;
      map[serviceName] = (map[serviceName] || 0) + amount;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [invoiceDetails, services]);

  const revenueByCategory = useMemo(() => {
    if (!invoiceDetails || !allCategories) return [];
    const map: Record<string, number> = {};
    invoiceDetails.forEach((det: any) => {
      const categoryId = det.ticket_category_id;
      const categoryName = allCategories.find((c: any) => c.id === categoryId)?.name || `Category #${categoryId}`;
      const amount = parseFloat(det.total_amount) || 0;
      map[categoryName] = (map[categoryName] || 0) + amount;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [invoiceDetails, allCategories]);

  const stats = [
    {
      title: "Active Services",
      value: services?.length || 0,
      icon: Calendar,
      color: "text-indigo-600",
      bg: "bg-indigo-50",
    },
    { 
      title: "Tickets Sold", 
      value: isLoadingTickets ? "..." : ticketsSold, 
      icon: Ticket, 
      color: "text-blue-600",
      bg: "bg-blue-50",
    },
    {
      title: "Total Revenue",
      value: isLoadingInvoices ? "..." : `₹${totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      icon: IndianRupee,
      color: "text-green-600",
      bg: "bg-green-50",
    },
    { 
      title: "Attendees", 
      value: isLoadingTickets ? "..." : attendees, 
      icon: Users, 
      color: "text-purple-600",
      bg: "bg-purple-50",
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar />

      <main className="flex-grow container px-4 md:px-8 py-12">
        <div className="flex flex-col gap-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">
                Merchant Portal
              </h1>
              <p className="text-slate-500">Welcome back, {user.email}</p>
            </div>
            
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Time Range:</span>
                <Select value={dateFilter} onValueChange={setDateFilter}>
                  <SelectTrigger className="w-[180px] bg-white border-slate-200">
                    <SelectValue placeholder="Select Range" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="today">Today</SelectItem>
                    <SelectItem value="5days">Last 5 Days</SelectItem>
                    <SelectItem value="15days">Last 15 Days</SelectItem>
                    <SelectItem value="month">Last One Month</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Link to="/merchant-services">
                <Button className="bg-indigo-600 hover:bg-indigo-700 gap-2 h-11 px-6 rounded-xl shadow-lg shadow-indigo-100">
                  <PlusCircle className="h-5 w-5" /> Manage Services
                </Button>
              </Link>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {stats.map((stat, i) => (
              <Card
                key={i}
                className="border-none shadow-sm overflow-hidden group transition-all duration-300 hover:shadow-md"
              >
                <CardContent className="p-0">
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div
                        className={`${stat.color} ${stat.bg} p-3 rounded-2xl group-hover:scale-110 transition-transform`}
                      >
                        <stat.icon className="h-6 w-6" />
                      </div>
                    </div>
                    <p className="text-sm font-semibold text-slate-500">
                      {stat.title}
                    </p>
                    <h3 className="text-2xl font-black text-slate-900 mt-1">
                      {stat.value}
                    </h3>
                  </div>
                  <div
                    className={`h-1 w-full ${stat.color.replace("text", "bg")}`}
                  />
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Analytics Pie Charts */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Tickets Sold Pie Chart */}
            <Card className="shadow-md border-slate-200">
              <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-2">
                <div>
                  <CardTitle className="text-lg font-bold flex items-center gap-2">
                    <Ticket className="h-5 w-5 text-indigo-500" /> Tickets Sold Breakdown
                  </CardTitle>
                  <CardDescription>Visual analysis of sold passes and admission tokens</CardDescription>
                </div>
              </CardHeader>
              <CardContent className="pt-4">
                <Tabs defaultValue="service" className="w-full">
                  <TabsList className="grid grid-cols-2 h-9 p-1 bg-slate-100 rounded-lg mb-6">
                    <TabsTrigger value="service" className="rounded-md text-xs font-bold">By Service</TabsTrigger>
                    <TabsTrigger value="category" className="rounded-md text-xs font-bold">By Category</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="service" className="outline-none">
                    <div className="h-[280px] w-full flex items-center justify-center">
                      {ticketsByService.length === 0 ? (
                        <div className="text-sm text-slate-400 italic">No tickets sold in this period</div>
                      ) : (
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={ticketsByService}
                              cx="50%"
                              cy="50%"
                              innerRadius={60}
                              outerRadius={90}
                              paddingAngle={4}
                              dataKey="value"
                            >
                              {ticketsByService.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                              ))}
                            </Pie>
                            <ChartTooltip formatter={(value) => `${value} Pass(es)`} />
                            <Legend verticalAlign="bottom" height={36} iconType="circle" />
                          </PieChart>
                        </ResponsiveContainer>
                      )}
                    </div>
                  </TabsContent>

                  <TabsContent value="category" className="outline-none">
                    <div className="h-[280px] w-full flex items-center justify-center">
                      {ticketsByCategory.length === 0 ? (
                        <div className="text-sm text-slate-400 italic">No tickets sold in this period</div>
                      ) : (
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={ticketsByCategory}
                              cx="50%"
                              cy="50%"
                              innerRadius={60}
                              outerRadius={90}
                              paddingAngle={4}
                              dataKey="value"
                            >
                              {ticketsByCategory.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                              ))}
                            </Pie>
                            <ChartTooltip formatter={(value) => `${value} Pass(es)`} />
                            <Legend verticalAlign="bottom" height={36} iconType="circle" />
                          </PieChart>
                        </ResponsiveContainer>
                      )}
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>

            {/* Revenue Pie Chart */}
            <Card className="shadow-md border-slate-200">
              <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-2">
                <div>
                  <CardTitle className="text-lg font-bold flex items-center gap-2">
                    <IndianRupee className="h-5 w-5 text-green-500" /> Revenue Distribution
                  </CardTitle>
                  <CardDescription>Income breakdown generated across business divisions</CardDescription>
                </div>
              </CardHeader>
              <CardContent className="pt-4">
                <Tabs defaultValue="service" className="w-full">
                  <TabsList className="grid grid-cols-2 h-9 p-1 bg-slate-100 rounded-lg mb-6">
                    <TabsTrigger value="service" className="rounded-md text-xs font-bold">By Service</TabsTrigger>
                    <TabsTrigger value="category" className="rounded-md text-xs font-bold">By Category</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="service" className="outline-none">
                    <div className="h-[280px] w-full flex items-center justify-center">
                      {revenueByService.length === 0 ? (
                        <div className="text-sm text-slate-400 italic">No revenue recorded in this period</div>
                      ) : (
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={revenueByService}
                              cx="50%"
                              cy="50%"
                              innerRadius={60}
                              outerRadius={90}
                              paddingAngle={4}
                              dataKey="value"
                            >
                              {revenueByService.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                              ))}
                            </Pie>
                            <ChartTooltip formatter={(value) => `₹${parseFloat(value as string).toFixed(2)}`} />
                            <Legend verticalAlign="bottom" height={36} iconType="circle" />
                          </PieChart>
                        </ResponsiveContainer>
                      )}
                    </div>
                  </TabsContent>

                  <TabsContent value="category" className="outline-none">
                    <div className="h-[280px] w-full flex items-center justify-center">
                      {revenueByCategory.length === 0 ? (
                        <div className="text-sm text-slate-400 italic">No revenue recorded in this period</div>
                      ) : (
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={revenueByCategory}
                              cx="50%"
                              cy="50%"
                              innerRadius={60}
                              outerRadius={90}
                              paddingAngle={4}
                              dataKey="value"
                            >
                              {revenueByCategory.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                              ))}
                            </Pie>
                            <ChartTooltip formatter={(value) => `₹${parseFloat(value as string).toFixed(2)}`} />
                            <Legend verticalAlign="bottom" height={36} iconType="circle" />
                          </PieChart>
                        </ResponsiveContainer>
                      )}
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Active Events List */}
            <Card className="lg:col-span-2 shadow-md border-slate-200">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Your Active Services</CardTitle>
                  <CardDescription>
                    Manage your active services sales and bookings
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                {isLoadingServices || isLoadingSubs
                  ? (
                    <div className="flex justify-center items-center py-16">
                      <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
                    </div>
                  )
                  : services?.length === 0
                  ? (
                    <div className="text-center py-16">
                      <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-slate-100">
                        <Briefcase className="h-10 w-10 text-slate-400" />
                      </div>
                      <h3 className="text-lg font-semibold text-slate-700">
                        No Services Available
                      </h3>
                      <p className="mt-2 text-sm text-slate-500">
                        Create your first service and start accepting bookings.
                      </p>
                    </div>
                  )
                  : (
                    <div className="grid gap-5">
                      {services?.map((service: any) => {
                        const sub = getServiceSubscription(service.id);
                        const isActive = isSubscriptionActive(sub);

                        return (
                          <div
                            key={service.id}
                            className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-indigo-300 hover:shadow-lg"
                          >
                            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                              {/* Left Section */}
                              <div className="flex items-start gap-4">
                                <div className="h-16 w-16 overflow-hidden rounded-2xl border bg-gradient-to-br from-indigo-50 to-indigo-100 shadow-sm">
                                  {service.logo_image_path
                                    ? (
                                      <img
                                        src={service.logo_image_path}
                                        alt={service.name}
                                        className="h-full w-full object-cover"
                                      />
                                    )
                                    : (
                                      <div className="flex h-full w-full items-center justify-center">
                                        <Briefcase className="h-7 w-7 text-indigo-600" />
                                      </div>
                                    )}
                                </div>

                                <div className="space-y-2">
                                  <div>
                                    <h3 className="text-lg font-bold text-slate-900">
                                      {service.name}
                                    </h3>

                                    <div className="mt-1 flex flex-col gap-1">
                                      <div className="flex flex-wrap items-center gap-3 text-sm text-slate-500">
                                        <span className="flex items-center gap-1">
                                          <Clock className="h-4 w-4 text-indigo-500" />
                                          {service.start_time} - {service.end_time}
                                        </span>

                                        <span className={`rounded-full px-3 py-1 text-xs font-medium ${service.status_sw ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                          {service.status_sw ? 'Service Active' : 'Service Inactive'}
                                        </span>
                                      </div>
                                      
                                      {/* Subscription Details */}
                                      <div className="flex items-center gap-2 mt-1">
                                        <ShieldCheck className={`h-4 w-4 ${isActive ? 'text-emerald-500' : 'text-slate-400'}`} />
                                        <p className="text-xs font-medium text-slate-500">
                                          Subscription: {sub ? (
                                            <span className={isActive ? "text-emerald-600" : "text-red-500"}>
                                              {sub.start_date} to {sub.end_date} {isActive ? "" : "(Expired)"}
                                            </span>
                                          ) : (
                                            <span className="text-amber-500">No active plan found</span>
                                          )}
                                        </p>
                                      </div>
                                    </div>
                                  </div>

                                  {service.description && (
                                    <p className="max-w-2xl text-sm text-slate-600 line-clamp-2">
                                      {service.description}
                                    </p>
                                  )}
                                </div>
                              </div>

                              {/* Right Section */}
                              <div className="flex flex-wrap items-center gap-3">
                                {!isActive && (
                                  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 text-amber-700 border border-amber-100 rounded-lg text-[10px] font-bold uppercase animate-pulse">
                                    <AlertTriangle className="h-3 w-3" /> Booking Disabled
                                  </div>
                                )}
                                
                                <Link to={`/merchant/book/${service.id}`} className={!isActive ? "pointer-events-none" : ""}>
                                  <Button
                                    size="sm"
                                    disabled={!isActive}
                                    className="bg-indigo-600 hover:bg-indigo-700 rounded-xl px-5"
                                  >
                                    Book Tickets
                                  </Button>
                                </Link>

                                <Link to={`/merchant/manage/${service.id}`}>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="rounded-xl border-indigo-200 text-indigo-600 hover:bg-indigo-600 hover:text-white"
                                  >
                                    Manage Tickets
                                  </Button>
                                </Link>

                                <Link to={`/merchant/pictures/${service.id}`}>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="rounded-xl text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 gap-1"
                                  >
                                    <ImageIcon className="h-4 w-4" />
                                    Pictures
                                  </Button>
                                </Link>

                                <Link to={`/merchant/holidays/${service.id}`}>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="rounded-xl text-slate-500 hover:text-red-600 hover:bg-red-50 gap-1"
                                  >
                                    <CalendarX className="h-4 w-4" />
                                    Holidays
                                  </Button>
                                </Link>

                                <Link to={`/merchant/vouchers/${service.id}`}>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="rounded-xl text-slate-500 hover:text-amber-600 hover:bg-amber-50 gap-1"
                                  >
                                    <Tag className="h-4 w-4" />
                                    Vouchers
                                  </Button>
                                </Link>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
              </CardContent>
            </Card>

            {/* Account Status */}
            <div className="space-y-6">
              <Card className="shadow-md border-slate-200 bg-indigo-600 text-white">
                <CardHeader>
                  <CardTitle className="text-lg">Account Status</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="h-5 w-5 text-indigo-200" />
                    <span className="text-sm font-medium">KYC Verified</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="h-5 w-5 text-indigo-200" />
                    <span className="text-sm font-medium">
                      Agreement Signed
                    </span>
                  </div>
                  <div className="pt-4 border-t border-indigo-500">
                    <Link to="/merchants">
                      <Button
                        variant="secondary"
                        className="w-full bg-white text-indigo-600 hover:bg-indigo-50"
                      >
                        <Settings className="h-4 w-4 mr-2" /> Merchant Settings
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-md border-slate-200">
                <CardHeader>
                  <CardTitle className="text-sm font-bold">
                    Payout Summary
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-500">Next Payout</span>
                    <span className="font-bold">Oct 15, 2024</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-500">
                      Pending Amount
                    </span>
                    <span className="font-bold text-indigo-600">₹0.00</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default MerchantDashboard;