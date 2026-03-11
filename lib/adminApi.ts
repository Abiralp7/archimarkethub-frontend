import api from '@/lib/apiClient';

export type UploadPurpose = 
| 'PRODUCT_IMAGE' 
| 'PRODUCT_CATALOG' 
| 'COMPANY_LOGO' 
| 'COMPANY_DOCS';

export type CreateCompanyPayload = {
  name: string;
  description?: string;
  website?: string;
  logoUrl?: string;

  // Optional (only send if backend supports it)
  legalDocUrls?: string[];
};

export type CompanyStatus = 'VERIFIED' | 'PENDING' | string;

export type Company = {
  id: string;
  name: string;
  description?: string;
  website?: string;
  domain?: string;
  slug?: string;
  logoUrl?: string;
  legalDocUrls?: string[];

  ownerEmail?: string;
  email?: string;
  owner?: {
    email?: string;
  };

  // ratings
  adminRating?: number | string;
  avgRating?: number | string;
  ratingCount?: number;

  status?: CompanyStatus;
  createdAt?: string;
};

export type AdminCompaniesParams = {
  status?: CompanyStatus;
  deleted?: 'active' | 'deleted' | 'all';
  q?: string;
  skip?: number;
  take?: number;
};

export type CreateProductPayload = {
  name: string;
  description?: string;
  price?: number;
  status?: string;
  companyId: string;
};

export type UpdateProductPayload = {
  name?: string;
  description?: string;
  price?: number;
  status?: string;
  categoryId?: string;
};

export type SupplierCreateProductPayload = {
  name: string;
  description?: string;
  price?: number;
  status?: string;
  categoryId?: string;
};

export type AdminProductsParams = {
  q?: string;
  companyId?: string;
  deleted?: 'active' | 'deleted' | 'all';
  skip?: number;
  take?: number;
};

type UploadResponse =
  | { url: string }
  | { fileUrl: string }
  | { path: string }
  | { location: string }
  | { publicPath: string; filename: string; url: string }
  | { data: { url?: string; fileUrl?: string; path?: string; location?: string } };

function pickUrl(r: any): string | null {
  if (!r) return null;
  if (typeof r.url === 'string') return r.url;
  if (typeof r.fileUrl === 'string') return r.fileUrl;
  if (typeof r.path === 'string') return r.path;
  if (typeof r.location === 'string') return r.location;

  const d = r.data;
  if (d?.url) return d.url;
  if (d?.fileUrl) return d.fileUrl;
  if (d?.path) return d.path;
  if (d?.location) return d.location;

  return null;
}

/**
 * ✅ The function your UI expects:
 * import { adminUploadFile } from '@/lib/adminApi'
 */
