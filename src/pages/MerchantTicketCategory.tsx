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
import { Textarea } from "@/components/ui/textarea";
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
  Ticket, Loader2, Briefcase, Clock, 
  Pencil, X, Plus, DollarSign, Users, 
  ShieldAlert, Info
} from 'lucide-react';

const API_URL = 'http://localhost:5000/api';

const categorySchema = z.object({
  merchant_service_id: z.string().min(1, "Service is required"),
  name: z.string().min(1, "Name is required").max(100, "Max 100 characters"),
  timeslot_id: z.string().optional().or(z.literal('')),
  total_ticket_count: z.string().regex(/^\d*$/, "Must be a number").optional().or(z.literal('')),
  age_restriction_sw: z.boolean().default(false),
  child_age_limit: z.string().regex(/^\d*$/, "Must be a number").optional().or(z.literal('')),
  free_age_limit: z.string().regex(/^\d*$/, "Must be a number").optional().or(z.literal('')),
  adult_price: z.string().min(1, "Adult price is required").regex(/^\d*\.?\d*$/, "Must be a valid amount"),
  child_price: z.string().regex(/^\d*\.?\d*$/, "Must be a valid amount").optional().or(z.literal('')),
  special_instruction: z.string().max(100, "Max 100 characters").optional().or(z.literal('')),
  status_sw: z.boolean().default(true),
  update_by: z.string().default("1")
});

type CategoryFormValues = z.infer<typeof categorySchema>;

