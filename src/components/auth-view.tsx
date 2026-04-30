"use client";

import { useState } from "react";
import { useAppStore } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Zap, Mail, Lock, User, Eye, EyeOff } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

export function AuthView() {
  const { authTab, setAuthTab, setUser, setView } = useAppStore();

  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [regUsername, setRegUsername] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regConfirm, setRegConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail || !loginPassword) {
      toast.error("Заполните все поля");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "login", email: loginEmail, password: loginPassword }),
      });
      const data = await res.json();
      if (res.ok) {
        setUser(data.user);
        toast.success(`Добро пожаловать, ${data.user.username}!`);
        setView("catalog");
      } else {
        toast.error("Ошибка входа", {
          description: data.error || "Неверные данные",
        });
      }
    } catch {
      toast.error("Ошибка сети", { description: "Попробуйте позже" });
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regUsername || !regEmail || !regPassword || !regConfirm) {
      toast.error("Заполните все поля");
      return;
    }
    if (regPassword !== regConfirm) {
      toast.error("Пароли не совпадают");
      return;
    }
    if (regPassword.length < 6) {
      toast.error("Пароль минимум 6 символов");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "register",
          username: regUsername,
          email: regEmail,
          password: regPassword,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setUser(data.user);
        toast.success("Регистрация успешна!", {
          description: `Добро пожаловать, ${data.user.username}!`,
        });
        setView("catalog");
      } else {
        toast.error("Ошибка регистрации", {
          description: data.error || "Попробуйте позже",
        });
      }
    } catch {
      toast.error("Ошибка сети", { description: "Попробуйте позже" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-8rem)] px-4 py-8">
      {/* Background decorations */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/4 h-64 w-64 rounded-full bg-neon-blue/5 blur-3xl animate-pulse-glow" />
        <div className="absolute bottom-1/4 right-1/4 h-64 w-64 rounded-full bg-neon-purple/5 blur-3xl animate-pulse-glow" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative w-full max-w-md"
      >
        <Card className="gradient-border overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-hero p-6 text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <div className="h-10 w-10 rounded-xl bg-neon-blue/20 flex items-center justify-center">
                <Zap className="h-6 w-6 text-neon-blue" />
              </div>
            </div>
            <h1 className="text-2xl font-bold">
              <span className="text-glow-blue text-neon-blue">Brawl</span>
              <span className="text-glow-orange text-neon-orange">Boost</span>
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Войдите в аккаунт или создайте новый
            </p>
          </div>

          <CardContent className="p-0">
            <Tabs
              value={authTab}
              onValueChange={(val) =>
                setAuthTab(val as "login" | "register")
              }
            >
              <TabsList className="w-full rounded-none border-b border-border bg-transparent h-12">
                <TabsTrigger
                  value="login"
                  className="flex-1 data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-neon-blue data-[state=active]:text-neon-blue data-[state=active]:shadow-none rounded-none"
                >
                  Вход
                </TabsTrigger>
                <TabsTrigger
                  value="register"
                  className="flex-1 data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-neon-orange data-[state=active]:text-neon-orange data-[state=active]:shadow-none rounded-none"
                >
                  Регистрация
                </TabsTrigger>
              </TabsList>

              <AnimatePresence mode="wait">
                <TabsContent value="login" className="p-6 mt-0">
                  <motion.form
                    key="login"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ duration: 0.2 }}
                    onSubmit={handleLogin}
                    className="space-y-4"
                  >
                    <div className="space-y-2">
                      <Label htmlFor="login-email">Email</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="login-email"
                          type="email"
                          placeholder="example@mail.com"
                          value={loginEmail}
                          onChange={(e) => setLoginEmail(e.target.value)}
                          className="pl-9"
                          required
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="login-password">Пароль</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="login-password"
                          type={showPassword ? "text" : "password"}
                          placeholder="••••••"
                          value={loginPassword}
                          onChange={(e) => setLoginPassword(e.target.value)}
                          className="pl-9 pr-9"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                          {showPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </div>
                    <Button
                      type="submit"
                      disabled={loading}
                      className="w-full bg-neon-blue hover:bg-neon-blue/80 text-white font-semibold"
                    >
                      {loading ? "Вход..." : "Войти"}
                    </Button>
                  </motion.form>
                </TabsContent>

                <TabsContent value="register" className="p-6 mt-0">
                  <motion.form
                    key="register"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.2 }}
                    onSubmit={handleRegister}
                    className="space-y-4"
                  >
                    <div className="space-y-2">
                      <Label htmlFor="reg-username">Имя пользователя</Label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="reg-username"
                          type="text"
                          placeholder="Brawler123"
                          value={regUsername}
                          onChange={(e) => setRegUsername(e.target.value)}
                          className="pl-9"
                          required
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="reg-email">Email</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="reg-email"
                          type="email"
                          placeholder="example@mail.com"
                          value={regEmail}
                          onChange={(e) => setRegEmail(e.target.value)}
                          className="pl-9"
                          required
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="reg-password">Пароль</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="reg-password"
                          type={showPassword ? "text" : "password"}
                          placeholder="Минимум 6 символов"
                          value={regPassword}
                          onChange={(e) => setRegPassword(e.target.value)}
                          className="pl-9 pr-9"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                          {showPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="reg-confirm">Подтвердите пароль</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="reg-confirm"
                          type="password"
                          placeholder="Повторите пароль"
                          value={regConfirm}
                          onChange={(e) => setRegConfirm(e.target.value)}
                          className="pl-9"
                          required
                        />
                      </div>
                    </div>
                    <Button
                      type="submit"
                      disabled={loading}
                      className="w-full bg-neon-orange hover:bg-neon-orange/80 text-white font-semibold"
                    >
                      {loading ? "Регистрация..." : "Зарегистрироваться"}
                    </Button>
                  </motion.form>
                </TabsContent>
              </AnimatePresence>
            </Tabs>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
