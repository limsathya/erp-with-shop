export interface Store {
  id: string;
  name: string;
  code: string;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export type VisitStatus = "SCHEDULED" | "CHECKED_IN" | "COMPLETED" | "CANCELLED";

export interface Visit {
  id: string;
  customerId: string;
  customer: Customer;
  storeId?: string | null;
  store?: Store | null;
  status: VisitStatus;
  scheduledAt: string;
  note?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Customer {
  id: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  id: string;
  name: string;
}

export interface Product {
  id: string;
  sku: string;
  name: string;
  nameKm?: string | null;
  nameZh?: string | null;
  description?: string | null;
  price: string;
  cost?: string;
  stock: number;
  lowStockAt: number;
  imageUrl?: string | null;
  active: boolean;
  category?: Category | null;
  categoryId?: string | null;
}

export interface InvoiceItem {
  id: string;
  productId?: string | null;
  product?: Product | null;
  name: string;
  quantity: number;
  unitPrice: string;
  lineTotal: string;
}

export interface Payment {
  id: string;
  method: "KHQR" | "CASH" | "CARD";
  amount: string;
  currency: "USD" | "KHR";
  status: "PENDING" | "COMPLETED" | "FAILED";
  reference?: string | null;
  createdAt: string;
}

export interface Invoice {
  id: string;
  number: string;
  customerId?: string | null;
  customer?: Customer | null;
  storeId?: string | null;
  store?: Store | null;
  currency: "USD" | "KHR";
  subtotal: string;
  discount: string;
  tax: string;
  total: string;
  status: "DRAFT" | "UNPAID" | "PAID" | "CANCELLED";
  note?: string | null;
  items: InvoiceItem[];
  payments: Payment[];
  createdAt: string;
  updatedAt: string;
}
