import {
  Menu,
  Wifi,
  WifiOff,
  Bell,
  Search,
} from "lucide-react";

export default function DashboardHeader({
  onMenuClick,
  mqttConnected = false,
  user,
  onSearch,
}) {
  const displayName =
    user?.displayName ||
    user?.email?.split("@")[0] ||
    "User";

  const initial =
    displayName.charAt(0).toUpperCase();

  return (
    <header className="sticky top-0 z-30 border-b border-white/10 bg-slate-950/80 backdrop-blur-xl">
      <div className="flex h-20 items-center gap-4 px-4 sm:px-6 lg:px-8">
        {/* Hamburger */}
        <button
          type="button"
          onClick={onMenuClick}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-300 transition hover:border-cyan-400/30 hover:bg-cyan-400/10 hover:text-cyan-300"
          aria-label="Open sidebar"
        >
          <Menu size={21} />
        </button>

        {/* Search */}
        <div className="hidden max-w-md flex-1 md:block">
          <div className="relative">
            <Search
              size={17}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
            />

            <input
              type="text"
              placeholder="Search devices, rooms..."
              onChange={(event) =>
                onSearch?.(event.target.value)
              }
              className="h-11 w-full rounded-xl border border-white/10 bg-white/5 pl-10 pr-4 text-sm text-white outline-none placeholder:text-slate-600 transition focus:border-cyan-400/40 focus:bg-white/[0.07]"
            />
          </div>
        </div>

        <div className="ml-auto flex items-center gap-2 sm:gap-3">
          {/* MQTT status */}
          <div
            className={`hidden items-center gap-2 rounded-xl border px-3 py-2 sm:flex ${
              mqttConnected
                ? "border-emerald-400/20 bg-emerald-400/10"
                : "border-red-400/20 bg-red-400/10"
            }`}
          >
            {mqttConnected ? (
              <Wifi
                size={16}
                className="text-emerald-400"
              />
            ) : (
              <WifiOff
                size={16}
                className="text-red-400"
              />
            )}

            <span
              className={`text-xs font-medium ${
                mqttConnected
                  ? "text-emerald-300"
                  : "text-red-300"
              }`}
            >
              {mqttConnected
                ? "MQTT Connected"
                : "MQTT Offline"}
            </span>
          </div>

          {/* Notifications */}
          <button
            type="button"
            className="relative flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-400 transition hover:bg-white/10 hover:text-white"
            aria-label="Notifications"
          >
            <Bell size={19} />

            <span className="absolute right-2.5 top-2.5 h-1.5 w-1.5 rounded-full bg-cyan-400" />
          </button>

          {/* User */}
          <button
            type="button"
            className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-2 py-2 transition hover:bg-white/10"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-400 to-blue-500 text-sm font-bold text-slate-950">
              {initial}
            </div>

            <div className="hidden text-left lg:block">
              <p className="max-w-28 truncate text-xs font-semibold text-white">
                {displayName}
              </p>

              <p className="text-[10px] text-slate-500">
                Smart Home
              </p>
            </div>
          </button>
        </div>
      </div>
    </header>
  );
}