"use client";

import { useEffect, useState } from "react";
import { useAppStore, type AdminStats } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  LayoutDashboard,
  Users,
  ShoppingBag,
  Star,
  Settings,
  FileText,
  TrendingUp,
  DollarSign,
  AlertTriangle,
  UserPlus,
  Shield,
  Trash2,
  Ban,
  CheckCircle,
  Search,
  Package,
  XCircle,
  Eye,
} from "lucide-react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { motion } from "framer-motion";
import { toast } from "sonner";

interface AdminUser {
  id: string;
  username: string;
  email: string;
  role: string;
  rating: number;
  verified: boolean;
  blocked: boolean;
  createdAt: string;
}

interface AdminOrder {
  id: string;
  serviceId: string;
  clientId: string;
  boosterId: string | null;
  status: string;
  price: number;
  createdAt: string;
  service?: { title: string };
  client?: { username: string };
  booster?: { username: string } | null;
}

interface AdminReview {
  id: string;
  rating: number;
  comment: string;
  createdAt: string;
  author?: { username: string };
  service?: { title: string };
}

interface AdminLog {
  id: string;
  action: string;
  target: string;
  details: string | null;
  createdAt: string;
  moderator?: { username: string };
}

interface AdminService {
  id: string;
  title: string;
  description: string;
  price: number;
  moderationStatus: string;
  rejectionReason: string | null;
  active: boolean;
  createdAt: string;
  category?: { name: string };
  booster?: { username: string; role: string };
}

const statusLabels: Record<string, string> = {
  pending: "Ожидание",
  in_progress: "В работе",
  completed: "Завершено",
  disputed: "Спор",
  cancelled: "Отменено",
  refunded: "Возврат",
};

const statusColors: Record<string, string> = {
  pending: "bg-neon-yellow/20 text-neon-yellow",
  in_progress: "bg-neon-blue/20 text-neon-blue",
  completed: "bg-neon-green/20 text-neon-green",
  disputed: "bg-destructive/20 text-destructive",
  cancelled: "bg-muted/50 text-muted-foreground",
  refunded: "bg-neon-purple/20 text-neon-purple",
};

