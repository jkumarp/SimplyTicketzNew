"use client";

import React, { useState, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import { API_URL } from "@/config";
import { showError, showSuccess } from "@/utils/toast";

// Core Layout & Custom Components
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SiteMapDialog from "@/components/SiteMapDialog";
import { ModalPictureShow } from "@/components/ModelPictureShow";

// UI Kit Components
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

// Icons
import {
  ArrowLeft,
  CalendarDays as CalendarIcon,
  Check,
  Clock,
  Image as ImageIcon,
  Loader2,
  MapPin,
  Minus,
  Percent,
  Plus,
  Receipt,
  ShieldAlert,
  Tag,
  Ticket,
  X,
  AlertTriangle,
  WalletCards,
} from "lucide-react";

// --- Interfaces & Types ---
interface Service {
  id: number;
  merchant_id: number;
  name: string;
  addressline1?: string;
  addressline2?: string;
  state: string | number;
  pincode?: string;
  sgst?: string;
  cgst?: string;
  igst?: string;
  location_coordinates?: string;
}

interface Category {
  id: number;
  name: string;
  adult_price: string;
  child_price?: string;
  special_instruction?: string;
  age_restriction_sw: boolean;
  child_age_limit?: number;
  free_age_limit?: number;
}

interface Timeslot {
  id: number;
  ticket_category_id: number;
  name: string;
  start: string;
}

interface Subscription {
  merchant_service_id: number;
  status_sw: boolean;
  start_date: string;
  end_date: string;
}

interface CategoryBooking {
  adult: number;
  child: number;
  bookingDate: string;
  timeslotId: string;
}

interface BookingState {
  counts: Record<string, CategoryBooking>;
}

// --- Local Sub-Component ---
interface QuantitySelectorProps {
  label: string;
  value: number;
  onDecrease: () => void;
  onIncrease: () => void;
}

const QuantitySelector = ({ label, value, onDecrease, onIncrease }: QuantitySelectorProps) => (
  <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm">
    <span className="text-xs font-bold text-slate-700">{label}</span>
    <div className="flex items-center gap-3">
      <Button
        variant="outline"
        size="icon"
        className="h-8 w-8 rounded-full border-slate-200 hover:bg-slate-50 hover:text-slate-900 transition-colors"
        disabled={value === 0}
        onClick={onDecrease}
      >
        <Minus className="h-3 w-3" />
      </Button>
      <span className="w-5 text-center font-extrabold text-sm text-slate-900">{value}</span>
      <Button
        size="icon"
        className="h-8 w-8 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white shadow-md hover:shadow-indigo-200 transition-all"
        onClick={onIncrease}
      >
        <Plus className="h-3 w-3" />
      </Button>
    </div>
  </div>
);

// --- Main Component ---
const MerchantTicketBooking = () => {
  const { serviceId } = useParams<{ serviceId: string }>();
  const navigate = useNavigate();

  // State Management
  const [currentCategory, setCurrentCategory] = useState<{ serviceId: number; categoryId: number } | null>(null);
  const [bookingState, setBookingState] = useState<BookingState>({ counts: {} });
  const [paymentMode, setPaymentMode] = useState("CASH");
  const [voucherCode, setVoucherCode] = useState("");
  const [discountPercentage, setDiscountPercentage] = useState(0);
  const [isValidatingVoucher, setIsValidatingVoucher] = useState(false);
  const [appliedVoucher, setAppliedVoucher] = useState<string | null>(null);

  const getAuthHeader = () => ({
    Authorization: `Bearer ${localStorage.getItem("token")}`,
  });

  // --- API Queries ---
  const { data: service, isLoading: isLoadingService } = useQuery<Service | undefined>({
    queryKey: ["merchant-service", serviceId],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/merchant-services`, { headers: getAuthHeader() });
      const data = await res.json();
      return data.data.find((s: any) => s.id.toString() === serviceId);
    },
    enabled: !!serviceId,
  });

  const { data: subscriptions, isLoading: isLoadingSubs } = useQuery<Subscription[]>({
    queryKey: ["merchant-subscriptions", serviceId],
    queryFn: async () => {
      if (!serviceId) return [];
      const res = await fetch(`${API_URL}/merchant-active-subscriptions?serviceId=${serviceId}`, {
        headers: getAuthHeader(),
      });
      if (!res.ok) throw new Error("Failed to fetch subscriptions");
      return (await res.json()).data;
    },
    enabled: !!serviceId,
  });

  const { data: calendarData } = useQuery<string[]>({
    queryKey: ["service-calendar", serviceId],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/merchant-services/booking-calendar?serviceId=${serviceId}`, {
        headers: getAuthHeader(),
      });
      if (!res.ok) throw new Error("Failed to fetch calendar data");
      return (await res.json()).data;
    },
    enabled: !!serviceId,
  });

  const { data: categories, isLoading: isLoadingCategories } = useQuery<Category[]>({
    queryKey: ["ticket-categories", serviceId],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/ticket-categories?merchantServiceId=${serviceId}`, {
        headers: getAuthHeader(),
      });
      return (await res.json()).data;
    },
    enabled: !!serviceId,
  });

  const { data: timeslots } = useQuery<Timeslot[]>({
    queryKey: ["ticket-timeslots", service?.merchant_id],
    queryFn: async () => {
      if (!service) return [];
      const res = await fetch(`${API_URL}/ticket-timeslots-by-service?serviceId=${service.id}`, {
        headers: getAuthHeader(),
      });
      return (await res.json()).data;
    },
    enabled: !!service?.merchant_id,
  });

  // --- Core Utility Calculations ---
  const updateCategoryData = (categoryId: string, updates: Partial<CategoryBooking>) => {
    setBookingState((prev) => {
      const current = prev.counts[categoryId] || {
        adult: 0,
        child: 0,
        bookingDate: "",
        timeslotId: "",
      };
      return {
        ...prev,
        counts: {
          ...prev.counts,
          [categoryId]: { ...current, ...updates },
        },
      };
    });
  };

  const totals = useMemo(() => {
    let subtotal = 0;
    let count = 0;

    if (!categories) {
      return {
        subtotal: 0,
        total: 0,
        count: 0,
        gstAmount: 0,
        sgstAmount: 0,
        cgstAmount: 0,
        igstAmount: 0,
        sgstPct: 0,
        cgstPct: 0,
        igstPct: 0,
        discountAmount: 0,
      };
    }

    Object.entries(bookingState.counts).forEach(([catId, data]) => {
      const category = categories.find((c) => c.id.toString() === catId);
      if (category) {
        subtotal += data.adult * parseFloat(category.adult_price);
        subtotal += data.child * (parseFloat(category.child_price || "0"));
        count += data.adult + data.child;
      }
    });

    const discountAmount = (subtotal * discountPercentage) / 100;
    const discountedSubtotal = Math.max(0, subtotal - discountAmount);

    const sgstPct = service?.sgst ? parseFloat(service.sgst) : 0;
    const cgstPct = service?.cgst ? parseFloat(service.cgst) : 0;
    const igstPct = service?.igst ? parseFloat(service.igst) : 0;

    const isHomeState = service?.state === 1 || service?.state === "1";

    const sgstAmount = isHomeState ? (discountedSubtotal * sgstPct) / 100 : 0;
    const cgstAmount = isHomeState ? (discountedSubtotal * cgstPct) / 100 : 0;
    const igstAmount = !isHomeState ? (discountedSubtotal * igstPct) / 100 : 0;
    const gstAmount = sgstAmount + cgstAmount + igstAmount;
    const total = discountedSubtotal + gstAmount;

    return {
      subtotal,
      total,
      count,
      gstAmount,
      sgstAmount,
      cgstAmount,
      igstAmount,
      sgstPct,
      cgstPct,
      igstPct,
      discountAmount,
    };
  }, [bookingState.counts, categories, discountPercentage, service]);

  const isActiveSubscription = useMemo(() => {
    if (!subscriptions || !serviceId) return false;
    const activeSub = subscriptions.find((s) => s.merchant_service_id === parseInt(serviceId) && s.status_sw);
    if (!activeSub) return false;

    const today = new Date().toISOString().split("T")[0];
    return today >= activeSub.start_date && today <= activeSub.end_date;
  }, [subscriptions, serviceId]);

  const isDateDisabled = (date: Date) => {
    if (!calendarData) return true;
    const dateStr = format(date, "yyyy-MM-dd");
    return !calendarData.includes(dateStr);
  };

  // --- Handlers & Mutations ---
  const handleValidateVoucher = async () => {
    if (!voucherCode.trim() || !service) return showError("Please enter a voucher code");
    
    setIsValidatingVoucher(true);
    try {
      const sanitizedCode = encodeURIComponent(voucherCode.trim().toUpperCase());
      const res = await fetch(
        `${API_URL}/validate-merchant-service-voucher?merchantId=${service.merchant_id}&serviceId=${serviceId}&voucherCode=${sanitizedCode}`,
        { headers: getAuthHeader() }
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Voucher validation failed");

      setDiscountPercentage(parseFloat(json.data));
      setAppliedVoucher(voucherCode.trim().toUpperCase());
      showSuccess(`Promo Code successfully applied: ${json.data}% discount!`);
    } catch (err: any) {
      setDiscountPercentage(0);
      setAppliedVoucher(null);
      showError(err.message || "Invalid Voucher Code");
    } finally {
      setIsValidatingVoucher(false);
    }
  };

  const bookingMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await fetch(`${API_URL}/tickets/book`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeader() },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Booking failed");
      return res.json();
    },
    onSuccess: (data) => {
      showSuccess("Booking confirmed successfully!");
      navigate(`/merchant/print/${data.invoiceId}`);
    },
    onError: (err: any) => showError(err.message),
  });

  const handleBuyTickets = () => {
    if (totals.count === 0) return showError("Please select at least one ticket");
    if (!service) return;

    try {
      const selectedCategories = Object.entries(bookingState.counts)
        .filter(([_, data]) => data.adult > 0 || data.child > 0)
        .map(([catId, data]) => {
          if (!data.bookingDate) throw new Error("Please select a visit date for all selected categories");
          if (!data.timeslotId) throw new Error("Please select a timeslot for all selected categories");

          return {
            ticket_category_id: parseInt(catId),
            adult_count: data.adult,
            child_count: data.child,
            booking_date: data.bookingDate,
            ticket_timeslot_id: parseInt(data.timeslotId),
          };
        });

      bookingMutation.mutate({
        customer_name: "Walk-in Guest",
        customer_phone: "",
        customer_phone_code: 91,
        email: "",
        payment_mode: paymentMode,
        merchant_id: service.merchant_id,
        merchant_service_id: parseInt(serviceId!),
        categories: selectedCategories,
        update_by: 1,
        voucher_code: appliedVoucher,
        total_amount: totals.subtotal,
        discount_percentage: discountPercentage,
        discount_value: totals.discountAmount,
        sgst: totals.sgstAmount,
        cgst: totals.cgstAmount,
        igst: totals.igstAmount,
        grand_total: totals.total,
      });
    } catch (err: any) {
      showError(err.message);
    }
  };

  if (isLoadingService || isLoadingCategories) {
    return (
      <div className="min-h-screen bg-slate-50/50 flex flex-col">
        <Navbar />
        <div className="flex-grow flex items-center justify-center">
          <div className="text-center space-y-3">
            <Loader2 className="h-10 w-10 animate-spin text-indigo-600 mx-auto" />
            <p className="text-sm font-medium text-slate-500">Loading workspace configurations...</p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100/70 flex flex-col font-sans antialiased">
      <Navbar />

      <main className="flex-grow container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        
        {/* --- Header Section --- */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 pb-6 border-b border-slate-200">
          <div className="flex items-start gap-4">
            <Button
              variant="outline"
              size="icon"
              onClick={() => navigate(-1)}
              className="rounded-xl bg-white shadow-sm hover:bg-slate-50 border-slate-200 shrink-0 transition-all"
            >
              <ArrowLeft className="h-4 w-4 text-slate-600" />
            </Button>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight bg-gradient-to-r from-slate-900 to-indigo-950 bg-clip-text text-transparent">{service?.name}</h1>
              <div className="flex items-center gap-1.5 text-sm font-medium text-slate-500 mt-1.5">
                <MapPin className="h-4 w-4 text-indigo-500 shrink-0" />
                <span>
                  {[service?.addressline1, service?.addressline2, service?.state].filter(Boolean).join(", ")}
                  {service?.pincode ? ` - ${service.pincode}` : ""}
                </span>
              </div>
            </div>
          </div>

          <SiteMapDialog
            coordinates={service?.location_coordinates}
            trigger={
              <Button variant="outline" className="bg-white border-slate-200 text-slate-700 font-bold shadow-sm gap-2 hover:bg-indigo-50/40 hover:text-indigo-600 transition-all">
                <MapPin className="h-4 w-4 text-indigo-500" /> View Site Map
              </Button>
            }
          />
        </div>

        {/* --- Subscriptions Guard Alert --- */}
        {!isActiveSubscription && !isLoadingSubs && (
          <Alert variant="destructive" className="mb-8 border-red-200 bg-red-50/80 shadow-sm animate-in fade-in slide-in-from-top-2">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            <AlertTitle className="font-bold text-red-900">Subscription Expired</AlertTitle>
            <AlertDescription className="text-red-700 font-medium">
              Your service subscription is either expired or not yet active. Booking is currently disabled. Please contact administration to renew your plan.
            </AlertDescription>
          </Alert>
        )}

        {/* --- Workspace Grid Layout --- */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          
          {/* Left Side: Ticket Cards Registry */}
          <div className={cn("lg:col-span-2 space-y-5", !isActiveSubscription && "opacity-60 pointer-events-none")}>
            <h3 className="font-black text-slate-900 text-xl flex items-center gap-2.5 px-1 tracking-tight">
              <Ticket className="h-5 w-5 text-indigo-600" /> Select Activities & Passes
            </h3>

            {categories?.map((category) => {
              const data = bookingState.counts[category.id] || { adult: 0, child: 0, bookingDate: "", timeslotId: "" };
              const selectedDate = data.bookingDate ? parseISO(data.bookingDate) : undefined;

                return (
                  <Card key={category.id} className="overflow-hidden border border-slate-200/80 bg-white shadow-sm hover:shadow-md transition-all duration-300 rounded-2xl">
                    <div className="flex flex-col lg:flex-row">
                      
                      {/* Form Details Pane */}
                      <div className="flex-1 p-6 sm:p-7 space-y-6">
                        <div className="flex flex-wrap items-start justify-between gap-4">
                          <div>
                            <h4 className="text-xl font-bold text-slate-900 tracking-tight">{category.name}</h4>
                            <p className="text-sm text-slate-500 mt-1.5 max-w-xl leading-relaxed">
                              {category.special_instruction || "Standard admissions terms and conditions apply."}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold px-2.5 py-1 rounded-lg">
                              Active Slots
                            </Badge>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setCurrentCategory({ serviceId: parseInt(serviceId!), categoryId: category.id })}
                              className="text-slate-600 hover:text-indigo-600 hover:bg-indigo-50/60 gap-1.5 h-8 font-bold rounded-lg transition-colors"
                            >
                              <ImageIcon className="h-4 w-4 text-indigo-500" /> Gallery
                            </Button>
                          </div>
                        </div>

                        {/* Fares Matrix Grid */}
                        <div className={cn("grid gap-4", category.age_restriction_sw ? "grid-cols-2" : "grid-cols-1")}>
                          <div className="rounded-2xl bg-gradient-to-br from-slate-50 to-slate-100/50 p-4 border border-slate-100 shadow-inner">
                            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block mb-0.5">Adult Fare</span>
                            <span className="text-2xl font-black text-slate-900">₹{parseFloat(category.adult_price).toFixed(2)}</span>
                          </div>
                          {category.age_restriction_sw && (
                            <div className="rounded-2xl bg-gradient-to-br from-slate-50 to-slate-100/50 p-4 border border-slate-100 shadow-inner animate-in fade-in slide-in-from-top-1 duration-200">
                              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block mb-0.5">Child Fare</span>
                              <span className="text-2xl font-black text-slate-900">
                                ₹{parseFloat(category.child_price || "0.00").toFixed(2)}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Conditional Age Directives Banner */}
                        {category.age_restriction_sw && (category.child_age_limit || category.free_age_limit) && (
                          <div className="text-xs text-indigo-800 bg-indigo-50/60 rounded-2xl p-4 border border-indigo-100 flex flex-col gap-2 shadow-sm animate-in fade-in duration-200">
                            <span className="font-extrabold flex items-center gap-1.5 text-indigo-900">
                              <ShieldAlert className="h-4 w-4 text-indigo-600 shrink-0" /> Age Admission Rules:
                            </span>
                            <div className="space-y-1 font-medium text-indigo-950/80">
                              {category.child_age_limit && (
                                <p>• Child tickets are eligible for children up to <strong className="font-bold text-indigo-900">{category.child_age_limit}</strong> years of age.</p>
                              )}
                              {category.free_age_limit && (
                                <p>• Free entry is permitted for toddlers/infants under <strong className="font-bold text-indigo-900">{category.free_age_limit}</strong> years of age.</p>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Calendar & Scheduling Directives */}
                        <div className="grid grid-cols-2 gap-4 mt-6 pt-6 border-t border-slate-100">
                          <div className="space-y-2">
                            <Label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                              <CalendarIcon className="h-3 w-3 text-indigo-500" /> Visit Date
                            </Label>
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button
                                  variant="outline"
                                  className={cn(
                                    "w-full h-10.5 text-xs font-semibold justify-start rounded-xl border-slate-200 focus:ring-2 focus:ring-indigo-500 bg-white hover:bg-slate-50 transition-all shadow-sm",
                                    !data.bookingDate && "text-slate-400"
                                  )}
                                >
                                  <CalendarIcon className="mr-2 h-4 w-4 text-slate-400" />
                                  {data.bookingDate ? format(parseISO(data.bookingDate), "PPP") : <span>Pick a date</span>}
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0 rounded-2xl shadow-xl border-slate-200" align="start">
                                <Calendar
                                  mode="single"
                                  selected={selectedDate}
                                  onSelect={(date) => date && updateCategoryData(category.id.toString(), { bookingDate: format(date, "yyyy-MM-dd") })}
                                  disabled={isDateDisabled}
                                  initialFocus
                                />
                              </PopoverContent>
                            </Popover>
                          </div>
                          
                          <div className="space-y-2">
                            <Label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                              <Clock className="h-3 w-3 text-indigo-500" /> Timeslot
                            </Label>
                            <Select value={data.timeslotId} onValueChange={(v) => updateCategoryData(category.id.toString(), { timeslotId: v })}>
                              <SelectTrigger className="h-10.5 text-xs rounded-xl border-slate-200 font-semibold shadow-sm focus:ring-2 focus:ring-indigo-500">
                                <SelectValue placeholder="Select Slot" />
                              </SelectTrigger>
                              <SelectContent className="rounded-xl">
                                {timeslots
                                  ?.filter((ts) => ts.ticket_category_id === category.id)
                                  .map((ts) => (
                                    <SelectItem key={ts.id} value={ts.id.toString()} className="text-xs font-medium">
                                      {ts.name} ({ts.start})
                                    </SelectItem>
                                  ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </div>

                      {/* Counter Actions Sidebar */}
                      <div className="lg:w-[250px] border-t lg:border-l lg:border-t-0 bg-slate-50/60 p-6 flex flex-col justify-center gap-4 border-slate-100">
                        <QuantitySelector
                          label="Adult"
                          value={data.adult}
                          onDecrease={() => updateCategoryData(category.id.toString(), { adult: Math.max(0, data.adult - 1) })}
                          onIncrease={() => updateCategoryData(category.id.toString(), { adult: data.adult + 1 })}
                        />

                        {category.age_restriction_sw && (
                          <QuantitySelector
                            label="Child"
                            value={data.child}
                            onDecrease={() => updateCategoryData(category.id.toString(), { child: Math.max(0, data.child - 1) })}
                            onIncrease={() => updateCategoryData(category.id.toString(), { child: data.child + 1 })}
                          />
                        )}
                      </div>

                    </div>
                  </Card>
                );
            })}
          </div>

          {/* Right Side Sticky Actions Sidebar Container */}
          <div className={cn("space-y-6 lg:sticky lg:top-6", !isActiveSubscription && "opacity-60 pointer-events-none")}>
            
            {/* Rearranged: Transaction Settings Placement */}
            <Card className="shadow-md border-slate-200 bg-white overflow-hidden rounded-2xl">
              <CardHeader className="bg-gradient-to-r from-slate-800 to-slate-900 border-b border-slate-800 py-4 text-white">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <WalletCards className="h-4 w-4 text-indigo-400" /> Transaction Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-5 pb-6">
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Payment Method</Label>
                  <Select value={paymentMode} onValueChange={setPaymentMode}>
                    <SelectTrigger className="rounded-xl h-10.5 border-slate-200 focus:ring-2 focus:ring-indigo-500 font-semibold text-slate-800 shadow-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="CASH" className="font-medium">Cash Payment</SelectItem>
                      <SelectItem value="UPI" className="font-medium">UPI Transfer</SelectItem>
                      <SelectItem value="CARD" className="font-medium">Credit/Debit Card</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Booking Summary Metrics Overview Container */}
            <Card className="shadow-lg border-slate-200 bg-white overflow-hidden rounded-2xl">
              <CardHeader className="bg-gradient-to-r from-indigo-900 to-indigo-950 text-white py-4.5">
                <CardTitle className="text-base font-extrabold flex items-center gap-2 tracking-tight">
                  <Receipt className="h-4.5 w-4.5 text-indigo-400" /> Booking Overview
                </CardTitle>
              </CardHeader>

              <CardContent className="pt-6 space-y-5">
                {totals.count === 0 ? (
                  <div className="text-center py-12 px-4">
                    <div className="h-12 w-12 bg-slate-50 text-slate-400 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-slate-100 shadow-inner">
                      <Ticket className="h-6 w-6 text-slate-400" />
                    </div>
                    <p className="text-sm font-semibold text-slate-400 italic">No activities chosen yet</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {Object.entries(bookingState.counts).map(([catId, data]) => {
                      if (data.adult === 0 && data.child === 0) return null;
                      const cat = categories?.find((c) => c.id.toString() === catId);
                      const ts = timeslots?.find((t) => t.id.toString() === data.timeslotId);
                      if (!cat) return null;

                      const lineTotal =
                        data.adult * parseFloat(cat.adult_price) +
                        data.child * parseFloat(cat.child_price || "0");

                      return (
                        <div key={catId} className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-100 space-y-2 shadow-sm">
                          <div className="flex justify-between items-start gap-2 text-sm">
                            <span className="font-bold text-slate-800 line-clamp-1">{cat.name}</span>
                            <span className="font-extrabold text-slate-900 shrink-0">₹{lineTotal.toFixed(2)}</span>
                          </div>
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-bold text-slate-500">
                            <span className="flex items-center gap-1">
                              <CalendarIcon className="h-3 w-3 text-indigo-500" />
                              {data.bookingDate || "Date Pending"}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3 text-indigo-500" />
                              {ts?.name || "Window Pending"}
                            </span>
                          </div>
                          <div className="text-[11px] font-extrabold text-indigo-600 tracking-wide bg-indigo-50/50 rounded-md px-2 py-0.5 inline-block border border-indigo-100/40">
                            {data.adult > 0 && `${data.adult} Adult${data.adult > 1 ? "s" : ""}`}
                            {data.adult > 0 && data.child > 0 && " • "}
                            {data.child > 0 && `${data.child} Child${data.child > 1 ? "ren" : ""}`}
                          </div>
                        </div>
                      );
                    })}

                    <Separator className="my-2 bg-slate-100" />

                    {/* Volume Metric Details */}
                    <div className="flex justify-between items-center text-sm font-bold text-slate-500 px-1">
                      <span>Total Volume</span>
                      <span className="font-extrabold text-slate-800">{totals.count} Ticket{totals.count > 1 ? "s" : ""}</span>
                    </div>

                    <div className="flex justify-between items-center text-sm font-bold text-slate-500 px-1">
                      <span>Subtotal</span>
                      <span className="font-extrabold text-slate-800">₹{totals.subtotal.toFixed(2)}</span>
                    </div>

                    {/* Voucher Application Actions */}
                    <div className="pt-2 pb-1 space-y-2 border-t border-slate-100">
                      <Label className="text-xs font-bold text-slate-600 flex items-center gap-1 uppercase tracking-wider">
                        <Tag className="h-3.5 w-3.5 text-indigo-500" /> Voucher Code
                      </Label>
                      <div className="flex gap-2">
                        <Input
                          placeholder="e.g. FESTIVE10"
                          className="h-10 uppercase rounded-xl border-slate-200 font-semibold text-xs focus-visible:ring-indigo-500 shadow-sm"
                          value={voucherCode}
                          onChange={(e) => setVoucherCode(e.target.value.toUpperCase())}
                          disabled={appliedVoucher !== null}
                        />
                        {appliedVoucher ? (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-10 text-xs rounded-xl text-red-500 hover:text-red-600 border-red-200 transition-colors"
                            onClick={() => {
                              setDiscountPercentage(0);
                              setAppliedVoucher(null);
                              setVoucherCode("");
                            }}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-10 text-xs rounded-xl border-indigo-200 text-indigo-600 hover:bg-indigo-50 font-bold px-4 shadow-sm transition-all"
                            onClick={handleValidateVoucher}
                            disabled={isValidatingVoucher}
                          >
                            {isValidatingVoucher ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Apply"}
                          </Button>
                        )}
                      </div>
                      {appliedVoucher && (
                        <div className="text-[11px] font-bold text-emerald-700 bg-emerald-50/80 px-2.5 py-1.5 rounded-xl border border-emerald-100 flex items-center gap-1 animate-in fade-in duration-200 shadow-sm">
                          <Check className="h-3.5 w-3.5 text-emerald-600" /> Code {appliedVoucher} applied ({discountPercentage}% off)
                        </div>
                      )}
                    </div>

                    {/* Deductions Displays */}
                    {totals.discountAmount > 0 && (
                      <div className="flex justify-between items-center text-sm font-bold text-emerald-600 px-1 bg-emerald-50/40 border border-emerald-100/50 p-2 rounded-xl animate-in fade-in duration-200 shadow-sm">
                        <span>Promo Discount</span>
                        <span className="font-extrabold">-₹{totals.discountAmount.toFixed(2)}</span>
                      </div>
                    )}

                    {/* Custom Tax Matrix Displays */}
                    {totals.gstAmount > 0 && (
                      <div className="bg-indigo-50/40 rounded-2xl p-4 border border-indigo-100/50 space-y-2 text-xs text-indigo-900 font-medium shadow-inner animate-in fade-in duration-200">
                        <p className="font-bold flex items-center gap-1 text-indigo-950">
                          <Percent className="h-3.5 w-3.5 text-indigo-600" /> GST Taxes breakdown:
                        </p>
                        {totals.sgstAmount > 0 && (
                          <div className="flex justify-between">
                            <span>SGST ({totals.sgstPct}%)</span>
                            <span className="font-bold text-slate-800">₹{totals.sgstAmount.toFixed(2)}</span>
                          </div>
                        )}
                        {totals.cgstAmount > 0 && (
                          <div className="flex justify-between">
                            <span>CGST ({totals.cgstPct}%)</span>
                            <span className="font-bold text-slate-800">₹{totals.cgstAmount.toFixed(2)}</span>
                          </div>
                        )}
                        {totals.igstAmount > 0 && (
                          <div className="flex justify-between">
                            <span>IGST ({totals.igstPct}%)</span>
                            <span className="font-bold text-slate-800">₹{totals.igstAmount.toFixed(2)}</span>
                          </div>
                        )}
                        <div className="flex justify-between pt-2 border-t border-indigo-100 font-extrabold text-indigo-950 text-xs">
                          <span>Total GST</span>
                          <span>₹{totals.gstAmount.toFixed(2)}</span>
                        </div>
                      </div>
                    )}

                    <div className="flex justify-between items-center px-1 pt-2 border-t border-slate-100">
                      <span className="text-sm font-black text-slate-800 uppercase tracking-wide">Gross Total</span>
                      <span className="text-3xl font-black text-indigo-600 tracking-tight drop-shadow-sm">₹{totals.total.toFixed(2)}</span>
                    </div>
                  </div>
                )}
              </CardContent>

              <CardFooter className="p-4 bg-slate-50 border-t border-slate-100">
                <Button
                  onClick={handleBuyTickets}
                  className="w-full bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white h-14 text-sm font-black rounded-xl shadow-md hover:shadow-indigo-200 transition-all transform hover:-translate-y-0.5 active:translate-y-0 tracking-wide"
                  disabled={!isActiveSubscription || totals.count === 0 || bookingMutation.isPending}
                >
                  {bookingMutation.isPending ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="animate-spin h-4 w-4" /> Processing Order...
                    </div>
                  ) : (
                    "Generate & Print Tickets"
                  )}
                </Button>
              </CardFooter>
            </Card>
          </div>

        </div>
      </main>

      <Footer />

      {/* --- Image Gallery Modal Canvas --- */}
      {currentCategory && (
        <ModalPictureShow
          serviceId={currentCategory.serviceId}
          categoryId={currentCategory.categoryId}
          onClose={() => setCurrentCategory(null)}
        />
      )}
    </div>
  );
};

export default MerchantTicketBooking;