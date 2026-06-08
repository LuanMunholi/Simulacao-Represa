import type { ACCENT } from "../constants";

type AccentKey = keyof typeof ACCENT;

/** Ícone de linha por categoria de sensor. Usa currentColor (cor herdada do pai). */
export function SensorIcon({
  accent,
  size = 15,
}: {
  accent: AccentKey;
  size?: number;
}) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };

  switch (accent) {
    case "water": // volume dos tanques — gota
      return (
        <svg {...common} fill="currentColor" stroke="none">
          <path d="M12 3c3 4 6 7 6 10a6 6 0 0 1-12 0c0-3 3-6 6-10z" />
        </svg>
      );
    case "rain": // chuva — nuvem + gotas
      return (
        <svg {...common}>
          <path d="M7 15a4 4 0 0 1 .5-8 5 5 0 0 1 9.5 1.5A3.5 3.5 0 0 1 16.5 15" />
          <path d="M8 18l-1 2M12 18l-1 2M16 18l-1 2" />
        </svg>
      );
    case "energy": // turbina + energia — raio
      return (
        <svg {...common} fill="currentColor" stroke="none">
          <path d="M13 2 4 14h6l-1 8 9-12h-6l1-8z" />
        </svg>
      );
    case "gate": // comportas — controle/sliders
      return (
        <svg {...common}>
          <path d="M4 8h16M4 16h16" />
          <circle cx="9" cy="8" r="2.2" fill="currentColor" stroke="none" />
          <circle cx="15" cy="16" r="2.2" fill="currentColor" stroke="none" />
        </svg>
      );
    case "flow": // enchimento/esvaziamento — setas verticais
      return (
        <svg {...common}>
          <path d="M8 4v12M8 16l-3-3M8 16l3-3" />
          <path d="M16 20V8M16 8l-3 3M16 8l3 3" />
        </svg>
      );
    case "stream": // fluxos — ondas
    default:
      return (
        <svg {...common}>
          <path d="M3 8c2.5-2.5 5 2.5 7.5 0S15.5 5.5 18 8" />
          <path d="M3 14c2.5-2.5 5 2.5 7.5 0S15.5 11.5 18 14" />
        </svg>
      );
  }
}
