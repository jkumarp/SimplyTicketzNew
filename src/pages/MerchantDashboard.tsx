"use client";

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Ticket, Calendar, Users, DollarSign, 
  PlusCircle, Settings, ChevronRight,
  Clock, CheckCircle2, Loader2, Briefcase
} from 'lucide-react';

const API_URL = 'http://localhost:5000/api';

const MerchantDashboard = () => {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const merchantId = user.merchant_id;

  const getAuthHeader = () => ({ 'Authorization': `Bearer ${localStorage.getItem('token')}` });

  const { data: services, isLoading } = useQuery({
    queryKey: ['merchant-services', merchantId],
    queryFn: async () => {
      if (!merchantId) return [];
      const res = await fetch(`${API_URL}/merchant-services?merchantId=${merchantId}`, {
        headers: getAuthHeader()
      });
      if (!res.ok) throw new Error('Failed to fetch services');
      return (await res.json()).data;
    },
    enabled: !!merchantId
  });

  const stats = [
    { title: "Active Services", value: services?.length || 0, icon: Calendar, color: "text-indigo-600" },
    { title: "Tickets Sold", value: "0", icon: Ticket, color: "text-blue-600" },
    { title: "Total Revenue", value: "$0.00", icon: DollarSign, color: "text-green-600" },
    { title: "Attendees", value: "0", icon: Users, color: "text-purple-600" },
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
            <Link to="/merchant-services">
              <Button className="bg-indigo-600 hover:bg-indigo-700 gap-2 h-12 px-6 rounded-xl shadow-lg shadow-indigo-100">
                <PlusCircle className="h-5 w-5" /> Manage Services
              </Button>
            </Link>
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
                      <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded-full">+0%</span>
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
                  <CardTitle>Your Active Services</CardTitle>
                  <CardDescription>Manage your live ticket sales and bookings</CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex justify-center py-10"><Loader2 className="animate-spin text-indigo-600" /></div>
                ) : services?.length === 0 ? (
                  <div className="text-center py-10 text-slate-500">
                    <Briefcase className="h-12 w-12 mx-auto mb-4 opacity-20" />
                    <p>No services found. Create one to get started!</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {services?.map((service: any) => (
                      <div key={service.id} className="flex flex-col md:flex-row md:items-center justify-between p-5 rounded-2xl border border-slate-100 hover:border-indigo-200 hover:bg-indigo-50/30 transition-all group gap-4">
                        <div className="flex items-center gap-4">
                          <div className="h-14 w-14 rounded-xl bg-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
                            {service.logo_image_path ? (
                              <img src={service.logo_image_path} alt="" className="h-full w-full object-cover rounded-xl" />
                            ) : (
                              <Briefcase className="h-6 w-6" />
                            )}
                          </div>
                          <div>
                            <h4 className="font-bold text-slate-900 text-lg">{service.name}</h4>
                            <p className="text-xs text-slate-500 flex items-center gap-1">
                              <Clock className="h-3 w-3" /> {service.start_time} - {service.end_time}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Link to={`/merchant/book/${service.id}`}>
                            <Button variant="outline" size="sm" className="rounded-lg border-indigo-200 text-indigo-600 hover:bg-indigo-600 hover:text-white">
                              Book Tickets
                            </Button>
                          </Link>
                          <Link to={`/merchant/manage/${service.id}`}>
                            <Button size="sm" className="bg-slate-900 hover:bg-indigo-600 rounded-lg">
                              Manage Tickets
                            </Button>
                          </Link>
                        </div>
                      </div>
                    ))}
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
                    <span className="text-sm font-medium">Agreement Signed</span>
                  </div>
                  <div className="pt-4 border-t border-indigo-500">
                    <Link to="/merchants">
                      <Button variant="secondary" className="w-full bg-white text-indigo-600 hover:bg-indigo-50">
                        <Settings className="h-4 w-4 mr-2" /> Merchant Settings
                      </Button>
                    </Link>
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
                    <span className="font-bold text-indigo-600">$0.00</span>
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