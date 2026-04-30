"use client";

import { useEffect, useState } from "react";
import { useAppStore, type Order, type Notification as AppNotification } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
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
  } = useAppStore();

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated || !currentUser) {
      setView("auth");
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      try {
        const [ordersRes, notifRes] = await Promise.all([
          fetch(`/api/orders?userId=${currentUser.id}`),
          fetch(`/api/notifications?userId=${currentUser.id}`),
        ]);
        if (ordersRes.ok) {
          const ordersData = await ordersRes.json();
          setOrders(ordersData.orders || (Array.isArray(ordersData) ? ordersData : []));
        }
        if (notifRes.ok) {
          const notifData = await notifRes.json();
          setNotifications(notifData.notifications || (Array.isArray(notifData) ? notifData : []));
        }
      } catch (error) {
        console.error("Failed to fetch dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [currentUser, isAuthenticated, setOrders, setNotifications, setView]);

  if (!isAuthenticated || !currentUser) return null;

  const userAchievements: string[] = Array.isArray(currentUser.achievements)
    ? currentUser.achievements
    : [];

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
            setDashboardTab(val as "orders" | "balance" | "notifications" | "achievements")
          }
        >
          <TabsList className="w-full flex h-10 mb-4">
            <TabsTrigger value="orders" className="flex-1 gap-1.5">
              <ShoppingBag className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Заказы</span>
            </TabsTrigger>
            <TabsTrigger value="balance" className="flex-1 gap-1.5">
              <Wallet className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Баланс</span>
            </TabsTrigger>
            <TabsTrigger value="notifications" className="flex-1 gap-1.5">
              <Bell className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Уведомления</span>
            </TabsTrigger>
            <TabsTrigger value="achievements" className="flex-1 gap-1.5">
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
    </div>
  );
}
