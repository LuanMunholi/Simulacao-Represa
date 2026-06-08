import { useOutletContext } from "react-router-dom";

import type { LayoutContext } from "../types";
import { Card } from "./Card";

// Layout horizontal em "Z" (viewBox 0 0 1400 650), inspirado no mockup:
// entrada (esquerda) -> C1 -> Tanque Superior -> C2 -> escada de fluxo -> Turbina
// -> escada de fluxo -> C3 -> Tanque Inferior -> C4 -> saída (direita).
// Card de chuva no canto superior direito.
const BG = "#1F2841";
const PANEL = "#212B45";
const PIPE = "#36405B";
const WATER = "#32A3FF";
const FLOW = "#38bdf8";
const GATE = "#9D5CE6";
const GATE_TRACK = "#2A3350";
const GREEN = "#00FF88";
const GREEN_OFF = "#64748B";
const YELLOW = "#FFF700";
const CYAN = "#67E8F9";
const TXT = "#F1F5F9";
const MUT = "#94A3B8";
const WARN = "#F59E0B";
const DANGER = "#EF4444";

// Tanques
const TANK_W = 200;
const TANK_H = 195;
const UP_TANK_X = 170;
const UP_TANK_Y = 52;
const UP_MID = UP_TANK_Y + TANK_H / 2; // ~150
const LOW_TANK_X = 1030;
const LOW_TANK_Y = 403;
const LOW_MID = LOW_TANK_Y + TANK_H / 2; // ~500

// Comportas (barras verticais ao lado de cada tanque)
const GATE_W = 22;
const GATE_H = 200;
const UP_GATE_Y = 50;
const LOW_GATE_Y = 401;
const C1_X = UP_TANK_X - GATE_W - 24; // 124
const C2_X = UP_TANK_X + TANK_W + 24; // 394
const C3_X = LOW_TANK_X - GATE_W - 24; // 984
const C4_X = LOW_TANK_X + TANK_W + 24; // 1276

// Turbina (entre os tanques)
const TURB_CX = 705;
const TURB_CY = 325;
const TURB_R = 66;

function clamp(x: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, x));
}

function num(data: LayoutContext["data"], id: string): number {
  const v = data?.sensors?.[id]?.valor;
  return typeof v === "number" ? v : 0;
}

// Mesmos limiares do toneFor: perto de 0% = vazio, perto de 100% = transbordo.
function waterColor(vol: number): string {
  if (vol <= 5 || vol >= 98) return DANGER;
  if (vol <= 20 || vol >= 95) return WARN;
  return WATER;
}

/** Tanque arredondado com nível de água animado, zonas de perigo e rótulo. */
function Tank({
  x,
  y,
  vol,
  label,
  clipId,
}: {
  x: number;
  y: number;
  vol: number;
  label: string;
  clipId: string;
}) {
  const fill = clamp(vol, 0, 100);
  const waterH = (TANK_H * fill) / 100;
  const waterY = y + TANK_H - waterH;
  const color = waterColor(fill);
  const cx = x + TANK_W / 2;
  return (
    <g>
      <clipPath id={clipId}>
        <rect x={x} y={y} width={TANK_W} height={TANK_H} rx={24} />
      </clipPath>

      <rect x={x} y={y} width={TANK_W} height={TANK_H} rx={24} fill="#0E1626" stroke="#3B4668" strokeWidth={2} />

      <g clipPath={`url(#${clipId})`}>
        {/* zonas de perigo (5% topo / 5% fundo) */}
        <rect x={x} y={y} width={TANK_W} height={TANK_H * 0.05} fill={DANGER} opacity={0.14} />
        <rect x={x} y={y + TANK_H * 0.95} width={TANK_W} height={TANK_H * 0.05} fill={DANGER} opacity={0.14} />
        <rect className="dam-water" x={x} y={waterY} width={TANK_W} height={waterH} fill={color} opacity={0.85} />
        {fill > 0 && (
          <rect className="dam-water" x={x} y={waterY} width={TANK_W} height={3} fill="#bae6fd" opacity={0.9} />
        )}
      </g>

      <rect
        x={x}
        y={y}
        width={TANK_W}
        height={TANK_H}
        rx={24}
        fill="none"
        stroke="#3B4668"
        strokeWidth={2}
      />

      <text
        x={cx}
        y={y + TANK_H / 2 - 10}
        textAnchor="middle"
        dominantBaseline="central"
        fontSize="34"
        fontWeight="800"
        fill={TXT}
      >
        {fill.toFixed(0)}%
      </text>
      <text
        x={cx}
        y={y + TANK_H / 2 + 14}
        textAnchor="middle"
        dominantBaseline="central"
        fontSize="13"
        fill={MUT}
      >
        {label}
      </text>
    </g>
  );
}

