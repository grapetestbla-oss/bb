"use client";

import { useState } from "react";
import { useAppStore } from "@/lib/store";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
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
import { Badge } from "@/components/ui/badge";
import { Plus, X, Loader2, ImageIcon } from "lucide-react";
import { toast } from "sonner";

interface CreateServiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateServiceDialog({
  open,
  onOpenChange,
}: CreateServiceDialogProps) {
  const { categories, currentUser, setMyServices, myServices, setServices, services } =
    useAppStore();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [estimatedTime, setEstimatedTime] = useState("1-3 дня");
  const [featureInput, setFeatureInput] = useState("");
  const [features, setFeatures] = useState<string[]>([]);
  const [requirementInput, setRequirementInput] = useState("");
  const [requirements, setRequirements] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setPrice("");
    setCategoryId("");
    setEstimatedTime("1-3 дня");
    setFeatureInput("");
    setFeatures([]);
    setRequirementInput("");
    setRequirements([]);
  };

  const addFeature = () => {
    const trimmed = featureInput.trim();
    if (trimmed && features.length < 10) {
      setFeatures([...features, trimmed]);
      setFeatureInput("");
    }
  };

  const removeFeature = (index: number) => {
    setFeatures(features.filter((_, i) => i !== index));
  };

  const addRequirement = () => {
    const trimmed = requirementInput.trim();
    if (trimmed && requirements.length < 10) {
      setRequirements([...requirements, trimmed]);
      setRequirementInput("");
    }
  };

  const removeRequirement = (index: number) => {
    setRequirements(requirements.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!currentUser) {
      toast.error("Необходимо авторизоваться");
      return;
    }
    if (!title.trim()) {
      toast.error("Введите название услуги");
      return;
    }
    if (!description.trim()) {
      toast.error("Введите описание услуги");
      return;
    }
    if (!price || Number(price) <= 0) {
      toast.error("Укажите корректную цену");
      return;
    }
    if (!categoryId) {
      toast.error("Выберите категорию");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/services", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          price: Number(price),
          categoryId,
          boosterId: currentUser.id,
          estimatedTime,
          features,
          requirements,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Ошибка создания услуги");
      }

      const data = await res.json();
      const newService = data.service || data;

      // Update both myServices and main services list
      setMyServices([newService, ...myServices]);
      setServices([newService, ...services]);

      toast.success("Услуга создана!", {
        description: "Она появится в каталоге после проверки модератором",
      });

      resetForm();
      onOpenChange(false);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Ошибка создания услуги"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto bg-background border-border/50">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">
            <span className="text-neon-blue">Создать</span> услугу
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="service-title">Название *</Label>
            <Input
              id="service-title"
              placeholder="Например: Буст трофеев до 50К"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="bg-secondary/50 border-border/50 focus:border-neon-blue/50"
              maxLength={100}
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="service-desc">Описание *</Label>
            <Textarea
              id="service-desc"
              placeholder="Подробно опишите вашу услугу, что входит, какие гарантии..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="bg-secondary/50 border-border/50 focus:border-neon-blue/50 min-h-[100px]"
              maxLength={2000}
            />
          </div>

          {/* Price & Category */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="service-price">Цена (₽) *</Label>
              <Input
                id="service-price"
                type="number"
                min="1"
                placeholder="500"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="bg-secondary/50 border-border/50 focus:border-neon-blue/50"
              />
            </div>
            <div className="space-y-2">
              <Label>Категория *</Label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger className="bg-secondary/50 border-border/50">
                  <SelectValue placeholder="Выберите" />
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

          {/* Estimated Time */}
          <div className="space-y-2">
            <Label htmlFor="service-time">Срок выполнения</Label>
            <Select value={estimatedTime} onValueChange={setEstimatedTime}>
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

          {/* Features */}
          <div className="space-y-2">
            <Label>Что входит в услугу</Label>
            <div className="flex gap-2">
              <Input
                placeholder="Например: Безопасный буст"
                value={featureInput}
                onChange={(e) => setFeatureInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addFeature();
                  }
                }}
                className="bg-secondary/50 border-border/50 focus:border-neon-blue/50"
                maxLength={80}
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={addFeature}
                disabled={!featureInput.trim() || features.length >= 10}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {features.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {features.map((f, i) => (
                  <Badge
                    key={i}
                    variant="secondary"
                    className="bg-neon-blue/10 text-neon-blue border-neon-blue/20 pr-1"
                  >
                    {f}
                    <button
                      onClick={() => removeFeature(i)}
                      className="ml-1 hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Requirements */}
          <div className="space-y-2">
            <Label>Требования к заказчику</Label>
            <div className="flex gap-2">
              <Input
                placeholder="Например: Аккаунт без бана"
                value={requirementInput}
                onChange={(e) => setRequirementInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addRequirement();
                  }
                }}
                className="bg-secondary/50 border-border/50 focus:border-neon-blue/50"
                maxLength={80}
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={addRequirement}
                disabled={!requirementInput.trim() || requirements.length >= 10}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {requirements.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {requirements.map((r, i) => (
                  <Badge
                    key={i}
                    variant="secondary"
                    className="bg-neon-orange/10 text-neon-orange border-neon-orange/20 pr-1"
                  >
                    {r}
                    <button
                      onClick={() => removeRequirement(i)}
                      className="ml-1 hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Info note */}
          <div className="rounded-lg border border-neon-yellow/20 bg-neon-yellow/5 p-3">
            <p className="text-xs text-muted-foreground">
              <span className="text-neon-yellow font-medium">⚡ Внимание:</span>{" "}
              Созданные услуги проходят проверку модератором перед публикацией в каталоге. 
              Обычно это занимает от нескольких минут до нескольких часов.
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => {
              resetForm();
              onOpenChange(false);
            }}
          >
            Отмена
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="bg-neon-blue hover:bg-neon-blue/80 text-white"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Создание...
              </>
            ) : (
              <>
                <Plus className="h-4 w-4 mr-2" />
                Создать услугу
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