export function AdminPanel() {
  const { currentUser, isAuthenticated, setView, adminTab, setAdminTab } =
    useAppStore();

  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [adminOrders, setAdminOrders] = useState<AdminOrder[]>([]);
  const [reviews, setReviews] = useState<AdminReview[]>([]);
  const [logs, setLogs] = useState<AdminLog[]>([]);
  const [pendingServices, setPendingServices] = useState<AdminService[]>([]);
  const [loading, setLoading] = useState(true);
  const [userSearch, setUserSearch] = useState("");
  const [rejectionDialog, setRejectionDialog] = useState<{ id: string; reason: string } | null>(null);

  useEffect(() => {
    if (
      !isAuthenticated ||
      !currentUser ||
      (currentUser.role !== "admin" && currentUser.role !== "moderator")
    ) {
      setView("catalog");
      return;
    }
  }, [currentUser, isAuthenticated, setView]);

  const fetchStats = async () => {
    try {
      const res = await fetch("/api/admin?action=stats");
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch {
      // ignore
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await fetch("/api/admin?action=users");
      if (res.ok) {
        const data = await res.json();
        setUsers(Array.isArray(data) ? data : (data.users || []));
      }
    } catch {
      // ignore
    }
  };

  const fetchOrders = async () => {
    try {
      const res = await fetch("/api/admin?action=orders");
      if (res.ok) {
        const data = await res.json();
        setAdminOrders(Array.isArray(data) ? data : (data.orders || []));
      }
    } catch {
      // ignore
    }
  };

  const fetchReviews = async () => {
    try {
      const res = await fetch("/api/admin?action=reviews");
      if (res.ok) {
        const data = await res.json();
        setReviews(Array.isArray(data) ? data : []);
      }
    } catch {
      // ignore
    }
  };

  const fetchLogs = async () => {
    try {
      const res = await fetch("/api/admin?action=logs");
      if (res.ok) {
        const data = await res.json();
        setLogs(Array.isArray(data) ? data : []);
      }
    } catch {
      // ignore
    }
  };

  const fetchPendingServices = async () => {
    try {
      const res = await fetch("/api/admin?action=pending-services");
      if (res.ok) {
        const data = await res.json();
        setPendingServices(Array.isArray(data) ? data : (data.services || []));
      }
    } catch {
      // ignore
    }
  };

  const handleModerateService = async (serviceId: string, action: "approve" | "reject", reason?: string) => {
    try {
      const res = await fetch(`/api/services/${serviceId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          moderationStatus: action === "approve" ? "approved" : "rejected",
          rejectionReason: action === "reject" ? reason : null,
        }),
      });
      if (res.ok) {
        toast.success(action === "approve" ? "Услуга одобрена" : "Услуга отклонена");
        fetchPendingServices();
      } else {
        toast.error("Ошибка");
      }
    } catch {
      toast.error("Ошибка сети");
    }
  };

  useEffect(() => {
    if (
      !isAuthenticated ||
      !currentUser ||
      (currentUser.role !== "admin" && currentUser.role !== "moderator")
    )
      return;

    const loadData = async () => {
      setLoading(true);
      await Promise.all([
        fetchStats(),
        fetchUsers(),
        fetchOrders(),
        fetchReviews(),
        fetchLogs(),
        fetchPendingServices(),
      ]);
      setLoading(false);
    };
    loadData();
  }, [currentUser, isAuthenticated]);

  if (
    !isAuthenticated ||
    !currentUser ||
    (currentUser.role !== "admin" && currentUser.role !== "moderator")
  )
    return null;

  const handleUserAction = async (
    userId: string,
    action: "block" | "unblock" | "verify" | "role"
  ) => {
    try {
      const body: Record<string, unknown> = {
        moderatorId: currentUser?.id,
      };
      if (action === "block") body.blocked = true;
      if (action === "unblock") body.blocked = false;
      if (action === "verify") body.verified = true;

      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        toast.success("Действие выполнено");
        fetchUsers();
      } else {
        toast.error("Ошибка");
      }
    } catch {
      toast.error("Ошибка сети");
    }
  };

  const handleOrderStatus = async (orderId: string, status: string) => {
    try {
      const res = await fetch(`/api/admin/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        toast.success("Статус обновлён");
        fetchOrders();
      } else {
        toast.error("Ошибка");
      }
    } catch {
      toast.error("Ошибка сети");
    }
  };

  const handleDeleteReview = async (reviewId: string) => {
    try {
      const res = await fetch(`/api/admin/reviews/${reviewId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        toast.success("Отзыв удалён");
        fetchReviews();
      } else {
        toast.error("Ошибка");
      }
    } catch {
      toast.error("Ошибка сети");
    }
  };

  const filteredUsers = userSearch
    ? users.filter(
        (u) =>
          u.username.toLowerCase().includes(userSearch.toLowerCase()) ||
          u.email.toLowerCase().includes(userSearch.toLowerCase())
      )
    : users;

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <h1 className="text-2xl font-bold mb-6 flex items-center gap-2">
          <Shield className="h-6 w-6 text-neon-orange" />
          Панель администратора
        </h1>

        <Tabs
          value={adminTab}
          onValueChange={(val) =>
            setAdminTab(
              val as "dashboard" | "users" | "orders" | "reviews" | "services" | "settings" | "logs"
            )
          }
        >
          <TabsList className="flex flex-wrap h-auto gap-1 mb-4 bg-transparent">
            <TabsTrigger
              value="dashboard"
              className="data-[state=active]:bg-neon-blue/20 data-[state=active]:text-neon-blue"
            >
              <LayoutDashboard className="h-3.5 w-3.5 mr-1.5" />
              Дашборд
            </TabsTrigger>
            <TabsTrigger
              value="users"
              className="data-[state=active]:bg-neon-blue/20 data-[state=active]:text-neon-blue"
            >
              <Users className="h-3.5 w-3.5 mr-1.5" />
              Пользователи
            </TabsTrigger>
            <TabsTrigger
              value="orders"
              className="data-[state=active]:bg-neon-blue/20 data-[state=active]:text-neon-blue"
            >
              <ShoppingBag className="h-3.5 w-3.5 mr-1.5" />
              Заказы
            </TabsTrigger>
            <TabsTrigger
              value="reviews"
              className="data-[state=active]:bg-neon-blue/20 data-[state=active]:text-neon-blue"
            >
              <Star className="h-3.5 w-3.5 mr-1.5" />
              Отзывы
            </TabsTrigger>
            <TabsTrigger
              value="services"
              className="data-[state=active]:bg-neon-blue/20 data-[state=active]:text-neon-blue"
            >
              <Package className="h-3.5 w-3.5 mr-1.5" />
              Услуги
              {pendingServices.length > 0 && (
                <Badge className="ml-1.5 bg-neon-orange text-white text-[10px] px-1.5 py-0 border-0">
                  {pendingServices.filter(s => s.moderationStatus === "pending").length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger
              value="settings"
              className="data-[state=active]:bg-neon-blue/20 data-[state=active]:text-neon-blue"
            >
              <Settings className="h-3.5 w-3.5 mr-1.5" />
              Настройки
            </TabsTrigger>
            <TabsTrigger
              value="logs"
              className="data-[state=active]:bg-neon-blue/20 data-[state=active]:text-neon-blue"
            >
              <FileText className="h-3.5 w-3.5 mr-1.5" />
              Логи
            </TabsTrigger>
          </TabsList>

          {/* Dashboard */}
          <TabsContent value="dashboard" className="mt-0 space-y-4">
            {loading || !stats ? (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-28 rounded-lg" />
                ))}
              </div>
            ) : (
              <>
                {/* Metric cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 text-muted-foreground mb-2">
                        <Users className="h-4 w-4" />
                        <span className="text-xs">Пользователей</span>
                      </div>
                      <p className="text-2xl font-bold">{stats.totalUsers}</p>
                      {stats.newUsersToday > 0 && (
                        <p className="text-xs text-neon-green mt-1">
                          +{stats.newUsersToday} сегодня
                        </p>
                      )}
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 text-muted-foreground mb-2">
                        <ShoppingBag className="h-4 w-4" />
                        <span className="text-xs">Активные заказы</span>
                      </div>
                      <p className="text-2xl font-bold text-neon-blue">
                        {stats.activeOrders}
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 text-muted-foreground mb-2">
                        <DollarSign className="h-4 w-4" />
                        <span className="text-xs">Выручка</span>
                      </div>
                      <p className="text-2xl font-bold text-neon-green">
                        {stats.totalRevenue.toLocaleString("ru-RU")} ₽
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 text-muted-foreground mb-2">
                        <AlertTriangle className="h-4 w-4" />
                        <span className="text-xs">Споры</span>
                      </div>
                      <p className="text-2xl font-bold text-destructive">
                        {stats.disputes}
                      </p>
                    </CardContent>
                  </Card>
                </div>

                {/* Charts */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-neon-green" />
                        Выручка по дням
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={stats.revenueByDay}>
                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                            <XAxis
                              dataKey="date"
                              tick={{ fontSize: 11 }}
                              stroke="hsl(var(--muted-foreground))"
                            />
                            <YAxis
                              tick={{ fontSize: 11 }}
                              stroke="hsl(var(--muted-foreground))"
                            />
                            <Tooltip
                              contentStyle={{
                                backgroundColor: "hsl(var(--card))",
                                border: "1px solid hsl(var(--border))",
                                borderRadius: "8px",
                                fontSize: "12px",
                              }}
                            />
                            <Area
                              type="monotone"
                              dataKey="revenue"
                              stroke="#10B981"
                              fill="#10B981"
                              fillOpacity={0.15}
                              strokeWidth={2}
                            />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm flex items-center gap-2">
                        <ShoppingBag className="h-4 w-4 text-neon-blue" />
                        Заказы по статусам
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={stats.ordersByStatus}>
                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                            <XAxis
                              dataKey="status"
                              tick={{ fontSize: 11 }}
                              stroke="hsl(var(--muted-foreground))"
                            />
                            <YAxis
                              tick={{ fontSize: 11 }}
                              stroke="hsl(var(--muted-foreground))"
                            />
                            <Tooltip
                              contentStyle={{
                                backgroundColor: "hsl(var(--card))",
                                border: "1px solid hsl(var(--border))",
                                borderRadius: "8px",
                                fontSize: "12px",
                              }}
                            />
                            <Bar
                              dataKey="count"
                              fill="#00D4FF"
                              radius={[4, 4, 0, 0]}
                            />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </>
            )}
          </TabsContent>

          {/* Users */}
          <TabsContent value="users" className="mt-0">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3 mb-4">
                  <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Поиск пользователей..."
                      value={userSearch}
                      onChange={(e) => setUserSearch(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Имя</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Роль</TableHead>
                        <TableHead>Рейтинг</TableHead>
                        <TableHead>Статус</TableHead>
                        <TableHead>Действия</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loading ? (
                        Array.from({ length: 5 }).map((_, i) => (
                          <TableRow key={i}>
                            {Array.from({ length: 6 }).map((_, j) => (
                              <TableCell key={j}>
                                <Skeleton className="h-4 w-20" />
                              </TableCell>
                            ))}
                          </TableRow>
                        ))
                      ) : filteredUsers.length === 0 ? (
                        <TableRow>
                          <TableCell
                            colSpan={6}
                            className="text-center text-muted-foreground py-8"
                          >
                            Пользователи не найдены
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredUsers.map((user) => (
                          <TableRow key={user.id}>
                            <TableCell className="font-medium">
                              {user.username}
                            </TableCell>
                            <TableCell className="text-muted-foreground text-sm">
                              {user.email}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-xs">
                                {user.role}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {user.rating.toFixed(1)}
                            </TableCell>
                            <TableCell>
                              {user.blocked ? (
                                <Badge className="bg-destructive/20 text-destructive text-xs">
                                  Заблокирован
                                </Badge>
                              ) : user.verified ? (
                                <Badge className="bg-neon-green/20 text-neon-green text-xs">
                                  Верифицирован
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-xs">
                                  Активен
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                {user.blocked ? (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() =>
                                      handleUserAction(user.id, "unblock")
                                    }
                                    className="h-7 text-xs text-neon-green"
                                  >
                                    <CheckCircle className="h-3 w-3" />
                                  </Button>
                                ) : (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() =>
                                      handleUserAction(user.id, "block")
                                    }
                                    className="h-7 text-xs text-destructive"
                                  >
                                    <Ban className="h-3 w-3" />
                                  </Button>
                                )}
                                {!user.verified && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() =>
                                      handleUserAction(user.id, "verify")
                                    }
                                    className="h-7 text-xs text-neon-blue"
                                  >
                                    <Shield className="h-3 w-3" />
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Orders */}
          <TabsContent value="orders" className="mt-0">
            <Card>
              <CardContent className="p-4">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>ID</TableHead>
                        <TableHead>Услуга</TableHead>
                        <TableHead>Клиент</TableHead>
                        <TableHead>Бустер</TableHead>
                        <TableHead>Статус</TableHead>
                        <TableHead>Цена</TableHead>
                        <TableHead>Действия</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loading ? (
                        Array.from({ length: 5 }).map((_, i) => (
                          <TableRow key={i}>
                            {Array.from({ length: 7 }).map((_, j) => (
                              <TableCell key={j}>
                                <Skeleton className="h-4 w-16" />
                              </TableCell>
                            ))}
                          </TableRow>
                        ))
                      ) : adminOrders.length === 0 ? (
                        <TableRow>
                          <TableCell
                            colSpan={7}
                            className="text-center text-muted-foreground py-8"
                          >
                            Заказы не найдены
                          </TableCell>
                        </TableRow>
                      ) : (
                        adminOrders.map((order) => (
                          <TableRow key={order.id}>
                            <TableCell className="font-mono text-xs">
                              {order.id.slice(0, 8)}...
                            </TableCell>
                            <TableCell className="text-sm">
                              {order.service?.title || "—"}
                            </TableCell>
                            <TableCell className="text-sm">
                              {order.client?.username || "—"}
                            </TableCell>
                            <TableCell className="text-sm">
                              {order.booster?.username || "—"}
                            </TableCell>
                            <TableCell>
                              <Badge
                                className={`text-xs ${
                                  statusColors[order.status] || ""
                                }`}
                              >
                                {statusLabels[order.status] || order.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="font-medium">
                              {order.price.toLocaleString("ru-RU")} ₽
                            </TableCell>
                            <TableCell>
                              <Select
                                onValueChange={(val) =>
                                  handleOrderStatus(order.id, val)
                                }
                              >
                                <SelectTrigger className="h-7 w-28 text-xs">
                                  <SelectValue placeholder="Статус" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="pending">Ожидание</SelectItem>
                                  <SelectItem value="in_progress">
                                    В работе
                                  </SelectItem>
                                  <SelectItem value="completed">
                                    Завершено
                                  </SelectItem>
                                  <SelectItem value="disputed">Спор</SelectItem>
                                  <SelectItem value="refunded">
                                    Возврат
                                  </SelectItem>
                                </SelectContent>
                              </Select>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Reviews */}
          <TabsContent value="reviews" className="mt-0">
            <Card>
              <CardContent className="p-4">
                {loading ? (
                  <div className="space-y-3">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <Skeleton key={i} className="h-20 w-full" />
                    ))}
                  </div>
                ) : reviews.length === 0 ? (
                  <p className="text-center text-muted-foreground py-12">
                    Отзывов пока нет
                  </p>
                ) : (
                  <div className="space-y-3 max-h-[600px] overflow-y-auto">
                    {reviews.map((review) => (
                      <div
                        key={review.id}
                        className="flex items-start gap-3 p-3 rounded-lg bg-secondary/30"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-medium">
                              {review.author?.username || "Пользователь"}
                            </span>
                            <div className="flex gap-0.5">
                              {Array.from({ length: 5 }, (_, i) => (
                                <Star
                                  key={i}
                                  className={`h-3 w-3 ${
                                    i < review.rating
                                      ? "fill-neon-yellow text-neon-yellow"
                                      : "fill-muted text-muted"
                                  }`}
                                />
                              ))}
                            </div>
                            <span className="text-xs text-muted-foreground">
                              — {review.service?.title || "Услуга"}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {review.comment}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteReview(review.id)}
                          className="h-7 text-destructive shrink-0"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Services Moderation */}
          <TabsContent value="services" className="mt-0">
            <Card>
              <CardContent className="p-4">
                <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
                  <Package className="h-4 w-4 text-neon-orange" />
                  Модерация услуг
                  {pendingServices.filter(s => s.moderationStatus === "pending").length > 0 && (
                    <Badge className="bg-neon-orange text-white text-[10px] px-1.5 border-0">
                      {pendingServices.filter(s => s.moderationStatus === "pending").length} на проверке
                    </Badge>
                  )}
                </h3>
                {loading ? (
                  <div className="space-y-3">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <Skeleton key={i} className="h-28 w-full" />
                    ))}
                  </div>
                ) : pendingServices.length === 0 ? (
                  <p className="text-center text-muted-foreground py-12">
                    Нет услуг для модерации
                  </p>
                ) : (
                  <div className="space-y-3 max-h-[600px] overflow-y-auto">
                    {pendingServices.map((service) => (
                      <div
                        key={service.id}
                        className={`p-4 rounded-lg border transition-colors ${
                          service.moderationStatus === "pending"
                            ? "border-neon-yellow/30 bg-neon-yellow/5"
                            : service.moderationStatus === "approved"
                            ? "border-neon-green/30 bg-neon-green/5"
                            : "border-destructive/30 bg-destructive/5"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <h4 className="font-semibold text-sm">{service.title}</h4>
                              <Badge
                                variant="outline"
                                className={
                                  service.moderationStatus === "pending"
                                    ? "bg-neon-yellow/20 text-neon-yellow border-neon-yellow/30"
                                    : service.moderationStatus === "approved"
                                    ? "bg-neon-green/20 text-neon-green border-neon-green/30"
                                    : "bg-destructive/20 text-destructive border-destructive/30"
                                }
                              >
                                {service.moderationStatus === "pending"
                                  ? "На проверке"
                                  : service.moderationStatus === "approved"
                                  ? "Одобрено"
                                  : "Отклонено"}
                              </Badge>
                              {!service.active && (
                                <Badge variant="outline" className="bg-muted/50 text-muted-foreground">
                                  Неактивна
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                              {service.description}
                            </p>
                            <div className="flex items-center gap-3 text-xs text-muted-foreground">
                              <span className="font-semibold text-neon-orange">
                                {service.price.toLocaleString("ru-RU")} ₽
                              </span>
                              <span>от {service.booster?.username || "Неизвестный"}</span>
                              {service.booster?.role && (
                                <Badge variant="outline" className="text-[10px] h-4 px-1">
                                  {service.booster.role === "client" ? "Клиент" : service.booster.role === "booster" ? "Бустер" : service.booster.role}
                                </Badge>
                              )}
                              {service.category && <span>{service.category.name}</span>}
                              <span>{new Date(service.createdAt).toLocaleDateString("ru-RU")}</span>
                            </div>
                            {service.rejectionReason && (
                              <p className="text-xs text-destructive mt-1">
                                Причина отклонения: {service.rejectionReason}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            {service.moderationStatus === "pending" && (
                              <>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-8 text-neon-green border-neon-green/30 hover:bg-neon-green/10"
                                  onClick={() => handleModerateService(service.id, "approve")}
                                >
                                  <CheckCircle className="h-3.5 w-3.5 mr-1" />
                                  Одобрить
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-8 text-destructive border-destructive/30 hover:bg-destructive/10"
                                  onClick={() => setRejectionDialog({ id: service.id, reason: "" })}
                                >
                                  <XCircle className="h-3.5 w-3.5 mr-1" />
                                  Отклонить
                                </Button>
                              </>
                            )}
                            {service.moderationStatus !== "pending" && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 text-xs"
                                onClick={() => handleModerateService(service.id, "approve")}
                              >
                                Вернуть
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Settings */}
          <TabsContent value="settings" className="mt-0">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Комиссия платформы</CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <Input
                        type="number"
                        defaultValue="10"
                        className="w-24"
                      />
                      <span className="text-sm text-muted-foreground">%</span>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => toast.success("Настройки сохранены")}
                    >
                      Сохранить
                    </Button>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Уведомления</CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <div className="space-y-3">
                    <Input
                      placeholder="Шаблон нового заказа"
                      defaultValue="Новый заказ #{orderId}: {serviceTitle}"
                    />
                    <Input
                      placeholder="Шаблон завершения"
                      defaultValue="Заказ #{orderId} завершён!"
                    />
                    <Button
                      size="sm"
                      onClick={() => toast.success("Шаблоны сохранены")}
                    >
                      Сохранить
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Logs */}
          <TabsContent value="logs" className="mt-0">
            <Card>
              <CardContent className="p-4">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Время</TableHead>
                        <TableHead>Модератор</TableHead>
                        <TableHead>Действие</TableHead>
                        <TableHead>Цель</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loading ? (
                        Array.from({ length: 5 }).map((_, i) => (
                          <TableRow key={i}>
                            {Array.from({ length: 4 }).map((_, j) => (
                              <TableCell key={j}>
                                <Skeleton className="h-4 w-24" />
                              </TableCell>
                            ))}
                          </TableRow>
                        ))
                      ) : logs.length === 0 ? (
                        <TableRow>
                          <TableCell
                            colSpan={4}
                            className="text-center text-muted-foreground py-8"
                          >
                            Логов пока нет
                          </TableCell>
                        </TableRow>
                      ) : (
                        logs.map((log) => (
                          <TableRow key={log.id}>
                            <TableCell className="text-xs text-muted-foreground">
                              {new Date(log.createdAt).toLocaleString("ru-RU")}
                            </TableCell>
                            <TableCell className="text-sm">
                              {log.moderator?.username || "—"}
                            </TableCell>
                            <TableCell className="text-sm">
                              {log.action}
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {log.target}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </motion.div>

      {/* Rejection Dialog */}
      <Dialog open={!!rejectionDialog} onOpenChange={(open) => !open && setRejectionDialog(null)}>
        <DialogContent className="sm:max-w-[400px] bg-background border-border/50">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Причина отклонения</DialogTitle>
          </DialogHeader>
          <Textarea
            placeholder="Укажите причину отклонения услуги..."
            value={rejectionDialog?.reason || ""}
            onChange={(e) =>
              rejectionDialog && setRejectionDialog({ ...rejectionDialog, reason: e.target.value })
            }
            className="bg-secondary/50 border-border/50 focus:border-neon-blue/50 min-h-[80px]"
          />
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setRejectionDialog(null)}>
              Отмена
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (rejectionDialog) {
                  handleModerateService(rejectionDialog.id, "reject", rejectionDialog.reason || "Нарушение правил");
                  setRejectionDialog(null);
                }
              }}
            >
              <XCircle className="h-4 w-4 mr-2" />
              Отклонить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
