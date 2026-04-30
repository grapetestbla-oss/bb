"use client";

import { useEffect, useState } from "react";
import { useAppStore, type Order, type Notification as AppNotification, type Service } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  OrderTracker,
} from "@/components/order-tracker";
import {
  ShoppingBag,
  Wallet,
  Bell,
  Award,
  Star,
  Clock,
  MessageCircle,
  ChevronRight,
  Plus,
  CheckCircle,
  AlertTriangle,
  Info,
  XCircle,
  Trophy,
  Zap,
  Shield,
  Package,
  Pencil,
  Trash2,
  Eye,
  EyeOff,
  Loader2,
  AlertCircle,
  X,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

const statusLabels: Record<string, string> = {
  pending: "Ожидание",
  in_progress: "В работе",
  completed: "Завершено",
  disputed: "Спор",
  cancelled: "Отменено",
  refunded: "Возврат",
};

const statusColors: Record<string, string> = {
  pending: "bg-neon-yellow/20 text-neon-yellow border-neon-yellow/30",
  in_progress: "bg-neon-blue/20 text-neon-blue border-neon-blue/30",
  completed: "bg-neon-green/20 text-neon-green border-neon-green/30",
  disputed: "bg-destructive/20 text-destructive border-destructive/30",
  cancelled: "bg-muted/50 text-muted-foreground border-muted",
  refunded: "bg-neon-purple/20 text-neon-purple border-neon-purple/30",
};

const moderationLabels: Record<string, string> = {
  pending: "На проверке",
  approved: "Одобрено",
  rejected: "Отклонено",
};

const moderationColors: Record<string, string> = {
  pending: "bg-neon-yellow/20 text-neon-yellow border-neon-yellow/30",
  approved: "bg-neon-green/20 text-neon-green border-neon-green/30",
  rejected: "bg-destructive/20 text-destructive border-destructive/30",
};

const notificationIcons: Record<string, typeof Info> = {
  info: Info,
  success: CheckCircle,
  warning: AlertTriangle,
  error: XCircle,
};

const achievementIcons: Record<string, { icon: typeof Trophy; color: string; label: string }> = {
  "100_orders": { icon: Trophy, color: "text-neon-yellow", label: "100 заказов" },
  "5_star_rating": { icon: Star, color: "text-neon-green", label: "5★ рейтинг" },
  "verified": { icon: Shield, color: "text-neon-blue", label: "Верифицирован" },
  "fast_completion": { icon: Zap, color: "text-neon-orange", label: "Быстрое выполнение" },
  "top_booster": { icon: Award, color: "text-neon-purple", label: "Топ бустер" },
};

export function UserDashboard() {
  const {
    currentUser,
    orders,
    setOrders,
    notifications,
    setNotifications,
    selectOrder,
    dashboardTab,
    setDashboardTab,
    isAuthenticated,
    setView,
    myServices,
    setMyServices,
    categories,
    setShowCreateService,
  } = useAppStore();

  const [loading, setLoading] = useState(true);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Edit form state
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editPrice, setEditPrice] = useState("");
  const [editCategoryId, setEditCategoryId] = useState("");
  const [editEstimatedTime, setEditEstimatedTime] = useState("");
  const [editFeatures, setEditFeatures] = useState<string[]>([]);
  const [editRequirements, setEditRequirements] = useState<string[]>([]);
  const [editFeatureInput, setEditFeatureInput] = useState("");
  const [editReqInput, setEditReqInput] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!isAuthenticated || !currentUser) {
      setView("auth");
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      try {
        const [ordersRes, notifRes, servicesRes] = await Promise.all([
          fetch(`/api/orders?userId=${currentUser.id}`),
          fetch(`/api/notifications?userId=${currentUser.id}`),
          fetch(`/api/services?userId=${currentUser.id}&includePending=true`),
        ]);
        if (ordersRes.ok) {
          const ordersData = await ordersRes.json();
          setOrders(ordersData.orders || (Array.isArray(ordersData) ? ordersData : []));
        }
        if (notifRes.ok) {
          const notifData = await notif.json();
          setNotifications(notifData.notifications || (Array.isArray(notifData) ? notifData : []));
        }
        if (servicesRes.ok) {
          const servicesData = await servicesRes.json();
          setMyServices(servicesData.services || (Array.isArray(servicesData) ? servicesData : []));
        }
      } catch (error) {
        console.error("Failed to fetch dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [currentUser, isAuthenticated, setOrders, setNotifications, setMyServices, setView]);

  if (!isAuthenticated || !currentUser) return null;

  const userAchievements: string[] = Array.isArray(currentUser.achievements)
    ? currentUser.achievements
    : [];

  const openEditDialog = (service: Service) => {
    setEditingService(service);
    setEditTitle(service.title);
    setEditDescription(service.description);
    setEditPrice(String(service.price));
    setEditCategoryId(service.categoryId);
    setEditEstimatedTime(service.estimatedTime);
    setEditFeatures([...service.features]);
    setEditRequirements([...service.requirements]);
  };

  const handleSaveEdit = async () => {
    if (!editingService) return;
    setIsSaving(true);
    try {
      const res = await fetch(`/api/services/${editingService.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: editTitle,
          description: editDescription,
          price: Number(editPrice),
          categoryId: editCategoryId,
          estimatedTime: editEstimatedTime,
          features: editFeatures,
          requirements: editRequirements,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Ошибка обновления");
      }
      const data = await res.json();
      const updated = data.service || data;
      setMyServices(myServices.map((s) => (s.id === updated.id ? updated : s)));
      toast.success("Услуга обновлена");
      setEditingService(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Ошибка обновления");
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleActive = async (service: Service) => {
    try {
      const res = await fetch(`/api/services/${service.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !service.active }),
      });
      if (!res.ok) throw new Error("Ошибка");
      const data = await res.json();
      const updated = data.service || data;
      setMyServices(myServices.map((s) => (s.id === updated.id ? { ...s, active: updated.active } : s)));
      toast.success(updated.active ? "Услуга активирована" : "Услуга деактивирована");
    } catch {
      toast.error("Не удалось изменить статус");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/services/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Ошибка");
      setMyServices(myServices.filter((s) => s.id !== id));
      toast.success("Услуга удалена");
      setDeleteConfirmId(null);
    } catch {
      toast.error("Не удалось удалить услугу");
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        {/* User header */}
        <div className="flex items-center gap-4 mb-6">
          <div className="h-14 w-14 rounded-full bg-neon-purple/20 flex items-center justify-center">
            <span className="text-2xl font-bold text-neon-purple">
              {currentUser.username.charAt(0).toUpperCase()}
            </span>
          </div>
          <div>
            <h1 className="text-xl font-bold">{currentUser.username}</h1>
            <p className="text-sm text-muted-foreground">{currentUser.email}</p>
          </div>
          <Badge
            variant="outline"
            className={
              currentUser.role === "admin"
                ? "border-neon-orange/50 text-neon-orange"
                : currentUser.role === "booster"
                ? "border-neon-blue/50 text-neon-blue"
                : "border-neon-green/50 text-neon-green"
            }
          >
            {currentUser.role === "client"
              ? "Клиент"
              : currentUser.role === "booster"
              ? "Бустер"
              : currentUser.role === "moderator"
              ? "Модератор"
              : "Администратор"}
          </Badge>
        </div>

        {/* Tabs */}
        <Tabs
          value={dashboardTab}
          onValueChange={(val) =>
            setDashboardTab(val as "orders" | "balance" | "notifications" | "achievements" | "my-services")
          }
        >
          <TabsList className="w-full flex h-10 mb-4 flex-wrap">
            <TabsTrigger value="orders" className="flex-1 gap-1.5 min-w-0">
              <ShoppingBag className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Заказы</span>
            </TabsTrigger>
            <TabsTrigger value="my-services" className="flex-1 gap-1.5 min-w-0">
              <Package className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Мои услуги</span>
            </TabsTrigger>
            <TabsTrigger value="balance" className="flex-1 gap-1.5 min-w-0">
              <Wallet className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Баланс</span>
            </TabsTrigger>
            <TabsTrigger value="notifications" className="flex-1 gap-1.5 min-w-0">
              <Bell className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Уведомления</span>
            </TabsTrigger>
            <TabsTrigger value="achievements" className="flex-1 gap-1.5 min-w-0">
              <Award className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Достижения</span>
            </TabsTrigger>
          </TabsList>

          {/* Orders Tab */}
          <TabsContent value="orders" className="mt-0">
            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-32 w-full rounded-lg" />
                ))}
              </div>
            ) : orders.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <ShoppingBag className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-muted-foreground">У вас пока нет заказов</p>
                  <Button
                    onClick={() => setView("catalog")}
                    variant="outline"
                    className="mt-3"
                  >
                    Перейти в каталог
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                <AnimatePresence>
                  {orders.map((order) => (
                    <motion.div
                      key={order.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <Card className="hover:border-neon-blue/30 transition-colors cursor-pointer group">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <h3 className="font-semibold text-sm truncate">
                                  {order.service?.title || "Услуга"}
                                </h3>
                                <Badge
                                  variant="outline"
                                  className={
                                    statusColors[order.status] || ""
                                  }
                                >
                                  {statusLabels[order.status] || order.status}
                                </Badge>
                              </div>
                              <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3">
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {new Date(order.createdAt).toLocaleDateString("ru-RU")}
                                </span>
                                <span className="font-semibold text-neon-orange">
                                  {order.price.toLocaleString("ru-RU")} ₽
                                </span>
                              </div>
                              <OrderTracker order={order} />
                            </div>
                            <div className="flex flex-col gap-2 shrink-0">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => selectOrder(order.id)}
                                className="group-hover:border-neon-blue/50"
                              >
                                <MessageCircle className="h-3.5 w-3.5 mr-1" />
                                Чат
                              </Button>
                              {order.status === "completed" && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-neon-yellow border-neon-yellow/30 hover:bg-neon-yellow/10"
                                >
                                  <Star className="h-3.5 w-3.5 mr-1" />
                                  Отзыв
                                </Button>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </TabsContent>

          {/* My Services Tab */}
          <TabsContent value="my-services" className="mt-0">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Мои услуги</h2>
              <Button
                onClick={() => setShowCreateService(true)}
                className="bg-neon-blue hover:bg-neon-blue/80 text-white"
                size="sm"
              >
                <Plus className="h-4 w-4 mr-1.5" />
                Создать услугу
              </Button>
            </div>

            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-28 w-full rounded-lg" />
                ))}
              </div>
            ) : myServices.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Package className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-muted-foreground">У вас пока нет услуг</p>
                  <p className="text-xs text-muted-foreground/70 mt-1">
                    Создайте услугу, чтобы предлагать свои услуги другим игрокам
                  </p>
                  <Button
                    onClick={() => setShowCreateService(true)}
                    className="mt-3 bg-neon-blue hover:bg-neon-blue/80 text-white"
                    size="sm"
                  >
                    <Plus className="h-4 w-4 mr-1.5" />
                    Создать услугу
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                <AnimatePresence>
                  {myServices.map((service) => (
                    <motion.div
                      key={service.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <Card className={`transition-colors ${!service.active ? "opacity-60" : ""}`}>
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1 flex-wrap">
                                <h3 className="font-semibold text-sm truncate">
                                  {service.title}
                                </h3>
                                <Badge
                                  variant="outline"
                                  className={
                                    moderationColors[service.moderationStatus] || ""
                                  }
                                >
                                  {moderationLabels[service.moderationStatus] || service.moderationStatus}
                                </Badge>
                                {!service.active && (
                                  <Badge variant="outline" className="bg-muted/50 text-muted-foreground border-muted">
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
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {service.estimatedTime}
                                </span>
                                <span className="flex items-center gap-1">
                                  <ShoppingBag className="h-3 w-3" />
                                  {service.ordersCount} заказов
                                </span>
                                <span className="flex items-center gap-1">
                                  <Star className="h-3 w-3 text-neon-yellow" />
                                  {service.rating.toFixed(1)}
                                </span>
                              </div>
                              {service.moderationStatus === "rejected" && service.rejectionReason && (
                                <div className="mt-2 p-2 rounded-md bg-destructive/10 border border-destructive/20">
                                  <p className="text-xs text-destructive flex items-start gap-1.5">
                                    <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                                    Причина отклонения: {service.rejectionReason}
                                  </p>
                                </div>
                              )}
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <Switch
                                checked={service.active}
                                onCheckedChange={() => handleToggleActive(service)}
                                className="data-[state=checked]:bg-neon-green"
                              />
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => openEditDialog(service)}
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                                onClick={() => setDeleteConfirmId(service.id)}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </TabsContent>

          {/* Balance Tab */}
          <TabsContent value="balance" className="mt-0">
            <Card>
              <CardContent className="p-6">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground mb-2">Текущий баланс</p>
                  <p className="text-4xl font-bold text-neon-green">
                    {currentUser.balance.toLocaleString("ru-RU")} ₽
                  </p>
                </div>
                <Separator className="my-6" />
                <div className="flex justify-center">
                  <Button
                    onClick={() =>
                      toast.info("Пополнение баланса", {
                        description: "Функция будет доступна позже",
                      })
                    }
                    className="bg-neon-green hover:bg-neon-green/80 text-white"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Пополнить баланс
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Notifications Tab */}
          <TabsContent value="notifications" className="mt-0">
            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full rounded-lg" />
                ))}
              </div>
            ) : notifications.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Bell className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-muted-foreground">Нет уведомлений</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2 max-h-[600px] overflow-y-auto">
                {notifications.map((notif) => {
                  const Icon = notificationIcons[notif.type] || Info;
                  const iconColor =
                    notif.type === "success"
                      ? "text-neon-green"
                      : notif.type === "warning"
                      ? "text-neon-yellow"
                      : notif.type === "error"
                      ? "text-destructive"
                      : "text-neon-blue";
                  return (
                    <Card
                      key={notif.id}
                      className={
                        !notif.read ? "border-neon-blue/30" : ""
                      }
                    >
                      <CardContent className="p-3 flex items-start gap-3">
                        <Icon className={`h-5 w-5 mt-0.5 shrink-0 ${iconColor}`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">{notif.title}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {notif.message}
                          </p>
                          <p className="text-[10px] text-muted-foreground/50 mt-1">
                            {new Date(notif.createdAt).toLocaleString("ru-RU")}
                          </p>
                        </div>
                        {!notif.read && (
                          <div className="h-2 w-2 rounded-full bg-neon-blue shrink-0 mt-2" />
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* Achievements Tab */}
          <TabsContent value="achievements" className="mt-0">
            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold mb-4">Достижения</h3>
                {userAchievements.length === 0 ? (
                  <div className="text-center py-8">
                    <Award className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                    <p className="text-muted-foreground">
                      Пока нет достижений
                    </p>
                    <p className="text-xs text-muted-foreground/70 mt-1">
                      Выполняйте заказы, чтобы получать награды
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {userAchievements.map((ach) => {
                      const achData = achievementIcons[ach];
                      if (!achData) return null;
                      const Icon = achData.icon;
                      return (
                        <motion.div
                          key={ach}
                          whileHover={{ scale: 1.05 }}
                          className="flex flex-col items-center gap-2 p-4 rounded-lg bg-secondary/30 border border-border/50"
                        >
                          <Icon className={`h-8 w-8 ${achData.color}`} />
                          <span className="text-xs text-center font-medium">
                            {achData.label}
                          </span>
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </motion.div>

      {/* Edit Service Dialog */}
      <Dialog open={!!editingService} onOpenChange={(open) => !open && setEditingService(null)}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto bg-background border-border/50">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">
              <span className="text-neon-orange">Редактирование</span> услуги
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-5 py-2">
            <div className="space-y-2">
              <Label>Название</Label>
              <Input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="bg-secondary/50 border-border/50 focus:border-neon-blue/50"
                maxLength={100}
              />
            </div>
            <div className="space-y-2">
              <Label>Описание</Label>
              <Textarea
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                className="bg-secondary/50 border-border/50 focus:border-neon-blue/50 min-h-[100px]"
                maxLength={2000}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Цена (₽)</Label>
                <Input
                  type="number"
                  min="1"
                  value={editPrice}
                  onChange={(e) => setEditPrice(e.target.value)}
                  className="bg-secondary/50 border-border/50 focus:border-neon-blue/50"
                />
              </div>
              <div className="space-y-2">
                <Label>Категория</Label>
                <Select value={editCategoryId} onValueChange={setEditCategoryId}>
                  <SelectTrigger className="bg-secondary/50 border-border/50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Срок выполнения</Label>
              <Select value={editEstimatedTime} onValueChange={setEditEstimatedTime}>
                <SelectTrigger className="bg-secondary/50 border-border/50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1-2 часа">1-2 часа</SelectItem>
                  <SelectItem value="3-6 часов">3-6 часов</SelectItem>
                  <SelectItem value="1 день">1 день</SelectItem>
                  <SelectItem value="1-3 дня">1-3 дня</SelectItem>
                  <SelectItem value="3-7 дней">3-7 дней</SelectItem>
                  <SelectItem value="1-2 недели">1-2 недели</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Что входит в услугу</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="Добавить..."
                  value={editFeatureInput}
                  onChange={(e) => setEditFeatureInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      const trimmed = editFeatureInput.trim();
                      if (trimmed && editFeatures.length < 10) {
                        setEditFeatures([...editFeatures, trimmed]);
                        setEditFeatureInput("");
                      }
                    }
                  }}
                  className="bg-secondary/50 border-border/50 focus:border-neon-blue/50"
                  maxLength={80}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => {
                    const trimmed = editFeatureInput.trim();
                    if (trimmed && editFeatures.length < 10) {
                      setEditFeatures([...editFeatures, trimmed]);
                      setEditFeatureInput("");
                    }
                  }}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {editFeatures.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {editFeatures.map((f, i) => (
                    <Badge
                      key={i}
                      variant="secondary"
                      className="bg-neon-blue/10 text-neon-blue border-neon-blue/20 pr-1"
                    >
                      {f}
                      <button
                        onClick={() => setEditFeatures(editFeatures.filter((_, idx) => idx !== i))}
                        className="ml-1 hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label>Требования к заказчику</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="Добавить..."
                  value={editReqInput}
                  onChange={(e) => setEditReqInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      const trimmed = editReqInput.trim();
                      if (trimmed && editRequirements.length < 10) {
                        setEditRequirements([...editRequirements, trimmed]);
                        setEditReqInput("");
                      }
                    }
                  }}
                  className="bg-secondary/50 border-border/50 focus:border-neon-blue/50"
                  maxLength={80}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => {
                    const trimmed = editReqInput.trim();
                    if (trimmed && editRequirements.length < 10) {
                      setEditRequirements([...editRequirements, trimmed]);
                      setEditReqInput("");
                    }
                  }}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {editRequirements.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {editRequirements.map((r, i) => (
                    <Badge
                      key={i}
                      variant="secondary"
                      className="bg-neon-orange/10 text-neon-orange border-neon-orange/20 pr-1"
                    >
                      {r}
                      <button
                        onClick={() => setEditRequirements(editRequirements.filter((_, idx) => idx !== i))}
                        className="ml-1 hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setEditingService(null)}>
              Отмена
            </Button>
            <Button
              onClick={handleSaveEdit}
              disabled={isSaving}
              className="bg-neon-orange hover:bg-neon-orange/80 text-white"
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Сохранение...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Сохранить
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <Dialog open={!!deleteConfirmId} onOpenChange={(open) => !open && setDeleteConfirmId(null)}>
        <DialogContent className="sm:max-w-[400px] bg-background border-border/50">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Удалить услугу?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Это действие нельзя отменить. Услуга будет деактивирована и удалена из каталога.
          </p>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>
              Отмена
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteConfirmId && handleDelete(deleteConfirmId)}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Удалить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
