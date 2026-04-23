import React from "react";
import { Search, ShoppingBag, TrendingUp, Users, LayoutDashboard } from "lucide-react";
import { clsx } from "clsx";
import { IXAZone } from "./IXALayout";

interface ZoneNavigationProps {
  activeZone: IXAZone;
  onZoneChange: (zone: IXAZone) => void;
}

export const ZoneNavigation: React.FC<ZoneNavigationProps> = ({ activeZone, onZoneChange }) => {
  const zones = [
    { id: "discover", label: "Discover", icon: Search },
    { id: "shop", label: "Shop", icon: ShoppingBag },
    { id: "grow", label: "Grow", icon: TrendingUp },
    { id: "connect", label: "Connect", icon: Users },
    { id: "me", label: "Me", icon: LayoutDashboard }
  ];

  return (
    <nav className="w-20 md:w-64 border-r border-grid-silver/20 bg-orbit-blue-primary flex flex-col p-md gap-sm">
      <div className="mb-lg px-sm hidden md:block">
        <p className="text-[10px] font-bold text-grid-silver uppercase tracking-[0.2em]">
          IXA Workspace
        </p>
      </div>
      {zones.map((zone) => {
        const Icon = zone.icon;
        const isActive = activeZone === zone.id;
        return (
          <button
            key={zone.id}
            onClick={() => onZoneChange(zone.id as IXAZone)}
            className={clsx(
              "flex items-center gap-4 p-md rounded-2xl transition-all duration-300 group relative",
              isActive
                ? "bg-pulse-cyan-500/10 text-pulse-cyan-500 shadow-[0_0_20px_rgba(0,217,255,0.1)]"
                : "text-grid-silver hover:bg-cosmic-slate hover:text-tech-white"
            )}
          >
            {isActive && (
              <div className="absolute left-0 w-1 h-6 bg-pulse-cyan-500 rounded-r-full" />
            )}
            <Icon size={24} className={clsx(isActive ? "scale-110" : "group-hover:scale-110")} />
            <span className="hidden md:block font-medium">{zone.label}</span>
          </button>
        );
      })}
      <div className="mt-auto p-md bg-cosmic-slate/30 rounded-2xl hidden md:block">
        <p className="text-xs text-grid-silver text-center italic">CSI Neural Link Active</p>
      </div>
    </nav>
  );
};