/** Comporta vertical: barra que enche de cima para baixo conforme a abertura (%). */
function GateV({ x, y, code, pct }: { x: number; y: number; code: string; pct: number }) {
  const fillH = (GATE_H * clamp(pct, 0, 100)) / 100;
  const cx = x + GATE_W / 2;
  return (
    <g>
      <rect x={x} y={y} width={GATE_W} height={GATE_H} rx={11} fill={GATE_TRACK} stroke={PIPE} strokeWidth={1.5} />
      {fillH > 0 && (
        <rect className="dam-gate" x={x} y={y + GATE_H - fillH} width={GATE_W} height={fillH} rx={11} fill={GATE} />
      )}
      <text x={cx} y={y + GATE_H + 18} textAnchor="middle" fontSize="13" fontWeight="600" fill={TXT}>
        {code}
      </text>
      <text x={cx} y={y + GATE_H + 34} textAnchor="middle" fontSize="12" fill={MUT}>
        {pct.toFixed(0)}%
      </text>
    </g>
  );
}

/** Tubo (estático) com sobreposição tracejada animada quando há vazão. */
function FlowPath({ d, flow }: { d: string; flow: number }) {
  return (
    <g>
      <path d={d} fill="none" stroke={PIPE} strokeWidth={14} strokeLinecap="round" strokeLinejoin="round" />
      {flow > 0.5 && (
        <path
          className="dam-flow-lg"
          d={d}
          fill="none"
          stroke={FLOW}
          strokeWidth={7}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray="14 14"
          opacity={0.95}
        />
      )}
    </g>
  );
}

