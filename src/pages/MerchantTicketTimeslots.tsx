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
  Clock, Loader2, Building2, Ticket, 
  Pencil, X, Plus, Hash, Activity
} from 'lucide-react';

const API_URL = 'http://localhost:5000/api';

const timeslotSchema = z.object({
  merchant_id: z.string().min(1, "Merchant is required"),
  ticket_category_id: z.string().optional().or(z.literal('')),
  name: z.string().min(1, "Name is required").max(100, "Max 100 characters"),
  start: z.string().min(1, "Start time is required"),
  end: z.string().min(1, "End time is required"),
  total_ticket_count: z.string().regex(/^\d*$/, "Must be a number").optional().or(z.literal('')),
  status_sw: z.boolean().default(true),
  update_by: z.string().default("1")
});

type TimeslotFormValues = z.infer<typeof timeslotSchema>;

const MerchantTicketTimeslots = () => {
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);

  const form = useForm<TimeslotFormValues>({
    resolver: zodResolver(timeslotSchema),
    defaultValues: {
      merchant_id: '',
      ticket_category_id: '',
      name: '',
      start: '',
      end: '',
      total_ticket_count: '',
      status_sw: true,
      update_by: '1'
    }
  });

  const getAuthHeader = () => {
    const token = localStorage.getItem('token');
    return token ? { 'Authorization': `Bearer ${token}` } : {};
  };

  // Queries
  const { data: timeslots, isLoading: isLoadingTimeslots } = useQuery({
    queryKey: ['ticket-timeslots'],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/ticket-timeslots`, {
        headers: { ...getAuthHeader() }
      });
      if (!res.ok) throw new Error('Failed to fetch timeslots');
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

  const { data: categories } = useQuery({
    queryKey: ['ticket-categories'],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/ticket-categories`, {
        headers: { ...getAuthHeader() }
      });
      return (await res.json()).data;
    }
  });

  const mutation = useMutation({
    mutationFn: async (data: TimeslotFormValues) => {
      const payload = {
        ...data,
        merchant_id: parseInt(data.merchant_id),
        ticket_category_id: data.ticket_category_id ? parseInt(data.ticket_category_id) : null,
        total_ticket_count: data.total_ticket_count ? parseInt(data.total_ticket_count) : null,
        update_by: parseInt(data.update_by)
      };

      const url = editingId ? `${API_URL}/ticket-timeslots/${editingId}` : `${API_URL}/ticket-timeslots`;
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
      queryClient.invalidateQueries({ queryKey: ['ticket-timeslots'] });
      showSuccess(editingId ? 'Timeslot updated!' : 'Timeslot created!');
      setEditingId(null);
      form.reset();
    },
    onError: (error: any) => showError(error.message)
  });

  const onSubmit = (data: TimeslotFormValues) => {
    mutation.mutate(data);
  };

  const handleEdit = (timeslot: any) => {
    setEditingId(timeslot.id);
    form.reset({
      ...timeslot,
      merchant_id: timeslot.merchant_id.toString(),
      ticket_category_id: timeslot.ticket_category_id?.toString() || '',
      total_ticket_count: timeslot.total_ticket_count?.toString() || '',
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
              <h1 className="text-3xl font-bold text-slate-900">Ticket Timeslots</h1>
              <p className="text-slate-500">Manage entry and exit time slots for your events</p>
            </div>
            {editingId && (
              <Button variant="outline" onClick={() => { setEditingId(null); form.reset(); }} className="gap-2">
                <X className="h-4 w-4" /> Cancel Edit
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
            <Card className="xl:col-span-1 shadow-lg border-indigo-100 h-fit">
              <CardHeader className="bg-indigo-50/30 border-b">
                <CardTitle className="flex items-center gap-2 text-indigo-700">
                  <Clock className="h-5 w-5" />
                  {editingId ? 'Edit Timeslot' : 'Add New Timeslot'}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Timeslot Name *</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g. Morning Session" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="start"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Start Time *</FormLabel>
                            <FormControl>
                              <Input type="time" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="end"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>End Time *</FormLabel>
                            <FormControl>
                              <Input type="time" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="total_ticket_count"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Total Ticket Capacity</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                              <Input placeholder="e.g. 500" className="pl-10" {...field} />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="ticket_category_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Ticket Category (Optional)</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select Category" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="none">None</SelectItem>
                              {categories?.map((c: any) => (
                                <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="status_sw"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center space-x-2 space-y-0 pt-2">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <FormLabel className="font-normal cursor-pointer">
                            Active Timeslot
                          </FormLabel>
                        </FormItem>
                      )}
                    />

                    <Button 
                      type="submit" 
                      className="w-full bg-indigo-600 hover:bg-indigo-700 h-12 mt-4"
                      disabled={mutation.isPending}
                    >
                      {mutation.isPending ? <Loader2 className="animate-spin" /> : (editingId ? 'Update Timeslot' : 'Create Timeslot')}
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>

            <Card className="xl:col-span-2 shadow-md border-slate-200">
              <CardHeader>
                <CardTitle>Timeslot Directory</CardTitle>
                <CardDescription>List of all entry slots across merchants</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingTimeslots ? (
                  <div className="flex justify-center py-20"><Loader2 className="animate-spin text-indigo-600" /></div>
                ) : (
                  <div className="rounded-xl border overflow-hidden">
                    <Table>
                      <TableHeader className="bg-slate-50">
                        <TableRow>
                          <TableHead>Timeslot Name</TableHead>
                          <TableHead>Merchant</TableHead>
                          <TableHead>Duration</TableHead>
                          <TableHead>Capacity</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {timeslots?.map((ts: any) => (
                          <TableRow key={ts.id} className="hover:bg-slate-50/50 transition-colors">
                            <TableCell className="font-bold text-indigo-600">{ts.name}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2 text-slate-600">
                                <Building2 className="h-3.5 w-3.5" />
                                {merchants?.find((m: any) => m.id === ts.merchant_id)?.organization_name || `ID: ${ts.merchant_id}`}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1.5 text-sm font-medium">
                                <Clock className="h-3.5 w-3.5 text-slate-400" />
                                {ts.start} - {ts.end}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1.5">
                                <Ticket className="h-3.5 w-3.5 text-slate-400" />
                                {ts.total_ticket_count || 'Unlimited'}
                              </div>
                            </TableCell>
                            <TableCell>
                              <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${ts.status_sw ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>
                                {ts.status_sw ? 'ACTIVE' : 'INACTIVE'}
                              </span>
                            </TableCell>
                            <TableCell className="text-right">
                              <Button variant="ghost" size="icon" onClick={() => handleEdit(ts)} className="text-indigo-600 hover:bg-indigo-50">
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
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default MerchantTicketTimeslots;