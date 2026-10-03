import { NavLink } from "react-router-dom";
import { Users, Radar, ClipboardList, SlidersHorizontal, Crosshair } from "lucide-react";

const links = [
  { to: "/roster", label: "Trainee roster", icon: Users },
  { to: "/live", label: "Live tactical map", icon: Radar },
  { to: "/aar", label: "After-action review", icon: ClipboardList },
  { to: "/scenario", label: "Scenario builder", icon: SlidersHorizontal },
];

export default function Sidebar() {
  return (
    <nav aria-label="Main" className="flex w-14 shrink-0 flex-col border-r border-zinc-800 bg-zinc-900 md:w-64">
      <div className="flex items-center gap-3 border-b border-zinc-800 p-4">
        <Crosshair className="h-6 w-6 shrink-0 text-friendly" />
        <div className="hidden md:block">
          <div className="font-head text-lg font-semibold leading-tight text-zinc-100">Counter-drone trainer</div>
          <div className="text-xs text-zinc-500">After-action review</div>
        </div>
      </div>
      <ul className="flex flex-col gap-1 p-2">
        {links.map(({ to, label, icon: Icon }) => (
          <li key={to}>
            <NavLink
              to={to}
              title={label}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded px-3 py-2 text-sm ${isActive ? "bg-zinc-800 text-friendly" : "text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-100"}`
              }
            >
              <Icon className="h-5 w-5 shrink-0" />
              <span className="hidden md:inline">{label}</span>
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
