"use client";

import React, { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SiteMapDialog from "@/components/SiteMapDialog";
import { API_URL } from "@/config";
import { ModalPictureShow } from "@/components/ModelPictureShow";

import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { showError, showSuccess } from "@/utils/toast";
import {
  ArrowLeft,
  CalendarDays as CalendarIcon,
  Clock,
  Image as ImageIcon,
  Loader2,
  MapPin,
  Minus,
  Plus,
  Receipt,
  Ticket,
  User,
  ShieldAlert,
  Percent,
  Tag,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface CategoryBooking {
  adult: number;
  child: number;
  bookingDate: string;
  timeslotId: string;
}

interface BookingState {
  counts: {
    [categoryId: string]: CategoryBooking;
  };
}

const MerchantTicketBooking = () => {
  const { serviceId } = useParams();
  const navigate = useNavigate();

  const [currentCategory, setCurrentCategory] = useState<
    { serviceId: number; categoryId: number } | null
  >(null);
  const [bookingState, setBookingState] = useState<BookingState>({
    counts: {},
  });
  const [customerInfo, setCustomerInfo] = useState({
    name: "",
    phone: "",
    email: "",
    payment_mode: "CASH",
  });

  const [voucherCode, setVoucherCode] = useState("");
  const [discountPercentage, setDiscountPercentage] = useState(0);
  const [isValidatingVoucher, setIsValidatingVoucher] = useState(false);
  const [appliedVoucher, setAppliedVoucher] = useState<string | null>(null);

  const getAuthHeader = () => ({
    "Authorization": `Bearer ${localStorage.getItem("token")}`,
  });

  // Queries
  const { data: service, isLoading: isLoadingService } = useQuery({
    queryKey: ["merchant-service", serviceId],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/merchant-services`, {
        headers: getAuthHeader(),
      });
      const data = await res.json();
      return data.data.find((s: any) => s.id.toString() === serviceId);
    },
    enabled: !!serviceId,
  });

  const { data: calendarData } = useQuery({
    queryKey: ["service-calendar", serviceId],
    queryFn: async () => {
      const res = await fetch(
        `${API_URL}/merchant-services/booking-calendar?serviceId=${serviceId}`,
        {
          headers: getAuthHeader(),
        },
      );
      if (!res.ok) throw new Error("Failed to fetch calendar data");
      const json = await res.json();
      return json.data;
    },
    enabled: !!serviceId,
  });

  const { data: categories, isLoading: isLoadingCategories } = useQuery({
    queryKey: ["ticket-categories", serviceId],
    queryFn: async () => {
      const res = await fetch(
        `${API_URL}/ticket-categories?merchantServiceId=${serviceId}`,
        {
          headers: getAuthHeader(),
        },
      );
      return (await res.json()).data;
    },
    enabled: !!serviceId,
  });

  const { data: timeslots } = useQuery({
    queryKey: ["ticket-timeslots", service?.merchant_id],
    queryFn: async () => {
      if (!service?.merchant_id) return [];
      const res = await fetch(
        `${API_URL}/ticket-timeslots-by-service?serviceId=${service.id}`,
        {
          headers: getAuthHeader(),
        },
      );
      return (await res.json()).data;
    },
    enabled: !!service?.merchant_id,
  });

  // State Management
  const updateCategoryData = (
    categoryId: string,
    updates: Partial<CategoryBooking>,
  ) => {
    setBookingState((prev) => {
      const current = prev.counts[categoryId] || {
        adult: 0,
        child: 0,
        bookingDate: "", // Keep empty initially so they choose a valid date
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

  const calculateTotal = () => {
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
      const category = categories.find((c: any) => c.id.toString() === catId);
      if (category) {
        subtotal += data.adult * parseFloat(category.adult_price);
        subtotal += data.child * (parseFloat(category.child_price) || 0);
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
  };

  const handleValidateVoucher = async () => {
    if (!voucherCode.trim()) {
      return showError("Please enter a voucher code");
    }
    setIsValidatingVoucher(true);
    try {
      const res = await fetch(
        `${API_URL}/merchant-service-vouchers?merchantId=${service.merchant_id}&serviceId=${serviceId}&voucherCode=${encodeURIComponent(
          voucherCode.trim().toUpperCase()
        )}`,
        { headers: getAuthHeader() }
      );
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Voucher validation failed");
      }
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

  // Mutations
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
      navigate(`/merchant/print/${data.data[0].ticket.id}`);
    },
    onError: (err: any) => showError(err.message),
  });

  const handleBuyTickets = () => {
    const { count } = calculateTotal();
    if (count === 0) return showError("Please select at least one ticket");
    if (!customerInfo.name || !customerInfo.phone) {
      return showError("Please fill out all required customer details");
    }

    try {
      const selectedCategories = Object.entries(bookingState.counts)
        .filter(([_, data]) => data.adult > 0 || data.child > 0)
        .map(([catId, data]) => {
          if (!data.bookingDate) {
            throw new Error(
              "Please select a visit date for all selected categories",
            );
          }
          if (!data.timeslotId) {
            throw new Error(
              "Please select a timeslot for all selected categories",
            );
          }

          return {
            ticket_category_id: parseInt(catId),
            adult_count: data.adult,
            child_count: data.child,
            booking_date: data.bookingDate,
            ticket_timeslot_id: parseInt(data.timeslotId),
          };
        });

      bookingMutation.mutate({
        customer_name: customerInfo.name,
        customer_phone: customerInfo.phone,
        customer_phone_code: 91,
        email: customerInfo.email,
        payment_mode: customerInfo.payment_mode,
        merchant_id: service.merchant_id,
        merchant_service_id: parseInt(serviceId!),
        categories: selectedCategories,
        update_by: 1,
      });
    } catch (err: any) {
      showError(err.message);
    }
  };

  const handleOpenModal = (serviceId: number, categoryId: number) => {
    setCurrentCategory({ serviceId, categoryId });
  };

  const isDateDisabled = (date: Date) => {
    if (!calendarData) return true;
    const dateStr = format(date, "yyyy-MM-dd");
    return !calendarData.includes(dateStr);
  };

  if (isLoadingService || isLoadingCategories) {
    return (
      <div className="min-h-screen bg-slate-50/50 flex flex-col">
        <Navbar />
        <div className="flex-grow flex items-center justify-center">
          <div className="text-center space-y-3">
            <Loader2 className="h-10 w-10 animate-spin text-indigo-600 mx-auto" />
            <p className="text-sm font-medium text-slate-500">
              Loading workspace configurations...
            </p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  const {
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
  } = calculateTotal();

  return (
    <div className="min-h-screen bg-slate-50/50 flex flex-col font-sans antialiased">
      <Navbar />

      <main className="flex-grow container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 pb-6 border-b border-slate-200">
          <div className="flex items-start gap-4">
            <Button
              variant="outline"
              size="icon"
              onClick={() => navigate(-1)}
              className="rounded-xl bg-white shadow-sm hover:bg-slate-50 shrink-0"
            >
              <ArrowLeft className="h-4 w-4 text-slate-600" />
            </Button>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                {service?.name}
              </h1>
              <div className="flex items-center gap-1.5 text-sm text-slate-500 mt-1">
                <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                <span>
                  {[
                    service?.addressline1,
                    service?.addressline2,
                    service?.state,
                  ].filter(Boolean).join(", ")}
                  {service?.pincode ? ` - ${service.pincode}` : ""}
                </span>
              </div>
            </div>
          </div>

          <SiteMapDialog
            coordinates={service?.location_coordinates}
            trigger={
              <Button
                variant="outline"
                className="bg-white text-slate-700 font-medium shadow-sm gap-2"
              >
                <MapPin className="h-4 w-4 text-indigo-500" /> View Site Map
              </Button>
            }
          />
        </div>

        {/* Dashboard Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          {/* Main Booking Controls */}
          <div className="lg:col-span-2 space-y-8">
            {/* Customer Information Card */}
            <Card className="shadow-sm border-slate-200 bg-white overflow-hidden">
              <CardHeader className="bg-slate-50/70 border-b border-slate-100 py-4">
                <CardTitle className="text-base font-semibold flex items-center gap-2 text-slate-800">
                  <User className="h-4 w-4 text-indigo-600" /> Customer Details
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6 grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <Label className="text-slate-600 font-medium">
                    Full Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    placeholder="e.g. John Doe"
                    className="rounded-xl border-slate-200 focus-visible:ring-indigo-500"
                    value={customerInfo.name}
                    onChange={(e) =>
                      setCustomerInfo({
                        ...customerInfo,
                        name: e.target.value,
                      })}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-600 font-medium">
                    Mobile Number <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    placeholder="10-digit mobile number"
                    maxLength={10}
                    className="rounded-xl border-slate-200 focus-visible:ring-indigo-500"
                    value={customerInfo.phone}
                    onChange={(e) =>
                      setCustomerInfo({
                        ...customerInfo,
                        phone: e.target.value,
                      })}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-600 font-medium">
                    Email Address
                  </Label>
                  <Input
                    type="email"
                    placeholder="name@company.com"
                    className="rounded-xl border-slate-200 focus-visible:ring-indigo-500"
                    value={customerInfo.email}
                    onChange={(e) =>
                      setCustomerInfo({
                        ...customerInfo,
                        email: e.target.value,
                      })}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-600 font-medium">
                    Payment Method
                  </Label>
                  <Select
                    value={customerInfo.payment_mode}
                    onValueChange={(v) =>
                      setCustomerInfo({ ...customerInfo, payment_mode: v })}
                  >
                    <SelectTrigger className="rounded-xl border-slate-200 focus:ring-indigo-500">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CASH">Cash Payment</SelectItem>
                      <SelectItem value="UPI">UPI Transfer</SelectItem>
                      <SelectItem value="CARD">Credit/Debit Card</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Ticket Activities Registry */}
            <div className="space-y-4">
              <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2 px-1">
                <Ticket className="h-5 w-5 text-indigo-600" />{" "}
                Select Activities & Passes
              </h3>

              {categories?.map((category: any) => {
                const data = bookingState.counts[category.id] || {
                  adult: 0,
                  child: 0,
                  bookingDate: "",
                  timeslotId: "",
                };

                const selectedDate = data.bookingDate
                  ? parseISO(data.bookingDate)
                  : undefined;

                return (
                  <Card
                    key={category.id}
                    className="overflow-hidden border border-slate-200 bg-white shadow-sm hover:shadow-md transition-all duration-200"
                  >
                    <div className="flex flex-col lg:flex-row">
                      {/* Form Details Pane */}
                      <div className="flex-1 p-5 sm:p-6 space-y-6">
                        <div className="flex flex-wrap items-start justify-between gap-4">
                          <div>
                            <h4 className="text-lg font-bold text-slate-900">
                              {category.name}
                            </h4>
                            <p className="text-sm text-slate-500 mt-1 max-w-xl">
                              {category.special_instruction ||
                                "Standard admissions terms and conditions apply."}
                            </p>
                          </div>

                          <div className="flex items-center gap-2">
                            <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-50 font-medium px-2.5 py-1 rounded-md">
                              Active Slots
                            </Badge>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                handleOpenModal(
                                  parseInt(serviceId!),
                                  category.id,
                                )}
                              className="text-slate-600 hover:text-indigo-600 hover:bg-slate-100 gap-1.5 h-8 font-medium"
                            >
                              <ImageIcon className="h-4 w-4" /> Gallery
                            </Button>
                          </div>
                        </div>

                        {/* Pricing Displays */}
                        <div className={cn("grid gap-4", category.age_restriction_sw ? "grid-cols-2" : "grid-cols-1")}>
                          <div className="rounded-xl bg-slate-50 p-3.5 border border-slate-100">
                            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                              Adult Fare
                            </span>
                            <span className="text-xl font-black text-slate-800">
                              ₹{parseFloat(category.adult_price).toFixed(2)}
                            </span>
                          </div>
                          {category.age_restriction_sw && (
                            <div className="rounded-xl bg-slate-50 p-3.5 border border-slate-100 animate-in fade-in slide-in-from-top-1 duration-200">
                              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                                Child Fare
                              </span>
                              <span className="text-xl font-black text-slate-800">
                                ₹{parseFloat(category.child_price || "0.00").toFixed(2)}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Age Restriction Limits & Rules */}
                        {category.age_restriction_sw && (category.child_age_limit || category.free_age_limit) && (
                          <div className="text-xs text-indigo-700 bg-indigo-50/50 rounded-xl p-3.5 border border-indigo-100 flex flex-col gap-1.5 animate-in fade-in duration-200">
                            <span className="font-bold flex items-center gap-1.5 text-indigo-800">
                              <ShieldAlert className="h-4 w-4 text-indigo-500 shrink-0" />
                              Age Admission Rules:
                            </span>
                            {category.child_age_limit && (
                              <p>• Child tickets are eligible for children up to <strong>{category.child_age_limit}</strong> years of age.</p>
                            )}
                            {category.free_age_limit && (
                              <p>• Free entry is permitted for toddlers/infants under <strong>{category.free_age_limit}</strong> years of age.</p>
                            )}
                          </div>
                        )}

                        {/* Per-Category Schedule */}
                        <div className="grid grid-cols-2 gap-4 mt-6 pt-6 border-t border-slate-100">
                          <div className="space-y-2">
                            <Label className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1">
                              <CalendarIcon className="h-3 w-3" />{" "}
                              Visit Date
                            </Label>
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button
                                  variant="outline"
                                  className={cn(
                                    "w-full h-10 text-xs font-normal justify-start rounded-xl border-slate-200 focus:ring-indigo-500 bg-white",
                                    !data.bookingDate && "text-muted-foreground"
                                  )}
                                >
                                  <CalendarIcon className="mr-2 h-4 w-4 text-slate-400" />
                                  {data.bookingDate ? (
                                    format(parseISO(data.bookingDate), "PPP")
                                  ) : (
                                    <span>Pick a date</span>
                                  )}
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0 rounded-2xl" align="start">
                                <Calendar
                                  mode="single"
                                  selected={selectedDate}
                                  onSelect={(date) => {
                                    if (date) {
                                      const dateStr = format(date, "yyyy-MM-dd");
                                      updateCategoryData(category.id, {
                                        bookingDate: dateStr,
                                      });
                                    }
                                  }}
                                  disabled={isDateDisabled}
                                  initialFocus
                                />
                              </PopoverContent>
                            </Popover>
                          </div>
                          <div className="space-y-2">
                            <Label className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1">
                              <Clock className="h-3 w-3" /> Timeslot
                            </Label>
                            <Select
                              value={data.timeslotId}
                              onValueChange={(v) =>
                                updateCategoryData(category.id, {
                                  timeslotId: v,
                                })}
                            >
                              <SelectTrigger className="h-10 text-xs">
                                <SelectValue placeholder="Select Slot" />
                              </SelectTrigger>
                              <SelectContent>
                                {timeslots
                                  ?.filter((ts: any) =>
                                    ts.ticket_category_id === category.id
                                  )
                                  .map((ts: any) => (
                                    <SelectItem
                                      key={ts.id}
                                      value={ts.id.toString()}
                                    >
                                      {ts.name} ({ts.start})
                                    </SelectItem>
                                  ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </div>

                      {/* Right Section: Quantity Controls */}
                      <div className="lg:w-[240px] border-t lg:border-l lg:border-t-0 bg-slate-50 p-6 flex flex-col justify-center gap-4">
                        <div className="flex items-center justify-between rounded-xl border bg-white p-3">
                          <span className="text-xs font-bold text-slate-600">
                            Adult
                          </span>
                          <div className="flex items-center gap-3">
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-7 w-7 rounded-full"
                              disabled={data.adult === 0}
                              onClick={() =>
                                updateCategoryData(category.id, {
                                  adult: Math.max(0, data.adult - 1),
                                })}
                            >
                              <Minus className="h-3 w-3" />
                            </Button>
                            <span className="w-4 text-center font-bold text-sm">
                              {data.adult}
                            </span>
                            <Button
                              size="icon"
                              className="h-7 w-7 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white"
                              onClick={() =>
                                updateCategoryData(category.id, {
                                  adult: data.adult + 1,
                                })}
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>

                        {category.age_restriction_sw && (
                          <div className="flex items-center justify-between rounded-xl border bg-white p-3 animate-in fade-in duration-200">
                            <span className="text-xs font-bold text-slate-600">
                              Child
                            </span>
                            <div className="flex items-center gap-3">
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-7 w-7 rounded-full"
                                disabled={data.child === 0}
                                onClick={() =>
                                  updateCategoryData(category.id, {
                                    child: Math.max(0, data.child - 1),
                                  })}
                              >
                                <Minus className="h-3 w-3" />
                              </Button>
                              <span className="w-4 text-center font-bold text-sm">
                                {data.child}
                              </span>
                              <Button
                                size="icon"
                                className="h-7 w-7 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white"
                                onClick={() =>
                                  updateCategoryData(category.id, {
                                    child: data.child + 1,
                                  })}
                              >
                                <Plus className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* Sticky Billing Statement Panel */}
          <div className="space-y-6 lg:sticky lg:top-6">
            <Card className="shadow-md border-slate-200 bg-white overflow-hidden">
              <CardHeader className="bg-slate-900 text-white py-4">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Receipt className="h-4 w-4 text-indigo-400" />{" "}
                  Booking Overview
                </CardTitle>
              </CardHeader>

              <CardContent className="pt-5 space-y-4">
                {count === 0
                  ? (
                    <div className="text-center py-10 px-4">
                      <div className="h-10 w-10 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto mb-3">
                        <Ticket className="h-5 w-5" />
                      </div>
                      <p className="text-sm font-medium text-slate-400 italic">
                        No slots or packages selected yet
                      </p>
                    </div>
                  )
                  : (
                    <div className="space-y-3.5">
                      {Object.entries(bookingState.counts).map(
                        ([catId, data]) => {
                          if (data.adult === 0 && data.child === 0) return null;
                          const cat = categories.find((c: any) =>
                            c.id.toString() === catId
                          );
                          const ts = timeslots?.find((t: any) =>
                            t.id.toString() === data.timeslotId
                          );

                          const lineTotal =
                            data.adult * parseFloat(cat.adult_price) +
                            data.child * (parseFloat(cat.child_price) || 0);

                          return (
                            <div
                              key={catId}
                              className="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-1.5"
                            >
                              <div className="flex justify-between items-start gap-2 text-sm">
                                <span className="font-bold text-slate-800 line-clamp-1">
                                  {cat.name}
                                </span>
                                <span className="font-bold text-slate-900 shrink-0">
                                  ₹{lineTotal.toFixed(2)}
                                </span>
                              </div>
                              <div className="flex items-center gap-3 text-[11px] font-medium text-slate-500">
                                <span className="flex items-center gap-1">
                                  <CalendarIcon className="h-3 w-3 text-slate-400" />
                                  {" "}
                                  {data.bookingDate || "Date Pending"}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3 text-slate-400" />
                                  {" "}
                                  {ts?.name || "Window Pending"}
                                </span>
                              </div>
                              <div className="text-[11px] font-bold text-indigo-600/90 tracking-wide">
                                {data.adult > 0 &&
                                  `${data.adult} Adult${
                                    data.adult > 1 ? "s" : ""
                                  }`}
                                {data.adult > 0 && data.child > 0 && " • "}
                                {data.child > 0 &&
                                  `${data.child} Child${
                                    data.child > 1 ? "ren" : ""
                                  }`}
                              </div>
                            </div>
                          );
                        },
                      )}

                      <Separator className="my-2" />

                      {/* Ticket Volume & Subtotal */}
                      <div className="flex justify-between items-center text-sm font-medium text-slate-500 px-1">
                        <span>Total Volume</span>
                        <span className="font-bold text-slate-800">
                          {count} Ticket{count > 1 ? "s" : ""}
                        </span>
                      </div>

                      <div className="flex justify-between items-center text-sm font-medium text-slate-500 px-1">
                        <span>Subtotal</span>
                        <span className="font-bold text-slate-800">
                          ₹{subtotal.toFixed(2)}
                        </span>
                      </div>

                      {/* Voucher / Promo Code Field */}
                      <div className="pt-2 pb-1 space-y-2 border-t border-slate-100">
                        <Label className="text-xs font-bold text-slate-600 flex items-center gap-1">
                          <Tag className="h-3.5 w-3.5 text-indigo-500" /> Voucher Code
                        </Label>
                        <div className="flex gap-2">
                          <Input
                            placeholder="e.g. FESTIVE10"
                            className="h-9 uppercase rounded-xl border-slate-200 text-xs focus-visible:ring-indigo-500"
                            value={voucherCode}
                            onChange={(e) => setVoucherCode(e.target.value.toUpperCase())}
                            disabled={appliedVoucher !== null}
                          />
                          {appliedVoucher ? (
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-9 text-xs rounded-xl text-red-500 hover:text-red-600 border-red-200"
                              onClick={() => {
                                setDiscountPercentage(0);
                                setAppliedVoucher(null);
                                setVoucherCode("");
                              }}
                            >
                              <X className="h-3.5 w-3.5" />
                            </Button>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-9 text-xs rounded-xl border-indigo-200 text-indigo-600 hover:bg-indigo-50 font-bold"
                              onClick={handleValidateVoucher}
                              disabled={isValidatingVoucher}
                            >
                              {isValidatingVoucher ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                "Apply"
                              )}
                            </Button>
                          )}
                        </div>
                        {appliedVoucher && (
                          <div className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1.5 rounded-lg border border-emerald-100 flex items-center gap-1 animate-in fade-in duration-200">
                            <Check className="h-3.5 w-3.5" /> Code {appliedVoucher} applied ({discountPercentage}% off)
                          </div>
                        )}
                      </div>

                      {discountAmount > 0 && (
                        <div className="flex justify-between items-center text-sm font-semibold text-emerald-600 px-1 animate-in fade-in duration-200">
                          <span>Promo Discount</span>
                          <span>-₹{discountAmount.toFixed(2)}</span>
                        </div>
                      )}

                      {/* SGST & CGST or IGST Breakdown */}
                      {gstAmount > 0 && (
                        <div className="bg-indigo-50/50 rounded-xl p-3 border border-indigo-50 space-y-2 text-xs text-indigo-700 animate-in fade-in duration-200">
                          <p className="font-bold flex items-center gap-1">
                            <Percent className="h-3 w-3" /> GST Taxes breakdown:
                          </p>
                          {sgstAmount > 0 && (
                            <div className="flex justify-between">
                              <span>SGST ({sgstPct}%)</span>
                              <span className="font-bold">₹{sgstAmount.toFixed(2)}</span>
                            </div>
                          )}
                          {cgstAmount > 0 && (
                            <div className="flex justify-between">
                              <span>CGST ({cgstPct}%)</span>
                              <span className="font-bold">₹{cgstAmount.toFixed(2)}</span>
                            </div>
                          )}
                          {igstAmount > 0 && (
                            <div className="flex justify-between">
                              <span>IGST ({igstPct}%)</span>
                              <span className="font-bold">₹{igstAmount.toFixed(2)}</span>
                            </div>
                          )}
                          <div className="flex justify-between pt-1 border-t border-indigo-100 font-bold">
                            <span>Total GST</span>
                            <span>₹{gstAmount.toFixed(2)}</span>
                          </div>
                        </div>
                      )}

                      <div className="flex justify-between items-center px-1 pt-1">
                        <span className="text-sm font-bold text-slate-800">
                          Gross Total
                        </span>
                        <span className="text-2xl font-black text-indigo-600 tracking-tight">
                          ₹{total.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  )}
              </CardContent>

              <CardFooter className="p-4 bg-slate-50/50 border-t border-slate-100">
                <Button
                  onClick={handleBuyTickets}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 h-14 text-sm font-bold rounded-xl shadow-sm transition-all"
                  disabled={count === 0 || bookingMutation.isPending}
                >
                  {bookingMutation.isPending
                    ? (
                      <div className="flex items-center gap-2">
                        <Loader2 className="animate-spin h-4 w-4" />{" "}
                        Processing Order...
                      </div>
                    )
                    : (
                      "Generate & Print Tickets"
                    )}
                </Button>
              </CardFooter>
            </Card>
          </div>
        </div>
      </main>

      <Footer />

      {/* Media Modals */}
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