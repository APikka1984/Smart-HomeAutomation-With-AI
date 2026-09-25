import {
  LayoutDashboard,
  Lightbulb,
  DoorOpen,
  BarChart3,
  Mic,
  Settings,
  User,
  LogOut,
  X,
  Sparkles,
  Zap,
} from "lucide-react";

export default function Sidebar({
  open,
  onClose,
  onLogout,
  activeSection = "dashboard",
  onNavigate,
  guestMode = false,
}) {
  const menuItems = [
    {
      id: "dashboard",
      label: "Dashboard",
      icon: LayoutDashboard,
    },
    {
      id: "rooms",
      label: "Rooms",
      icon: DoorOpen,
    },
    {
      id: "devices",
      label: "Devices",
      icon: Lightbulb,
    },
    {
      id: "sensors",
      label: "Sensors",
      icon: BarChart3,
    },
    {
      id: "automation",
      label: "Automation",
      icon: Zap,
    },
    {
      id: "voice",
      label: "AI Voice",
      icon: Mic,
    },
  ];

  const bottomItems = [
    {
      id: "profile",
      label: "Profile",
      icon: User,
    },
    {
      id: "settings",
      label: "Settings",
      icon: Settings,
    },
  ];

  const handleNavigate = (id) => {
    console.log("Sidebar clicked:", id);
    onNavigate?.(id);
  };

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <button
          type="button"
          aria-label="Close sidebar"
          onClick={onClose}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-0 z-50 flex h-screen w-72 flex-col border-r border-white/10 bg-slate-950/95 shadow-2xl shadow-black/30 backdrop-blur-xl transition-transform duration-300 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Brand */}
        <div className="flex h-20 shrink-0 items-center justify-between border-b border-white/10 px-5">
          <button
            type="button"
            onClick={() => handleNavigate("dashboard")}
            className="flex items-center gap-3"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-400 text-xl text-slate-950 shadow-lg shadow-cyan-400/20">
              🏠
            </div>

            <div className="text-left">
              <h1 className="text-base font-bold text-white">
                SmartHome
              </h1>
              <p className="text-[11px] text-slate-500">
                AI Automation
              </p>
            </div>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 transition hover:bg-white/5 hover:text-white lg:hidden"
            aria-label="Close sidebar"
          >
            <X size={20} />
          </button>
        </div>

        {/* Guest banner */}
        {guestMode && (
          <div className="mx-4 mt-4 shrink-0 rounded-xl border border-amber-400/20 bg-amber-400/10 p-3">
            <div className="flex items-center gap-2">
              <Sparkles size={16} className="text-amber-300" />
              <span className="text-xs font-semibold text-amber-200">
                Guest Mode
              </span>
            </div>

            <p className="mt-1 text-[11px] leading-5 text-slate-400">
              Some features are limited while exploring the app.
            </p>
          </div>
        )}

        {/* Main navigation */}
        <nav className="flex-1 overflow-y-auto px-4 py-6">
          <p className="mb-3 px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-600">
            Main Menu
          </p>

          <div className="space-y-1.5">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const active = activeSection === item.id;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleNavigate(item.id)}
                  className={`group flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition ${
                    active
                      ? "bg-cyan-400 text-slate-950 shadow-lg shadow-cyan-400/10"
                      : "text-slate-400 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  <Icon
                    size={19}
                    className={
                      active
                        ? "text-slate-950"
                        : "text-slate-500 group-hover:text-cyan-300"
                    }
                  />

                  <span>{item.label}</span>

                  {item.id === "voice" && (
                    <span
                      className={`ml-auto rounded-full px-2 py-0.5 text-[9px] font-bold ${
                        active
                          ? "bg-slate-950/10 text-slate-950"
                          : "bg-cyan-400/10 text-cyan-300"
                      }`}
                    >
                      AI
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Account */}
          <p className="mb-3 mt-8 px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-600">
            Account
          </p>

          <div className="space-y-1.5">
            {bottomItems.map((item) => {
              const Icon = item.icon;
              const active = activeSection === item.id;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleNavigate(item.id)}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition ${
                    active
                      ? "bg-white/10 text-white"
                      : "text-slate-400 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  <Icon size={19} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        </nav>

        {/* Logout */}
        <div className="shrink-0 border-t border-white/10 p-4">
          <button
            type="button"
            onClick={onLogout}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-slate-400 transition hover:bg-red-500/10 hover:text-red-300"
          >
            <LogOut size={19} />
            <span>{guestMode ? "Exit Guest Mode" : "Logout"}</span>
          </button>
        </div>
      </aside>
    </>
  );
}
