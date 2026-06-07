export const SENSOR_LABELS: Record<string, string> = {
  sensor_volume_01: "Volume Tanque Superior",
  sensor_volume_02: "Volume Tanque Inferior",
  sensor_chuva_01: "Chuva atual",
  sensor_chuva_02: "Chuva média diária (30d)",
  sensor_turbina_01: "Turbina",
  sensor_energia_01: "Energia gerada",
  sensor_comporta_01: "Comporta 01 — Enchimento Sup.",
  sensor_enchimento_01: "Taxa de enchimento",
  sensor_comporta_02: "Comporta 02 — Saída Sup.",
  sensor_fluxo_01: "Fluxo passagem turbina",
  sensor_comporta_03: "Comporta 03 — Entrada Inf.",
  sensor_fluxo_02: "Fluxo saída barragem",
  sensor_comporta_04: "Comporta 04 — Esvaziamento Inf.",
  sensor_esvaziamento_01: "Taxa de esvaziamento",
};

export interface SensorCategory {
  title: string;
  sensors: string[];
  accent: keyof typeof ACCENT;
}

export const SENSOR_CATEGORIES: SensorCategory[] = [
  {
    title: "Volume dos tanques",
    accent: "water",
    sensors: ["sensor_volume_01", "sensor_volume_02"],
  },
  {
    title: "Chuvas",
    accent: "rain",
    sensors: ["sensor_chuva_01", "sensor_chuva_02"],
  },
  {
    title: "Turbina + energia",
    accent: "energy",
    sensors: ["sensor_turbina_01", "sensor_energia_01"],
  },
  {
    title: "Comportas",
    accent: "gate",
    sensors: [
      "sensor_comporta_01",
      "sensor_comporta_02",
      "sensor_comporta_03",
      "sensor_comporta_04",
    ],
  },
  {
    title: "Enchimento + esvaziamento",
    accent: "flow",
    sensors: ["sensor_enchimento_01", "sensor_esvaziamento_01"],
  },
  { title: "Fluxos", accent: "stream", sensors: ["sensor_fluxo_01", "sensor_fluxo_02"] },
];

// Acento visual por categoria (ponto colorido no título + barra lateral nos cards).
// Tons escolhidos para não colidir com o vermelho/âmbar do sistema de perigo.
export const ACCENT = {
  water: { dot: "bg-sky-400", bar: "border-l-sky-500/70" },
  rain: { dot: "bg-cyan-400", bar: "border-l-cyan-500/70" },
  energy: { dot: "bg-emerald-400", bar: "border-l-emerald-500/70" },
  gate: { dot: "bg-violet-400", bar: "border-l-violet-500/70" },
  flow: { dot: "bg-teal-400", bar: "border-l-teal-500/70" },
  stream: { dot: "bg-blue-400", bar: "border-l-blue-500/70" },
} as const;

// Janela de chuva acumulada (dias) usada para derivar a média diária no card.
export const CHUVA_WINDOW_DAYS = 30;

export const ALERT_BG: Record<string, string> = {
  VERDE: "bg-green-600",
  AMARELO: "bg-yellow-600",
  LARANJA: "bg-orange-600",
  VERMELHO: "bg-red-600",
};

export const SEVERITY_BG: Record<string, string> = {
  BAIXA: "bg-cyan-700",
  MEDIA: "bg-yellow-600",
  ALTA: "bg-orange-600",
  CRITICA: "bg-red-600",
  ALERTA: "bg-yellow-600",
  CRITICO: "bg-red-600",
};

export const SEVERITY_BORDER: Record<string, string> = {
  BAIXA: "border-l-cyan-700",
  MEDIA: "border-l-yellow-600",
  ALTA: "border-l-orange-600",
  CRITICA: "border-l-red-600",
  ALERTA: "border-l-yellow-600",
  CRITICO: "border-l-red-600",
};

export const STATUS_LABELS: Record<string, string> = {
  RODANDO: "RODANDO",
  PAUSADO: "PAUSADO",
  INICIANDO: "INICIANDO",
  CENARIO_ATIVO: "CENÁRIO ATIVO",
};

// Estado de saúde geral (a partir do alert_level) — usado no cabeçalho.
export const ALERT_HEALTH: Record<
  string,
  { label: string; dot: string; text: string; ring: string }
> = {
  VERDE: { label: "SAUDÁVEL", dot: "bg-emerald-400", text: "text-emerald-300", ring: "ring-emerald-500/40" },
  AMARELO: { label: "ATENÇÃO", dot: "bg-amber-400", text: "text-amber-300", ring: "ring-amber-500/40" },
  LARANJA: { label: "ALERTA", dot: "bg-orange-400", text: "text-orange-300", ring: "ring-orange-500/40" },
  VERMELHO: { label: "CRÍTICO", dot: "bg-red-500", text: "text-red-300", ring: "ring-red-500/40" },
};

// Superfície padrão de card e título de seção — base da linguagem de design.
export const CARD =
  "bg-slate-800/70 border border-slate-700/80 rounded-xl shadow-sm shadow-black/20";
export const SECTION_TITLE =
  "text-xs font-semibold uppercase tracking-wider text-slate-400 m-0";

export const BTN =
  "px-3 py-1.5 text-sm rounded border border-slate-600 bg-slate-700 text-slate-200 " +
  "hover:bg-slate-600 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed " +
  "transition-colors";

export const BTN_PRIMARY =
  "px-3 py-1.5 text-sm rounded border border-blue-800 bg-blue-600 text-white " +
  "hover:bg-blue-500 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed " +
  "transition-colors";

export const BTN_URGENT =
  "px-3 py-1.5 text-sm rounded border border-red-800 bg-red-600 text-white font-semibold " +
  "hover:bg-red-500 cursor-pointer transition-colors";
