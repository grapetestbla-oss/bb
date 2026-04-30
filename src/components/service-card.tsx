"use client";

import { useAppStore, type Service } from "@/lib/store";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Star, Clock, User, Zap, Trophy, Swords, Target } from "lucide-react";
import { motion } from "framer-motion";

const categoryGradients: Record<string, string> = {
  trophies: "from-yellow-500/30 to-orange-600/30",
  brawlers: "from-neon-purple/30 to-pink-600/30",
  quests: "from-neon-green/30 to-emerald-600/30",
  ranks: "from-neon-blue/30 to-cyan-600/30",
};

const categoryIcons: Record<string, typeof Trophy> = {
  trophies: Trophy,
  brawlers: Swords,
  quests: Target,
  ranks: Zap,
};

interface ServiceCardProps {
  service: Service;
}

export function ServiceCard({ service }: ServiceCardProps) {
  const { selectService, currentUser, isAuthenticated, setView, setAuthTab } =
    useAppStore();

  const categorySlug = service.category?.slug || "";
  const gradientClass =
    categoryGradients[categorySlug] || "from-neon-blue/30 to-neon-purple/30";
  const CategoryIcon = categoryIcons[categorySlug] || Zap;

  const handleClick = () => {
    selectService(service.id);
  };

  const handleOrder = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isAuthenticated) {
      setAuthTab("login");
      setView("auth");
      return;
    }
    selectService(service.id);
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`h-3.5 w-3.5 ${
          i < Math.round(rating)
            ? "fill-neon-yellow text-neon-yellow"
            : "fill-muted text-muted"
        }`}
      />
    ));
  };

  return (
    <motion.div
      whileHover={{ y: -4, scale: 1.01 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
    >
      <Card
        className="gradient-border cursor-pointer overflow-hidden group transition-all duration-300 hover:shadow-lg hover:shadow-neon-blue/5"
        onClick={handleClick}
      >
        {/* Image/Gradient header */}
        <div
          className={`relative h-36 bg-gradient-to-br ${gradientClass} flex items-center justify-center overflow-hidden`}
        >
          <CategoryIcon className="h-16 w-16 text-white/20 absolute" />
          <div className="relative z-10 flex flex-col items-center gap-1">
            <CategoryIcon className="h-8 w-8 text-white/80" />
            <span className="text-xs font-medium text-white/70 uppercase tracking-wider">
              {service.category?.name || "Услуга"}
            </span>
          </div>
          <div className="absolute inset-0 animate-shimmer opacity-0 group-hover:opacity-100 transition-opacity" />
          {service.ordersCount > 10 && (
            <Badge className="absolute top-2 right-2 bg-neon-orange/90 text-white text-[10px] px-1.5 py-0.5 border-0">
              Популярное
            </Badge>
          )}
        </div>

        <CardContent className="p-4 flex flex-col gap-3">
          {/* Title */}
          <h3 className="font-semibold text-foreground group-hover:text-glow-blue group-hover:text-neon-blue transition-colors line-clamp-1">
            {service.title}
          </h3>

          {/* Rating & Orders */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-0.5">
              {renderStars(service.rating)}
            </div>
            <span className="text-xs text-muted-foreground">
              {service.rating.toFixed(1)} ({service.reviewsCount})
            </span>
          </div>

          {/* Booster */}
          {service.booster && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <User className="h-3.5 w-3.5" />
              <span className="truncate">{service.booster.username}</span>
              {service.booster.verified && (
                <Badge
                  variant="outline"
                  className="h-4 px-1 text-[10px] border-neon-green/50 text-neon-green"
                >
                  ✓
                </Badge>
              )}
            </div>
          )}

          {/* Time & Price row */}
          <div className="flex items-center justify-between mt-1">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Clock className="h-3.5 w-3.5" />
              <span>{service.estimatedTime}</span>
            </div>
            <span className="text-lg font-bold text-neon-orange">
              {service.price.toLocaleString("ru-RU")} ₽
            </span>
          </div>

          {/* Order button */}
          <Button
            onClick={handleOrder}
            className="w-full bg-neon-blue/90 hover:bg-neon-blue text-white font-medium transition-all hover:shadow-md hover:shadow-neon-blue/25"
            size="sm"
          >
            Заказать
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  );
}
