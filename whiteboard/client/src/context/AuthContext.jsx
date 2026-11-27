import { createContext, useContext, useEffect, useState } from 'react';
import api from '../utils/api';

const AuthContext = createContext(null);

const TOKEN_KEY = 'archboard_token';
const GUEST_KEY = 'archboard_guest';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem(TOKEN_KEY);

      if (token) {
        try {
          const { data } = await api.get('/auth/me');
          setUser({ ...data, isGuest: false });
          setLoading(false);
          return;
        } catch (error) {
          localStorage.removeItem(TOKEN_KEY);
        }
      }

      const savedGuest = localStorage.getItem(GUEST_KEY);
      if (savedGuest) {
        try {
          const parsed = JSON.parse(savedGuest);
          if (parsed && parsed.name) {
            setUser({ ...parsed, isGuest: true });
          }
        } catch (error) {
          localStorage.removeItem(GUEST_KEY);
        }
      }

      setLoading(false);
    };

    initAuth();
  }, []);

  const login = async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    localStorage.removeItem(GUEST_KEY);
    localStorage.setItem(TOKEN_KEY, data.token);
    const loggedInUser = {
      _id: data._id,
      name: data.name,
      email: data.email,
      isGuest: false,
    };
    setUser(loggedInUser);
    return loggedInUser;
  };

  const register = async (name, email, password) => {
    const { data } = await api.post('/auth/register', { name, email, password });
    localStorage.removeItem(GUEST_KEY);
    localStorage.setItem(TOKEN_KEY, data.token);
    const registeredUser = {
      _id: data._id,
      name: data.name,
      email: data.email,
      isGuest: false,
    };
    setUser(registeredUser);
    return registeredUser;
  };

  const continueAsGuest = (guestName) => {
    const trimmed = guestName && guestName.trim() ? guestName.trim() : `Guest-${Math.floor(1000 + Math.random() * 9000)}`;
    const guestUser = {
      _id: `guest-${crypto.randomUUID ? crypto.randomUUID() : Date.now()}`,
      name: trimmed,
      email: '',
      isGuest: true,
    };
    localStorage.removeItem(TOKEN_KEY);
    localStorage.setItem(GUEST_KEY, JSON.stringify(guestUser));
    setUser(guestUser);
    return guestUser;
  };

  const logout = () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(GUEST_KEY);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAuthenticated: Boolean(user),
        login,
        register,
        continueAsGuest,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
};