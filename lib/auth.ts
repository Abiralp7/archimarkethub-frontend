import api from './apiClient';

export type Role = 'ADMIN' | 'USER' | string;

export type Me = {
  id: string;
  email: string;
  role: Role;
};

export type AuthResponse = {
  user: Me;
  accessToken: string;
};

export async function login(email: string, password: string): Promise<AuthResponse> {
  const res = await api.post<AuthResponse>('/auth/login', { email, password });
  localStorage.setItem('access_token', res.data.accessToken);
  return res.data;
}

export async function register(email: string, password: string, role?: Role): Promise<AuthResponse> {
  const res = await api.post<AuthResponse>('/auth/register', { email, password, role });
  localStorage.setItem('access_token', res.data.accessToken);
  return res.data;
}

export async function getMe(): Promise<Me> {
  const res = await api.get<Me>('/auth/me');
  return res.data;
}

export const me = getMe; // Alias for backward compatibility

export function logout() {
  localStorage.removeItem('access_token');
}

export function isLoggedIn() {
  if (typeof window === 'undefined') return false;
  return !!localStorage.getItem('access_token');
}
