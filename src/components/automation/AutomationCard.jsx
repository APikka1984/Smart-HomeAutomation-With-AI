import {
  Zap,
  Thermometer,
  Droplets,
  Clock3,
  Power,
  Pencil,
  Copy,
  Trash2,
  ChevronDown,
} from "lucide-react";

function formatRoom(room = "") {
  if (!room) return "Any room";

  return room
    .replace(/-/g, " ")
    .replace(/\b\w/g, (char) =>
      char.toUpperCase()
    );
}

function formatDevice(device = "") {
  if (!device) return "Selected device";

  return device
    .replace(/-/g, " ")
    .replace(/\b\w/g, (char) =>
      char.toUpperCase()
    );
}

function getTriggerIcon(trigger) {
  if (trigger?.type === "sensor") {
    return trigger.sensor === "humidity"
      ? Droplets
      : Thermometer;
  }

  if (trigger?.type === "time") {
    return Clock3;
  }

  return Power;
}

function getTriggerTitle(trigger) {
  if (!trigger) return "Trigger";

  if (trigger.type === "sensor") {
    return trigger.sensor === "humidity"
      ? "Humidity"
      : "Temperature";
  }

  if (trigger.type === "time") {
    return "Scheduled Time";
  }

  if (trigger.type === "device") {
    return "Device State";
  }

  return "Trigger";
}

function getTriggerDescription(trigger) {
  if (!trigger) {
    return "No trigger configured";
  }

  if (trigger.type === "sensor") {
    const sensor =
      trigger.sensor === "humidity"
        ? "humidity"
        : "temperature";

    const unit =
      trigger.sensor === "humidity"
        ? "%"
        : "°C";

    return `${formatRoom(
      trigger.room
    )} ${sensor} ${
      trigger.operator || ">"
    } ${trigger.value ?? 0}${unit}`;
  }

  if (trigger.type === "time") {
    return trigger.time
      ? `At ${trigger.time}`
      : "Time not configured";
  }

  if (trigger.type === "device") {
    return `${formatDevice(
      trigger.deviceId
    )} becomes ${
      trigger.deviceState || "ON"
    }`;
  }

  return "Custom trigger";
}

function getActionDescription(action) {
  if (!action) {
    return "No action configured";
  }

  return `${action.command || "ON"} ${formatDevice(
    action.deviceId
  )}${
    action.room
      ? ` in ${formatRoom(action.room)}`
      : ""
  }`;
}

function getRepeatLabel(repeat) {
  switch (repeat) {
    case "once":
      return "Once";

    case "daily":
      return "Daily";

    case "weekdays":
      return "Weekdays";

    case "weekends":
      return "Weekends";

    case "always":
    default:
      return "Always";
  }
}

export default function AutomationCard({
  automation,
  onEdit,
  onDelete,
  onDuplicate,
  onToggle,
}) {
  const trigger =
    automation?.trigger || {};

  const action =
    automation?.action || {};

  const TriggerIcon =
    getTriggerIcon(trigger);

  const enabled =
    Boolean(automation?.enabled);

  return (
    <article
      className={`group relative overflow-hidden rounded-2xl border bg-slate-900/95 p-5 shadow-xl shadow-black/20 transition duration-300 hover:-translate-y-0.5 ${
        enabled
          ? "border-white/10 hover:border-cyan-400/20"
          : "border-white/5 opacity-80"
      }`}
    >
      {/* Accent */}
      <div
        className={`absolute inset-x-0 top-0 h-px ${
          enabled
            ? "bg-gradient-to-r from-transparent via-cyan-400/70 to-transparent"
            : "bg-white/10"
        }`}
      />

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <div
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border ${
              enabled
                ? "border-cyan-400/20 bg-cyan-400/10 text-cyan-300"
                : "border-white/10 bg-white/5 text-slate-500"
            }`}
          >
            <Zap size={20} />
          </div>

          <div className="min-w-0">
            <h3 className="truncate text-sm font-semibold text-white">
              {automation?.name ||
                "Untitled Automation"}
            </h3>

            <div className="mt-1 flex items-center gap-2">
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                  enabled
                    ? "bg-emerald-400/10 text-emerald-300"
                    : "bg-slate-700/60 text-slate-400"
                }`}
              >
                {enabled
                  ? "Active"
                  : "Disabled"}
              </span>

              <span className="text-[10px] text-slate-500">
                {getRepeatLabel(
                  automation?.repeat
                )}
              </span>
            </div>
          </div>
        </div>

        {/* Toggle */}
        <button
          type="button"
          onClick={() =>
            onToggle?.(
              automation,
              !enabled
            )
          }
          className={`relative h-6 w-11 shrink-0 rounded-full border transition ${
            enabled
              ? "border-cyan-400/40 bg-cyan-400"
              : "border-white/10 bg-slate-800"
          }`}
          aria-label={
            enabled
              ? "Disable automation"
              : "Enable automation"
          }
        >
          <span
            className={`absolute top-1 h-4 w-4 rounded-full transition ${
              enabled
                ? "left-6 bg-slate-950"
                : "left-1 bg-slate-400"
            }`}
          />
        </button>
      </div>

      {/* Rule */}
      <div className="mt-5 space-y-3">
        {/* IF */}
        <div className="rounded-xl border border-white/5 bg-black/20 p-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-400/10 text-violet-300">
              <TriggerIcon size={17} />
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                IF ·{" "}
                {getTriggerTitle(
                  trigger
                )}
              </p>

              <p className="mt-1 break-words text-sm font-medium text-slate-200">
                {getTriggerDescription(
                  trigger
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Arrow */}
        <div className="flex justify-center">
          <div className="flex h-6 w-6 items-center justify-center rounded-full border border-white/10 bg-slate-950 text-slate-500">
            <ChevronDown size={14} />
          </div>
        </div>

        {/* THEN */}
        <div className="rounded-xl border border-white/5 bg-black/20 p-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-400/10 text-emerald-300">
              <Power size={17} />
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                THEN · Device Action
              </p>

              <p className="mt-1 break-words text-sm font-medium text-slate-200">
                {getActionDescription(
                  action
                )}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-white/5 pt-4">
        <div className="flex items-center gap-2">
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              enabled
                ? "bg-emerald-400 shadow-lg shadow-emerald-400/50"
                : "bg-slate-600"
            }`}
          />

          <span className="text-[10px] text-slate-500">
            {enabled
              ? "Rule enabled"
              : "Rule disabled"}
          </span>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() =>
              onEdit?.(automation)
            }
            className="rounded-lg p-2 text-slate-500 transition hover:bg-cyan-400/10 hover:text-cyan-300"
            title="Edit automation"
          >
            <Pencil size={16} />
          </button>

          <button
            type="button"
            onClick={() =>
              onDuplicate?.(
                automation
              )
            }
            className="rounded-lg p-2 text-slate-500 transition hover:bg-violet-400/10 hover:text-violet-300"
            title="Duplicate automation"
          >
            <Copy size={16} />
          </button>

          <button
            type="button"
            onClick={() =>
              onDelete?.(automation)
            }
            className="rounded-lg p-2 text-slate-500 transition hover:bg-red-500/10 hover:text-red-300"
            title="Delete automation"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>
    </article>
  );
}