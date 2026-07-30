"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  Briefcase,
  CreditCard,
  LayoutDashboard,
  Loader2,
  LogIn,
  LogOut,
  Menu,
  Search,
  Store,
  Ticket,
  User,
  Users as UsersIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Link, useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { showError, showSuccess } from "@/utils/toast";
import { API_URL, RECAPTCHA_SITE_KEY } from "@/config";
import { loginSchema, collectZodErrors } from "@/lib/validationSchemas";
import Recaptcha, { RecaptchaHandle } from "@/components/Recaptcha";

const Navbar = () => {
  const [user, setUser] = useState<any>(null);
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loginData, setLoginData] = useState({ email: "", password: "" });
  const [loginErrors, setLoginErrors] = useState<Record<string, string>>({});
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const recaptchaRef = useRef<RecaptchaHandle>(null);
  const navigate = useNavigate();
  // Role 7 is a guest/customer session auto-issued by pages like
  // CustomerTicketBooking so anonymous visitors can browse and book without
  // signing in first - it shouldn't make the navbar look "signed in".
  const isAuthenticatedUser = !!user && user.role !== 7;

  useEffect(() => {
    const storedUser = sessionStorage.getItem("user");
    if (storedUser) setUser(JSON.parse(storedUser));

    const handleStorageChange = () => {
      const updatedUser = sessionStorage.getItem("user");
      setUser(updatedUser ? JSON.parse(updatedUser) : null);
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = loginSchema.safeParse(loginData);
    if (!result.success) {
      setLoginErrors(collectZodErrors(result.error));
      return;
    }
    if (!captchaToken) {
      showError("Please verify you are not a robot.");
      return;
    }
    setLoginErrors({});
    setIsLoading(true);
    try {
      const res = await fetch(`${API_URL}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...loginData, recaptchaToken: captchaToken }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      // The backend returns the decoded user payload alongside the token,
      // so the client never needs to decrypt/verify the JWE/JWT itself -
      // doing that would require shipping the JWT/JWE secrets to the
      // browser, which would let anyone forge their own session token.
      sessionStorage.setItem("token", data.token);
      sessionStorage.setItem("user", JSON.stringify(data.user));
      setUser(data.user);
      setIsLoginOpen(false);
      showSuccess("Welcome back!");

      if (data.user.role === 1) navigate("/admin/dashboard");
      else if ([2, 4, 5, 6].includes(data.user.role)) {
        navigate("/merchant/dashboard");
      }

      window.dispatchEvent(new Event("storage"));
    } catch (err: any) {
      showError(err.message);
      // reCAPTCHA tokens are single-use, so a failed attempt needs a fresh
      // verification before the next submit is allowed.
      setCaptchaToken(null);
      recaptchaRef.current?.reset();
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch(`${API_URL}/logout`, { method: "POST" });
      sessionStorage.removeItem("token");
      sessionStorage.removeItem("user");
      setUser(null);
      showSuccess("Signed out successfully");
      navigate("/");
      window.dispatchEvent(new Event("storage"));
    } catch (err: any) {
      showError("Error signing out");
    }
  };

  const getDashboardLink = () => {
    if (!user) return null;
    if (user.role === 1) return "/admin/dashboard";
    if ([2, 4, 5, 6].includes(user.role)) return "/merchant/dashboard";
    return "/";
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
              placeholder="Search events..."
              className="pl-10 bg-muted/50 border-none focus-visible:ring-indigo-500 rounded-full"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 md:gap-4">
          <div className="hidden sm:flex items-center gap-2">
            {isAuthenticatedUser && (
              <div className="flex items-center gap-2">
                <Link to={getDashboardLink() || "#"}>
                  <Button
                    variant="ghost"
                    className="font-medium gap-2 text-indigo-600"
                  >
                    <LayoutDashboard className="h-4 w-4" />Dashboard
                  </Button>
                </Link>
                {[1, 2].includes(user.role) && (
                  <Link to="/users">
                    <Button variant="ghost" className="font-medium gap-2">
                      <UsersIcon className="h-4 w-4" />Users
                    </Button>
                  </Link>
                )}
                {[1, 2, 3].includes(user.role) && (
                  <Link to="/merchants">
                    <Button variant="ghost" className="font-medium gap-2">
                      <Store className="h-4 w-4" />Merchants
                    </Button>
                  </Link>
                )}
                {[1, 2].includes(user.role) && (
                  <Link to="/merchant-services">
                    <Button variant="ghost" className="font-medium gap-2">
                      <Briefcase className="h-4 w-4" />Services
                    </Button>
                  </Link>
                )}
                {[1, 2].includes(user.role) && (
                  <Link to="/merchant-subscriptions">
                    <Button variant="ghost" className="font-medium gap-2">
                      <CreditCard className="h-4 w-4" />Subscriptions
                    </Button>
                  </Link>
                )}
              </div>
            )}
          </div>

          {isAuthenticatedUser
            ? (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  className="rounded-full"
                  onClick={handleLogout}
                  title="Sign Out"
                >
                  <LogOut className="h-4 w-4 text-red-500" />
                </Button>
              </div>
            )
            : (
              <Dialog
                open={isLoginOpen}
                onOpenChange={(open) => {
                  setIsLoginOpen(open);
                  if (!open) setCaptchaToken(null);
                }}
              >
                <DialogTrigger asChild>
                  <Button
                    variant="default"
                    className="bg-indigo-600 hover:bg-indigo-700 rounded-full px-6"
                  >
                    <LogIn className="h-4 w-4 mr-2" />Sign In
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[400px]">
                  <DialogHeader>
                    <DialogTitle className="text-2xl font-bold text-center">
                      Sign In
                    </DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleLogin} className="space-y-4 pt-4">
                    <div className="space-y-2">
                      <Label htmlFor="nav-email">Email</Label>
                      <Input
                        id="nav-email"
                        type="email"
                        maxLength={100}
                        required
                        value={loginData.email}
                        onChange={(e) =>
                          setLoginData({ ...loginData, email: e.target.value })}
                      />
                      {loginErrors.email && (
                        <p className="text-sm text-red-500">{loginErrors.email}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="nav-password">Password</Label>
                      <Input
                        id="nav-password"
                        type="password"
                        maxLength={20}
                        required
                        value={loginData.password}
                        onChange={(e) =>
                          setLoginData({
                            ...loginData,
                            password: e.target.value,
                          })}
                      />
                      {loginErrors.password && (
                        <p className="text-sm text-red-500">{loginErrors.password}</p>
                      )}
                    </div>
                    <Recaptcha
                      ref={recaptchaRef}
                      siteKey={RECAPTCHA_SITE_KEY}
                      onVerify={setCaptchaToken}
                      onExpire={() => setCaptchaToken(null)}
                    />
                    <Button
                      type="submit"
                      className="w-full bg-indigo-600"
                      disabled={isLoading || !captchaToken}
                    >
                      {isLoading
                        ? <Loader2 className="h-4 w-4 animate-spin" />
                        : "Sign In"}
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
