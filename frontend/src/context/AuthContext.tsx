import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import apiClient from '../api/client';

interface Moderator {
  id: string;
  cafe_id: string;
  email: string;
  role: 'owner' | 'moderator';
  permissions: string[];
}

interface Cafe {
  id: string;
  name: string;
  location?: string;
  description?: string;
}

interface AuthContextType {
  moderator: Moderator | null;
  cafe: Cafe | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [moderator, setModerator] = useState<Moderator | null>(null);
  const [cafe, setCafe] = useState<Cafe | null>(null);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    // Load from localStorage on mount
    const savedToken = localStorage.getItem('token');
    const savedModerator = localStorage.getItem('moderator');
    const savedCafe = localStorage.getItem('cafe');

    if (savedToken && savedModerator && savedCafe) {
      setToken(savedToken);
      setModerator(JSON.parse(savedModerator));
      setCafe(JSON.parse(savedCafe));
    }
  }, []);

  const login = async (email: string, password: string) => {
    const response = await apiClient.post('/auth/login', { email, password });
    const { token: newToken, moderator: newModerator, cafe: newCafe } = response.data;

    setToken(newToken);
    setModerator(newModerator);
    setCafe(newCafe);

    localStorage.setItem('token', newToken);
    localStorage.setItem('moderator', JSON.stringify(newModerator));
    localStorage.setItem('cafe', JSON.stringify(newCafe));
  };

  const logout = () => {
    setToken(null);
    setModerator(null);
    setCafe(null);

    localStorage.removeItem('token');
    localStorage.removeItem('moderator');
    localStorage.removeItem('cafe');
  };

  return (
    <AuthContext.Provider
      value={{
        moderator,
        cafe,
        token,
        login,
        logout,
        isAuthenticated: !!token && !!moderator,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
