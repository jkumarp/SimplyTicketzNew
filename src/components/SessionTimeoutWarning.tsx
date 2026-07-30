"use client";

import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { getSessionExpiry, getAuthHeader } from "@/utils/common";
import { API_URL } from "@/config";
import { showSuccess, showError } from "@/utils/toast";
import { AlertCircle, Clock, Loader2 } from "lucide-react";

const SessionTimeoutWarning = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const navigate = useNavigate();
  // Tracks whether the user explicitly dismissed the warning (X button /
  // Escape) so the interval below doesn't force it back open every tick.
  // Reset whenever the session is extended past the warning window.
  const dismissedRef = useRef(false);

  useEffect(() => {
    const checkInterval = setInterval(() => {
      const exp = getSessionExpiry();
      if (!exp) {
        setIsOpen(false);
        return;
      }

      const now = Math.floor(Date.now() / 1000);
      const remainingSeconds = exp - now;

      // Log out automatically if session has already expired
      if (remainingSeconds <= 0) {
        clearInterval(checkInterval);
        setIsOpen(false);
        sessionStorage.removeItem("token");
        sessionStorage.removeItem("user");
        window.dispatchEvent(new Event("storage"));
        showError("Your session has expired. Please sign in again.");
        navigate("/");
        return;
      }

      // Show warning popup in the last 5 minutes (300 seconds)
      if (remainingSeconds <= 300) {
        setTimeLeft(remainingSeconds);
        if (!dismissedRef.current) {
          setIsOpen(true);
        }
      } else {
        // Session is healthy again (e.g. just refreshed) - clear the
        // dismissal so the warning can show again next time it's due.
        dismissedRef.current = false;
        setIsOpen(false);
      }
    }, 1000);

    return () => clearInterval(checkInterval);
  }, [navigate]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const res = await fetch(`${API_URL}/refresh-token`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeader(),
        },
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Token refresh failed");

      // Set refreshed token. The backend returns the decoded user payload
      // alongside it, so we never need to decrypt/verify the JWE/JWT
      // ourselves - doing that client-side would require shipping the
      // JWT/JWE secrets to the browser, letting anyone forge a session.
      sessionStorage.setItem("token", data.token);
      sessionStorage.setItem("user", JSON.stringify(data.user));
      window.dispatchEvent(new Event("storage"));

      dismissedRef.current = false;
      setIsOpen(false);
      showSuccess("Session extended successfully!");
    } catch (err: any) {
      showError(err.message || "Could not extend your session");
      handleLogout();
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem("token");
    sessionStorage.removeItem("user");
    window.dispatchEvent(new Event("storage"));
    setIsOpen(false);
    navigate("/");
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        setIsOpen(open);
        if (!open) dismissedRef.current = true;
      }}
    >
      <DialogContent className="sm:max-w-[400px] rounded-3xl p-6" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader className="flex flex-col items-center justify-center text-center space-y-3">
          <div className="bg-amber-100 p-3 rounded-full text-amber-600 animate-pulse">
            <Clock className="h-6 w-6" />
          </div>
          <DialogTitle className="text-xl font-bold text-slate-900">
            Session Expiring Soon
          </DialogTitle>
          <DialogDescription className="text-slate-500">
            For security, your active session is about to expire in:
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center justify-center py-4">
          <span className="text-4xl font-extrabold text-indigo-600 font-mono tracking-wider">
            {formatTime(timeLeft)}
          </span>
        </div>

        <DialogFooter className="flex flex-col sm:flex-row gap-2 w-full pt-4 border-t">
          <Button
            variant="outline"
            className="w-full sm:flex-1 rounded-xl text-slate-600"
            onClick={handleLogout}
            disabled={isRefreshing}
          >
            Sign Out
          </Button>
          <Button
            className="w-full sm:flex-1 bg-indigo-600 hover:bg-indigo-700 rounded-xl font-bold"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            {isRefreshing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              "Stay Signed In"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SessionTimeoutWarning;