"use client";

import { useState } from "react";
import { useAppStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Search,
  Sun,
  Moon,
  Menu,
  User,
  LogOut,
  Bell,
  Shield,
  LayoutDashboard,
  Zap,
  Plus,
} from "lucide-react";

export function Header() {
  const {
    currentView,
    setView,
    currentUser,
    isAuthenticated,
    searchQuery,
    setSearchQuery,
    logout,
    toggleTheme,
    getTheme,
    setShowCreateService,
  } = useAppStore();
  const [mobileOpen, setMobileOpen] = useState(false);
  const theme = getTheme();

  const navItems = [
    { label: "Каталог", view: "catalog" as const, icon: Zap },
    ...(isAuthenticated
      ? [
          {
            label: "Мои заказы",
            view: "dashboard" as const,
            icon: LayoutDashboard,
          },
        ]
      : []),
    ...(isAuthenticated &&
    currentUser &&
    (currentUser.role === "moderator" || currentUser.role === "admin")
      ? [{ label: "Админ", view: "admin" as const, icon: Shield }]
      : []),
  ];

  const handleNav = (view: Parameters<typeof setView>[0]) => {
    setView(view);
    setMobileOpen(false);
  };

  const handleLogout = () => {
    logout();
    setMobileOpen(false);
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/50 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 gap-4">
        {/* Logo */}
        <button
          onClick={() => handleNav("catalog")}
          className="flex items-center gap-2 shrink-0"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-neon-blue/20">
            <Zap className="h-5 w-5 text-neon-blue" />
          </div>
          <span className="text-xl font-bold text-glow-blue text-neon-blue hidden sm:inline">
            BrawlBoost
          </span>
        </button>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.view;
            return (
              <Button
                key={item.view}
                variant={isActive ? "default" : "ghost"}
                size="sm"
                onClick={() => handleNav(item.view)}
                className={
                  isActive
                    ? "bg-neon-blue/20 text-neon-blue hover:bg-neon-blue/30"
                    : "text-muted-foreground hover:text-foreground"
                }
              >
                <Icon className="h-4 w-4 mr-1.5" />
                {item.label}
              </Button>
            );
          })}
          {isAuthenticated && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowCreateService(true)}
              className="text-neon-orange hover:text-neon-orange/80 hover:bg-neon-orange/10"
            >
              <Plus className="h-4 w-4 mr-1.5" />
              Создать
            </Button>
          )}
        </nav>

        {/* Search */}
        <div className="hidden sm:flex relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Поиск услуг..."
            value={searchQuery}
            onChange={handleSearch}
            className="pl-9 bg-secondary/50 border-border/50 focus:border-neon-blue/50 focus:ring-neon-blue/20"
          />
        </div>

        {/* Right side actions */}
        <div className="flex items-center gap-2">
          {/* Theme toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            className="text-muted-foreground hover:text-foreground"
          >
            {theme === "dark" ? (
              <Sun className="h-5 w-5" />
            ) : (
              <Moon className="h-5 w-5" />
            )}
          </Button>

          {/* Auth buttons or user menu */}
          {isAuthenticated && currentUser ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="flex items-center gap-2 px-2"
                >
                  <Avatar className="h-7 w-7">
                    <AvatarFallback className="bg-neon-purple/30 text-neon-purple text-xs">
                      {currentUser.username.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="hidden sm:inline text-sm font-medium">
                    {currentUser.username}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => handleNav("dashboard")}>
                  <LayoutDashboard className="mr-2 h-4 w-4" />
                  Кабинет
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleNav("dashboard")}>
                  <Bell className="mr-2 h-4 w-4" />
                  Уведомления
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-destructive">
                  <LogOut className="mr-2 h-4 w-4" />
                  Выйти
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="hidden sm:flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  useAppStore.getState().setAuthTab("login");
                  handleNav("auth");
                }}
              >
                Войти
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  useAppStore.getState().setAuthTab("register");
                  handleNav("auth");
                }}
                className="bg-neon-blue hover:bg-neon-blue/80 text-white"
              >
                Регистрация
              </Button>
            </div>
          )}

          {/* Mobile menu */}
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72 bg-background">
              <SheetHeader>
                <SheetTitle className="text-glow-blue text-neon-blue">
                  BrawlBoost
                </SheetTitle>
              </SheetHeader>
              <div className="flex flex-col gap-4 mt-6">
                {/* Mobile search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Поиск услуг..."
                    value={searchQuery}
                    onChange={handleSearch}
                    className="pl-9"
                  />
                </div>

                {/* Mobile nav */}
                <nav className="flex flex-col gap-1">
                  {navItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = currentView === item.view;
                    return (
                      <Button
                        key={item.view}
                        variant={isActive ? "default" : "ghost"}
                        className={
                          isActive
                            ? "bg-neon-blue/20 text-neon-blue justify-start"
                            : "justify-start text-muted-foreground"
                        }
                        onClick={() => handleNav(item.view)}
                      >
                        <Icon className="h-4 w-4 mr-2" />
                        {item.label}
                      </Button>
                    );
                  })}
                  {isAuthenticated && (
                    <Button
                      variant="ghost"
                      className="justify-start text-neon-orange hover:text-neon-orange/80 hover:bg-neon-orange/10"
                      onClick={() => {
                        setShowCreateService(true);
                        setMobileOpen(false);
                      }}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Создать услугу
                    </Button>
                  )}
                </nav>

                {/* Mobile auth */}
                {!isAuthenticated && (
                  <div className="flex flex-col gap-2 mt-4 pt-4 border-t border-border">
                    <Button
                      variant="outline"
                      onClick={() => {
                        useAppStore.getState().setAuthTab("login");
                        handleNav("auth");
                      }}
                    >
                      <User className="h-4 w-4 mr-2" />
                      Войти
                    </Button>
                    <Button
                      onClick={() => {
                        useAppStore.getState().setAuthTab("register");
                        handleNav("auth");
                      }}
                      className="bg-neon-blue hover:bg-neon-blue/80 text-white"
                    >
                      Регистрация
                    </Button>
                  </div>
                )}

                {isAuthenticated && currentUser && (
                  <div className="flex flex-col gap-2 mt-4 pt-4 border-t border-border">
                    <div className="flex items-center gap-3 px-2 py-1">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="bg-neon-purple/30 text-neon-purple">
                          {currentUser.username.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium">
                          {currentUser.username}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {currentUser.role === "client"
                            ? "Клиент"
                            : currentUser.role === "booster"
                            ? "Бустер"
                            : currentUser.role === "moderator"
                            ? "Модератор"
                            : "Администратор"}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      className="justify-start text-destructive"
                      onClick={handleLogout}
                    >
                      <LogOut className="h-4 w-4 mr-2" />
                      Выйти
                    </Button>
                  </div>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
