import { create } from 'zustand';

interface Owner {
  id: number;
  name: string;
  storeId: number;
  storeName: string;
  lineUserId: string;
}

interface AuthState {
  token: string | null;
  owner: Owner | null;
  isAuthenticated: boolean;
  setAuth: (token: string, owner: Owner) => void;
  clearAuth: () => void;
  initialize: () => void;
}

export const useLiffAuthStore = create<AuthState>((set) => ({
  token: null,
  owner: null,
  isAuthenticated: false,
  setAuth: (token: string, owner: Owner) => {
    localStorage.setItem('liff_token', token);
    localStorage.setItem('liff_user', JSON.stringify(owner));
    set({ token, owner, isAuthenticated: true });
  },
  clearAuth: () => {
    localStorage.removeItem('liff_token');
    localStorage.removeItem('liff_user');
    set({ token: null, owner: null, isAuthenticated: false });
  },
  initialize: () => {
    const token = localStorage.getItem('liff_token');
    const ownerStr = localStorage.getItem('liff_user');
    if (token && ownerStr) {
      const owner = JSON.parse(ownerStr);
      set({ token, owner, isAuthenticated: true });
    }
  },
}));
