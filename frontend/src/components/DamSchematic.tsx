import { useOutletContext } from "react-router-dom";

import type { LayoutContext } from "../types";
import { Card } from "./Card";

// Geometria do diagrama (coordenadas do viewBox 0 0 460 560).
const CX = 230; // eixo central / tubulação
const TANK_X = 150;
const TANK_W = 160;
const UPPER_Y = 78;
const LOWER_Y = 330;
const TANK_H = 150;

const WATER = "#38bdf8";
const WARN = "#f59e0b";
const DANGER = "#ef4444";

function clamp(x: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, x));
}

function num(
  data: LayoutContext["data"],
  id: string,
): number {
  const v = data?.sensors?.[id]?.valor;
  return typeof v === "number" ? v : 0;
}

// Mesmos limiares do toneFor: perto de 0% = vazio, perto de 100% = transbordo.
function waterColor(vol: number): string {
  if (vol <= 5 || vol >= 98) return DANGER;
  if (vol <= 20 || vol >= 95) return WARN;
  return WATER;
}

/** Tanque com nível de água animado, zonas de perigo e rótulo. */
function Tank({
  y,
  vol,
  label,
  clipId,
}: {
  y: number;
  vol: number;
  label: string;
  clipId: string;
}) {
  const fill = clamp(vol, 0, 100);
  const waterH = (TANK_H * fill) / 100;
  const waterY = y + TANK_H - waterH;
  const color = waterColor(fill);
  return (
    <g>
      <clipPath id={clipId}>
        <rect x={TANK_X} y={y} width={TANK_W} height={TANK_H} rx={10} />
      </clipPath>

      {/* fundo do tanque */}
      <rect
        x={TANK_X}
        y={y}
        width={TANK_W}
        height={TANK_H}
        rx={10}
        fill="#0f172a"
        stroke="#475569"
        strokeWidth={2}
      />

      <g clipPath={`url(#${clipId})`}>
        {/* zonas de perigo (transbordo no topo, vazio no fundo) */}
        <rect x={TANK_X} y={y} width={TANK_W} height={TANK_H * 0.05} fill={DANGER} opacity={0.12} />
        <rect
          x={TANK_X}
          y={y + TANK_H * 0.95}
          width={TANK_W}
          height={TANK_H * 0.05}
          fill={DANGER}
          opacity={0.12}
        />
        {/* água */}
        <rect
          className="dam-water"
          x={TANK_X}
          y={waterY}
          width={TANK_W}
          height={waterH}
          fill={color}
          opacity={0.55}
        />
        {/* brilho na superfície da água */}
        {fill > 0 && (
          <rect
            className="dam-water"
            x={TANK_X}
            y={waterY}
            width={TANK_W}
            height={3}
            fill={color}
          />
        )}
      </g>

      {/* contorno por cima da água */}
      <rect
        x={TANK_X}
        y={y}
        width={TANK_W}
        height={TANK_H}
        rx={10}
        fill="none"
        stroke="#475569"
        strokeWidth={2}
      />

      <text x={TANK_X + TANK_W / 2} y={y + TANK_H / 2 - 6} textAnchor="middle" fontSize="26" fontWeight="700" fill="#e2e8f0">
        {fill.toFixed(0)}%
      </text>
      <text x={TANK_X + TANK_W / 2} y={y + TANK_H / 2 + 14} textAnchor="middle" fontSize="11" fill="#94a3b8">
        {label}
      </text>
    </g>
  );
}

/** Comporta: barra que mostra a abertura (%) com rótulo. */
function Gate({ x, y, label, pct }: { x: number; y: number; label: string; pct: number }) {
  const w = 62;
  const h = 11;
  const open = (w * clamp(pct, 0, 100)) / 100;
  return (
    <g>
      <text x={x} y={y - 7} textAnchor="middle" fontSize="10" fill="#cbd5e1">
        {label} · {pct.toFixed(0)}%
      </text>
      <rect x={x - w / 2} y={y} width={w} height={h} rx={5.5} fill="#1e293b" stroke="#475569" strokeWidth={1} />
      <rect x={x - w / 2} y={y} width={open} height={h} rx={5.5} fill="#8b5cf6" opacity={0.9} />
    </g>
  );
}

/** Tubo vertical com indicação de fluxo (traço animado quando há vazão). */
function Pipe({ y1, y2, flow }: { y1: number; y2: number; flow: number }) {
  return (
    <g>
      <line x1={CX} y1={y1} x2={CX} y2={y2} stroke="#334155" strokeWidth={8} strokeLinecap="round" />
      {flow > 0.5 && (
        <line
          className="dam-flow"
          x1={CX}
          y1={y1}
          x2={CX}
          y2={y2}
          stroke={WATER}
          strokeWidth={4}
          strokeLinecap="round"
          strokeDasharray="3 7"
          opacity={0.9}
        />
      )}
    </g>
  );
}

