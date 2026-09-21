"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Copy,
  Download,
  Loader2,
  Pencil,
  Printer,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { ProposalContent } from "@/components/kp/proposal-content";
import { kpApi, type ProposalFull } from "@/lib/kp/client";

export default function KpProposalPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();

  const [proposal, setProposal] = useState<ProposalFull | null>(null);
  const [draft, setDraft] = useState("");
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    kpApi
      .getProposal(id)
      .then(({ proposal: data }) => {
        setProposal(data);
        setDraft(data.content);
      })
      .catch((error) => {
        const status = (error as { status?: number }).status;
        if (status === 401) router.push("/kp/login");
        else if (status === 404) router.push("/kp/app");
        else toast.error("Не удалось загрузить КП");
      })
      .finally(() => setLoading(false));
  }, [id, router]);

  const save = async () => {
    setBusy(true);
    try {
      const { proposal: updated } = await kpApi.saveProposal(id, { content: draft });
      setProposal(updated);
      setEditing(false);
      toast.success("Сохранено");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Не удалось сохранить");
    } finally {
      setBusy(false);
    }
  };

  const regenerate = async () => {
    setBusy(true);
    try {
      const { proposal: updated } = await kpApi.regenerateProposal(id);
      setProposal(updated);
      setDraft(updated.content);
      toast.success("Текст пересобран");
    } catch (error) {
      const err = error as Error & { code?: string };
      toast.error(err.message, {
        action:
          err.code === "plan_required"
            ? { label: "Тарифы", onClick: () => router.push("/kp/app/billing") }
            : undefined,
      });
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    try {
      await kpApi.deleteProposal(id);
      toast.success("КП удалено");
      router.push("/kp/app");
    } catch {
      toast.error("Не удалось удалить");
    }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(proposal?.content ?? "");
      toast.success("Текст скопирован");
    } catch {
      toast.error("Браузер не дал доступ к буферу обмена");
    }
  };

  const download = () => {
    if (!proposal) return;
    const blob = new Blob([proposal.content], {
      type: "text/markdown;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${proposal.title.replace(/[^\p{L}\p{N}]+/gu, "-")}.md`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-10">
        <Skeleton className="h-96 w-full" />
      </main>
    );
  }

  if (!proposal) return null;

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <div className="kp-no-print mb-6 flex flex-wrap items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => router.push("/kp/app")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          К списку
        </Button>

        <div className="ml-auto flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={copy}>
            <Copy className="mr-2 h-4 w-4" />
            Копировать
          </Button>
          <Button variant="outline" size="sm" onClick={download}>
            <Download className="mr-2 h-4 w-4" />
            Markdown
          </Button>
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            <Printer className="mr-2 h-4 w-4" />
            PDF
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={regenerate}
            disabled={busy}
          >
            {busy ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            Пересобрать
          </Button>
          <Button
            variant={editing ? "default" : "outline"}
            size="sm"
            onClick={() => (editing ? save() : setEditing(true))}
            disabled={busy}
          >
            <Pencil className="mr-2 h-4 w-4" />
            {editing ? "Сохранить" : "Править"}
          </Button>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="sm">
                <Trash2 className="h-4 w-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Удалить это КП?</AlertDialogTitle>
                <AlertDialogDescription>
                  Действие необратимо — текст и бриф будут удалены.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Отмена</AlertDialogCancel>
                <AlertDialogAction onClick={remove}>Удалить</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <Card className="kp-print-area">
        <CardContent className="p-8">
          {editing ? (
            <Textarea
              className="min-h-[70vh] font-mono text-sm"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
            />
          ) : (
            <ProposalContent content={proposal.content} />
          )}
        </CardContent>
      </Card>

      {editing && (
        <p className="kp-no-print mt-3 text-sm text-muted-foreground">
          Разметка — Markdown. Таблицы и заголовки сохранятся при экспорте.
        </p>
      )}
    </main>
  );
}