const MerchantTicketCategory = () => {
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);

  const form = useForm<CategoryFormValues>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      merchant_service_id: '',
      name: '',
      timeslot_id: '',
      total_ticket_count: '',
      age_restriction_sw: false,
      child_age_limit: '',
      free_age_limit: '',
      adult_price: '0.00',
      child_price: '',
      special_instruction: '',
      status_sw: true,
      update_by: '1'
    }
  });

  const getAuthHeader = () => {
    const token = localStorage.getItem('token');
    return token ? { 'Authorization': `Bearer ${token}` } : {};
  };

  // Queries
  const { data: categories, isLoading: isLoadingCategories } = useQuery({
    queryKey: ['ticket-categories'],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/ticket-categories`, {
        headers: { ...getAuthHeader() }
      });
      if (!res.ok) throw new Error('Failed to fetch categories');
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

  const { data: timeslots } = useQuery({
    queryKey: ['ticket-timeslots'],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/ticket-timeslots`, {
        headers: { ...getAuthHeader() }
      });
      return (await res.json()).data;
    }
  });

  const mutation = useMutation({
    mutationFn: async (data: CategoryFormValues) => {
      const payload = {
        ...data,
        merchant_service_id: parseInt(data.merchant_service_id),
        timeslot_id: data.timeslot_id && data.timeslot_id !== 'none' ? parseInt(data.timeslot_id) : null,
        total_ticket_count: data.total_ticket_count ? parseInt(data.total_ticket_count) : null,
        child_age_limit: data.child_age_limit ? parseInt(data.child_age_limit) : null,
        free_age_limit: data.free_age_limit ? parseInt(data.free_age_limit) : null,
        adult_price: parseFloat(data.adult_price),
        child_price: data.child_price ? parseFloat(data.child_price) : null,
        update_by: parseInt(data.update_by)
      };

      const url = editingId ? `${API_URL}/ticket-categories/${editingId}` : `${API_URL}/ticket-categories`;
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
      queryClient.invalidateQueries({ queryKey: ['ticket-categories'] });
      showSuccess(editingId ? 'Category updated!' : 'Category created!');
      setEditingId(null);
      form.reset();
    },
    onError: (error: any) => showError(error.message)
  });

  const onSubmit = (data: CategoryFormValues) => {
    mutation.mutate(data);
  };

  const handleEdit = (cat: any) => {
    setEditingId(cat.id);
    form.reset({
      ...cat,
      merchant_service_id: cat.merchant_service_id.toString(),
      timeslot_id: cat.timeslot_id?.toString() || 'none',
      total_ticket_count: cat.total_ticket_count?.toString() || '',
      child_age_limit: cat.child_age_limit?.toString() || '',
      free_age_limit: cat.free_age_limit?.toString() || '',
      adult_price: cat.adult_price?.toString() || '0.00',
      child_price: cat.child_price?.toString() || '',
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
              <h1 className="text-3xl font-bold text-slate-900">Ticket Categories</h1>
              <p className="text-slate-500">Define ticket types, pricing, and restrictions for your services</p>
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
                    <Ticket className="h-5 w-5" />
                    Category Configuration
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-8 space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="merchant_service_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Associated Service *</FormLabel>
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
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Category Name *</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g. General Admission, VIP" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="timeslot_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Default Timeslot</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select Timeslot (Optional)" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="none">None</SelectItem>
                              {timeslots?.map((ts: any) => (
                                <SelectItem key={ts.id} value={ts.id.toString()}>{ts.name} ({ts.start}-{ts.end})</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="total_ticket_count"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Total Capacity</FormLabel>
                          <FormControl>
                            <Input placeholder="Unlimited if empty" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                      <DollarSign className="h-4 w-4" /> Pricing Structure
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <FormField
                        control={form.control}
                        name="adult_price"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Adult Price *</FormLabel>
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
                      <FormField
                        control={form.control}
                        name="child_price"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Child Price</FormLabel>
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
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                      <Users className="h-4 w-4" /> Age Restrictions
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <FormField
                        control={form.control}
                        name="age_restriction_sw"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center space-x-2 space-y-0 pt-8">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <FormLabel className="font-normal cursor-pointer">
                              Enable Restrictions
                            </FormLabel>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="child_age_limit"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Child Age Limit</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g. 12" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="free_age_limit"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Free Entry Age Limit</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g. 3" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  <FormField
                    control={form.control}
                    name="special_instruction"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <Info className="h-4 w-4" /> Special Instructions
                        </FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Any specific rules or info for this ticket type..." 
                            className="resize-none"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              <div className="space-y-8">
                <Card className="shadow-lg border-indigo-100">
                  <CardHeader className="bg-slate-900 text-white">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <ShieldAlert className="h-5 w-5" /> Status & Visibility
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-6">
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
                            Category Active
                          </FormLabel>
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>

                <Button 
                  type="submit" 
                  className="w-full bg-indigo-600 hover:bg-indigo-700 h-14 text-lg font-bold rounded-2xl shadow-lg shadow-indigo-100"
                  disabled={mutation.isPending}
                >
                  {mutation.isPending ? <Loader2 className="animate-spin" /> : (editingId ? 'Update Category' : 'Create Category')}
                </Button>
              </div>
            </form>
          </Form>

          <Card className="shadow-md border-slate-200">
            <CardHeader>
              <CardTitle>Category Directory</CardTitle>
              <CardDescription>All defined ticket categories across services</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingCategories ? (
                <div className="flex justify-center py-20"><Loader2 className="animate-spin text-indigo-600" /></div>
              ) : (
                <div className="rounded-xl border overflow-hidden">
                  <Table>
                    <TableHeader className="bg-slate-50">
                      <TableRow>
                        <TableHead>Category Name</TableHead>
                        <TableHead>Service</TableHead>
                        <TableHead>Pricing (A/C)</TableHead>
                        <TableHead>Capacity</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {categories?.map((cat: any) => (
                        <TableRow key={cat.id} className="hover:bg-slate-50/50 transition-colors">
                          <TableCell className="font-bold text-indigo-600">{cat.name}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2 text-slate-600">
                              <Briefcase className="h-3.5 w-3.5" />
                              {services?.find((s: any) => s.id === cat.merchant_service_id)?.name || `ID: ${cat.merchant_service_id}`}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col text-sm">
                              <span className="font-bold">${cat.adult_price}</span>
                              {cat.child_price && <span className="text-slate-400 text-xs">Child: ${cat.child_price}</span>}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1.5 text-sm">
                              <Users className="h-3.5 w-3.5 text-slate-400" />
                              {cat.total_ticket_count || 'Unlimited'}
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${cat.status_sw ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>
                              {cat.status_sw ? 'ACTIVE' : 'INACTIVE'}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="icon" onClick={() => handleEdit(cat)} className="text-indigo-600 hover:bg-indigo-50">
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

export default MerchantTicketCategory;