"use client";

import React, { useState, useEffect } from 'react';
import { Search, Ticket, User, Menu, Users as UsersIcon, Store, LogIn, LogOut, Loader2 } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Link } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { showSuccess, showError } from "@/utils/toast";

const API_URL = 'http://localhost:5000/api';

const Navbar = () => {
  const [user, setUser] = useState<any>(null);
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loginData, setLoginData] = useState({ email: '', password: '' });

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) setUser(JSON.parse(storedUser));
    
    // Listen for storage changes to sync across tabs/components
    const handleStorageChange = () => {
      const updatedUser = localStorage.getItem('user');
      setUser(updatedUser ? JSON.parse(updatedUser) : null);
    };
    
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const res = await fetch(`${API_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginData)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      setUser(data.user);
      setIsLoginOpen(false);
      showSuccess('Welcome back!');
      // Dispatch event to notify other components
      window.dispatchEvent(new Event('storage'));
    } catch (err: any) {
      showError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch(`${API_URL}/logout`, { method: 'POST' });
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      setUser(null);
      showSuccess('Signed out successfully');
      // Dispatch event to notify other components
      window.dispatchEvent(new Event('storage'));
    } catch (err: any) {
      showError('Error signing out');
    }
  };

  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between px-4 md:px-8">
        <Link to="/" className="flex items-center gap-2">
          <div className="bg-indigo-600 p-1.5 rounded-lg">
            <Ticket className="h-6 w-6 text-white" />
          </div>
          <span className="text-xl font-bold tracking-tight text-indigo-600 hidden sm:inline-block">
            SimplyTicketz
          </span>
        </Link>

        <div className="hidden md:flex flex-1 max-w-md mx-8">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search events, artists, or venues..." 
              className="pl-10 bg-muted/50 border-none focus-visible:ring-indigo-500 rounded-full"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 md:gap-4">
          <Button variant="ghost" size="icon" className="md:hidden">
            <Search className="h-5 w-5" />
          </Button>
          
          <div className="hidden sm:flex items-center gap-2">
            <Link to="/users">
              <Button variant="ghost" className="font-medium gap-2">
                <UsersIcon className="h-4 w-4" />
                Users
              </Button>
            </Link>
            <Link to="/merchants">
              <Button variant="ghost" className="font-medium gap-2">
                <Store className="h-4 w-4" />
                Merchants
              </Button>
            </Link>
          </div>

          {user ? (
            <div className="flex items-center gap-2">
              <div className="hidden lg:flex flex-col items-end mr-2">
                <span className="text-xs font-bold text-slate-900 truncate max-w-[150px]">{user.email}</span>
                <span className="text-[10px] text-slate-500 uppercase tracking-wider">Role: {user.role}</span>
              </div>
              <Button variant="outline" size="icon" className="rounded-full" onClick={handleLogout} title="Sign Out">
                <LogOut className="h-4 w-4 text-red-500" />
              </Button>
            </div>
          ) : (
            <Dialog open={isLoginOpen} onOpenChange={setIsLoginOpen}>
              <DialogTrigger asChild>
                <Button variant="default" className="bg-indigo-600 hover:bg-indigo-700 rounded-full px-6">
                  <LogIn className="h-4 w-4 mr-2" />
                  Sign In
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[400px]">
                <DialogHeader>
                  <DialogTitle className="text-2xl font-bold text-center">Sign In</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleLogin} className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label htmlFor="nav-email">Email</Label>
                    <Input 
                      id="nav-email" 
                      type="email" 
                      placeholder="name@example.com" 
                      required 
                      value={loginData.email}
                      onChange={(e) => setLoginData({...loginData, email: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="nav-password">Password</Label>
                    <Input 
                      id="nav-password" 
                      type="password" 
                      required 
                      value={loginData.password}
                      onChange={(e) => setLoginData({...loginData, password: e.target.value})}
                    />
                  </div>
                  <Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700" disabled={isLoading}>
                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Sign In'}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          )}

          <Button variant="ghost" size="icon" className="md:hidden">
            <Menu className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;