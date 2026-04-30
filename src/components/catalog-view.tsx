"use client";

import { useEffect, useMemo, useState } from "react";
import { useAppStore } from "@/lib/store";
import { ServiceCard } from "@/components/service-card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Zap,
  Trophy,
  Swords,
  Target,
  TrendingUp,
  Search,
  Plus,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { CreateServiceDialog } from "@/components/create-service-dialog";

const categoryIcons: Record<string, typeof Trophy> = {
  trophies: Trophy,
  brawlers: Swords,
  quests: Target,
  ranks: TrendingUp,
};

export function CatalogView() {
  const {
    services,
    categories,
    searchQuery,
    selectedCategory,
    sortBy,
    setSearchQuery,
    setSelectedCategory,
    setSortBy,
    setServices,
    setCategories,
    isLoading,
    setIsLoading,
    isAuthenticated,
    showCreateService,
    setShowCreateService,
    setMyServices,
    myServices,
  } = useAppStore();

  const [localSearch, setLocalSearch] = useState(searchQuery);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchQuery(localSearch);
    }, 300);
    return () => clearTimeout(timer);
  }, [localSearch, setSearchQuery]);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [servicesRes, categoriesRes] = await Promise.all([
          fetch("/api/services"),
          fetch("/api/categories"),
        ]);
        if (servicesRes.ok) {
          const servicesData = await servicesRes.json();
          setServices(servicesData.services || servicesData);
        }
        if (categoriesRes.ok) {
          const categoriesData = await categoriesRes.json();
          setCategories(Array.isArray(categoriesData) ? categoriesData : (categoriesData.categories || []));
        }
      } catch (error) {
        console.error("Failed to fetch data:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [setServices, setCategories, setIsLoading]);

  const filteredServices = useMemo(() => {
    let result = [...services];

    // Filter by category
    if (selectedCategory) {
      result = result.filter((s) => s.categoryId === selectedCategory);
    }

    // Filter by search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (s) =>
          s.title.toLowerCase().includes(query) ||
          s.description.toLowerCase().includes(query) ||
          s.category?.name.toLowerCase().includes(query)
      );
    }

    // Sort
    switch (sortBy) {
      case "price_asc":
        result.sort((a, b) => a.price - b.price);
        break;
      case "price_desc":
        result.sort((a, b) => b.price - a.price);
        break;
      case "rating":
        result.sort((a, b) => b.rating - a.rating);
        break;
      case "newest":
        result.sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        break;
      case "popular":
      default:
        result.sort((a, b) => b.ordersCount - a.ordersCount);
        break;
    }

    return result;
  }, [services, selectedCategory, searchQuery, sortBy]);

  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="bg-gradient-hero relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-10 left-10 h-32 w-32 rounded-full bg-neon-blue/5 blur-3xl animate-pulse-glow" />
          <div className="absolute bottom-10 right-10 h-40 w-40 rounded-full bg-neon-purple/5 blur-3xl animate-pulse-glow" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-64 w-64 rounded-full bg-neon-orange/3 blur-3xl" />
        </div>
        <div className="relative mx-auto max-w-7xl px-4 py-16 sm:py-24 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight">
              <span className="text-glow-blue text-neon-blue">Brawl</span>
              <span className="text-glow-orange text-neon-orange">Boost</span>
            </h1>
            <p className="mt-4 text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto">
              Профессиональный бустинг Brawl Stars
            </p>
            <p className="mt-2 text-sm text-muted-foreground/70 max-w-xl mx-auto">
              Трофеи, редкие бойцы, квесты и ранги — доверьтесь лучшим бустерам
              сообщества
            </p>
          </motion.div>

          {/* Hero search */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mt-8 max-w-md mx-auto relative"
          >
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Найти услугу..."
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              className="w-full h-11 rounded-xl border border-border/50 bg-background/60 backdrop-blur-sm pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-neon-blue/50 focus:border-neon-blue/50 placeholder:text-muted-foreground"
            />
          </motion.div>
        </div>
      </section>

      {/* Filters & Content */}
      <section className="mx-auto max-w-7xl px-4 py-8 w-full">
        {/* Category pills & Sort */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          {/* Category filter pills */}
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant={selectedCategory === null ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedCategory(null)}
              className={
                selectedCategory === null
                  ? "bg-neon-blue/20 text-neon-blue border-neon-blue/30 hover:bg-neon-blue/30"
                  : ""
              }
            >
              <Zap className="h-3.5 w-3.5 mr-1.5" />
              Все
            </Button>
            {categories.map((cat) => {
              const Icon = categoryIcons[cat.slug] || Zap;
              const isActive = selectedCategory === cat.id;
              return (
                <Button
                  key={cat.id}
                  variant={isActive ? "default" : "outline"}
                  size="sm"
                  onClick={() =>
                    setSelectedCategory(isActive ? null : cat.id)
                  }
                  className={
                    isActive
                      ? "bg-neon-blue/20 text-neon-blue border-neon-blue/30 hover:bg-neon-blue/30"
                      : ""
                  }
                >
                  <Icon className="h-3.5 w-3.5 mr-1.5" />
                  {cat.name}
                </Button>
              );
            })}
          </div>

          {/* Sort + Create button */}
          <div className="flex items-center gap-2">
            <Select
              value={sortBy}
              onValueChange={(val) =>
                setSortBy(
                  val as "popular" | "price_asc" | "price_desc" | "rating" | "newest"
                )
              }
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Сортировка" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="popular">Популярные</SelectItem>
                <SelectItem value="price_asc">Цена ↑</SelectItem>
                <SelectItem value="price_desc">Цена ↓</SelectItem>
                <SelectItem value="rating">Рейтинг</SelectItem>
                <SelectItem value="newest">Новые</SelectItem>
              </SelectContent>
            </Select>
            {isAuthenticated && (
              <Button
                onClick={() => setShowCreateService(true)}
                className="bg-neon-orange hover:bg-neon-orange/80 text-white shrink-0"
                size="sm"
              >
                <Plus className="h-4 w-4 mr-1.5" />
                <span className="hidden sm:inline">Создать услугу</span>
                <span className="sm:hidden">Создать</span>
              </Button>
            )}
          </div>
        </div>

        {/* Services grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="space-y-3">
                <Skeleton className="h-36 w-full rounded-t-lg" />
                <div className="p-4 space-y-3">
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-9 w-full" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredServices.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-16"
          >
            <Zap className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-lg text-muted-foreground">
              Услуги не найдены
            </p>
            <p className="text-sm text-muted-foreground/70 mt-1">
              Попробуйте изменить фильтры или поисковый запрос
            </p>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            <AnimatePresence mode="popLayout">
              {filteredServices.map((service) => (
                <motion.div
                  key={service.id}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.2 }}
                >
                  <ServiceCard service={service} />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </section>

      {/* Create Service Dialog */}
      <CreateServiceDialog
        open={showCreateService}
        onOpenChange={setShowCreateService}
      />
    </div>
  );
}
