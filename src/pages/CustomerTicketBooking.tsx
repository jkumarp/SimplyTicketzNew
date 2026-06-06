"use client";

import React, { useState } from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { showSuccess, showError } from "@/utils/toast";
import { Ticket, User, Mail, Phone, CreditCard, Users } from 'lucide-react';

const CustomerTicketBooking = () => {
  const [formData, setFormData] = useState({
    customer_name: '',
    email: '',
    customer_phone: '',
    payment_mode: 'UPI',
    adult_count: '1',
    child_count: '0'
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleBuyTickets = (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const bookingData = {
        ...formData,
        booking_date: new Date().toISOString(),
        adult_count: parseInt(formData.adult_count) || 0,
        child_count: parseInt(formData.child_count) || 0,
        id: Date.now() // Unique ID for local reference
      };

      // Get existing bookings or initialize empty array
      const existingBookings = JSON.parse(localStorage.getItem('customer_bookings') || '[]');
      
      // Add new booking
      const updatedBookings = [...existingBookings, bookingData];
      
      // Save back to localStorage
      localStorage.setItem('customer_bookings', JSON.stringify(updatedBookings));

      showSuccess("Tickets added to your local bookings!");
      
      // Reset form
      setFormData({
        customer_name: '',
        email: '',
        customer_phone: '',
        payment_mode: 'UPI',
        adult_count: '1',
        child_count: '0'
      });
    } catch (err) {
      showError("Failed to save booking locally");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar />
      
      <main className="flex-grow container max-w-2xl px-4 md:px-8 py-12">
        <Card className="shadow-xl border-indigo-100 overflow-hidden">
          <CardHeader className="bg-indigo-600 text-white p-8">
            <div className="flex items-center gap-3 mb-2">
              <div className="bg-white/20 p-2 rounded-lg">
                <Ticket className="h-6 w-6 text-white" />
              </div>
              <CardTitle className="text-2xl">Book Your Tickets</CardTitle>
            </div>
            <CardDescription className="text-indigo-100 text-base">
              Fill in your details to secure your spot.
            </CardDescription>
          </CardHeader>
          
          <CardContent className="p-8">
            <form onSubmit={handleBuyTickets} className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="customer_name" className="flex items-center gap-2">
                    <User className="h-4 w-4 text-slate-400" /> Full Name
                  </Label>
                  <Input 
                    id="customer_name"
                    name="customer_name"
                    required
                    placeholder="John Doe"
                    value={formData.customer_name}
                    onChange={handleInputChange}
                    className="h-12"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-slate-400" /> Email Address
                    </Label>
                    <Input 
                      id="email"
                      name="email"
                      type="email"
                      required
                      placeholder="john@example.com"
                      value={formData.email}
                      onChange={handleInputChange}
                      className="h-12"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="customer_phone" className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-slate-400" /> Phone Number
                    </Label>
                    <Input 
                      id="customer_phone"
                      name="customer_phone"
                      required
                      placeholder="10-digit mobile"
                      maxLength={10}
                      value={formData.customer_phone}
                      onChange={handleInputChange}
                      className="h-12"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-slate-400" /> Adult Tickets
                    </Label>
                    <Input 
                      name="adult_count"
                      type="number"
                      min="1"
                      value={formData.adult_count}
                      onChange={handleInputChange}
                      className="h-12"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-slate-400" /> Child Tickets
                    </Label>
                    <Input 
                      name="child_count"
                      type="number"
                      min="0"
                      value={formData.child_count}
                      onChange={handleInputChange}
                      className="h-12"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-slate-400" /> Payment Mode
                  </Label>
                  <Select 
                    value={formData.payment_mode} 
                    onValueChange={(v) => handleSelectChange('payment_mode', v)}
                  >
                    <SelectTrigger className="h-12">
                      <SelectValue placeholder="Select Payment Method" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="UPI">UPI / GPay / PhonePe</SelectItem>
                      <SelectItem value="CARD">Credit / Debit Card</SelectItem>
                      <SelectItem value="CASH">Cash at Venue</SelectItem>
                      <SelectItem value="NETBANKING">Net Banking</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button 
                type="submit" 
                className="w-full bg-indigo-600 hover:bg-indigo-700 h-14 text-lg font-bold rounded-xl shadow-lg shadow-indigo-100 transition-all active:scale-[0.98]"
              >
                Buy Tickets
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>

      <Footer />
    </div>
  );
};

export default CustomerTicketBooking;