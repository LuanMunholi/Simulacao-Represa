import type { ReactNode } from "react";

import { CARD } from "../constants";

interface CardProps {
  /** Título opcional no cabeçalho do card. */
  title?: ReactNode;
  /** Conteúdo opcional alinhado à direita do cabeçalho (badge, ação, etc.). */
  right?: ReactNode;
  /** Classes extras para o container externo. */
  className?: string;
  /** Classes do corpo (padding padrão p-4). */
  bodyClassName?: string;
  children: ReactNode;
}

/** Superfície padrão da UI — garante consistência de borda, raio, sombra e espaçamento. */
export function Card({
  title,
  right,
  className = "",
  bodyClassName = "p-4",
  children,
}: CardProps) {
  const hasHeader = title != null || right != null;
  return (
    <section className={`${CARD} ${className}`}>
      {hasHeader && (
        <div className="flex items-center justify-between gap-3 px-4 pt-3 pb-2.5 border-b border-slate-700/60">
          {title != null ? (
            <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400 m-0">
              {title}
            </h2>
          ) : (
            <span />
          )}
          {right}
        </div>
      )}
      <div className={bodyClassName}>{children}</div>
    </section>
  );
}
