"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { User, UserRole } from "@/types";
import { api, setAuthToken, getAuthToken } from "@/lib/api";

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (data: any) => Promise<User>;
  googleLogin: (credential: any, role?: UserRole) => Promise<User>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setTokenState] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadUser() {
      const storedToken = getAuthToken();
      if (storedToken) {
        setTokenState(storedToken);
        try {
          const res = await api.getMe();
          setUser(res.user);
        } catch (err) {
          console.error("Token verification failed:", err);
          setAuthToken(null);
          setTokenState(null);
          setUser(null);
        }
      }
      setLoading(false);
    }
    loadUser();
  }, []);

  const login = async (email: string, password: string) => {
    const res = await api.login({ email, password });
    setAuthToken(res.token, res.user.role);
    setTokenState(res.token);
    setUser(res.user);
    return res.user;
  };

  const register = async (data: any) => {
    const res = await api.register(data);
    setAuthToken(res.token, res.user.role);
    setTokenState(res.token);
    setUser(res.user);
    return res.user;
  };

  const googleLogin = async (credential: any, role: UserRole = "student") => {
    const res = await api.googleLogin(credential, role);
    setAuthToken(res.token, res.user.role);
    setTokenState(res.token);
    setUser(res.user);
    return res.user;
  };

  const logout = () => {
    setAuthToken(null);
    setTokenState(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        register,
        googleLogin,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
