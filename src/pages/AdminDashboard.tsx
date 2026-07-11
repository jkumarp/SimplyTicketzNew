"use client";

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from 'react-router-dom';
import { 
  Users, Store, Ticket, TrendingUp, 
  AlertCircle, ArrowRight,
  BarChart3, Activity, MessageSquare
} from 'lucide-react';

import { API_URL } from "@/config";

const AdminDashboard = () => {
  const getAuthHeader = () => {
    const token = localStorage.getItem('token');
    return token ? { 'Authorization': `Bearer ${token}` } : {};
  };

  const { data: users } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/users`, {
        headers: { ...getAuthHeader() }
      });
      return (await res.json()).data;
    }
  });

  const { data: merchants } = useQuery({
    queryKey: ['merchants'],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/merchants`, {
        headers: { ...getAuthHeader() }
      });
      return (await res.json()).data;
    }
  });

  const { data: enquiries } = useQuery({
    queryKey: ['merchant-enquiries-count'],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/merchant-enquiries`, {
        headers: { ...getAuthHeader() }
      });
      return (await res.json()).data;
    }
  });

  const stats = [
    { title: "Total Users", value: users?.length || 0, icon: Users, color: "text-blue-600", bg: "bg-blue-50" },
    { title: "Active Merchants", value: merchants?.filter((m: any) => m.status_sw).length || 0, icon: Store, color: "text-indigo-600", bg: "bg-indigo-50" },
    { title: "New Enquiries", value: enquiries?.filter((e: any) => e.status === 'Created').length || 0, icon: MessageSquare, color: "text-purple-600", bg: "bg-purple-50" },
    { title: "Total Tickets", value: "1,284", icon: Ticket, color: "text-green-600", bg: "bg-green-50" },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar />
      
      <main className="flex-grow container px-4 md:px-8 py-12">
        <div className="flex flex-col gap-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Admin Command Center</h1>
              <p className="text-slate-500">System-wide overview and management</p>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="gap-2">
                <BarChart3 className="h-4 w-4" /> Reports
              </Button>
              <Button className="bg-indigo-600 hover:bg-indigo-700 gap-2">
                <Activity className="h-4 w-4" /> System Status
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {stats.map((stat, i) => (
              <Card key={i} className="border-none shadow-sm">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-500">{stat.title}</p>
                      <h3 className="text-2xl font-bold text-slate-900 mt-1">{stat.value}</h3>
                    </div>
                    <div className={`${stat.bg} ${stat.color} p-3 rounded-2xl`}>
                      <stat.icon className="h-6 w-6" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <Card className="lg:col-span-2 shadow-md border-slate-200">
              <CardHeader>
                <CardTitle>Management Modules</CardTitle>
                <CardDescription>Quick access to core system entities</CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Link to="/users">
                  <div className="group p-6 rounded-2xl border border-slate-100 bg-white hover:border-indigo-200 hover:shadow-md transition-all cursor-pointer">
                    <div className="flex items-center justify-between mb-4">
                      <div className="bg-blue-50 p-3 rounded-xl text-blue-600">
                        <Users className="h-6 w-6" />
                      </div>
                      <ArrowRight className="h-5 w-5 text-slate-300 group-hover:text-indigo-600 group-hover:translate-x-1 transition-all" />
                    </div>
                    <h4 className="font-bold text-slate-900">User Directory</h4>
                    <p className="text-sm text-slate-500 mt-1">Manage system users, roles, and permissions.</p>
                  </div>
                </Link>
                <Link to="/merchants">
                  <div className="group p-6 rounded-2xl border border-slate-100 bg-white hover:border-indigo-200 hover:shadow-md transition-all cursor-pointer">
                    <div className="flex items-center justify-between mb-4">
                      <div className="bg-indigo-50 p-3 rounded-xl text-indigo-600">
                        <Store className="h-6 w-6" />
                      </div>
                      <ArrowRight className="h-5 w-5 text-slate-300 group-hover:text-indigo-600 group-hover:translate-x-1 transition-all" />
                    </div>
                    <h4 className="font-bold text-slate-900">Merchant Partners</h4>
                    <p className="text-sm text-slate-500 mt-1">Onboard and verify event organizers.</p>
                  </div>
                </Link>
                <Link to="/admin/enquiries">
                  <div className="group p-6 rounded-2xl border border-slate-100 bg-white hover:border-indigo-200 hover:shadow-md transition-all cursor-pointer">
                    <div className="flex items-center justify-between mb-4">
                      <div className="bg-purple-50 p-3 rounded-xl text-purple-600">
                        <MessageSquare className="h-6 w-6" />
                      </div>
                      <ArrowRight className="h-5 w-5 text-slate-300 group-hover:text-indigo-600 group-hover:translate-x-1 transition-all" />
                    </div>
                    <h4 className="font-bold text-slate-900">Merchant Enquiries</h4>
                    <p className="text-sm text-slate-500 mt-1">Review and respond to partnership requests.</p>
                  </div>
                </Link>
              </CardContent>
            </Card>

            <Card className="shadow-md border-slate-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-indigo-600" />
                  Recent Activity
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {[1, 2, 3, 4].map((_, i) => (
                    <div key={i} className="flex gap-4">
                      <div className="h-2 w-2 rounded-full bg-indigo-400 mt-2 shrink-0" />
                      <div>
                        <p className="text-sm text-slate-900 font-medium">New merchant registration</p>
                        <p className="text-xs text-slate-500">2 hours ago • Global Events Ltd.</p>
                      </div>
                    </div>
                  ))}
                </div>
                <Button variant="ghost" className="w-full mt-6 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50">
                  View All Activity
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default AdminDashboard;