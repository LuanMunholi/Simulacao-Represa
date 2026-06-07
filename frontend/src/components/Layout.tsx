import { NavLink, Outlet } from "react-router-dom";

import { useWebSocket } from "../hooks/useWebSocket";
import type { LayoutContext, Tick } from "../types";
import { GameOverOverlay } from "./GameOverOverlay";
import { Header } from "./Header";

const tabBase =
  "px-4 py-2 text-sm font-medium transition-colors border-b-2";
const tabInactive = "text-slate-400 border-transparent hover:text-slate-200";
const tabActive = "text-slate-100 border-blue-500";

export function Layout() {
  const { data, connected } = useWebSocket<Tick>("/ws");
  const ctx: LayoutContext = { data, connected };

  return (
    <div className="p-6 max-w-[1600px] mx-auto">
      <Header data={data} connected={connected} />
      <nav className="flex gap-1 border-b border-slate-700 mb-4">
        <NavLink
          to="/monitoring"
          className={({ isActive }) =>
            `${tabBase} ${isActive ? tabActive : tabInactive}`
          }
        >
          Monitoramento
        </NavLink>
        <NavLink
          to="/simulation"
          className={({ isActive }) =>
            `${tabBase} ${isActive ? tabActive : tabInactive}`
          }
        >
          Simulação
        </NavLink>
      </nav>
      <Outlet context={ctx} />

      {data?.game_over && (
        <GameOverOverlay
          gameOver={data.game_over}
          dia={Math.floor(data.simulated_hours / 24)}
        />
      )}
    </div>
  );
}
