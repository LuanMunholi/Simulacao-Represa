export interface SensorEntry {
  valor: number | string;
  unidade: string | null;
}

export interface RiskEntry {
  codigo: string;
  severidade: string;
  mensagem: string;
  sensores: Record<string, number | string>;
}

export interface PredictionEntry {
  tanque: string;
  tipo: string;
  tempo_horas: number;
  severidade: string;
  mensagem: string;
}

export interface Tick {
  simulated_hours: number;
  simulated_time: string;
  fator_aceleracao: number;
  status: string;
  paused_reason: string | null;
  scenario_active: string | null;
  scenario_ticks_remaining: number | null;
  sensors: Record<string, SensorEntry>;
  derived: {
    capacidade_atual: number;
    contribuicao_chuva: number;
    taxa_liquida_01: number;
    taxa_liquida_02: number;
  };
  alert_level: string;
  active_risks: RiskEntry[];
  active_predictions: PredictionEntry[];
  game_over: GameOver | null;
}

export interface GameOver {
  tanque: string;
  sensor: string;
  tipo: "esvaziou" | "transbordou";
}

export interface AlertHistoryItem {
  id: number;
  simulated_timestamp: number;
  simulated_time: string;
  tipo: string;
  severidade: string;
  mensagem: string;
  leituras: Record<string, number | string>;
}

export interface LayoutContext {
  data: Tick | null;
  connected: boolean;
}
