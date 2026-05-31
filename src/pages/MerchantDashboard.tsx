"use client";

import React from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Ticket, Calendar, Users, DollarSign, 
  PlusCircle, Settings, ChevronRight,
  Clock, CheckCircle2
} from 'lucide-react';

const MerchantDashboard = () => {
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const stats = [
    { title: "Active Events", value: "12", icon: Calendar, color: "text-indigo-600" },
    { title: "Tickets Sold", value: "842", icon: Ticket, color: "text-blue-600" },
    { title: "Total Revenue", value: "$42,500", icon: DollarSign, color: "text-green-600" },
    { title: "Attendees", value: "790", icon: Users, color: "text-purple-600" },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar />
      
      <main className="flex-grow container px-4 md:px-8 py-12">
        <div className="flex flex-col gap-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Merchant Portal</h1>
              <p className="text-slate-500">Welcome back, {user.email}</p>
            </div>
            <Button className="bg-indigo-600 hover:bg-indigo-700 gap-2 h-12 px-6 rounded-xl shadow-lg shadow-indigo-100">
              <PlusCircle className="h-5 w-5" /> Create New Event
            </Button>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {stats.map((stat, i) => (
              <Card key={i} className="border-none shadow-sm overflow-hidden group">
                <CardContent className="p-0">
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className={`${stat.color} bg-slate-50 p-2 rounded-lg group-hover:scale-110 transition-transform`}>
                        <stat.icon className="h-5 w-5" />
                      </div>
                      <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded-full">+12%</span>
                    </div>
                    <p className="text-sm font-medium text-slate-500">{stat.title}</p>
                    <h3 className="text-2xl font-bold text-slate-900 mt-1">{stat.value}</h3>
                  </div>
                  <div className={`h-1 w-full ${stat.color.replace('text', 'bg')}`} />
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Active Events List */}
            <Card className="lg:col-span-2 shadow-md border-slate-200">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Your Active Events</CardTitle>
                  <CardDescription>Manage your live ticket sales</CardDescription>
                </div>
                <Button variant="ghost" className="text-indigo-600">View All</Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[1, 2, 3].map((_, i) => (
                    <div key={i} className="flex items-center justify-between p-4 rounded-xl border border-slate-100 hover:bg-slate-50 transition-colors cursor-pointer group">
                      <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-lg bg-slate-200 overflow-hidden">
                          <img src={`https://images.unsplash.com/photo-${1500000000000 + i}?auto=format&fit=crop&q=80&w=100`} alt="Event" className="object-cover h-full w-full" />
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-900">Summer Music Festival 2024</h4>
                          <p className="text-xs text-slate-500 flex items-center gap-1">
                            <Calendar className="h-3 w-3" /> Aug 15 • <Clock className="h-3 w-3 ml-1" /> 18:00
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="hidden md:block text-right">
                          <p className="text-sm font-bold text-slate-900">428/500</p>
                          <p className="text-[10px] text-slate-400 uppercase font-bold">Tickets Sold</p>
                        </div>
                        <ChevronRight className="h-5 w-5 text-slate-300 group-hover:text-indigo-600 transition-colors" />
                      </div>
                    </div>
                  ))}
                </div>
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
                    <span className="text-sm font-medium">Agreement Signed</span>
                  </div>
                  <div className="pt-4 border-t border-indigo-500">
                    <Button variant="secondary" className="w-full bg-white text-indigo-600 hover:bg-indigo-50">
                      <Settings className="h-4 w-4 mr-2" /> Merchant Settings
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-md border-slate-200">
                <CardHeader>
                  <CardTitle className="text-sm font-bold">Payout Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-500">Next Payout</span>
                    <span className="font-bold">Oct 15, 2024</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-500">Pending Amount</span>
                    <span className="font-bold text-indigo-600">$12,450.00</span>
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