import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";

import { BTN, BTN_PRIMARY, SENSOR_LABELS } from "../constants";
import type { LayoutContext } from "../types";

type ComportaKey =
  | "comporta_01"
  | "comporta_02"
  | "comporta_03"
  | "comporta_04";

type Gates = Record<ComportaKey, number>;
type Turbina = "LIGADO" | "DESLIGADO";

const COMPORTAS: { key: ComportaKey; sensorId: string }[] = [
  { key: "comporta_01", sensorId: "sensor_comporta_01" },
  { key: "comporta_02", sensorId: "sensor_comporta_02" },
  { key: "comporta_03", sensorId: "sensor_comporta_03" },
  { key: "comporta_04", sensorId: "sensor_comporta_04" },
];

const ZERO_GATES: Gates = {
  comporta_01: 0,
  comporta_02: 0,
  comporta_03: 0,
  comporta_04: 0,
};

export function ComportaControlCard() {
  const { data } = useOutletContext<LayoutContext>();
  const [gates, setGates] = useState<Gates>(ZERO_GATES);
  const [turbina, setTurbina] = useState<Turbina>("DESLIGADO");
  // Enquanto o usuário não edita, o card espelha o estado real (startup, sim ao vivo).
  // Ao editar, congela os valores como "pendentes" até Aplicar/Reverter.
  const [dirty, setDirty] = useState(false);
  const [feedback, setFeedback] = useState("");

  useEffect(() => {
    if (dirty || !data?.sensors) return;
    const s = data.sensors;
    setGates({
      comporta_01: numValue(s.sensor_comporta_01?.valor),
      comporta_02: numValue(s.sensor_comporta_02?.valor),
      comporta_03: numValue(s.sensor_comporta_03?.valor),
      comporta_04: numValue(s.sensor_comporta_04?.valor),
    });
    setTurbina(s.sensor_turbina_01?.valor === "LIGADO" ? "LIGADO" : "DESLIGADO");
  }, [data, dirty]);

  // Restrição operacional do engine (rejeitada com 422 se violada).
  const invalid = gates.comporta_02 > gates.comporta_03;

  function setGate(key: ComportaKey, value: number) {
    setDirty(true);
    setGates((g) => ({ ...g, [key]: value }));
  }

  function toggleTurbina() {
    setDirty(true);
    setTurbina((t) => (t === "LIGADO" ? "DESLIGADO" : "LIGADO"));
  }

  function revert() {
    setDirty(false);
    setFeedback("");
  }

  async function apply() {
    if (invalid) return;
    setFeedback("Aplicando…");
    try {
      const res = await fetch("/api/simulation/manual-adjust", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...gates, turbina }),
      });
      if (res.ok) {
        setFeedback("Ajuste aplicado");
        setDirty(false);
      } else {
        const detail = await res.text();
        setFeedback(`Falhou (${res.status}): ${detail.slice(0, 120)}`);
      }
    } catch (e) {
      setFeedback(`Erro: ${e}`);
    }
    setTimeout(() => setFeedback(""), 4000);
  }

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-lg p-5">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm text-slate-400 m-0">Controle das comportas</h2>
        {dirty && (
          <span className="text-[11px] text-amber-400 font-mono">
            alterações pendentes
          </span>
        )}
      </div>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-x-6 gap-y-3">
        {COMPORTAS.map(({ key, sensorId }) => (
          <div key={key}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-slate-300">
                {SENSOR_LABELS[sensorId] ?? key}
              </span>
              <span className="text-sm font-mono font-semibold min-w-[52px] text-right">
                {gates[key].toFixed(0)}%
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              step={1}
              value={gates[key]}
              onChange={(e) => setGate(key, parseFloat(e.target.value))}
              className="w-full"
            />
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3 mt-4">
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">Turbina:</span>
          <button
            className={BTN}
            onClick={toggleTurbina}
            aria-pressed={turbina === "LIGADO"}
          >
            {turbina === "LIGADO" ? "LIGADO" : "DESLIGADO"}
          </button>
        </div>

        <div className="flex-1" />

        <button className={BTN} onClick={revert} disabled={!dirty}>
          Reverter
        </button>
        <button className={BTN_PRIMARY} onClick={apply} disabled={!dirty || invalid}>
          Aplicar
        </button>
      </div>

      {invalid && (
        <div className="mt-2 text-xs text-amber-400">
          Comporta 02 (Saída Sup.) não pode exceder a Comporta 03 (Entrada Inf.).
        </div>
      )}

      {feedback && (
        <div className="mt-2 text-xs text-slate-400 font-mono">{feedback}</div>
      )}
    </div>
  );
}

function numValue(v: number | string | undefined): number {
  return typeof v === "number" ? v : 0;
}
