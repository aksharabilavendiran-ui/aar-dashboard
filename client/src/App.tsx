import { Navigate, Route, Routes } from "react-router-dom";
import Sidebar from "./components/Sidebar";
import Roster from "./pages/Roster";
import Live from "./pages/Live";
import AarPage from "./pages/AarPage";
import AarIndex from "./pages/AarIndex";
import Scenario from "./pages/Scenario";

export default function App() {
  return (
    <div className="flex h-full">
      <Sidebar />
      <main className="min-w-0 flex-1 overflow-y-auto p-4 md:p-6">
        <Routes>
          <Route path="/" element={<Navigate to="/roster" replace />} />
          <Route path="/roster" element={<Roster />} />
          <Route path="/live" element={<Live />} />
          <Route path="/aar" element={<AarIndex />} />
          <Route path="/aar/:sessionId" element={<AarPage />} />
          <Route path="/scenario" element={<Scenario />} />
        </Routes>
      </main>
    </div>
  );
}
