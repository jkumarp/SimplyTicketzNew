"use client";

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { showSuccess, showError } from "@/utils/toast";
import { UserPlus, Loader2, Mail, Phone, User as UserIcon, Lock } from 'lucide-react';

const API_URL = 'http://localhost:5000/api';

const Users = () => {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    user_fname: '',
    email: '',
    phone: '',
    password: '',
    user_type_id: '1',
    update_by: '1'
  });

  const { data: users, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/users`);
      if (!res.ok) throw new Error('Failed to fetch users');
      const json = await res.json();
      return json.data;
    }
  });

  const mutation = useMutation({
    mutationFn: async (newUser: any) => {
      const res = await fetch(`${API_URL}/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUser)
      });
      
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to create user');
      return json;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      showSuccess('User created and registered successfully!');
      setFormData({ user_fname: '', email: '', phone: '', password: '', user_type_id: '1', update_by: '1' });
    },
    onError: (error: any) => {
      showError(error.message || 'Error creating user');
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate(formData);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar />
      
      <main className="flex-grow container px-4 md:px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Add User Form */}
          <Card className="lg:col-span-1 h-fit">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-indigo-600" />
                Add New User
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Full Name</label>
                  <Input 
                    required
                    placeholder="John Doe"
                    value={formData.user_fname}
                    onChange={(e) => setFormData({...formData, user_fname: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Email</label>
                  <Input 
                    type="email"
                    required
                    placeholder="john@example.com"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input 
                      type="password"
                      required
                      placeholder="Min 6 characters"
                      className="pl-10"
                      value={formData.password}
                      onChange={(e) => setFormData({...formData, password: e.target.value})}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Phone</label>
                  <Input 
                    required
                    placeholder="1234567890"
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  />
                </div>
                <Button 
                  type="submit" 
                  className="w-full bg-indigo-600 hover:bg-indigo-700"
                  disabled={mutation.isPending}
                )
                  {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create User'}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Users List */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>User Directory</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Contact</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users?.map((user: any) => (
                        <TableRow key={user.id}>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center">
                                <UserIcon className="h-4 w-4 text-indigo-600" />
                              </div>
                              {user.user_fname}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col text-xs text-slate-500">
                              <span className="flex items-center gap-1"><Mail className="h-3 w-3" /> {user.email}</span>
                              <span className="flex items-center gap-1"><Phone className="h-3 w-3" /> {user.phone}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${user.status_sw ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-700'}`}>
                              {user.status_sw ? 'Active' : 'Inactive'}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                      {(!users || users.length === 0) && (
                        <TableRow>
                          <TableCell colSpan={3} className="text-center py-8 text-slate-500">
                            No users found.
                          </TableCell>
                        </TableRow>
                      )}
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

export default Users;