/** Setas de entrada/saída (chevrons marchando quando há vazão). */
function Arrows({ x, y, dir, active }: { x: number; y: number; dir: 1 | -1; active: boolean }) {
  const color = active ? FLOW : "#3B4668";
  return (
    <g>
      {[0, 1, 2].map((i) => {
        const bx = x + dir * i * 26;
        return (
          <path
            key={i}
            className={active ? "dam-march" : undefined}
            d={`M ${bx} ${y - 9} l ${dir * 11} 9 l ${-dir * 11} 9`}
            fill="none"
            stroke={color}
            strokeWidth={4}
            strokeLinecap="round"
            strokeLinejoin="round"
            style={active ? { animationDelay: `${i * 0.15}s` } : undefined}
          />
        );
      })}
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

  const drops = Math.min(6, Math.ceil(chuva / 2));

  // Tubos
  const inflowPipe = `M 96 ${UP_MID} H ${C1_X}`;
  const c1ToTank = `M ${C1_X + GATE_W} ${UP_MID} H ${UP_TANK_X}`;
  const tankToC2 = `M ${UP_TANK_X + TANK_W} ${UP_MID} H ${C2_X}`;
  const upperStair = `M ${C2_X + GATE_W} ${UP_MID} H 520 V ${TURB_CY} H ${TURB_CX - TURB_R}`;
  const lowerStair = `M ${TURB_CX + TURB_R} ${TURB_CY} H 880 V ${LOW_MID} H ${C3_X}`;
  const c3ToTank = `M ${C3_X + GATE_W} ${LOW_MID} H ${LOW_TANK_X}`;
  const tankToC4 = `M ${LOW_TANK_X + TANK_W} ${LOW_MID} H ${C4_X}`;
  const outflowPipe = `M ${C4_X + GATE_W} ${LOW_MID} H 1304`;

  return (
    <Card title="Esquema da represa" bodyClassName="p-3">
      <svg
        viewBox="0 0 1400 650"
        width="100%"
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label="Diagrama da represa em tempo real"
        style={{ display: "block" }}
      >
        {/* Painel de fundo */}
        <rect x={0.5} y={0.5} width={1399} height={649} rx={20} fill={BG} stroke={PIPE} strokeWidth={1.5} />

        {/* Tubos + fluxo (atrás de tudo) */}
        <FlowPath d={inflowPipe} flow={enchimento} />
        <FlowPath d={c1ToTank} flow={enchimento} />
        <FlowPath d={tankToC2} flow={fluxo1} />
        <FlowPath d={upperStair} flow={fluxo1} />
        <FlowPath d={lowerStair} flow={fluxo2} />
        <FlowPath d={c3ToTank} flow={fluxo2} />
        <FlowPath d={tankToC4} flow={esvaz} />
        <FlowPath d={outflowPipe} flow={esvaz} />

        <Arrows x={28} y={UP_MID} dir={1} active={enchimento > 0.5} />
        <Arrows x={1330} y={LOW_MID} dir={1} active={esvaz > 0.5} />

        {/* Tanques */}
        <Tank x={UP_TANK_X} y={UP_TANK_Y} vol={vol1} label="Tanque Superior" clipId="clip-upper" />
        <Tank x={LOW_TANK_X} y={LOW_TANK_Y} vol={vol2} label="Tanque Inferior" clipId="clip-lower" />

        {/* Comportas */}
        <GateV x={C1_X} y={UP_GATE_Y} code="C1" pct={c1} />
        <GateV x={C2_X} y={UP_GATE_Y} code="C2" pct={c2} />
        <GateV x={C3_X} y={LOW_GATE_Y} code="C3" pct={c3} />
        <GateV x={C4_X} y={LOW_GATE_Y} code="C4" pct={c4} />

        {/* Turbina */}
        <g>
          <circle cx={TURB_CX} cy={TURB_CY} r={TURB_R} fill="none" stroke={turbinaOn ? GREEN : GREEN_OFF} strokeWidth={14} opacity={0.22} />
          <circle cx={TURB_CX} cy={TURB_CY} r={TURB_R} fill="#0E1626" stroke={turbinaOn ? GREEN : GREEN_OFF} strokeWidth={6} />
          <g className={`dam-blades${turbinaOn ? " on" : ""}`}>
            {[0, 60, 120, 180, 240, 300].map((a) => (
              <rect
                key={a}
                x={TURB_CX - 9}
                y={TURB_CY - 46}
                width={18}
                height={40}
                rx={9}
                fill={turbinaOn ? GREEN : GREEN_OFF}
                transform={`rotate(${a} ${TURB_CX} ${TURB_CY})`}
              />
            ))}
            <circle cx={TURB_CX} cy={TURB_CY} r={12} fill={turbinaOn ? GREEN : GREEN_OFF} />
          </g>
          <text x={TURB_CX} y={TURB_CY + TURB_R + 24} textAnchor="middle" fontSize="13" fill={MUT}>
            Turbina
          </text>
          <text x={TURB_CX} y={TURB_CY + TURB_R + 42} textAnchor="middle" fontSize="14" fontWeight="700" fill={turbinaOn ? GREEN : GREEN_OFF}>
            {turbinaOn ? "LIGADO" : "DESLIGADO"}
          </text>
          <text x={TURB_CX} y={TURB_CY + TURB_R + 60} textAnchor="middle" fontSize="13" fontWeight="600" fill={YELLOW}>
            {energia.toFixed(0)} kW/h
          </text>
        </g>

        {/* Card de chuva (canto superior direito) */}
        <g>
          <rect x={1066} y={30} width={318} height={132} rx={16} fill={PANEL} stroke={PIPE} strokeWidth={1.5} />
          <g fill="#475569" stroke="#5B6680" strokeWidth={1}>
            <ellipse cx={1132} cy={84} rx={20} ry={15} />
            <ellipse cx={1156} cy={74} rx={26} ry={20} />
            <ellipse cx={1184} cy={84} rx={20} ry={15} />
            <rect x={1112} y={82} width={92} height={18} rx={9} stroke="none" />
          </g>
          {Array.from({ length: drops }).map((_, i) => (
            <line
              key={i}
              className="dam-rain"
              x1={1124 + i * 12}
              y1={106}
              x2={1124 + i * 12}
              y2={114}
              stroke={CYAN}
              strokeWidth={2.5}
              strokeLinecap="round"
              style={{ animationDelay: `${(i % 3) * 0.22}s` }}
            />
          ))}
          <text x={1238} y={84} fontSize="13" fill={MUT}>
            Chuva atual
          </text>
          <text x={1238} y={112} fontSize="22" fontWeight="700" fill={CYAN}>
            {chuva.toFixed(1)} mm/h
          </text>
        </g>
      </svg>
    </Card>
  );
}
