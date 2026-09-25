import {
  Power,
  Pencil,
  Trash2,
  Wifi,
  WifiOff,
} from "lucide-react";

export default function DeviceCard({
  device,
  onToggle,
  onEdit,
  onDelete,
}) {
  const isOnline = device.online !== false;
  const isOn = Boolean(device.state);

  return (
    <div
      className={`group relative overflow-hidden rounded-2xl border p-5 transition-all duration-300 ${
        isOn
          ? "border-cyan-400/20 bg-cyan-400/[0.05] hover:border-cyan-400/40"
          : "border-white/10 bg-white/[0.03] hover:border-white/20"
      } hover:-translate-y-1 hover:shadow-2xl`}
    >
      {/* Top glow */}
      <div
        className={`pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full blur-3xl transition-opacity ${
          isOn
            ? "bg-cyan-400/10 opacity-100"
            : "opacity-0"
        }`}
      />

      {/* Header */}
      <div className="relative flex items-start justify-between gap-4">
        <div className="min-w-0">
          {/* Device Icon */}
          <div
            className={`flex h-16 w-16 items-center justify-center rounded-2xl border text-4xl transition-all duration-300 ${
              isOn
                ? "border-cyan-400/20 bg-cyan-400/10 shadow-lg shadow-cyan-400/10"
                : "border-white/10 bg-white/5"
            }`}
          >
            {device.icon || "💡"}
          </div>

          {/* Device Information */}
          <h2 className="mt-4 truncate text-lg font-semibold text-white">
            {device.name || "Unnamed Device"}
          </h2>

          <p className="mt-1 truncate text-sm capitalize text-slate-400">
            {device.room || "Unknown Room"}
          </p>
        </div>

        {/* Online Status */}
        <div
          className={`flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-wider ${
            isOnline
              ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-300"
              : "border-red-400/20 bg-red-400/10 text-red-300"
          }`}
        >
          {isOnline ? (
            <Wifi size={12} />
          ) : (
            <WifiOff size={12} />
          )}

          {isOnline ? "Online" : "Offline"}
        </div>
      </div>

      {/* Status */}
      <div className="relative mt-6 flex items-center justify-between rounded-xl border border-white/10 bg-black/10 px-4 py-3">
        <div>
          <p className="text-xs text-slate-500">
            Device Status
          </p>

          <div className="mt-1 flex items-center gap-2">
            <span
              className={`h-2 w-2 rounded-full ${
                isOn
                  ? "bg-emerald-400 shadow-lg shadow-emerald-400/50"
                  : "bg-slate-500"
              }`}
            />

            <span
              className={`text-sm font-semibold ${
                isOn
                  ? "text-emerald-300"
                  : "text-slate-400"
              }`}
            >
              {isOn ? "ON" : "OFF"}
            </span>
          </div>
        </div>

        {/* Toggle */}
        <button
          type="button"
          onClick={() => onToggle(device.id)}
          disabled={!isOnline}
          aria-label={
            isOn
              ? `Turn off ${device.name}`
              : `Turn on ${device.name}`
          }
          className={`relative h-7 w-12 rounded-full transition-all duration-300 ${
            !isOnline
              ? "cursor-not-allowed bg-slate-700 opacity-50"
              : isOn
              ? "bg-cyan-500 shadow-lg shadow-cyan-500/20"
              : "bg-slate-700 hover:bg-slate-600"
          }`}
        >
          <span
            className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow-md transition-transform duration-300 ${
              isOn
                ? "translate-x-6"
                : "translate-x-1"
            }`}
          />
        </button>
      </div>

      {/* Bottom Actions */}
      <div className="relative mt-4 flex items-center gap-2">
        {/* Power Button */}
        <button
          type="button"
          onClick={() => onToggle(device.id)}
          disabled={!isOnline}
          className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all ${
            !isOnline
              ? "cursor-not-allowed bg-slate-800 text-slate-600"
              : isOn
              ? "bg-emerald-400/10 text-emerald-300 hover:bg-emerald-400/20"
              : "bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white"
          }`}
        >
          <Power size={17} />

          {isOn ? "Turn Off" : "Turn On"}
        </button>

        {/* Edit */}
        <button
          type="button"
          onClick={() => onEdit(device)}
          aria-label={`Edit ${device.name}`}
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-400 transition hover:border-blue-400/30 hover:bg-blue-400/10 hover:text-blue-300"
        >
          <Pencil size={17} />
        </button>

        {/* Delete */}
        <button
          type="button"
          onClick={() => onDelete(device.id)}
          aria-label={`Delete ${device.name}`}
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-400 transition hover:border-red-400/30 hover:bg-red-400/10 hover:text-red-300"
        >
          <Trash2 size={17} />
        </button>
      </div>
    </div>
  );
}