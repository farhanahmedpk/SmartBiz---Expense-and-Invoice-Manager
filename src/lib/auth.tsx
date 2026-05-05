import React, { createContext, useContext, useState, useEffect } from 'react';

interface User {
  id: number;
  email: string;
  business_name?: string;
  name?: string;
  currency: string;
  role: 'user' | 'admin' | 'client';
  theme?: 'dark' | 'light';
  logo_url?: string;
  dashboard_config?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (token: string, user: User) => void;
  logout: () => void;
  updateUser: (user: Partial<User>) => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      if (token) {
        try {
          const role = localStorage.getItem('role');
          const endpoint = role === 'client' ? '/api/client/profile' : '/api/profile';
          const response = await fetch(endpoint, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          
          if (response.ok) {
            const text = await response.text();
            if (text) {
              const profile = JSON.parse(text);
              const extendedProfile = { ...profile, role: role || 'user' };
              setUser(extendedProfile);
              localStorage.setItem('user', JSON.stringify(extendedProfile));
            }
          } else if (response.status === 401 || response.status === 403 || response.status === 404) {
            // Token is invalid or user no longer exists
            logout();
          }
        } catch (e) {
          console.error("Failed to fetch profile:", e);
        }
      }
      setIsLoading(false);
    };

    fetchProfile();
  }, [token]);

  const login = (newToken: string, newUser: User) => {
    localStorage.setItem('token', newToken);
    localStorage.setItem('user', JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
  };

  const updateUser = (updatedFields: Partial<User>) => {
    if (user) {
      const newUser = { ...user, ...updatedFields };
      localStorage.setItem('user', JSON.stringify(newUser));
      setUser(newUser);
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, updateUser, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