export function DamSchematic() {
  const { data } = useOutletContext<LayoutContext>();

  const vol1 = num(data, "sensor_volume_01");
  const vol2 = num(data, "sensor_volume_02");
  const c1 = num(data, "sensor_comporta_01");
  const c2 = num(data, "sensor_comporta_02");
  const c3 = num(data, "sensor_comporta_03");
  const c4 = num(data, "sensor_comporta_04");
  const chuva = num(data, "sensor_chuva_01");
  const energia = num(data, "sensor_energia_01");
  const turbinaOn = data?.sensors?.sensor_turbina_01?.valor === "LIGADO";

  const enchimento = num(data, "sensor_enchimento_01");
  const fluxo1 = num(data, "sensor_fluxo_01");
  const fluxo2 = num(data, "sensor_fluxo_02");
  const esvaz = num(data, "sensor_esvaziamento_01");

  const drops = Math.min(9, Math.ceil(chuva / 2));

  return (
    <Card title="Esquema da represa" bodyClassName="p-3">
      <svg
        viewBox="0 0 460 560"
        width="100%"
        preserveAspectRatio="xMidYMid meet"
        style={{ maxHeight: 620, display: "block" }}
        role="img"
        aria-label="Diagrama da represa em tempo real"
      >
        {/* Chuva */}
        <g>
          <text x={CX} y={18} textAnchor="middle" fontSize="11" fill="#7dd3fc">
            Chuva · {chuva.toFixed(1)} mm/h
          </text>
          <path
            d="M188 40 a16 16 0 0 1 31 -6 a13 13 0 0 1 24 6 a14 14 0 0 1 -2 28 h-50 a13 13 0 0 1 -3 -28 Z"
            fill="#334155"
            stroke="#475569"
            strokeWidth={1}
          />
          {Array.from({ length: drops }).map((_, i) => (
            <line
              key={i}
              className="dam-rain"
              x1={196 + i * 7}
              y1={70}
              x2={196 + i * 7}
              y2={78}
              stroke="#7dd3fc"
              strokeWidth={2}
              strokeLinecap="round"
              style={{ animationDelay: `${(i % 5) * 0.18}s` }}
            />
          ))}
        </g>

        {/* Tubulações + fluxo */}
        <Pipe y1={58} y2={UPPER_Y} flow={enchimento} />
        <Pipe y1={UPPER_Y + TANK_H} y2={262} flow={fluxo1} />
        <Pipe y1={298} y2={LOWER_Y} flow={fluxo2} />
        <Pipe y1={LOWER_Y + TANK_H} y2={540} flow={esvaz} />

        {/* Tanques */}
        <Tank y={UPPER_Y} vol={vol1} label="Tanque Superior" clipId="clip-upper" />
        <Tank y={LOWER_Y} vol={vol2} label="Tanque Inferior" clipId="clip-lower" />

        {/* Turbina */}
        <g>
          <circle cx={CX} cy={280} r={20} fill="#0f172a" stroke={turbinaOn ? "#34d399" : "#64748b"} strokeWidth={2} />
          <g className={`dam-blades${turbinaOn ? " on" : ""}`}>
            {[0, 60, 120, 180, 240, 300].map((a) => (
              <rect
                key={a}
                x={CX - 1.5}
                y={280 - 16}
                width={3}
                height={16}
                rx={1.5}
                fill={turbinaOn ? "#34d399" : "#64748b"}
                transform={`rotate(${a} ${CX} 280)`}
              />
            ))}
            <circle cx={CX} cy={280} r={3.5} fill={turbinaOn ? "#34d399" : "#64748b"} />
          </g>
          <text x={CX + 30} y={272} fontSize="10" fill="#94a3b8">
            Turbina
          </text>
          <text x={CX + 30} y={286} fontSize="11" fontWeight="600" fill={turbinaOn ? "#6ee7b7" : "#94a3b8"}>
            {turbinaOn ? "LIGADO" : "DESLIGADO"}
          </text>
          <text x={CX + 30} y={300} fontSize="10" fill="#cbd5e1">
            {energia.toFixed(0)} kW/h
          </text>
        </g>

        {/* Comportas */}
        <Gate x={CX} y={64} label="C1 Ench. Sup." pct={c1} />
        <Gate x={CX} y={238} label="C2 Saída Sup." pct={c2} />
        <Gate x={CX} y={312} label="C3 Entr. Inf." pct={c3} />
        <Gate x={CX} y={494} label="C4 Esv. Inf." pct={c4} />

        {/* Saída */}
        <text x={CX} y={556} textAnchor="middle" fontSize="10" fill="#94a3b8">
          ↓ saída da barragem
        </text>
      </svg>
    </Card>
  );
}
