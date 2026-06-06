"use client";

import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { showSuccess, showError } from "@/utils/toast";
import { 
  Ticket, Plus, Minus, ShoppingCart, 
  Info, Users, Clock, Loader2, ArrowLeft,
  ChevronRight, DollarSign
} from 'lucide-react';

const API_URL = 'http://localhost:5000/api';

interface BookingState {
  [categoryId: string]: {
    adult: number;
    child: number;
  };
}

const MerchantTicketBooking = () => {
  const { serviceId } = useParams();
  const navigate = useNavigate();
  const [bookingCounts, setBookingCounts] = useState<BookingState>({});

  const getAuthHeader = () => ({ 'Authorization': `Bearer ${localStorage.getItem('token')}` });

  // Fetch Service Details
  const { data: service, isLoading: isLoadingService } = useQuery({
    queryKey: ['merchant-service', serviceId],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/merchant-services`, { headers: getAuthHeader() });
      const data = await res.json();
      return data.data.find((s: any) => s.id.toString() === serviceId);
    },
    enabled: !!serviceId
  });

  // Fetch Categories
  const { data: categories, isLoading: isLoadingCategories } = useQuery({
    queryKey: ['ticket-categories', serviceId],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/ticket-categories?merchantServiceId=${serviceId}`, { headers: getAuthHeader() });
      return (await res.json()).data;
    },
    enabled: !!serviceId
  });

  // Fetch Timeslots (to show names)
  const { data: timeslots } = useQuery({
    queryKey: ['ticket-timeslots', service?.merchant_id],
    queryFn: async () => {
      if (!service?.merchant_id) return [];
      const res = await fetch(`${API_URL}/ticket-timeslots?merchantId=${service.merchant_id}`, { headers: getAuthHeader() });
      return (await res.json()).data;
    },
    enabled: !!service?.merchant_id
  });

  const updateCount = (categoryId: string, type: 'adult' | 'child', delta: number) => {
    setBookingCounts(prev => {
      const current = prev[categoryId] || { adult: 0, child: 0 };
      const newValue = Math.max(0, current[type] + delta);
      return {
        ...prev,
        [categoryId]: { ...current, [type]: newValue }
      };
    });
  };

  const calculateTotal = () => {
    let total = 0;
    let count = 0;
    if (!categories) return { total, count };

    Object.entries(bookingCounts).forEach(([catId, counts]) => {
      const category = categories.find((c: any) => c.id.toString() === catId);
      if (category) {
        total += (counts.adult * parseFloat(category.adult_price));
        total += (counts.child * (parseFloat(category.child_price) || 0));
        count += counts.adult + counts.child;
      }
    });
    return { total, count };
  };

  const handleBuyTickets = () => {
    const { count, total } = calculateTotal();
    if (count === 0) {
      showError("Please select at least one ticket");
      return;
    }

    try {
      const selectedCategories = Object.entries(bookingCounts)
        .filter(([_, counts]) => counts.adult > 0 || counts.child > 0)
        .map(([catId, counts]) => {
          const cat = categories.find((c: any) => c.id.toString() === catId);
          return {
            category_id: catId,
            name: cat.name,
            adult_count: counts.adult,
            child_count: counts.child,
            adult_price: cat.adult_price,
            child_price: cat.child_price
          };
        });

      const bookingData = {
        id: Date.now(),
        merchant_service_id: serviceId,
        service_name: service?.name,
        booking_date: new Date().toISOString(),
        categories: selectedCategories,
        total_amount: total,
        total_tickets: count,
        status: 'PENDING_PAYMENT'
      };

      const existingBookings = JSON.parse(localStorage.getItem('merchant_bookings') || '[]');
      localStorage.setItem('merchant_bookings', JSON.stringify([...existingBookings, bookingData]));

      showSuccess("Booking saved to local storage!");
      setBookingCounts({});
    } catch (err) {
      showError("Failed to process booking");
    }
  };

  if (isLoadingService || isLoadingCategories) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <Navbar />
        <div className="flex-grow flex items-center justify-center">
          <Loader2 className="h-12 w-12 animate-spin text-indigo-600" />
        </div>
        <Footer />
      </div>
    );
  }

  const { total, count } = calculateTotal();

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar />
      
      <main className="flex-grow container px-4 md:px-8 py-12">
        <div className="max-w-5xl mx-auto space-y-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="rounded-full">
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-3xl font-bold text-slate-900">{service?.name || 'Book Tickets'}</h1>
                <p className="text-slate-500">Select your ticket categories and quantity</p>
              </div>
            </div>
            <Badge variant="outline" className="bg-white px-4 py-1.5 text-indigo-600 border-indigo-100">
              Service ID: #{serviceId}
            </Badge>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              {categories?.length === 0 ? (
                <Card className="p-12 text-center border-dashed">
                  <Ticket className="h-12 w-12 mx-auto mb-4 text-slate-300" />
                  <h3 className="text-lg font-medium text-slate-900">No Categories Available</h3>
                  <p className="text-slate-500">This service doesn't have any ticket categories configured yet.</p>
                </Card>
              ) : (
                categories?.map((category: any) => {
                  const counts = bookingCounts[category.id] || { adult: 0, child: 0 };
                  const timeslot = timeslots?.find((t: any) => t.id === category.timeslot_id);

                  return (
                    <Card key={category.id} className="overflow-hidden border-none shadow-md hover:shadow-lg transition-all">
                      <CardHeader className="bg-white border-b pb-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <CardTitle className="text-xl text-slate-900">{category.name}</CardTitle>
                            {timeslot && (
                              <div className="flex items-center gap-1.5 text-xs text-indigo-600 font-medium mt-1">
                                <Clock className="h-3.5 w-3.5" />
                                {timeslot.name} ({timeslot.start} - {timeslot.end})
                              </div>
                            )}
                          </div>
                          <Badge className="bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border-none">
                            {category.total_ticket_count ? `${category.total_ticket_count} Left` : 'Unlimited'}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-6 space-y-6">
                        {category.special_instruction && (
                          <div className="flex items-start gap-2 p-3 bg-amber-50 rounded-xl text-amber-800 text-sm">
                            <Info className="h-4 w-4 shrink-0 mt-0.5" />
                            {category.special_instruction}
                          </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                          {/* Adult Tickets */}
                          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                            <div>
                              <p className="font-bold text-slate-900">Adult</p>
                              <p className="text-indigo-600 font-bold">${category.adult_price}</p>
                            </div>
                            <div className="flex items-center gap-4">
                              <Button 
                                variant="outline" 
                                size="icon" 
                                className="h-8 w-8 rounded-lg"
                                onClick={() => updateCount(category.id, 'adult', -1)}
                                disabled={counts.adult === 0}
                              >
                                <Minus className="h-4 w-4" />
                              </Button>
                              <span className="w-4 text-center font-bold">{counts.adult}</span>
                              <Button 
                                variant="outline" 
                                size="icon" 
                                className="h-8 w-8 rounded-lg bg-white"
                                onClick={() => updateCount(category.id, 'adult', 1)}
                              >
                                <Plus className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>

                          {/* Child Tickets */}
                          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="font-bold text-slate-900">Child</p>
                                {category.child_age_limit && (
                                  <span className="text-[10px] bg-slate-200 px-1.5 py-0.5 rounded text-slate-600">
                                    Under {category.child_age_limit}
                                  </span>
                                )}
                              </div>
                              <p className="text-indigo-600 font-bold">${category.child_price || '0.00'}</p>
                            </div>
                            <div className="flex items-center gap-4">
                              <Button 
                                variant="outline" 
                                size="icon" 
                                className="h-8 w-8 rounded-lg"
                                onClick={() => updateCount(category.id, 'child', -1)}
                                disabled={counts.child === 0}
                              >
                                <Minus className="h-4 w-4" />
                              </Button>
                              <span className="w-4 text-center font-bold">{counts.child}</span>
                              <Button 
                                variant="outline" 
                                size="icon" 
                                className="h-8 w-8 rounded-lg bg-white"
                                onClick={() => updateCount(category.id, 'child', 1)}
                              >
                                <Plus className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </div>

            {/* Summary Sidebar */}
            <div className="space-y-6">
              <Card className="shadow-xl border-indigo-100 sticky top-24">
                <CardHeader className="bg-slate-900 text-white rounded-t-xl">
                  <CardTitle className="flex items-center gap-2">
                    <ShoppingCart className="h-5 w-5" />
                    Booking Summary
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6 space-y-4">
                  {count === 0 ? (
                    <p className="text-center py-8 text-slate-400 italic">No tickets selected</p>
                  ) : (
                    <div className="space-y-4">
                      {Object.entries(bookingCounts).map(([catId, counts]) => {
                        if (counts.adult === 0 && counts.child === 0) return null;
                        const cat = categories.find((c: any) => c.id.toString() === catId);
                        return (
                          <div key={catId} className="space-y-1">
                            <p className="text-sm font-bold text-slate-900">{cat.name}</p>
                            <div className="flex justify-between text-xs text-slate-500">
                              <span>{counts.adult} Adult, {counts.child} Child</span>
                              <span className="font-medium text-slate-700">
                                ${(counts.adult * parseFloat(cat.adult_price) + counts.child * (parseFloat(cat.child_price) || 0)).toFixed(2)}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                      <Separator />
                      <div className="flex justify-between items-center pt-2">
                        <span className="text-slate-600 font-medium">Total Tickets</span>
                        <span className="font-bold text-slate-900">{count}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-600 font-medium">Total Amount</span>
                        <span className="text-2xl font-black text-indigo-600">${total.toFixed(2)}</span>
                      </div>
                    </div>
                  )}
                </CardContent>
                <CardFooter className="pb-6">
                  <Button 
                    onClick={handleBuyTickets}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 h-14 text-lg font-bold rounded-xl shadow-lg shadow-indigo-100 group"
                    disabled={count === 0}
                  >
                    Buy Tickets
                    <ChevronRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </CardFooter>
              </Card>

              <div className="p-6 bg-indigo-50 rounded-2xl border border-indigo-100">
                <h4 className="font-bold text-indigo-900 mb-2 flex items-center gap-2">
                  <Users className="h-4 w-4" /> Group Booking?
                </h4>
                <p className="text-xs text-indigo-700 leading-relaxed">
                  For bookings over 20 people, please contact our support team for special group discounts and arrangements.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default MerchantTicketBooking;