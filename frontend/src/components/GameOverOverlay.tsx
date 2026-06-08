import { useState } from "react";

import type { GameOver } from "../types";

/** Overlay de fim de jogo: aparece quando um tanque esvazia ou transborda.
 * A simulação é pausada pelo backend; a única saída é reiniciar a partida. */
export function GameOverOverlay({ gameOver, dia }: { gameOver: GameOver; dia: number | null }) {
  const [resetting, setResetting] = useState(false);
  const [erro, setErro] = useState<string>("");

  const transbordou = gameOver.tipo === "transbordou";
  const titulo = transbordou ? "Tanque transbordou!" : "Tanque esvaziou!";
  const detalhe = transbordou
    ? `O ${gameOver.tanque} chegou a 100% e transbordou.`
    : `O ${gameOver.tanque} chegou a 0% e secou.`;

  async function reiniciar() {
    setResetting(true);
    setErro("");
    try {
      const res = await fetch("/api/simulation/reset", { method: "POST" });
      if (!res.ok) {
        setErro(`Falha ao reiniciar (${res.status}).`);
        setResetting(false);
      }
      // Em caso de sucesso, o WebSocket logo enviará o estado reiniciado
      // (pausado, dia 0) e o overlay desaparece sozinho.
    } catch (e) {
      setErro(`Erro ao reiniciar: ${e}`);
      setResetting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-2xl border border-red-700/60 bg-slate-900 p-7 text-center shadow-2xl shadow-red-950/40">
        <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-full bg-red-500/15 ring-1 ring-red-500/40">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
        </div>

        <h2 className="m-0 text-2xl font-bold text-red-300">Fim de jogo</h2>
        <p className="mt-1 mb-0 text-lg font-semibold text-slate-100">{titulo}</p>
        <p className="mt-2 mb-0 text-sm text-slate-400">{detalhe}</p>
        {dia != null && (
          <p className="mt-3 mb-0 text-sm text-slate-300">
            A barragem operou por <strong className="text-slate-100">{dia}</strong>{" "}
            {dia === 1 ? "dia" : "dias"}.
          </p>
        )}

        <button
          onClick={reiniciar}
          disabled={resetting}
          className="mt-6 w-full rounded-lg border border-blue-700 bg-blue-600 px-4 py-2.5 font-semibold text-white transition-colors hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {resetting ? "Reiniciando…" : "Reiniciar simulação"}
        </button>
        {erro && <p className="mt-3 mb-0 text-xs text-red-400">{erro}</p>}
      </div>
    </div>
  );
}
