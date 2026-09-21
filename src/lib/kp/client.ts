"use client";

import type { AccountState } from "@/lib/kp/account";

export interface ProposalSummary {
  id: string;
  title: string;
  clientName: string;
  engine: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProposalFull extends ProposalSummary {
  brief: string;
  content: string;
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: init?.body ? { "Content-Type": "application/json" } : undefined,
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(payload?.error ?? "Что-то пошло не так") as Error & {
      status: number;
      code?: string;
    };
    error.status = response.status;
    error.code = payload?.code;
    throw error;
  }

  return payload as T;
}

export const kpApi = {
  account: () => request<AccountState>("/api/kp/account"),

  login: (email: string, password: string) =>
    request<{ ok: true }>("/api/kp/auth", {
      method: "POST",
      body: JSON.stringify({ action: "login", email, password }),
    }),

  register: (input: {
    email: string;
    password: string;
    name: string;
    company: string;
  }) =>
    request<{ ok: true }>("/api/kp/auth", {
      method: "POST",
      body: JSON.stringify({ action: "register", ...input }),
    }),

  logout: () =>
    request<{ ok: true }>("/api/kp/auth", {
      method: "POST",
      body: JSON.stringify({ action: "logout" }),
    }),

  listProposals: (query = "") =>
    request<{ proposals: ProposalSummary[] }>(
      `/api/kp/proposals${query ? `?q=${encodeURIComponent(query)}` : ""}`,
    ),

  getProposal: (id: string) =>
    request<{ proposal: ProposalFull }>(`/api/kp/proposals/${id}`),

  createProposal: (brief: unknown) =>
    request<{ proposal: ProposalFull }>("/api/kp/proposals", {
      method: "POST",
      body: JSON.stringify(brief),
    }),

  saveProposal: (id: string, data: { content?: string; title?: string }) =>
    request<{ proposal: ProposalFull }>(`/api/kp/proposals/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  regenerateProposal: (id: string) =>
    request<{ proposal: ProposalFull }>(`/api/kp/proposals/${id}/regenerate`, {
      method: "POST",
    }),

  deleteProposal: (id: string) =>
    request<{ ok: true }>(`/api/kp/proposals/${id}`, { method: "DELETE" }),

  billing: () =>
    request<{ account: AccountState; payments: PaymentRow[] }>("/api/kp/billing"),

  checkout: (plan: string) =>
    request<{ checkout: { ref: string; url: string } }>(
      "/api/kp/billing/checkout",
      { method: "POST", body: JSON.stringify({ plan }) },
    ),

  cancelSubscription: () =>
    request<{ ok: true }>("/api/kp/billing/cancel", { method: "POST" }),

  getCheckout: (ref: string) =>
    request<{
      payment: {
        ref: string;
        plan: string;
        planName: string;
        amount: number;
        currency: string;
        status: string;
      };
    }>(`/api/kp/checkout/${ref}`),

  payMock: (ref: string, outcome: "success" | "fail") =>
    request<{ ok: true; message: string }>(`/api/kp/billing/mock/${ref}`, {
      method: "POST",
      body: JSON.stringify({ outcome }),
    }),
};

export interface PaymentRow {
  id: string;
  plan: string;
  amount: number;
  currency: string;
  status: string;
  provider: string;
  providerRef: string;
  createdAt: string;
}
