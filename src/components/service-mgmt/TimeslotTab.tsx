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
import { 
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { showSuccess, showError } from "@/utils/toast";
import { Clock, Loader2, Pencil, AlertCircle } from 'lucide-react';

const API_URL = 'http://localhost:5000/api';

const timeslotSchema = z.object({
  merchant_id: z.string().min(1),
  name: z.string().min(1).max(100),
  start: z.string().min(1),
  end: z.string().min(1),
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

  const getAuthHeader = () => ({ 'Authorization': `Bearer ${localStorage.getItem('token')}` });

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

  const form = useForm<TimeslotFormValues>({
    resolver: zodResolver(timeslotSchema),
    defaultValues: {
      merchant_id: service?.merchant_id?.toString() || '',
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
      const res = await fetch(`${API_URL}/ticket-timeslots?merchantId=${service.merchant_id}`, { headers: getAuthHeader() });
      return (await res.json()).data;
    },
    enabled: !!service?.merchant_id
  });

  const mutation = useMutation({
    mutationFn: async (data: TimeslotFormValues) => {
      const payload = { ...data, merchant_id: parseInt(data.merchant_id), update_by: 1 };
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
          <CardTitle className="flex items-center gap-2 text-indigo-700"><Clock className="h-5 w-5" /> {editingId ? 'Edit Timeslot' : 'Add Timeslot'}</CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit((data) => mutation.mutate(data))} className="space-y-4">
              <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem><FormLabel>Slot Name *</FormLabel><FormControl><Input placeholder="e.g. Morning Session" {...field} /></FormControl></FormItem>
              )} />
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="start" render={({ field }) => (
                  <FormItem><FormLabel>Start Time *</FormLabel><FormControl><Input type="time" {...field} /></FormControl></FormItem>
                )} />
                <FormField control={form.control} name="end" render={({ field }) => (
                  <FormItem><FormLabel>End Time *</FormLabel><FormControl><Input type="time" {...field} /></FormControl></FormItem>
                )} />
              </div>
              <Button type="submit" className="w-full bg-indigo-600" disabled={mutation.isPending}>
                {mutation.isPending ? <Loader2 className="animate-spin" /> : 'Save Timeslot'}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      <Card className="xl:col-span-2 shadow-md border-slate-200">
        <CardHeader><CardTitle>Timeslots for Merchant</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? <Loader2 className="animate-spin mx-auto" /> : (
            <Table>
              <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Duration</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
              <TableBody>
                {timeslots?.map((ts: any) => (
                  <TableRow key={ts.id}>
                    <TableCell className="font-bold">{ts.name}</TableCell>
                    <TableCell>{ts.start} - {ts.end}</TableCell>
                    <TableCell className="text-right"><Button variant="ghost" size="icon" onClick={() => { setEditingId(ts.id); form.reset(ts); }}><Pencil className="h-4 w-4" /></Button></TableCell>
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

export default TimeslotTab;