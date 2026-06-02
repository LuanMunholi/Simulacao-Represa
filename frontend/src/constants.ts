export const SENSOR_LABELS: Record<string, string> = {
  sensor_volume_01: "Volume Tanque Superior",
  sensor_volume_02: "Volume Tanque Inferior",
  sensor_chuva_01: "Chuva atual",
  sensor_chuva_02: "Chuva acumulada (30d)",
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

export const SENSOR_ORDER: string[] = [
  "sensor_volume_01", "sensor_volume_02",
  "sensor_chuva_01", "sensor_chuva_02",
  "sensor_turbina_01", "sensor_energia_01",
  "sensor_comporta_01", "sensor_enchimento_01",
  "sensor_comporta_02", "sensor_fluxo_01",
  "sensor_comporta_03", "sensor_fluxo_02",
  "sensor_comporta_04", "sensor_esvaziamento_01",
];

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
