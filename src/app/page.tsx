"use client";

import { useEffect } from "react";
import { useAppStore } from "@/lib/store";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { CatalogView } from "@/components/catalog-view";
import { ServiceDetailView } from "@/components/service-detail-view";
import { AuthView } from "@/components/auth-view";
import { UserDashboard } from "@/components/user-dashboard";
import { AdminPanel } from "@/components/admin-panel";
import { ChatWidget } from "@/components/chat-widget";
import { AnimatePresence, motion } from "framer-motion";

export default function Home() {
  const {
    currentView,
    setServices,
    setCategories,
    setUser,
    setIsLoading,
  } = useAppStore();

  // Initial data load
  useEffect(() => {
    const initApp = async () => {
      setIsLoading(true);

      // Check for saved user in localStorage
      try {
        const savedUser = localStorage.getItem("brawlboost-user");
        if (savedUser) {
          const parsed = JSON.parse(savedUser);
          setUser(parsed);
        }
      } catch {
        // ignore parse errors
      }

      // Seed demo data first
      try {
        await fetch("/api/seed", { method: "POST" });
      } catch {
        // Seed may fail if already seeded, that's fine
      }

      // Fetch categories and services
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
        console.error("Failed to fetch initial data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    initApp();
  }, [setServices, setCategories, setUser, setIsLoading]);

  // Save user to localStorage when it changes
  useEffect(() => {
    const { currentUser } = useAppStore.getState();
    if (currentUser) {
      localStorage.setItem("brawlboost-user", JSON.stringify(currentUser));
    } else {
      localStorage.removeItem("brawlboost-user");
    }
  });

  const renderView = () => {
    switch (currentView) {
      case "catalog":
        return <CatalogView />;
      case "service-detail":
        return <ServiceDetailView />;
      case "auth":
        return <AuthView />;
      case "dashboard":
        return <UserDashboard />;
      case "admin":
        return <AdminPanel />;
      case "order-chat":
        return <ChatWidget />;
      default:
        return <CatalogView />;
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentView}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
          >
            {renderView()}
          </motion.div>
        </AnimatePresence>
      </main>
      <Footer />
    </div>
  );
}
