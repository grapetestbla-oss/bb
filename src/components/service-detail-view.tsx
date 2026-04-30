"use client";

import { useEffect, useState } from "react";
import { useAppStore, type Service, type Review } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ChevronLeft,
  Star,
  Clock,
  CheckCircle,
  Shield,
  User,
  Zap,
  Trophy,
  Swords,
  Target,
  TrendingUp,
  MessageSquare,
} from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";

const categoryGradients: Record<string, string> = {
  trophies: "from-yellow-500/40 to-orange-600/40",
  brawlers: "from-neon-purple/40 to-pink-600/40",
  quests: "from-neon-green/40 to-emerald-600/40",
  ranks: "from-neon-blue/40 to-cyan-600/40",
};

const categoryIcons: Record<string, typeof Trophy> = {
  trophies: Trophy,
  brawlers: Swords,
  quests: Target,
  ranks: TrendingUp,
};

export function ServiceDetailView() {
  const {
    selectedServiceId,
    services,
    setView,
    currentUser,
    isAuthenticated,
    setAuthTab,
  } = useAppStore();

  const [service, setService] = useState<Service | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [ordering, setOrdering] = useState(false);

  useEffect(() => {
    const fetchService = async () => {
      if (!selectedServiceId) return;
      setLoading(true);
      try {
        const res = await fetch(`/api/services/${selectedServiceId}`);
        if (res.ok) {
          const data = await res.json();
          setService(data.service || data);
        }
      } catch (error) {
        console.error("Failed to fetch service:", error);
      } finally {
        setLoading(false);
      }
    };

    // First try to find in store
    const fromStore = services.find((s) => s.id === selectedServiceId);
    if (fromStore) {
      setService(fromStore);
      setLoading(false);
    }

    // Always fetch fresh data
    fetchService();
  }, [selectedServiceId, services]);

  useEffect(() => {
    const fetchReviews = async () => {
      if (!selectedServiceId) return;
      try {
        const res = await fetch(
          `/api/reviews?serviceId=${selectedServiceId}`
        );
        if (res.ok) {
          const data = await res.json();
          setReviews(data.reviews || (Array.isArray(data) ? data : []));
        }
      } catch {
        // ignore
      }
    };
    fetchReviews();
  }, [selectedServiceId]);

  const handleOrder = async () => {
    if (!isAuthenticated) {
      setAuthTab("login");
      setView("auth");
      return;
    }
    if (!service || !currentUser) return;

    setOrdering(true);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceId: service.id,
          clientId: currentUser.id,
          price: service.price,
        }),
      });
      if (res.ok) {
        toast.success("Заказ создан!", {
          description: "Перенаправляем в личный кабинет...",
        });
        setView("dashboard");
      } else {
        const data = await res.json();
        toast.error("Ошибка создания заказа", {
          description: data.error || "Попробуйте позже",
        });
      }
    } catch {
      toast.error("Ошибка сети", {
        description: "Не удалось создать заказ",
      });
    } finally {
      setOrdering(false);
    }
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`h-4 w-4 ${
          i < Math.round(rating)
            ? "fill-neon-yellow text-neon-yellow"
            : "fill-muted text-muted"
        }`}
      />
    ));
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8">
        <Skeleton className="h-8 w-32 mb-6" />
        <Skeleton className="h-48 w-full mb-6" />
        <div className="space-y-4">
          <Skeleton className="h-8 w-1/2" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      </div>
    );
  }

  if (!service) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16 text-center">
        <p className="text-muted-foreground">Услуга не найдена</p>
        <Button
          variant="outline"
          onClick={() => setView("catalog")}
          className="mt-4"
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Назад к каталогу
        </Button>
      </div>
    );
  }

  const categorySlug = service.category?.slug || "";
  const gradientClass =
    categoryGradients[categorySlug] || "from-neon-blue/40 to-neon-purple/40";
  const CategoryIcon = categoryIcons[categorySlug] || Zap;
  const features: string[] = Array.isArray(service.features)
    ? service.features
    : [];
  const requirements: string[] = Array.isArray(service.requirements)
    ? service.requirements
    : [];

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      {/* Back button */}
      <Button
        variant="ghost"
        onClick={() => setView("catalog")}
        className="mb-4 text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="h-4 w-4 mr-1" />
        Назад к каталогу
      </Button>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        {/* Hero image/gradient */}
        <div
          className={`relative h-48 sm:h-56 bg-gradient-to-br ${gradientClass} rounded-xl flex items-center justify-center overflow-hidden mb-6`}
        >
          <CategoryIcon className="h-24 w-24 text-white/10 absolute" />
          <div className="relative z-10 flex flex-col items-center gap-2">
            <CategoryIcon className="h-12 w-12 text-white/80" />
            <span className="text-sm font-medium text-white/60 uppercase tracking-wider">
              {service.category?.name || "Услуга"}
            </span>
          </div>
          <div className="absolute inset-0 animate-shimmer opacity-0 hover:opacity-100 transition-opacity" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Title & Rating */}
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
                {service.title}
              </h1>
              <div className="flex items-center gap-3 mt-2">
                <div className="flex items-center gap-1">
                  {renderStars(service.rating)}
                </div>
                <span className="text-sm text-muted-foreground">
                  {service.rating.toFixed(1)} ({service.reviewsCount} отзывов)
                </span>
                <Badge variant="outline" className="text-xs">
                  <Clock className="h-3 w-3 mr-1" />
                  {service.estimatedTime}
                </Badge>
              </div>
            </div>

            {/* Description */}
            <Card>
              <CardContent className="p-4 sm:p-6">
                <h2 className="text-lg font-semibold mb-3">Описание</h2>
                <p className="text-muted-foreground leading-relaxed">
                  {service.description}
                </p>
              </CardContent>
            </Card>

            {/* Features */}
            {features.length > 0 && (
              <Card>
                <CardContent className="p-4 sm:p-6">
                  <h2 className="text-lg font-semibold mb-3">
                    Что включено
                  </h2>
                  <ul className="space-y-2">
                    {features.map((feature, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <CheckCircle className="h-4 w-4 text-neon-green mt-0.5 shrink-0" />
                        <span className="text-sm text-muted-foreground">
                          {feature}
                        </span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {/* Requirements */}
            {requirements.length > 0 && (
              <Card>
                <CardContent className="p-4 sm:p-6">
                  <h2 className="text-lg font-semibold mb-3">Требования</h2>
                  <ul className="space-y-2">
                    {requirements.map((req, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <Shield className="h-4 w-4 text-neon-yellow mt-0.5 shrink-0" />
                        <span className="text-sm text-muted-foreground">
                          {req}
                        </span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {/* Reviews */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Отзывы ({reviews.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 pt-0">
                {reviews.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">
                    Пока нет отзывов. Будьте первым!
                  </p>
                ) : (
                  <div className="space-y-4 max-h-96 overflow-y-auto">
                    {reviews.map((review) => (
                      <div
                        key={review.id}
                        className="flex gap-3 p-3 rounded-lg bg-secondary/30"
                      >
                        <div className="h-8 w-8 rounded-full bg-neon-purple/20 flex items-center justify-center shrink-0">
                          <User className="h-4 w-4 text-neon-purple" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
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
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            {review.comment}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Price card */}
            <Card className="gradient-border">
              <CardContent className="p-4 sm:p-6 space-y-4">
                <div>
                  <span className="text-sm text-muted-foreground">Цена</span>
                  <div className="text-3xl font-bold text-neon-orange mt-1">
                    {service.price.toLocaleString("ru-RU")} ₽
                  </div>
                </div>
                <Separator />
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  Срок: {service.estimatedTime}
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Shield className="h-4 w-4" />
                  Безопасная сделка
                </div>
                <Button
                  onClick={handleOrder}
                  disabled={ordering}
                  className="w-full bg-neon-blue hover:bg-neon-blue/80 text-white font-semibold h-11 text-base glow-blue"
                >
                  {ordering ? "Создание заказа..." : "Заказать"}
                </Button>
              </CardContent>
            </Card>

            {/* Booster info */}
            {service.booster && (
              <Card>
                <CardContent className="p-4 sm:p-6">
                  <h3 className="text-sm font-semibold text-muted-foreground mb-3">
                    Бустер
                  </h3>
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-full bg-neon-purple/20 flex items-center justify-center">
                      <User className="h-6 w-6 text-neon-purple" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">
                          {service.booster.username}
                        </span>
                        {service.booster.verified && (
                          <Badge className="bg-neon-green/20 text-neon-green text-[10px] px-1.5 border-0">
                            <CheckCircle className="h-3 w-3 mr-0.5" />
                            Верифицирован
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-1 mt-1">
                        {renderStars(service.booster.rating)}
                        <span className="text-xs text-muted-foreground ml-1">
                          {service.booster.rating.toFixed(1)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 text-xs text-muted-foreground">
                    Выполнено заказов: {service.booster.reviewsCount}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
