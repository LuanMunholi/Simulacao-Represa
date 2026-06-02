import { Navigate, Route, Routes } from "react-router-dom";

import { Layout } from "./components/Layout";
import { MonitoringPanel } from "./pages/MonitoringPanel";
import { SimulationPanel } from "./pages/SimulationPanel";

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Navigate to="/monitoring" replace />} />
        <Route path="/monitoring" element={<MonitoringPanel />} />
        <Route path="/simulation" element={<SimulationPanel />} />
      </Route>
    </Routes>
  );
}
