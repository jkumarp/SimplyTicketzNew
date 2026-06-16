"use client";

import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
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
import { showSuccess, showError } from "@/utils/toast";
import { 
  CalendarX, Loader2, Pencil, Trash2, 
  ArrowLeft, Plus, X, Calendar as CalendarIcon
} from 'lucide-react';
import { API_URL } from '@/config';

const holidaySchema = z.object({
  holiday_name: z.string().min(1, "Holiday name is required").max(200),
  holiday_date: z.string().min(1, "Date is required"),
  status_sw: z.boolean().default(true),
});

type HolidayFormValues = z.infer<typeof holidaySchema>;

const MerchantServiceHolidays = () => {
  const { serviceId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);

  const getAuthHeader = () => ({
    'Authorization': `Bearer ${localStorage.getItem('token')}`
  });

  // Fetch service details to get merchant_id
  const { data: service, isLoading: isLoadingService } = useQuery({
    queryKey: ['merchant-service', serviceId],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/merchant-services`, { headers: getAuthHeader() });
      const data = await res.json();
      return data.data.find((s: any) => s.id.toString() === serviceId);
    },
    enabled: !!serviceId
  });

  // Fetch holidays for this service
  const { data: holidays, isLoading: isLoadingHolidays } = useQuery({
    queryKey: ['merchant-service-holidays', serviceId],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/merchant-service-holidays?serviceId=${serviceId}`, {
        headers: getAuthHeader()
      });
      if (!res.ok) throw new Error('Failed to fetch holidays');
      return (await res.json()).data;
    },
    enabled: !!serviceId
  });

  const form = useForm<HolidayFormValues>({
    resolver: zodResolver(holidaySchema),
    defaultValues: {
      holiday_name: '',
      holiday_date: '',
      status_sw: true,
    }
  });

  const mutation = useMutation({
    mutationFn: async (data: HolidayFormValues) => {
      const payload = {
        ...data,
        merchant_id: service.merchant_id,
        merchant_service_id: parseInt(serviceId!),
        update_by: 1 // Assuming admin/merchant user ID 1 for now
      };

      const url = editingId 
        ? `${API_URL}/merchant-service-holidays/${editingId}` 
        : `${API_URL}/merchant-service-holidays`;
      
      const method = editingId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 
          'Content-Type': 'application/json',
          ...getAuthHeader()
        },
        body: JSON.stringify(payload)
      });
      
      if (!res.ok) throw new Error('Operation failed');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['merchant-service-holidays', serviceId] });
      showSuccess(editingId ? 'Holiday updated!' : 'Holiday added!');
      setEditingId(null);
      form.reset();
    },
    onError: (error: any) => showError(error.message)
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`${API_URL}/merchant-service-holidays/${id}`, {
        method: 'DELETE',
        headers: getAuthHeader()
      });
      if (!res.ok) throw new Error('Failed to delete holiday');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['merchant-service-holidays', serviceId] });
      showSuccess('Holiday deleted successfully');
    },
    onError: (error: any) => showError(error.message)
  });

  const onSubmit = (data: HolidayFormValues) => {
    mutation.mutate(data);
  };

  const handleEdit = (holiday: any) => {
    setEditingId(holiday.id);
    form.reset({
      holiday_name: holiday.holiday_name,
      holiday_date: holiday.holiday_date,
      status_sw: !!holiday.status_sw,
    });
  };

  if (isLoadingService) {
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

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar />
      
      <main className="flex-grow container px-4 md:px-8 py-12">
        <div className="max-w-6xl mx-auto space-y-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => navigate(-1)}
                className="rounded-full"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-3xl font-bold text-slate-900">Manage Holidays</h1>
                <p className="text-slate-500">Configure non-working days for {service?.name}</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <Card className="lg:col-span-1 shadow-md border-indigo-100 h-fit">
              <CardHeader className="bg-indigo-50/30 border-b">
                <CardTitle className="flex items-center gap-2 text-indigo-700">
                  {editingId ? <Pencil className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
                  {editingId ? 'Edit Holiday' : 'Add New Holiday'}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="holiday_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Holiday Name *</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g. Independence Day" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="holiday_date"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Date *</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
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
                            Active
                          </FormLabel>
                        </FormItem>
                      )}
                    />
                    <div className="flex gap-3 pt-2">
                      <Button 
                        type="submit" 
                        className="flex-1 bg-indigo-600 hover:bg-indigo-700"
                        disabled={mutation.isPending}
                      >
                        {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : (editingId ? 'Update' : 'Add Holiday')}
                      </Button>
                      {editingId && (
                        <Button 
                          variant="outline" 
                          onClick={() => { setEditingId(null); form.reset(); }}
                        >
                          Cancel
                        </Button>
                      )}
                    </div>
                  </form>
                </Form>
              </CardContent>
            </Card>

            <Card className="lg:col-span-2 shadow-md border-slate-200">
              <CardHeader>
                <CardTitle>Holiday List</CardTitle>
                <CardDescription>Upcoming and past holidays for this service</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingHolidays ? (
                  <div className="flex justify-center py-10">
                    <Loader2 className="h-10 w-10 animate-spin text-indigo-600" />
                  </div>
                ) : (
                  <div className="rounded-xl border overflow-hidden">
                    <Table>
                      <TableHeader className="bg-slate-50">
                        <TableRow>
                          <TableHead>Holiday Name</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {holidays?.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={4} className="text-center py-12 text-slate-400 italic">
                              No holidays configured yet
                            </TableCell>
                          </TableRow>
                        ) : (
                          holidays?.map((holiday: any) => (
                            <TableRow key={holiday.id} className="hover:bg-slate-50/50 transition-colors">
                              <TableCell className="font-bold text-slate-900">{holiday.holiday_name}</TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2 text-sm text-slate-600">
                                  <CalendarIcon className="h-4 w-4 text-slate-400" />
                                  {new Date(holiday.holiday_date).toLocaleDateString()}
                                </div>
                              </TableCell>
                              <TableCell>
                                <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${holiday.status_sw ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>
                                  {holiday.status_sw ? 'ACTIVE' : 'INACTIVE'}
                                </span>
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end gap-2">
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="text-indigo-600 hover:bg-indigo-50"
                                    onClick={() => handleEdit(holiday)}
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="text-red-500 hover:bg-red-50"
                                    onClick={() => {
                                      if (confirm('Are you sure you want to delete this holiday?')) {
                                        deleteMutation.mutate(holiday.id);
                                      }
                                    }}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
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

export default MerchantServiceHolidays;