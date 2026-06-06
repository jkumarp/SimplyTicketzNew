"use client";

import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { showSuccess, showError } from "@/utils/toast";
import { 
  Ticket, Plus, Minus, ShoppingCart, 
  Info, Users, Clock, Loader2, ArrowLeft,
  ChevronRight, User, Phone, Mail, CreditCard
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
  const [customerInfo, setCustomerInfo] = useState({
    name: '',
    phone: '',
    email: '',
    payment_mode: 'CASH'
  });

  const getAuthHeader = () => ({ 'Authorization': `Bearer ${localStorage.getItem('token')}` });

  const { data: service, isLoading: isLoadingService } = useQuery({
    queryKey: ['merchant-service', serviceId],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/merchant-services`, { headers: getAuthHeader() });
      const data = await res.json();
      return data.data.find((s: any) => s.id.toString() === serviceId);
    },
    enabled: !!serviceId
  });

  const { data: categories, isLoading: isLoadingCategories } = useQuery({
    queryKey: ['ticket-categories', serviceId],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/ticket-categories?merchantServiceId=${serviceId}`, { headers: getAuthHeader() });
      return (await res.json()).data;
    },
    enabled: !!serviceId
  });

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
      return { ...prev, [categoryId]: { ...current, [type]: newValue } };
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

  const bookingMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await fetch(`${API_URL}/tickets/book`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error('Booking failed');
      return res.json();
    },
    onSuccess: (data) => {
      showSuccess("Booking confirmed!");
      navigate(`/merchant/print/${data.data.ticket.id}`);
    },
    onError: (err: any) => showError(err.message)
  });

  const handleBuyTickets = () => {
    const { count } = calculateTotal();
    if (count === 0) return showError("Please select at least one ticket");
    if (!customerInfo.name || !customerInfo.phone) return showError("Please fill customer details");

    const selectedCategories = Object.entries(bookingCounts)
      .filter(([_, counts]) => counts.adult > 0 || counts.child > 0)
      .map(([catId, counts]) => ({
        ticket_category_id: parseInt(catId),
        adult_count: counts.adult,
        child_count: counts.child
      }));

    bookingMutation.mutate({
      customer_name: customerInfo.name,
      customer_phone: customerInfo.phone,
      customer_phone_code: 91,
      email: customerInfo.email,
      payment_mode: customerInfo.payment_mode,
      merchant_id: service.merchant_id,
      merchant_service_id: parseInt(serviceId!),
      categories: selectedCategories,
      update_by: 1
    });
  };

  if (isLoadingService || isLoadingCategories) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <Navbar />
        <div className="flex-grow flex items-center justify-center"><Loader2 className="h-12 w-12 animate-spin text-indigo-600" /></div>
        <Footer />
      </div>
    );
  }

  const { total, count } = calculateTotal();

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar />
      <main className="flex-grow container px-4 md:px-8 py-12">
        <div className="max-w-6xl mx-auto space-y-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="rounded-full"><ArrowLeft className="h-5 w-5" /></Button>
              <div>
                <h1 className="text-3xl font-bold text-slate-900">{service?.name}</h1>
                <p className="text-slate-500">Configure booking and customer details</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">
              {/* Customer Details Card */}
              <Card className="shadow-md border-indigo-100">
                <CardHeader className="bg-indigo-50/30 border-b">
                  <CardTitle className="text-lg flex items-center gap-2 text-indigo-700">
                    <User className="h-5 w-5" /> Customer Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label>Full Name *</Label>
                    <Input placeholder="John Doe" value={customerInfo.name} onChange={e => setCustomerInfo({...customerInfo, name: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <Label>Phone Number *</Label>
                    <Input placeholder="10-digit mobile" maxLength={10} value={customerInfo.phone} onChange={e => setCustomerInfo({...customerInfo, phone: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <Label>Email Address</Label>
                    <Input type="email" placeholder="customer@example.com" value={customerInfo.email} onChange={e => setCustomerInfo({...customerInfo, email: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <Label>Payment Mode</Label>
                    <Select value={customerInfo.payment_mode} onValueChange={v => setCustomerInfo({...customerInfo, payment_mode: v})}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="CASH">Cash</SelectItem>
                        <SelectItem value="UPI">UPI</SelectItem>
                        <SelectItem value="CARD">Card</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              {/* Categories */}
              <div className="space-y-4">
                <h3 className="font-bold text-slate-900 flex items-center gap-2"><Ticket className="h-5 w-5 text-indigo-600" /> Select Categories</h3>
                {categories?.map((category: any) => {
                  const counts = bookingCounts[category.id] || { adult: 0, child: 0 };
                  const timeslot = timeslots?.find((t: any) => t.id === category.timeslot_id);
                  return (
                    <Card key={category.id} className="overflow-hidden border-none shadow-sm hover:shadow-md transition-all">
                      <CardContent className="p-6">
                        <div className="flex flex-col md:flex-row justify-between gap-6">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-bold text-lg text-slate-900">{category.name}</h4>
                              {timeslot && <Badge variant="secondary" className="text-[10px]">{timeslot.name}</Badge>}
                            </div>
                            <p className="text-xs text-slate-500 mb-4">{category.special_instruction || 'No special instructions'}</p>
                            <div className="flex gap-4">
                              <div className="text-sm"><span className="text-slate-400">Adult:</span> <span className="font-bold">${category.adult_price}</span></div>
                              <div className="text-sm"><span className="text-slate-400">Child:</span> <span className="font-bold">${category.child_price || '0.00'}</span></div>
                            </div>
                          </div>
                          <div className="flex flex-col sm:flex-row gap-4 items-center">
                            <div className="flex items-center gap-3 bg-slate-50 p-2 rounded-xl border">
                              <span className="text-[10px] font-bold text-slate-400 uppercase px-2">Adult</span>
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => updateCount(category.id, 'adult', -1)} disabled={counts.adult === 0}><Minus className="h-3 w-3" /></Button>
                              <span className="w-4 text-center font-bold">{counts.adult}</span>
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => updateCount(category.id, 'adult', 1)}><Plus className="h-3 w-3" /></Button>
                            </div>
                            <div className="flex items-center gap-3 bg-slate-50 p-2 rounded-xl border">
                              <span className="text-[10px] font-bold text-slate-400 uppercase px-2">Child</span>
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => updateCount(category.id, 'child', -1)} disabled={counts.child === 0}><Minus className="h-3 w-3" /></Button>
                              <span className="w-4 text-center font-bold">{counts.child}</span>
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => updateCount(category.id, 'child', 1)}><Plus className="h-3 w-3" /></Button>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>

            {/* Summary */}
            <div className="space-y-6">
              <Card className="shadow-xl border-indigo-100 sticky top-24">
                <CardHeader className="bg-slate-900 text-white rounded-t-xl">
                  <CardTitle className="flex items-center gap-2"><ShoppingCart className="h-5 w-5" /> Summary</CardTitle>
                </CardHeader>
                <CardContent className="pt-6 space-y-4">
                  {count === 0 ? <p className="text-center py-8 text-slate-400 italic">No tickets selected</p> : (
                    <div className="space-y-4">
                      {Object.entries(bookingCounts).map(([catId, counts]) => {
                        if (counts.adult === 0 && counts.child === 0) return null;
                        const cat = categories.find((c: any) => c.id.toString() === catId);
                        return (
                          <div key={catId} className="flex justify-between text-sm">
                            <div><p className="font-bold">{cat.name}</p><p className="text-xs text-slate-500">{counts.adult}A, {counts.child}C</p></div>
                            <span className="font-medium">${(counts.adult * parseFloat(cat.adult_price) + counts.child * (parseFloat(cat.child_price) || 0)).toFixed(2)}</span>
                          </div>
                        );
                      })}
                      <Separator />
                      <div className="flex justify-between items-center pt-2"><span className="text-slate-600">Total Tickets</span><span className="font-bold">{count}</span></div>
                      <div className="flex justify-between items-center"><span className="text-slate-600">Total Amount</span><span className="text-2xl font-black text-indigo-600">${total.toFixed(2)}</span></div>
                    </div>
                  )}
                </CardContent>
                <CardFooter className="pb-6">
                  <Button onClick={handleBuyTickets} className="w-full bg-indigo-600 hover:bg-indigo-700 h-14 text-lg font-bold rounded-xl shadow-lg" disabled={count === 0 || bookingMutation.isPending}>
                    {bookingMutation.isPending ? <Loader2 className="animate-spin" /> : <>Confirm & Print <ChevronRight className="ml-2 h-5 w-5" /></>}
                  </Button>
                </CardFooter>
              </Card>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default MerchantTicketBooking;