"use client";

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  FormDescription,
} from "@/components/ui/form";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { showSuccess, showError } from "@/utils/toast";
import { Ticket, Loader2, IndianRupee, Pencil, X, AlertCircle, Info, Users } from 'lucide-react';

const API_URL = 'http://localhost:5000/api';

const categorySchema = z.object({
  merchant_service_id: z.string().min(1, "Service is required"),
  name: z.string().min(1, "Name is required").max(100),
  timeslot_id: z.string().optional().or(z.literal('')),
  total_ticket_count: z.string().regex(/^\d*$/).optional().or(z.literal('')),
  age_restriction_sw: z.boolean().default(false),
  child_age_limit: z.string().regex(/^\d*$/).optional().or(z.literal('')),
  free_age_limit: z.string().regex(/^\d*$/).optional().or(z.literal('')),
  adult_price: z.string().min(1, "Price is required").regex(/^\d*\.?\d*$/),
  child_price: z.string().regex(/^\d*\.?\d*$/).optional().or(z.literal('')),
  special_instruction: z.string().max(100).optional().or(z.literal('')),
  status_sw: z.boolean().default(true),
  update_by: z.string().default("1")
});

type CategoryFormValues = z.infer<typeof categorySchema>;

interface CategoryTabProps {
  serviceId: string | null;
}

