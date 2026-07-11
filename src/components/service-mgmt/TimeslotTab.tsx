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
import { Clock, Loader2, Pencil, AlertCircle, Ticket, Hash } from 'lucide-react';

import { API_URL } from "@/config";
const getAuthHeader = () => ({
  "Authorization": `Bearer ${localStorage.getItem("token")}`,
});

const timeslotSchema = z.object({
  merchant_id: z.string().min(1),
  ticket_category_id: z.string().optional().or(z.literal('')),
  name: z.string().min(1, "Name is required").max(100),
  start: z.string().min(1, "Start time is required"),
  end: z.string().min(1, "End time is required"),
  total_ticket_count: z.string().regex(/^\d*$/).optional().or(z.literal('')),
  status_sw: z.boolean().default(true),
  update_by: z.string().default("1")
});

type TimeslotFormValues = z.infer<typeof timeslotSchema>;

interface TimeslotTabProps {
  serviceId: string | null;
}

const TimeslotTab = ({ serviceId }: TimeslotTabProps) => {
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);

  // Fetch service to get merchant_id
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

  // Fetch categories for this service to link to timeslots
  const { data: categories } = useQuery({
    queryKey: ['ticket-categories', serviceId],
    queryFn: async () => {
      if (!serviceId) return [];
      const res = await fetch(`${API_URL}/ticket-categories?merchantServiceId=${serviceId}`, { headers: getAuthHeader() });
      return (await res.json()).data;
    },
    enabled: !!serviceId
  });

  const form = useForm<TimeslotFormValues>({
    resolver: zodResolver(timeslotSchema),
    defaultValues: {
      merchant_id: service?.merchant_id?.toString() || '',
      ticket_category_id: '',
      name: '', start: '', end: '', total_ticket_count: '',
      status_sw: true, update_by: '1'
    }
  });

  React.useEffect(() => {
    if (service) form.setValue('merchant_id', service.merchant_id.toString());
  }, [service, form]);

  const { data: timeslots, isLoading } = useQuery({
    queryKey: ['ticket-timeslots', service?.merchant_id],
    queryFn: async () => {
      if (!service?.merchant_id) return [];
      const res = await fetch(`${API_URL}/ticket-timeslots-by-service?serviceId=${serviceId}`, { headers: getAuthHeader() });
      return (await res.json()).data;
    },
    enabled: !!service?.merchant_id
  });

  const mutation = useMutation({
    mutationFn: async (data: TimeslotFormValues) => {
      const payload = { 
        ...data, 
        merchant_id: parseInt(data.merchant_id),
        merchant_service_id:serviceId,
        ticket_category_id: data.ticket_category_id ? parseInt(data.ticket_category_id) : null,
        total_ticket_count: data.total_ticket_count ? parseInt(data.total_ticket_count) : null,
        update_by: 1 
      };
      const url = editingId ? `${API_URL}/ticket-timeslots/${editingId}` : `${API_URL}/ticket-timeslots`;
      const res = await fetch(url, {
        method: editingId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error('Operation failed');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket-timeslots'] });
      showSuccess('Timeslot saved!');
      setEditingId(null);
      form.reset({ merchant_id: service?.merchant_id?.toString() || '' });
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
            <Clock className="h-5 w-5" /> 
            {editingId ? 'Edit Timeslot' : 'Add Timeslot'}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit((data) => mutation.mutate(data))} className="space-y-4">
              <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem>
                  <FormLabel>Slot Name *</FormLabel>
                  <FormControl><Input placeholder="e.g. Morning Session" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="ticket_category_id" render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2"><Ticket className="h-4 w-4" /> Link to Category</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Select Category (Optional)" /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="none">None (All Categories)</SelectItem>
                      {categories?.map((cat: any) => (
                        <SelectItem key={cat.id} value={cat.id.toString()}>{cat.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormItem>
              )} />

              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="start" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start Time *</FormLabel>
                    <FormControl><Input type="time" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="end" render={({ field }) => (
                  <FormItem>
                    <FormLabel>End Time *</FormLabel>
                    <FormControl><Input type="time" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <FormField control={form.control} name="total_ticket_count" render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2"><Hash className="h-4 w-4" /> Slot Capacity</FormLabel>
                  <FormControl><Input type="number" placeholder="Total tickets for this slot" {...field} /></FormControl>
                </FormItem>
              )} />

              <FormField control={form.control} name="status_sw" render={({ field }) => (
                <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                  <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                  <FormLabel className="font-normal cursor-pointer">Active Timeslot</FormLabel>
                </FormItem>
              )} />

              <div className="flex gap-3 pt-2">
                <Button type="submit" className="flex-1 bg-indigo-600" disabled={mutation.isPending}>
                  {mutation.isPending ? <Loader2 className="animate-spin" /> : 'Save Timeslot'}
                </Button>
                {editingId && (
                  <Button variant="outline" onClick={() => { setEditingId(null); form.reset({ merchant_id: service?.merchant_id?.toString() || '' }); }}>
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
          <CardTitle>Timeslots for Merchant</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-10"><Loader2 className="animate-spin text-indigo-600" /></div>
          ) : (
            <div className="rounded-xl border overflow-hidden">
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow>
                    <TableHead>Slot Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Capacity</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {timeslots?.map((ts: any) => (
                    <TableRow key={ts.id} className="hover:bg-slate-50/50 transition-colors">
                      <TableCell className="font-bold text-slate-900">{ts.name}</TableCell>
                      <TableCell className="text-sm text-indigo-600">
                        {categories?.find((c: any) => c.id === ts.ticket_category_id)?.name || 'All Categories'}
                      </TableCell>
                      <TableCell className="text-sm text-slate-600">{ts.start} - {ts.end}</TableCell>
                      <TableCell className="text-sm font-mono">{ts.total_ticket_count || '∞'}</TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${ts.status_sw ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>
                          {ts.status_sw ? 'ACTIVE' : 'INACTIVE'}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" className="text-indigo-600" onClick={() => { 
                          setEditingId(ts.id); 
                          form.reset({
                            ...ts,
                            merchant_id: ts.merchant_id.toString(),
                            ticket_category_id: ts.ticket_category_id?.toString() || '',
                            total_ticket_count: ts.total_ticket_count?.toString() || '',
                            update_by: '1'
                          }); 
                        }}>
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

export default TimeslotTab;