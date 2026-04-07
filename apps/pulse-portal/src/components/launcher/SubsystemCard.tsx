"use client";

import { SubsystemInfo } from "../../types/subsystem";

interface SubsystemCardProps {
  subsystem: SubsystemInfo;
  onLaunch: () => void;
}

export function SubsystemCard({ subsystem, onLaunch }: SubsystemCardProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case "online":
        return "bg-green-500";
      case "degraded":
        return "bg-yellow-500";
      case "offline":
        return "bg-red-500";
      default:
        return "bg-gray-500";
    }
  };

  const getHealthColor = (health: number) => {
    if (health >= 95) return "text-green-400";
    if (health >= 80) return "text-yellow-400";
    return "text-red-400";
  };

  return (
    <div className="bg-slate-800/70 backdrop-blur-sm rounded-sm xxs:rounded-md md:rounded-lg lg:rounded-xl border border-slate-700 p-3 xxs:p-4 md:p-6 hover:border-slate-600 transition-all cursor-pointer group">
      <div className="flex items-start justify-between mb-3 xxs:mb-4">
        <div className="flex items-center space-x-2 xxs:space-x-3 flex-shrink-0">
          <div className="text-lg xxs:text-xl md:text-2xl">{subsystem.icon}</div>
          <div className="min-w-0 flex-1">
            <h3 className="text-sm xxs:text-base md:text-lg font-semibold text-white group-hover:text-purple-300 transition-colors truncate">
              {subsystem.name}
            </h3>
            <p className="text-xs xxs:text-sm text-slate-400 line-clamp-2">
              {subsystem.description}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-1 xxs:space-x-2 flex-shrink-0 ml-2">
          <div
            className={`w-2 h-2 xxs:w-3 xxs:h-3 rounded-full ${getStatusColor(subsystem.status)}`}
          ></div>
          <span className="text-xs text-slate-400 capitalize hidden xs:block">
            {subsystem.status}
          </span>
        </div>
      </div>

      <div className="space-y-2 xxs:space-y-3 mb-3 xxs:mb-4">
        <div className="flex justify-between items-center">
          <span className="text-xs xxs:text-sm text-slate-400">Health</span>
          <span className={`text-xs xxs:text-sm font-medium ${getHealthColor(subsystem.health)}`}>
            {subsystem.health}%
          </span>
        </div>
        <div className="w-full bg-slate-700 rounded-full h-1.5 xxs:h-2">
          <div
            className="bg-gradient-to-r from-green-500 to-blue-500 h-1.5 xxs:h-2 rounded-full transition-all duration-300"
            style={{ width: `${subsystem.health}%` }}
          ></div>
        </div>
      </div>

      <div className="flex items-center justify-between mb-3 xxs:mb-4">
        <div className="text-xs text-slate-500 truncate">
          {subsystem.regionCount} regions • {subsystem.userCount.toLocaleString()} users
        </div>
        <button
          onClick={onLaunch}
          disabled={subsystem.status === "offline"}
          className="px-2 xxs:px-3 md:px-4 py-1.5 xxs:py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-slate-600 disabled:cursor-not-allowed rounded-md xxs:rounded-lg text-white text-xs xxs:text-sm font-medium transition-colors min-h-8 xxs:min-h-9"
        >
          Launch
        </button>
      </div>

      {/* Features Preview */}
      <div className="pt-3 xxs:pt-4 border-t border-slate-700">
        <div className="flex flex-wrap gap-1">
          {subsystem.features.slice(0, 3).map((feature, index) => (
            <span
              key={index}
              className="px-1.5 xxs:px-2 py-0.5 xxs:py-1 bg-slate-700 text-xs text-slate-300 rounded-md"
            >
              {feature}
            </span>
          ))}
          {subsystem.features.length > 3 && (
            <span className="px-1.5 xxs:px-2 py-0.5 xxs:py-1 bg-slate-700 text-xs text-slate-500 rounded-md">
              +{subsystem.features.length - 3} more
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
