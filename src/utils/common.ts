import { Numerals } from "react-day-picker";

export interface User {
    user_id: number;
    merchant_id: number;
    role:number;
    user_fname?: string;
    email?: string;
  }
  
  export function getUser(): User {
    return JSON.parse(sessionStorage.getItem("user") || "{}");
  }
  
  export function getMerchantId(): number {
    return getUser().merchant_id;
  }
  
  export function getUserId(): number {
    return getUser().user_id;
  }

  export function getUserEmail(): string {
    return getUser().email;
  }

  export function getUserRoleId(): number {
    return getUser().role;
  }

  export function getAuthHeader() {
    return {
      Authorization: `Bearer ${sessionStorage.getItem("token")}`,
    };
  }