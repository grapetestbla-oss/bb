"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useAppStore, type ChatMessage, type Order } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { OrderTracker } from "@/components/order-tracker";
import {
  ChevronLeft,
  Send,
  Clock,
  Loader2,
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

export function ChatWidget() {
  const { selectedOrderId, currentUser, isAuthenticated, setView, orders } =
    useAppStore();

  const [order, setOrder] = useState<Order | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [socket, setSocket] = useState<unknown>(null);
  const [progressValue, setProgressValue] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load order data
  useEffect(() => {
    if (!selectedOrderId) return;
    const loadOrder = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/orders/${selectedOrderId}`);
        if (res.ok) {
          const data = await res.json();
          const orderData = data.order || data;
          setOrder(orderData);
          setMessages(orderData.messages || []);
          setProgressValue(orderData.progress || 0);
        }
      } catch (error) {
        console.error("Failed to load order:", error);
      } finally {
        setLoading(false);
      }
    };
    loadOrder();
  }, [selectedOrderId]);

  // Socket.IO connection
  useEffect(() => {
    if (!selectedOrderId) return;

    let io: ReturnType<typeof import("socket.io-client")["io"]> | null = null;

    const connectSocket = async () => {
      try {
        const { io: socketIO } = await import("socket.io-client");
        io = socketIO("/?XTransformPort=3003", {
          transports: ["websocket", "polling"],
        });

        io.on("connect", () => {
          console.log("Socket connected");
          io?.emit("join-order", { orderId: selectedOrderId, userId: currentUser?.id });
        });

        io.on("new-message", (msg: ChatMessage) => {
          setMessages((prev) => {
            if (prev.some((m) => m.id === msg.id)) return prev;
            return [...prev, msg];
          });
        });

        io.on("progress-update", (data: { orderId: string; progress: number }) => {
          if (data.orderId === selectedOrderId) {
            setProgressValue(data.progress);
            setOrder((prev) =>
              prev ? { ...prev, progress: data.progress } : prev
            );
          }
        });

        setSocket(io);
      } catch (error) {
        console.error("Socket connection failed:", error);
      }
    };

    connectSocket();

    return () => {
      if (io) {
        io.emit("leave-order", selectedOrderId);
        io.disconnect();
      }
    };
  }, [selectedOrderId]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = useCallback(async () => {
    if (!newMessage.trim() || !selectedOrderId || !currentUser) return;

    const content = newMessage.trim();
    setNewMessage("");
    setSending(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: selectedOrderId,
          senderId: currentUser.id,
          content,
        }),
      });

      if (res.ok) {
        const msg = await res.json();
        setMessages((prev) => [...prev, msg]);
        // Emit via socket
        if (socket && typeof socket === "object" && "emit" in socket) {
          (socket as { emit: (event: string, ...args: unknown[]) => void }).emit(
            "send-message",
            { orderId: selectedOrderId, senderId: currentUser.id, content }
          );
        }
      }
    } catch {
      toast.error("Не удалось отправить сообщение");
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  }, [newMessage, selectedOrderId, currentUser, socket]);

  const handleProgressChange = async (value: number[]) => {
    const progress = value[0];
    setProgressValue(progress);

    if (!selectedOrderId) return;

    try {
      await fetch(`/api/orders/${selectedOrderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ progress }),
      });

      if (socket && typeof socket === "object" && "emit" in socket) {
        (socket as { emit: (event: string, ...args: unknown[]) => void }).emit(
          "order-progress",
          { orderId: selectedOrderId, progress }
        );
      }
    } catch {
      toast.error("Не удалось обновить прогресс");
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (!isAuthenticated || !currentUser) return null;

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-6">
        <div className="space-y-4">
          <div className="h-10 bg-muted/30 rounded animate-pulse" />
          <div className="h-64 bg-muted/20 rounded animate-pulse" />
          <div className="h-12 bg-muted/30 rounded animate-pulse" />
        </div>
      </div>
    );
  }

  const isBooster = order?.boosterId === currentUser.id;

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        {/* Back button */}
        <Button
          variant="ghost"
          onClick={() => setView("dashboard")}
          className="mb-4 text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Назад к заказам
        </Button>

        {/* Order info header */}
        {order && (
          <Card className="mb-4">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-semibold truncate">
                  {order.service?.title || "Заказ"}
                </h2>
                <Badge
                  variant="outline"
                  className={statusColors[order.status] || ""}
                >
                  {statusLabels[order.status] || order.status}
                </Badge>
              </div>
              <OrderTracker order={order} />
            </CardContent>
          </Card>
        )}

        {/* Progress slider for booster */}
        {isBooster && order && order.status === "in_progress" && (
          <Card className="mb-4">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Прогресс выполнения</span>
                <span className="text-sm text-neon-blue font-medium">
                  {progressValue}%
                </span>
              </div>
              <Slider
                value={[progressValue]}
                onValueChange={handleProgressChange}
                max={100}
                step={5}
                className="w-full"
              />
            </CardContent>
          </Card>
        )}

        {/* Chat area */}
        <Card className="flex flex-col">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <span>Чат заказа</span>
              <span className="text-muted-foreground font-normal">
                {messages.length} сообщений
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 flex flex-col">
            {/* Messages */}
            <div className="flex-1 min-h-[300px] max-h-96 overflow-y-auto space-y-3 mb-4 pr-1">
              {messages.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground text-sm">
                  Нет сообщений. Начните общение!
                </div>
              ) : (
                messages.map((msg, i) => {
                  const isOwn = msg.senderId === currentUser.id;
                  const showAvatar =
                    i === 0 || messages[i - 1]?.senderId !== msg.senderId;
                  return (
                    <div
                      key={msg.id}
                      className={`flex ${
                        isOwn ? "justify-end" : "justify-start"
                      }`}
                    >
                      <div
                        className={`max-w-[80%] ${
                          isOwn
                            ? "bg-neon-blue/20 border border-neon-blue/20 rounded-l-xl rounded-tr-xl"
                            : "bg-secondary/50 border border-border/50 rounded-r-xl rounded-tl-xl"
                        } px-3 py-2`}
                      >
                        {showAvatar && !isOwn && (
                          <p className="text-xs font-medium text-neon-purple mb-1">
                            {msg.sender?.username || "Бустер"}
                          </p>
                        )}
                        <p className="text-sm">{msg.content}</p>
                        <p className="text-[10px] text-muted-foreground/50 mt-1">
                          {new Date(msg.createdAt).toLocaleTimeString("ru-RU", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="flex items-center gap-2">
              <Input
                ref={inputRef}
                placeholder="Введите сообщение..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={handleKeyPress}
                disabled={sending}
                className="flex-1"
              />
              <Button
                onClick={sendMessage}
                disabled={sending || !newMessage.trim()}
                size="icon"
                className="bg-neon-blue hover:bg-neon-blue/80 text-white shrink-0"
              >
                {sending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
