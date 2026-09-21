"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

/** Таблицы стоимости и этапов — GFM, без remark-gfm они отрендерятся текстом. */
export function ProposalContent({ content }: { content: string }) {
  return (
    <div className="kp-prose">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
    </div>
  );
}