export async function adminUploadFile(args: { file: File; purpose: UploadPurpose }) {
  const { file, purpose } = args;
  const fd = new FormData();
  fd.append("purpose", purpose);
  fd.append("file", file);

  // decide which endpoint to hit; registration has no token yet
  const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
  const endpoint = token ? '/uploads/file' : '/uploads/file/public';

  try {
    const res = await api.post(endpoint, fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    const data = res.data || {};
    const url = (data.url as string) || data.data?.url || data.publicPath || null;
    const assetId = data.id || data.assetId || data.fileAssetId || null;
    const fileType = data.mimeType || data.fileType || null;
    const fileSize = data.sizeBytes || data.fileSize || null;
    if (!url) throw new Error("Upload succeeded but no url returned");
    return { url, assetId, fileType, fileSize } as any;
  } catch (e: any) {
    const msg =
      e?.response?.data?.message ||
      e?.response?.data?.error ||
      e?.message ||
      "Upload failed";
    throw new Error(typeof msg === "string" ? msg : JSON.stringify(msg));
  }
}


/**
 * (Optional) Keep backward compatibility if other code calls uploadFile(...)
 */
export async function uploadFile(file: File, purpose: UploadPurpose) {
  return adminUploadFile({ file, purpose });
}

export async function adminCreateCompany(payload: CreateCompanyPayload) {
  const res = await api.post('/admin/companies', payload);
  return res.data;
}

export async function adminGetCompany(id: string) {
  const res = await api.get(`/admin/companies/${id}`);
  return res.data;
}

// soft-delete an active company (same route used by original UI).  
// For permanent deletion we call a separate endpoint below.
export async function adminDeleteCompany(id: string) {
  const res = await api.delete(`/admin/companies/${id}`);
  return res.data;
}

export async function adminPermanentDeleteCompany(id: string) {
  const res = await api.delete(`/admin/companies/${id}/permanent`);
  return res.data;
}

export async function adminCompanies(params: AdminCompaniesParams = {}) {
  const res = await api.get('/admin/companies', {
    params: {
      status: params.status,
      deleted: params.deleted ?? 'active',
      q: params.q,
      skip: params.skip ?? 0,
      take: params.take ?? 50,
    },
  });

  return res.data;
}

export async function adminVerifyCompany(id: string) {
  const res = await api.patch(`/admin/companies/${id}/status`, { status: 'VERIFIED' });
  return res.data;
}

export async function adminUpdateCompanyStatus(id: string, status: string) {
  const res = await api.patch(`/admin/companies/${id}/status`, { status });
  return res.data;
}

export async function adminUpdateCompany(id: string, payload: any) {
  const res = await api.patch(`/admin/companies/${id}`, payload);
  return res.data;
}

export async function adminRestoreCompany(id: string) {
  const res = await api.patch(`/admin/companies/${id}/restore`);
  return res.data;
}

export async function adminCreateProduct(payload: CreateProductPayload) {
  const res = await api.post('/admin/products', payload);
  return res.data;
}

export async function adminGetProduct(id: string) {
  const res = await api.get(`/admin/products/${id}`);
  return res.data;
}

// Supplier/Company specific endpoints
export async function supplierCreateProduct(payload: SupplierCreateProductPayload) {
  const res = await api.post('/company/products', payload);
  return res.data;
}

export async function supplierGetProducts(params?: AdminProductsParams) {
  const res = await api.get('/company/products', {
    params: {
      deleted: params?.deleted ?? 'active',
      skip: params?.skip ?? 0,
      take: params?.take ?? 50,
    },
  });
  return res.data;
}

export async function supplierGetProduct(id: string) {
  const res = await api.get(`/company/products/${id}`);
  return res.data;
}

export async function supplierUpdateProduct(id: string, payload: UpdateProductPayload) {
  const res = await api.patch(`/company/products/${id}`, payload);
  return res.data;
}

export async function supplierDeleteProduct(id: string) {
  const res = await api.delete(`/company/products/${id}`);
  return res.data;
}

export async function supplierAddProductImage(productId: string, body: { url?: string; assetId?: string; sortOrder?: number }) {
  const payload: any = {};
  if (body.url) payload.url = body.url;
  if (body.assetId) payload.assetId = body.assetId;
  if (typeof body.sortOrder === 'number') payload.sortOrder = body.sortOrder;
  const res = await api.post(`/company/products/${productId}/images`, payload);
  return res.data;
}

export async function supplierDeleteProductImage(productId: string, imageId: string) {
  const res = await api.delete(`/company/product-images/${imageId}`);
  return res.data;
}

export async function supplierAddProductCatalogue(productId: string, body: { title?: string; fileUrl?: string; assetId?: string; fileType?: string; fileSize?: number; sortOrder?: number }) {
  const payload: any = {
    title: body.title ?? 'Catalogue',
  };
  if (body.fileUrl) payload.fileUrl = body.fileUrl;
  if (body.assetId) payload.assetId = body.assetId;
  if (body.fileType) payload.fileType = body.fileType;
  if (typeof body.fileSize === 'number') payload.fileSize = body.fileSize;
  if (typeof body.sortOrder === 'number') payload.sortOrder = body.sortOrder;
  const res = await api.post(`/company/products/${productId}/catalogs`, payload);
  return res.data;
}

export async function supplierDeleteProductCatalogue(productId: string, catalogueId: string) {
  const res = await api.delete(`/company/product-catalogs/${catalogueId}`);
  return res.data;
}

// allow supplier to update their own company/profile info
export type SupplierUpdateMePayload = {
  name?: string;
  description?: string;
  website?: string;
  logoUrl?: string;
  legalDocUrls?: string[];
  phoneNumber?: string;
  countryCode?: string;
  businessAddress?: string;
};

export async function supplierUpdateMe(payload: SupplierUpdateMePayload) {
  const res = await api.patch('/company/me', payload);
  return res.data;
}

export async function adminUpdateProduct(id: string, payload: any) {
  const res = await api.patch(`/admin/products/${id}`, payload);
  return res.data;
}

export async function adminDeleteProduct(id: string) {
  const res = await api.delete(`/admin/products/${id}`);
  return res.data;
}

export async function adminPermanentDeleteProduct(id: string) {
  const res = await api.delete(`/admin/products/${id}/permanent`);
  return res.data;
}

export async function adminRestoreProduct(id: string) {
  const res = await api.patch(`/admin/products/${id}/restore`);
  return res.data;
}

export async function adminUpdateProductAdminRating(id: string, adminRating: number) {
  const res = await api.patch(`/admin/products/${id}/admin-rating`, { adminRating });
  return res.data;
}

export async function adminUpdateCompanyAdminRating(id: string, adminRating: number) {
  const res = await api.patch(`/admin/companies/${id}/admin-rating`, { adminRating });
  return res.data;
}

export async function adminProducts(params: AdminProductsParams = {}) {
  const res = await api.get('/admin/products', {
    params: {
      q: params.q,
      companyId: params.companyId,
      deleted: params.deleted,
      skip: params.skip ?? 0,
      take: params.take ?? 50,
    },
  });

  return res.data;
}

// Analytics functions
export async function adminAnalyticsDaily(params?: any) {
  try {
    const res = await api.get('/admin/analytics/daily', { params });
    return res.data;
  } catch (error) {
    console.error('adminAnalyticsDaily error', error);
    return { items: [] };
  }
}

export async function adminAnalyticsTop(params?: any) {
  try {
    const res = await api.get('/admin/analytics/top', { params });
    return res.data;
  } catch (error) {
    console.error('adminAnalyticsTop error', error);
    return { items: [] };
  }
}

// Company/supplier analytics (uses company-owned endpoints)
export async function companyAnalyticsDaily(params?: any) {
  try {
    const res = await api.get('/company/analytics/daily', { params });
    return res.data;
  } catch (error) {
    console.error('companyAnalyticsDaily error', error);
    return { items: [] };
  }
}

export async function companyAnalyticsTop(params?: any) {
  try {
    const res = await api.get('/company/analytics/top', { params });
    return res.data;
  } catch (error) {
    console.error('companyAnalyticsTop error', error);
    return [];
  }
}

export async function adminCompanyClaims(params?: any) {
  // Stub: return empty data
  const res = await api.get('/admin/company-claims', { params });
  return res.data;
}

// Review types and functions
export type ProductReview = {
  id: string;
  productId: string;
  product: {
    id: string;
    name: string;
    slug: string;
    company: {
      id: string;
      name: string;
      slug: string;
    };
  };
  userId: string;
  rating: number;
  comment?: string;
  authorName?: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
};

export type CompanyReview = {
  id: string;
  company: {
    id: string;
    name: string;
    slug?: string;
  };
  userId: string;
  rating: number;
  comment?: string;
  authorName?: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
};

export type AdminReviewsParams = {
  q?: string;
  productId?: string;
  companyId?: string;
  userId?: string;
  rating?: number;
  deleted?: 'active' | 'deleted' | 'all';
  skip?: number;
  take?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
};

export async function adminListReviews(params: AdminReviewsParams = {}) {
  const res = await api.get('/admin/reviews', {
    params: {
      q: params.q,
      productId: params.productId,
      companyId: params.companyId,
      userId: params.userId,
      rating: params.rating,
      deleted: params.deleted ?? 'all',
      skip: params.skip ?? 0,
      take: params.take ?? 50,
      sortBy: params.sortBy ?? 'createdAt',
      sortOrder: params.sortOrder ?? 'desc',
    },
  });
  return res.data;
}

// Admin: list company-level reviews
export async function adminListCompanyReviews(params: AdminReviewsParams = {}) {
  const res = await api.get('/admin/company-reviews', {
    params: {
      q: params.q,
      companyId: params.companyId,
      userId: params.userId,
      rating: params.rating,
      deleted: params.deleted ?? 'all',
      skip: params.skip ?? 0,
      take: params.take ?? 50,
      sortBy: params.sortBy ?? 'createdAt',
      sortOrder: params.sortOrder ?? 'desc',
    },
  });
  return res.data;
}

export async function adminGetCompanyReview(id: string) {
  const res = await api.get(`/admin/company-reviews/${id}`);
  return res.data;
}

export async function adminDeleteCompanyReview(id: string) {
  const res = await api.delete(`/admin/company-reviews/${id}/permanent`);
  return res.data;
}

export async function adminGetReview(id: string) {
  const res = await api.get(`/admin/reviews/${id}`);
  return res.data;
}

export async function adminDeleteReview(id: string) {
  const res = await api.delete(`/admin/reviews/${id}`);
  return res.data;
}

// Notification types and functions
export type AdminNotification = {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  read: boolean;
  createdAt: string;
  link?: string;
};

export async function adminGetNotifications(params?: { take?: number; skip?: number }) {
  try {
    const res = await api.get('/admin/notifications', {
      params: {
        take: params?.take ?? 10,
        skip: params?.skip ?? 0,
      },
    });
    return res.data;
  } catch (error) {
    // If endpoint doesn't exist or backend rejects params, return empty notifications
    return { items: [], total: 0, unread: 0 };
  }
}

export async function adminMarkNotificationAsRead(id: string) {
  try {
    const res = await api.patch(`/admin/notifications/${id}/read`);
    return res.data;
  } catch (error) {
    return { id };
  }
}

export async function adminMarkAllNotificationsAsRead() {
  try {
    const res = await api.patch('/admin/notifications/mark-all-as-read');
    return res.data;
  } catch (error) {
    return { success: false };
  }
}

export async function adminGetUnreadNotificationCount() {
  try {
    const res = await api.get('/admin/notifications/unread-count');
    return res.data;
  } catch (error) {
    return { count: 0 };
  }
}

// Per-user (supplier / regular user) notifications helper
export type Notification = {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  read: boolean;
  createdAt: string;
  link?: string;
};

export async function getMyNotifications(params?: { limit?: number; offset?: number }) {
  try {
    const res = await api.get('/notifications', {
      params: {
        skip: params?.offset ?? 0,
        take: params?.limit ?? 10,
      },
    });
    return res.data;
  } catch (error) {
    return { items: [], total: 0, unread: 0 };
  }
}

export async function markMyNotificationAsRead(id: string) {
  try {
    const res = await api.patch(`/notifications/${id}/read`);
    return res.data;
  } catch (error) {
    return { id };
  }
}

export async function markAllMyNotificationsAsRead() {
  try {
    const res = await api.patch('/notifications/read-all');
    return res.data;
  } catch (error) {
    return { success: false };
  }
}

export async function getMyUnreadNotificationCount() {
  try {
    const res = await api.get('/notifications', {
      params: { take: 1, skip: 0 },
    });
    return { count: res.data?.unread ?? 0 };
  } catch (error) {
    return { count: 0 };
  }
}

// Chat message type used by both sides
export type ChatMessage = {
  id: string;
  supplierId: string;
  sender: 'ADMIN' | 'SUPPLIER';
  content: string;
  read: boolean;
  createdAt: string;
};

// result object returned to admin listing for unread suppliers
export type UnreadSupplier = {
  supplierId: string;
  unread: number;
  name?: string;
};

// --- chat endpoints -----------------------------------------------------
export async function sendChatMessage(payload: {
  supplierId: string;
  sender: 'ADMIN' | 'SUPPLIER';
  content: string;
}) {
  const res = await api.post('/chat/messages', payload);
  return res.data as ChatMessage;
}

export async function getChatMessages(supplierId: string) {
  const res = await api.get(`/chat/messages/${supplierId}`);
  return res.data as ChatMessage[];
}

export async function getChatUnreadCount(supplierId: string) {
  const res = await api.get(`/chat/unread/${supplierId}`);
  return res.data as { count: number };
}

export async function markChatRead(supplierId: string) {
  const res = await api.post(`/chat/read/${supplierId}`);
  return res.data;
}

// admin helper: mark a particular supplier's messages as read
export async function adminMarkSupplierRead(supplierId: string) {
  const res = await api.post(`/chat/suppliers/${supplierId}/read`);
  return res.data;
}

export async function adminGetChatUnreadSuppliers() {
  const res = await api.get('/chat/suppliers/unread');
  return res.data as UnreadSupplier[];
}

export async function setChatTyping(
  supplierId: string,
  sender: 'ADMIN' | 'SUPPLIER',
  typing: boolean
) {
  const res = await api.post(`/chat/typing/${supplierId}`, { sender, typing });
  return res.data as { adminTyping: boolean; supplierTyping: boolean };
}

export async function getChatTyping(supplierId: string) {
  const res = await api.get(`/chat/typing/${supplierId}`);
  return res.data as { adminTyping: boolean; supplierTyping: boolean };
}

// Supplier API functions
export async function supplierRegister(payload: {
  name: string;
  email: string;
  password: string;
  contactNumber?: string;
  website?: string;
  description?: string;
  logoUrl?: string;
  address?: string;
  legalDocUrls?: string[];
}) {
  try {
    const res = await api.post('/suppliers/register', payload);
    return res.data;
  } catch (error: any) {
    throw error?.response?.data || error;
  }
}

export async function supplierLogin(email: string, password: string) {
  try {
    const res = await api.post('/suppliers/login', { email, password });
    if (res.data.accessToken) {
      localStorage.setItem('access_token', res.data.accessToken);
    }
    return res.data;
  } catch (error: any) {
    throw error?.response?.data || error;
  }
}

export async function supplierGetMe() {
  try {
    const res = await api.get('/suppliers/me');
    return res.data;
  } catch (error: any) {
    throw error?.response?.data || error;
  }
}

export async function supplierGetApplicationStatus() {
  try {
    const res = await api.get('/suppliers/application-status');
    return res.data;
  } catch (error: any) {
    return { status: 'pending', message: 'Application status not available' };
  }
}

export async function getPublicProducts(params?: { q?: string; skip?: number; take?: number }) {
  try {
    const res = await api.get('/products', {
      params: {
        q: params?.q,
        skip: params?.skip ?? 0,
        take: params?.take ?? 50,
        companySlug: (params as any)?.companySlug,
      },
    });
    return res.data;
  } catch (error: any) {
    return { items: [], total: 0 };
  }
}

export type Category = {
  id: string;
  name: string;
  slug?: string;
  description?: string | null;
};

export async function getPublicCompanies(params?: { skip?: number; take?: number }) {
  try {
    const res = await api.get('/companies', {
      params: {
        skip: params?.skip ?? 0,
        take: params?.take ?? 50,
      },
    });
    return res.data;
  } catch (error: any) {
    return { items: [], total: 0 };
  }
}

// Public company by slug
export async function getPublicCompany(slug: string) {
  const res = await api.get(`/companies/${encodeURIComponent(slug)}`);
  return res.data;
}

// Categories
export async function getCategories() {
  try {
    const res = await api.get('/categories');
    return res.data as Category[];
  } catch (error: any) {
    return [] as Category[];
  }
}

// Admin category management (uses same public endpoints)
export async function adminCreateCategory(payload: { name: string; description?: string; slug?: string }) {
  const res = await api.post('/categories', payload);
  return res.data;
}

export async function adminUpdateCategory(id: string, payload: { name?: string; description?: string; slug?: string }) {
  const res = await api.patch(`/categories/${id}`, payload);
  return res.data;
}

export async function adminDeleteCategory(id: string) {
  const res = await api.delete(`/categories/${id}`);
  return res.data;
}

// Product Reviews
export type CreateProductReviewPayload = {
  rating: number; // 1-5
  comment?: string;
};

export async function getProductReviews(productId: string, params?: { skip?: number; take?: number }) {
  const res = await api.get(`/products/${productId}/reviews`, {
    params: {
      skip: params?.skip ?? 0,
      take: params?.take ?? 20,
    },
  });
  return res.data;
}

export async function createProductReview(productId: string, payload: CreateProductReviewPayload) {
  const res = await api.post(`/products/${productId}/reviews`, payload);
  return res.data;
}

// Anonymous/public product review (no auth required)
export async function createAnonymousProductReview(productId: string, payload: CreateProductReviewPayload & { authorName: string }) {
  const res = await api.post(`/public/products/${productId}/reviews`, payload);
  return res.data;
}

export async function updateProductReview(reviewId: string, payload: Partial<CreateProductReviewPayload>) {
  const res = await api.patch(`/reviews/${reviewId}`, payload);
  return res.data;
}

export async function deleteProductReview(reviewId: string) {
  const res = await api.delete(`/reviews/${reviewId}`);
  return res.data;
}

// Company Reviews
export async function getCompanyReviews(companyId: string, params?: { skip?: number; take?: number }) {
  const res = await api.get(`/companies/${companyId}/reviews`, {
    params: {
      skip: params?.skip ?? 0,
      take: params?.take ?? 20,
    },
  });
  return res.data;
}

export async function createCompanyReview(companyId: string, payload: CreateProductReviewPayload) {
  const res = await api.post(`/companies/${companyId}/reviews`, payload);
  return res.data;
}

// Anonymous/public company review
export async function createAnonymousCompanyReview(companyId: string, payload: CreateProductReviewPayload & { authorName: string }) {
  const res = await api.post(`/public/companies/${companyId}/reviews`, payload);
  return res.data;
}

export async function updateCompanyReview(reviewId: string, payload: Partial<CreateProductReviewPayload>) {
  const res = await api.patch(`/company-reviews/${reviewId}`, payload);
  return res.data;
}

export async function deleteCompanyReview(reviewId: string) {
  const res = await api.delete(`/company-reviews/${reviewId}`);
  return res.data;
}
