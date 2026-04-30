import { create } from "zustand";

export type ViewType = 
  | "catalog" 
  | "service-detail" 
  | "auth" 
  | "dashboard" 
  | "admin" 
  | "order-chat";

export interface User {
  id: string;
  email: string;
  username: string;
  role: "client" | "booster" | "moderator" | "admin";
  avatar: string | null;
  balance: number;
  rating: number;
  reviewsCount: number;
  verified: boolean;
  blocked: boolean;
  achievements: string[];
  createdAt: string;
}

export interface Service {
  id: string;
  title: string;
  description: string;
  price: number;
  image: string | null;
  categoryId: string;
  boosterId: string;
  estimatedTime: string;
  features: string[];
  requirements: string[];
  active: boolean;
  ordersCount: number;
  rating: number;
  reviewsCount: number;
  createdAt: string;
  category?: Category;
  booster?: User;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  order: number;
}

export interface Order {
  id: string;
  serviceId: string;
  clientId: string;
  boosterId: string | null;
  status: "pending" | "in_progress" | "completed" | "disputed" | "cancelled" | "refunded";
  progress: number;
  price: number;
  escrowLocked: boolean;
  clientNotes: string | null;
  boosterNotes: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  service?: Service;
  client?: User;
  booster?: User;
  messages?: ChatMessage[];
  reviews?: Review[];
}

export interface Review {
  id: string;
  orderId: string;
  serviceId: string;
  authorId: string;
  targetId: string;
  rating: number;
  comment: string;
  createdAt: string;
  author?: User;
}

export interface ChatMessage {
  id: string;
  orderId: string;
  senderId: string;
  content: string;
  read: boolean;
  createdAt: string;
  sender?: User;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: "info" | "success" | "warning" | "error";
  read: boolean;
  createdAt: string;
}

export interface AdminStats {
  totalUsers: number;
  activeOrders: number;
  totalRevenue: number;
  disputes: number;
  newUsersToday: number;
  completedToday: number;
  totalOrders: number;
  averageRating: number;
  revenueByDay: { date: string; revenue: number }[];
  ordersByStatus: { status: string; count: number }[];
}

interface AppState {
  // Navigation
  currentView: ViewType;
  selectedServiceId: string | null;
  selectedOrderId: string | null;
  
  // Auth
  currentUser: User | null;
  isAuthenticated: boolean;
  
  // Data
  services: Service[];
  categories: Category[];
  orders: Order[];
  notifications: Notification[];
  adminStats: AdminStats | null;
  
  // UI
  searchQuery: string;
  selectedCategory: string | null;
  sortBy: "popular" | "price_asc" | "price_desc" | "rating" | "newest";
  authTab: "login" | "register";
  adminTab: "dashboard" | "users" | "orders" | "reviews" | "settings" | "logs";
  dashboardTab: "orders" | "balance" | "notifications" | "achievements";
  isLoading: boolean;
  
  // Actions
  setView: (view: ViewType) => void;
  selectService: (id: string) => void;
  selectOrder: (id: string) => void;
  setUser: (user: User | null) => void;
  logout: () => void;
  setServices: (services: Service[]) => void;
  setCategories: (categories: Category[]) => void;
  setOrders: (orders: Order[]) => void;
  setNotifications: (notifications: Notification[]) => void;
  setAdminStats: (stats: AdminStats | null) => void;
  setSearchQuery: (query: string) => void;
  setSelectedCategory: (category: string | null) => void;
  setSortBy: (sort: "popular" | "price_asc" | "price_desc" | "rating" | "newest") => void;
  setAuthTab: (tab: "login" | "register") => void;
  setAdminTab: (tab: "dashboard" | "users" | "orders" | "reviews" | "settings" | "logs") => void;
  setDashboardTab: (tab: "orders" | "balance" | "notifications" | "achievements") => void;
  setIsLoading: (loading: boolean) => void;
  toggleTheme: () => void;
  getTheme: () => "dark" | "light";
}

export const useAppStore = create<AppState>((set, get) => ({
  // Navigation
  currentView: "catalog",
  selectedServiceId: null,
  selectedOrderId: null,
  
  // Auth
  currentUser: null,
  isAuthenticated: false,
  
  // Data
  services: [],
  categories: [],
  orders: [],
  notifications: [],
  adminStats: null,
  
  // UI
  searchQuery: "",
  selectedCategory: null,
  sortBy: "popular",
  authTab: "login",
  adminTab: "dashboard",
  dashboardTab: "orders",
  isLoading: false,
  
  // Actions
  setView: (view) => set({ currentView: view }),
  selectService: (id) => set({ selectedServiceId: id, currentView: "service-detail" }),
  selectOrder: (id) => set({ selectedOrderId: id, currentView: "order-chat" }),
  setUser: (user) => set({ currentUser: user, isAuthenticated: !!user }),
  logout: () => set({ currentUser: null, isAuthenticated: false, currentView: "catalog" }),
  setServices: (services) => set({ services }),
  setCategories: (categories) => set({ categories }),
  setOrders: (orders) => set({ orders }),
  setNotifications: (notifications) => set({ notifications }),
  setAdminStats: (stats) => set({ adminStats: stats }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  setSelectedCategory: (category) => set({ selectedCategory: category }),
  setSortBy: (sort) => set({ sortBy: sort }),
  setAuthTab: (tab) => set({ authTab: tab }),
  setAdminTab: (tab) => set({ adminTab: tab }),
  setDashboardTab: (tab) => set({ dashboardTab: tab }),
  setIsLoading: (loading) => set({ isLoading: loading }),
  
  toggleTheme: () => {
    const current = get().getTheme();
    const next = current === "dark" ? "light" : "dark";
    localStorage.setItem("brawlboost-theme", next);
    if (next === "light") {
      document.documentElement.classList.remove("dark");
      document.documentElement.classList.add("light");
    } else {
      document.documentElement.classList.remove("light");
      document.documentElement.classList.add("dark");
    }
  },
  
  getTheme: () => {
    if (typeof document !== "undefined") {
      return document.documentElement.classList.contains("light") ? "light" : "dark";
    }
    return "dark";
  },
}));
