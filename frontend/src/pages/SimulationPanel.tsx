import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";

import { Card } from "../components/Card";
import { BTN, BTN_PRIMARY } from "../constants";
import type { LayoutContext } from "../types";

async function postJson(path: string, body?: object): Promise<Response> {
  return fetch(path, {
    method: "POST",
    headers: body ? { "Content-Type": "application/json" } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
}

function speedFromSlider(v: number): number {
  return Math.pow(10, (v / 100) * 3 - 1);
}
function speedToSlider(s: number): number {
  return ((Math.log10(s) + 1) / 3) * 100;
}

export function SimulationPanel() {
  const { data } = useOutletContext<LayoutContext>();
  const fator = data?.fator_aceleracao ?? 1.0;
  const [sliderPos, setSliderPos] = useState<number>(() => speedToSlider(fator));
  const [feedback, setFeedback] = useState<string>("");
  const status = data?.status;
  const isStarting = status === "INICIANDO";
  // A barragem já foi iniciada se o loop avançou (horas > 0) ou se está
  // iniciando/rodando. Uma vez ligada, o botão "Iniciar Barragem" fica
  // permanentemente desativado (não se inicia duas vezes).
  const hasStarted = isStarting || status === "RODANDO" || status === "CENARIO_ATIVO" || (data?.simulated_hours ?? 0) > 0;

  useEffect(() => {
    if (data) setSliderPos(speedToSlider(data.fator_aceleracao));
  }, [data?.fator_aceleracao]);

  async function call(label: string, path: string, body?: object) {
    setFeedback(`${label}…`);
    try {
      const res = await postJson(path, body);
      if (res.ok) setFeedback(`${label} OK`);
      else {
        const detail = await res.text();
        setFeedback(`${label} falhou (${res.status}): ${detail.slice(0, 120)}`);
      }
    } catch (e) {
      setFeedback(`${label} erro: ${e}`);
    }
    setTimeout(() => setFeedback(""), 4000);
  }

  function commitSpeed() {
    const fator = Math.round(speedFromSlider(sliderPos) * 10) / 10;
    call(`Velocidade ${fator}x`, "/api/simulation/speed", { fator });
  }

  const currentSpeed = speedFromSlider(sliderPos);

  return (
    <div className="flex flex-col gap-4 max-w-3xl">
      <Card title="Controle da simulação" bodyClassName="p-5">
        <div className="flex flex-wrap gap-2 items-center">
          <button
            className={BTN_PRIMARY}
            onClick={() => call("Iniciar barragem", "/api/simulation/start")}
            disabled={hasStarted}
          >
            {hasStarted ? "Barragem ligada ✓" : "Iniciar Barragem"}
          </button>

          <button
            className={BTN}
            disabled={!hasStarted}
            onClick={() =>
              status === "PAUSADO"
                ? call("Retomar", "/api/simulation/resume")
                : call("Pausar", "/api/simulation/pause")
            }
          >
            {status === "PAUSADO" ? "Retomar" : "Pausar"}
          </button>
        </div>

        {hasStarted && (
          <div className="mt-3 flex items-center gap-2 text-sm">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span className="text-slate-300">
              {isStarting
                ? "Barragem ligada — enchendo os tanques…"
                : status === "PAUSADO"
                  ? "Barragem ligada (pausada)"
                  : "Barragem ligada e em operação"}
            </span>
          </div>
        )}
      </Card>

      <Card title="Velocidade da simulação" bodyClassName="p-5">
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-400 min-w-[40px]">0.1x</span>
          <input
            type="range"
            min={0}
            max={100}
            step={0.5}
            value={sliderPos}
            onChange={(e) => setSliderPos(parseFloat(e.target.value))}
            onMouseUp={commitSpeed}
            onTouchEnd={commitSpeed}
            className="flex-1 max-w-[320px]"
          />
          <span className="text-xs text-slate-400 min-w-[40px] text-right">100x</span>
          <span className="text-base font-mono font-semibold min-w-[80px] text-right">
            {currentSpeed.toFixed(1)}x
          </span>
        </div>
      </Card>

      <Card title="Cenários" bodyClassName="p-5">
        <div className="flex flex-wrap gap-2 items-center mb-2">
          <span className="text-xs text-slate-400 min-w-[100px]">Chuva intensa:</span>
          {[1, 7, 15].map((d) => (
            <button
              key={`chuva-${d}`}
              className={BTN}
              onClick={() =>
                call(`Chuva ${d}d`, "/api/simulation/scenario", {
                  tipo: "chuva_intensa",
                  duracao_dias: d,
                })
              }
            >
              {d} {d === 1 ? "dia" : "dias"}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-xs text-slate-400 min-w-[100px]">Seca:</span>
          {[15, 30, 60].map((d) => (
            <button
              key={`seca-${d}`}
              className={BTN}
              onClick={() =>
                call(`Seca ${d}d`, "/api/simulation/scenario", {
                  tipo: "seca",
                  duracao_dias: d,
                })
              }
            >
              {d} dias
            </button>
          ))}
        </div>

        {data?.scenario_active && (
          <div className="mt-4 px-3 py-2 bg-slate-900/70 border border-slate-700 rounded text-xs text-slate-300">
            Cenário ativo: <strong>{data.scenario_active}</strong>
            {data.scenario_ticks_remaining != null && (
              <>
                {" "}— {data.scenario_ticks_remaining}h restantes (
                {(data.scenario_ticks_remaining / 24).toFixed(1)} dias)
              </>
            )}
          </div>
        )}
      </Card>

      {feedback && (
        <div className="text-xs text-slate-400 font-mono">{feedback}</div>
      )}
    </div>
  );
}
