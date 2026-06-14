"use client";

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { 
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { showSuccess, showError } from "@/utils/toast";
import { 
  CreditCard, Loader2, Building2, Briefcase, 
  Calendar, Pencil, X, Plus, Shield, 
  Smartphone, Monitor, Users, DollarSign, RefreshCcw
} from 'lucide-react';

const API_URL = 'http://localhost:5000/api';

const subscriptionSchema = z.object({
  merchant_id: z.string().min(1, "Merchant is required"),
  subscription_id: z.string().optional().or(z.literal('')),
  merchant_service_id: z.string().min(1, "Service is required"),
  start_date: z.string().min(1, "Start date is required"),
  end_date: z.string().min(1, "End date is required"),
  ticket_encryption_key: z.string().max(500).optional().or(z.literal('')),
  secret_key: z.string().max(50).optional().or(z.literal('')),
  secret_value: z.string().max(50).optional().or(z.literal('')),
  allowed_scanning_device: z.string().regex(/^\d*$/, "Must be a number").optional().or(z.literal('')),
  allowed_pos_device: z.string().regex(/^\d*$/, "Must be a number").optional().or(z.literal('')),
  allowed_staff_login: z.string().regex(/^\d*$/, "Must be a number").optional().or(z.literal('')),
  convinience_fee: z.string().regex(/^\d*\.?\d*$/, "Must be a valid amount").optional().or(z.literal('')),
  ticket_refund_sw: z.boolean().default(false),
  status_sw: z.boolean().default(true),
  update_by: z.string().default("1")
});

type SubscriptionFormValues = z.infer<typeof subscriptionSchema>;

const MerchantSubscription = () => {
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);

  const form = useForm<SubscriptionFormValues>({
    resolver: zodResolver(subscriptionSchema),
    defaultValues: {
      merchant_id: '',
      subscription_id: '',
      merchant_service_id: '',
      start_date: '',
      end_date: '',
      ticket_encryption_key: '',
      secret_key: '',
      secret_value: '',
      allowed_scanning_device: '1',
      allowed_pos_device: '1',
      allowed_staff_login: '5',
      convinience_fee: '0.00',
      ticket_refund_sw: false,
      status_sw: true,
      update_by: '1'
    }
  });

  const getAuthHeader = () => {
    const token = localStorage.getItem('token');
    return token ? { 'Authorization': `Bearer ${token}` } : {};
  };

  // Queries
  const { data: subscriptions, isLoading: isLoadingSubs } = useQuery({
    queryKey: ['merchant-subscriptions'],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/merchant-subscriptions`, {
        headers: { ...getAuthHeader() }
      });
      if (!res.ok) throw new Error('Failed to fetch subscriptions');
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

  const { data: services } = useQuery({
    queryKey: ['merchant-services'],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/merchant-services`, {
        headers: { ...getAuthHeader() }
      });
      return (await res.json()).data;
    }
  });

  const mutation = useMutation({
    mutationFn: async (data: SubscriptionFormValues) => {
      const payload = {
        ...data,
        merchant_id: parseInt(data.merchant_id),
        subscription_id: data.subscription_id ? parseInt(data.subscription_id) : null,
        merchant_service_id: parseInt(data.merchant_service_id),
        allowed_scanning_device: data.allowed_scanning_device ? parseInt(data.allowed_scanning_device) : null,
        allowed_pos_device: data.allowed_pos_device ? parseInt(data.allowed_pos_device) : null,
        allowed_staff_login: data.allowed_staff_login ? parseInt(data.allowed_staff_login) : null,
        convinience_fee: data.convinience_fee ? parseFloat(data.convinience_fee) : null,
        update_by: parseInt(data.update_by)
      };

      const url = editingId ? `${API_URL}/merchant-subscriptions/${editingId}` : `${API_URL}/merchant-subscriptions`;
      const method = editingId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 
          'Content-Type': 'application/json',
          ...getAuthHeader()
        },
        body: JSON.stringify(payload)
      });
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Operation failed');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['merchant-subscriptions'] });
      showSuccess(editingId ? 'Subscription updated!' : 'Subscription created!');
      setEditingId(null);
      form.reset();
    },
    onError: (error: any) => showError(error.message)
  });

  const onSubmit = (data: SubscriptionFormValues) => {
    mutation.mutate(data);
  };

  const handleEdit = (sub: any) => {
    setEditingId(sub.id);
    form.reset({
      ...sub,
      merchant_id: sub.merchant_id.toString(),
      subscription_id: sub.subscription_id?.toString() || '',
      merchant_service_id: sub.merchant_service_id.toString(),
      allowed_scanning_device: sub.allowed_scanning_device?.toString() || '',
      allowed_pos_device: sub.allowed_pos_device?.toString() || '',
      allowed_staff_login: sub.allowed_staff_login?.toString() || '',
      convinience_fee: sub.convinience_fee?.toString() || '',
      update_by: '1'
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar />
      
      <main className="flex-grow container px-4 md:px-8 py-12">
        <div className="flex flex-col gap-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Merchant Subscriptions</h1>
              <p className="text-slate-500">Manage merchant plans, device limits, and service access</p>
            </div>
            {editingId && (
              <Button variant="outline" onClick={() => { setEditingId(null); form.reset(); }} className="gap-2">
                <X className="h-4 w-4" /> Cancel Edit
              </Button>
            )}
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="grid grid-cols-1 xl:grid-cols-3 gap-8">
              <Card className="xl:col-span-2 shadow-lg border-indigo-100">
                <CardHeader className="bg-indigo-50/30 border-b">
                  <CardTitle className="flex items-center gap-2 text-indigo-700">
                    <CreditCard className="h-5 w-5" />
                    Subscription Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-8 space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="merchant_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Merchant *</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select Merchant" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {merchants?.map((m: any) => (
                                <SelectItem key={m.id} value={m.id.toString()}>{m.organization_name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="merchant_service_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Merchant Service *</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select Service" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {services?.map((s: any) => (
                                <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="start_date"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Start Date *</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="end_date"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>End Date *</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                      <Shield className="h-4 w-4" /> Security & Encryption
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <FormField
                        control={form.control}
                        name="ticket_encryption_key"
                        render={({ field }) => (
                          <FormItem className="md:col-span-3">
                            <FormLabel>Ticket Encryption Key</FormLabel>
                            <FormControl>
                              <Input placeholder="RSA/AES Key String" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="secret_key"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Secret Key</FormLabel>
                            <FormControl>
                              <Input placeholder="API Key Name" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="secret_value"
                        render={({ field }) => (
                          <FormItem className="md:col-span-2">
                            <FormLabel>Secret Value</FormLabel>
                            <FormControl>
                              <Input type="password" placeholder="••••••••" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                      <Monitor className="h-4 w-4" /> Usage Limits
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <FormField
                        control={form.control}
                        name="allowed_scanning_device"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="flex items-center gap-2">
                              <Smartphone className="h-3.5 w-3.5" /> Scanning Devices
                            </FormLabel>
                            <FormControl>
                              <Input type="number" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="allowed_pos_device"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="flex items-center gap-2">
                              <Monitor className="h-3.5 w-3.5" /> POS Devices
                            </FormLabel>
                            <FormControl>
                              <Input type="number" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="allowed_staff_login"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="flex items-center gap-2">
                              <Users className="h-3.5 w-3.5" /> Staff Logins
                            </FormLabel>
                            <FormControl>
                              <Input type="number" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="space-y-8">
                <Card className="shadow-lg border-indigo-100">
                  <CardHeader className="bg-slate-900 text-white">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <DollarSign className="h-5 w-5" /> Fees & Policies
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-6 space-y-6">
                    <FormField
                      control={form.control}
                      name="convinience_fee"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Convenience Fee (per ticket)</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                              <Input className="pl-10" placeholder="0.00" {...field} />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <div className="pt-4 space-y-4 border-t">
                      <FormField
                        control={form.control}
                        name="ticket_refund_sw"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <FormLabel className="flex items-center gap-2 font-normal cursor-pointer">
                              <RefreshCcw className="h-4 w-4" /> Allow Ticket Refunds
                            </FormLabel>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="status_sw"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <FormLabel className="font-normal cursor-pointer">
                              Subscription Active
                            </FormLabel>
                          </FormItem>
                        )}
                      />
                    </div>
                  </CardContent>
                </Card>

                <Button 
                  type="submit" 
                  className="w-full bg-indigo-600 hover:bg-indigo-700 h-14 text-lg font-bold rounded-2xl shadow-lg shadow-indigo-100"
                  disabled={mutation.isPending}
                >
                  {mutation.isPending ? <Loader2 className="animate-spin" /> : (editingId ? 'Update Subscription' : 'Activate Subscription')}
                </Button>
              </div>
            </form>
          </Form>

          <Card className="shadow-md border-slate-200">
            <CardHeader>
              <CardTitle>Subscription Directory</CardTitle>
              <CardDescription>Active and historical merchant subscriptions</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingSubs ? (
                <div className="flex justify-center py-20"><Loader2 className="animate-spin text-indigo-600" /></div>
              ) : (
                <div className="rounded-xl border overflow-hidden">
                  <Table>
                    <TableHeader className="bg-slate-50">
                      <TableRow>
                        <TableHead>Merchant & Service</TableHead>
                        <TableHead>Validity</TableHead>
                        <TableHead>Limits (S/P/U)</TableHead>
                        <TableHead>Fee</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {subscriptions?.map((sub: any) => (
                        <TableRow key={sub.id} className="hover:bg-slate-50/50 transition-colors">
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-bold text-slate-900">
                                {merchants?.find((m: any) => m.id === sub.merchant_id)?.organization_name || `Merchant ${sub.merchant_id}`}
                              </span>
                              <span className="text-xs text-indigo-600 font-medium">
                                {services?.find((s: any) => s.id === sub.merchant_service_id)?.name || `Service ${sub.merchant_service_id}`}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-xs">
                            <div className="flex items-center gap-1 text-slate-600">
                              <Calendar className="h-3 w-3" /> {sub.start_date} to {sub.end_date}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2 text-xs font-mono">
                              <span title="Scanning Devices" className="bg-slate-100 px-1.5 py-0.5 rounded">{sub.allowed_scanning_device}</span>
                              <span title="POS Devices" className="bg-slate-100 px-1.5 py-0.5 rounded">{sub.allowed_pos_device}</span>
                              <span title="Staff Logins" className="bg-slate-100 px-1.5 py-0.5 rounded">{sub.allowed_staff_login}</span>
                            </div>
                          </TableCell>
                          <TableCell className="font-medium text-slate-900">
                            ₹{sub.convinience_fee}
                          </TableCell>
                          <TableCell>
                            <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${sub.status_sw ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>
                              {sub.status_sw ? 'ACTIVE' : 'INACTIVE'}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="icon" onClick={() => handleEdit(sub)} className="text-indigo-600 hover:bg-indigo-50">
                              <Pencil className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default MerchantSubscription;