const CategoryTab = ({ serviceId }: CategoryTabProps) => {
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);

  const form = useForm<CategoryFormValues>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      merchant_service_id: serviceId || '',
      name: '', timeslot_id: '', total_ticket_count: '',
      age_restriction_sw: false, child_age_limit: '', free_age_limit: '',
      adult_price: '0.00', child_price: '', special_instruction: '',
      status_sw: true, update_by: '1'
    }
  });

  React.useEffect(() => {
    if (serviceId) form.setValue('merchant_service_id', serviceId);
  }, [serviceId, form]);

  const getAuthHeader = () => ({ 'Authorization': `Bearer ${localStorage.getItem('token')}` });

  // Fetch service to get merchant_id for timeslots
  const { data: service } = useQuery({
    queryKey: ['merchant-service', serviceId],
    queryFn: async () => {
      if (!serviceId) return null;
      const res = await fetch(`${API_URL}/merchant-services`, { headers: getAuthHeader() });
      const data = await res.json();
      return data.data.find((s: any) => s.id.toString() === serviceId);
    },
    enabled: !!serviceId
  });

  // Fetch timeslots for the merchant
  const { data: timeslots } = useQuery({
    queryKey: ['ticket-timeslots', service?.merchant_id],
    queryFn: async () => {
      if (!service?.merchant_id) return [];
      const res = await fetch(`${API_URL}/ticket-timeslots?merchantId=${service.merchant_id}`, { headers: getAuthHeader() });
      return (await res.json()).data;
    },
    enabled: !!service?.merchant_id
  });

  const { data: categories, isLoading } = useQuery({
    queryKey: ['ticket-categories', serviceId],
    queryFn: async () => {
      const url = serviceId ? `${API_URL}/ticket-categories?merchantServiceId=${serviceId}` : `${API_URL}/ticket-categories`;
      const res = await fetch(url, { headers: getAuthHeader() });
      return (await res.json()).data;
    }
  });

  const mutation = useMutation({
    mutationFn: async (data: CategoryFormValues) => {
      const payload = {
        ...data,
        merchant_service_id: parseInt(data.merchant_service_id),
        timeslot_id: data.timeslot_id ? parseInt(data.timeslot_id) : null,
        total_ticket_count: data.total_ticket_count ? parseInt(data.total_ticket_count) : null,
        child_age_limit: data.child_age_limit ? parseInt(data.child_age_limit) : null,
        free_age_limit: data.free_age_limit ? parseInt(data.free_age_limit) : null,
        adult_price: parseFloat(data.adult_price),
        child_price: data.child_price ? parseFloat(data.child_price) : null,
        update_by: parseInt(data.update_by)
      };
      const url = editingId ? `${API_URL}/ticket-categories/${editingId}` : `${API_URL}/ticket-categories`;
      const res = await fetch(url, {
        method: editingId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error('Operation failed');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket-categories'] });
      showSuccess('Category saved!');
      setEditingId(null);
      form.reset({ merchant_service_id: serviceId || '' });
    },
    onError: (error: any) => showError(error.message)
  });

  if (!serviceId) {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
        <AlertCircle className="h-12 w-12 text-slate-300 mb-4" />
        <h3 className="text-lg font-bold text-slate-900">No Service Selected</h3>
        <p className="text-slate-500">Please select a service from the Services tab first.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
      <Card className="xl:col-span-1 shadow-md border-indigo-100 h-fit">
        <CardHeader className="bg-indigo-50/30 border-b">
          <CardTitle className="flex items-center gap-2 text-indigo-700">
            <Ticket className="h-5 w-5" /> 
            {editingId ? 'Edit Category' : 'Add Category'}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit((data) => mutation.mutate(data))} className="space-y-6">
              <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem>
                  <FormLabel>Activity Name *</FormLabel>
                  <FormControl><Input placeholder="e.g. General Admission" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="timeslot_id" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Timeslot</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Select Slot" /></SelectTrigger></FormControl>
                      <SelectContent>
                        {timeslots?.map((ts: any) => (
                          <SelectItem key={ts.id} value={ts.id.toString()}>{ts.name} ({ts.start}-{ts.end})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )} />
                <FormField control={form.control} name="total_ticket_count" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Total Capacity</FormLabel>
                    <FormControl><Input type="number" placeholder="0 for unlimited" {...field} /></FormControl>
                  </FormItem>
                )} />
              </div>

              <div className="space-y-4 p-4 bg-slate-50 rounded-xl border">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                  <Users className="h-3.5 w-3.5" /> Pricing & Age Limits
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="adult_price" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Adult Price *</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                          <Input className="pl-10" {...field} />
                        </div>
                      </FormControl>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="child_price" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Child Price</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                          <Input className="pl-10" {...field} />
                        </div>
                      </FormControl>
                    </FormItem>
                  )} />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="child_age_limit" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Child Age Limit</FormLabel>
                      <FormControl><Input type="number" placeholder="e.g. 12" {...field} /></FormControl>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="free_age_limit" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Free Age Limit</FormLabel>
                      <FormControl><Input type="number" placeholder="e.g. 5" {...field} /></FormControl>
                    </FormItem>
                  )} />
                </div>

                <FormField control={form.control} name="age_restriction_sw" render={({ field }) => (
                  <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                    <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                    <FormLabel className="font-normal cursor-pointer">Enable Age Restrictions</FormLabel>
                  </FormItem>
                )} />
              </div>

              <FormField control={form.control} name="special_instruction" render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2"><Info className="h-4 w-4" /> Special Instructions</FormLabel>
                  <FormControl><Input placeholder="e.g. Bring valid ID" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="status_sw" render={({ field }) => (
                <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                  <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                  <FormLabel className="font-normal cursor-pointer">Active Category</FormLabel>
                </FormItem>
              )} />

              <div className="flex gap-3 pt-2">
                <Button type="submit" className="flex-1 bg-indigo-600" disabled={mutation.isPending}>
                  {mutation.isPending ? <Loader2 className="animate-spin" /> : 'Save Category'}
                </Button>
                {editingId && (
                  <Button variant="outline" onClick={() => { setEditingId(null); form.reset({ merchant_service_id: serviceId || '' }); }}>
                    Cancel
                  </Button>
                )}
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      <Card className="xl:col-span-2 shadow-md border-slate-200">
        <CardHeader>
          <CardTitle>Categories for Selected Service</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-10"><Loader2 className="animate-spin text-indigo-600" /></div>
          ) : (
            <div className="rounded-xl border overflow-hidden">
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow>
                    <TableHead>Category Name</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Limits</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {categories?.map((cat: any) => (
                    <TableRow key={cat.id} className="hover:bg-slate-50/50 transition-colors">
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-900">{cat.name}</span>
                          {cat.special_instruction && <span className="text-[10px] text-slate-400 italic">{cat.special_instruction}</span>}
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">
                      ₹{cat.adult_price} / ₹{cat.child_price || '0.00'}
                      </TableCell>
                      <TableCell className="text-xs text-slate-500">
                        <div className="flex flex-col gap-1">
                          <span>Cap: {cat.total_ticket_count || '∞'}</span>
                          <span>Age: {cat.free_age_limit || 0}-{cat.child_age_limit || 0}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${cat.status_sw ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>
                          {cat.status_sw ? 'ACTIVE' : 'INACTIVE'}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" className="text-indigo-600" onClick={() => { setEditingId(cat.id); form.reset({
                          ...cat,
                          merchant_service_id: cat.merchant_service_id.toString(),
                          timeslot_id: cat.timeslot_id?.toString() || '',
                          total_ticket_count: cat.total_ticket_count?.toString() || '',
                          child_age_limit: cat.child_age_limit?.toString() || '',
                          free_age_limit: cat.free_age_limit?.toString() || '',
                          adult_price: cat.adult_price.toString(),
                          child_price: cat.child_price?.toString() || '',
                          update_by: '1'
                        }); }}>
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
  );
};

export default CategoryTab;