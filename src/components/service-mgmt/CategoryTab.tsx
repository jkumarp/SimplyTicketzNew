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
} from "@/components/ui/form";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { showSuccess, showError } from "@/utils/toast";
import { Ticket, Loader2, DollarSign, Pencil, X, AlertCircle } from 'lucide-react';

const API_URL = 'http://localhost:5000/api';

const categorySchema = z.object({
  merchant_service_id: z.string().min(1, "Service is required"),
  name: z.string().min(1, "Name is required").max(100),
  timeslot_id: z.string().optional().or(z.literal('')),
  total_ticket_count: z.string().regex(/^\d*$/).optional().or(z.literal('')),
  age_restriction_sw: z.boolean().default(false),
  adult_price: z.string().min(1, "Price is required").regex(/^\d*\.?\d*$/),
  child_price: z.string().regex(/^\d*\.?\d*$/).optional().or(z.literal('')),
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
      age_restriction_sw: false, adult_price: '0.00', child_price: '',
      status_sw: true, update_by: '1'
    }
  });

  React.useEffect(() => {
    if (serviceId) form.setValue('merchant_service_id', serviceId);
  }, [serviceId, form]);

  const getAuthHeader = () => ({ 'Authorization': `Bearer ${localStorage.getItem('token')}` });

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
          <CardTitle className="flex items-center gap-2 text-indigo-700"><Ticket className="h-5 w-5" /> {editingId ? 'Edit Category' : 'Add Category'}</CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit((data) => mutation.mutate(data))} className="space-y-4">
              <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem><FormLabel>Category Name *</FormLabel><FormControl><Input placeholder="e.g. General Admission" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="adult_price" render={({ field }) => (
                  <FormItem><FormLabel>Adult Price *</FormLabel><FormControl><div className="relative"><DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" /><Input className="pl-10" {...field} /></div></FormControl></FormItem>
                )} />
                <FormField control={form.control} name="child_price" render={({ field }) => (
                  <FormItem><FormLabel>Child Price</FormLabel><FormControl><div className="relative"><DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" /><Input className="pl-10" {...field} /></div></FormControl></FormItem>
                )} />
              </div>
              <Button type="submit" className="w-full bg-indigo-600" disabled={mutation.isPending}>
                {mutation.isPending ? <Loader2 className="animate-spin" /> : 'Save Category'}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      <Card className="xl:col-span-2 shadow-md border-slate-200">
        <CardHeader><CardTitle>Categories for Selected Service</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? <Loader2 className="animate-spin mx-auto" /> : (
            <Table>
              <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Price (A/C)</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
              <TableBody>
                {categories?.map((cat: any) => (
                  <TableRow key={cat.id}>
                    <TableCell className="font-bold">{cat.name}</TableCell>
                    <TableCell>${cat.adult_price} / ${cat.child_price || '0'}</TableCell>
                    <TableCell className="text-right"><Button variant="ghost" size="icon" onClick={() => { setEditingId(cat.id); form.reset(cat); }}><Pencil className="h-4 w-4" /></Button></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default CategoryTab;