import { useEffect, useMemo, useState } from "react";
import {
  X,
  Thermometer,
  Droplets,
  Clock3,
  Cpu,
} from "lucide-react";

const createDefaultForm = () => ({
  name: "",
  enabled: true,

  trigger: {
    type: "sensor",
    room: "",
    sensor: "temperature",
    operator: ">",
    value: 30,
    deviceId: "",
    deviceState: "ON",
    time: "",
  },

  action: {
    deviceId: "",
    room: "",
    command: "ON",
  },

  repeat: "always",

  schedule: {
    enabled: false,
    startTime: "",
    endTime: "",
  },
});

function normalizeRoom(room = "") {
  return room
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

function getDisplayRoom(room = "") {
  return room.replace(/-/g, " ");
}

export default function AutomationModal({
  automation,
  devices = [],
  onClose,
  onSave,
}) {
  const [form, setForm] = useState(createDefaultForm());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const rooms = useMemo(() => {
    const values = devices
      .map((device) => device.room)
      .filter(Boolean)
      .map((room) => room.trim());

    return [...new Set(values)];
  }, [devices]);

  useEffect(() => {
    if (!automation) {
      setForm(createDefaultForm());
      setError("");
      return;
    }

    const trigger = automation.trigger || {};
    const action = automation.action || {};
    const schedule = automation.schedule || {};

    setForm({
      ...createDefaultForm(),
      ...automation,
      trigger: {
        ...createDefaultForm().trigger,
        ...trigger,
        value:
          trigger.type === "sensor" &&
          trigger.value !== undefined &&
          trigger.value !== null
            ? Number(trigger.value)
            : trigger.value ?? 30,
      },
      action: {
        ...createDefaultForm().action,
        ...action,
      },
      schedule: {
        ...createDefaultForm().schedule,
        ...schedule,
      },
    });

    setError("");
  }, [automation]);

  function updateForm(field, value) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function updateTrigger(field, value) {
    setForm((current) => ({
      ...current,
      trigger: {
        ...current.trigger,
        [field]: value,
      },
    }));
  }

  function updateAction(field, value) {
    setForm((current) => ({
      ...current,
      action: {
        ...current.action,
        [field]: value,
      },
    }));
  }

  function updateSchedule(field, value) {
    setForm((current) => ({
      ...current,
      schedule: {
        ...current.schedule,
        [field]: value,
      },
    }));
  }

  function changeTriggerType(type) {
    setForm((current) => {
      const baseTrigger = {
        type,
        room: "",
        sensor: "temperature",
        operator: ">",
        value: 30,
        deviceId: "",
        deviceState: "ON",
        time: "",
      };

      if (type === "sensor") {
        baseTrigger.room = current.trigger.room || rooms[0]
          ? normalizeRoom(current.trigger.room || rooms[0])
          : "";
      }

      if (type === "device") {
        baseTrigger.deviceId = current.trigger.deviceId || "";
        baseTrigger.deviceState =
          current.trigger.deviceState || "ON";
      }

      if (type === "time") {
        baseTrigger.time = current.trigger.time || "";
      }

      return {
        ...current,
        trigger: baseTrigger,
      };
    });
  }

  function handleTriggerDevice(deviceId) {
    const device = devices.find((item) => item.id === deviceId);

    setForm((current) => ({
      ...current,
      trigger: {
        ...current.trigger,
        deviceId,
      },
    }));
  }

  function handleActionDevice(deviceId) {
    const device = devices.find((item) => item.id === deviceId);

    setForm((current) => ({
      ...current,
      action: {
        ...current.action,
        deviceId,
        room: device?.room ? normalizeRoom(device.room) : "",
      },
    }));
  }

  function validate() {
    const name = form.name.trim();

    if (!name) {
      return "Please enter an automation name.";
    }

    if (!form.trigger?.type) {
      return "Please select a trigger type.";
    }

    if (form.trigger.type === "sensor") {
      if (!form.trigger.room) {
        return "Please select a trigger room.";
      }

      if (!["temperature", "humidity"].includes(form.trigger.sensor)) {
        return "Please select a valid sensor.";
      }

      if (!["<", ">", "<=", ">=", "=="].includes(form.trigger.operator)) {
        return "Please select a valid condition.";
      }

      const value = Number(form.trigger.value);

      if (!Number.isFinite(value)) {
        return "Please enter a valid sensor trigger value.";
      }
    }

    if (form.trigger.type === "device") {
      if (!form.trigger.deviceId) {
        return "Please select a trigger device.";
      }

      if (!["ON", "OFF"].includes(form.trigger.deviceState)) {
        return "Please select a valid device state.";
      }
    }

    if (form.trigger.type === "time" && !form.trigger.time) {
      return "Please select a trigger time.";
    }

    if (!form.action?.deviceId) {
      return "Please select a device to control.";
    }

    if (!["ON", "OFF"].includes(form.action.command)) {
      return "Please select a valid action command.";
    }

    return "";
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    const validationError = validate();

    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      setSaving(true);

      const cleanForm = {
        name: form.name.trim(),
        enabled: Boolean(form.enabled),

        trigger: {
          type: form.trigger.type,
          ...(form.trigger.type === "sensor"
            ? {
                room: normalizeRoom(form.trigger.room),
                sensor: form.trigger.sensor,
                operator: form.trigger.operator,
                value: Number(form.trigger.value),
              }
            : {}),

          ...(form.trigger.type === "device"
            ? {
                deviceId: form.trigger.deviceId,
                deviceState: form.trigger.deviceState,
              }
            : {}),

          ...(form.trigger.type === "time"
            ? {
                time: form.trigger.time,
              }
            : {}),
        },

        action: {
          deviceId: form.action.deviceId,
          room: normalizeRoom(form.action.room),
          command: form.action.command,
        },

        repeat: form.repeat || "always",

        schedule: {
          enabled: Boolean(form.schedule?.enabled),
          startTime: form.schedule?.startTime || "",
          endTime: form.schedule?.endTime || "",
        },
      };

      await onSave(cleanForm);
      onClose();
    } catch (saveError) {
      console.error("Automation save error:", saveError);

      setError(
        saveError?.message || "Failed to save automation."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4 backdrop-blur-md"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="relative max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-3xl border border-cyan-400/20 bg-[#07111f] shadow-2xl shadow-black/50">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-white/10 bg-[#07111f]/95 px-5 py-4 backdrop-blur-xl sm:px-6">
          <div>
            <h2 className="text-xl font-bold text-white">
              {automation ? "Edit Automation" : "Create Automation"}
            </h2>

            <p className="mt-1 text-xs text-slate-500">
              Define when your smart home should perform an action.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-400 transition hover:bg-white/10 hover:text-white"
            aria-label="Close automation modal"
          >
            <X size={19} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 p-5 sm:p-6">
          {error && (
            <div className="rounded-2xl border border-red-400/20 bg-red-500/10 p-4 text-sm text-red-300">
              {error}
            </div>
          )}

          <section>
            <label className="mb-2 block text-sm font-semibold text-slate-300">
              Automation Name
            </label>

            <input
              value={form.name}
              onChange={(event) =>
                updateForm("name", event.target.value)
              }
              placeholder="e.g. Turn fan on when room is hot"
              className="w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-400/50"
            />
          </section>

          <section className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <div>
              <p className="font-semibold text-white">
                Automation enabled
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Disabled rules remain saved but will not execute.
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                updateForm("enabled", !form.enabled)
              }
              className={`relative h-7 w-12 rounded-full transition ${
                form.enabled ? "bg-emerald-500" : "bg-slate-700"
              }`}
              aria-label="Toggle automation"
            >
              <span
                className={`absolute top-1 h-5 w-5 rounded-full bg-white transition ${
                  form.enabled ? "left-6" : "left-1"
                }`}
              />
            </button>
          </section>

          <section className="rounded-3xl border border-white/10 bg-white/[0.025] p-5">
            <div className="mb-5">
              <p className="text-xs font-bold uppercase tracking-wider text-cyan-300">
                01 · IF
              </p>
              <h3 className="mt-1 text-lg font-bold text-white">
                Choose a trigger
              </h3>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <TriggerButton
                active={form.trigger.type === "sensor"}
                icon={<Thermometer size={18} />}
                label="Sensor"
                onClick={() => changeTriggerType("sensor")}
              />

              <TriggerButton
                active={form.trigger.type === "time"}
                icon={<Clock3 size={18} />}
                label="Time"
                onClick={() => changeTriggerType("time")}
              />

              <TriggerButton
                active={form.trigger.type === "device"}
                icon={<Cpu size={18} />}
                label="Device"
                onClick={() => changeTriggerType("device")}
              />
            </div>

            {form.trigger.type === "sensor" && (
              <div className="mt-5 space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <SelectField
                    label="Room"
                    value={form.trigger.room}
                    onChange={(value) =>
                      updateTrigger("room", value)
                    }
                    options={[
                      { value: "", label: "Select room" },
                      ...rooms.map((room) => ({
                        value: normalizeRoom(room),
                        label: room,
                      })),
                    ]}
                  />

                  <SelectField
                    label="Sensor"
                    value={form.trigger.sensor}
                    onChange={(value) =>
                      updateTrigger("sensor", value)
                    }
                    options={[
                      {
                        value: "temperature",
                        label: "Temperature",
                      },
                      {
                        value: "humidity",
                        label: "Humidity",
                      },
                    ]}
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <SelectField
                    label="Condition"
                    value={form.trigger.operator}
                    onChange={(value) =>
                      updateTrigger("operator", value)
                    }
                    options={[
                      { value: ">", label: "Greater than" },
                      { value: "<", label: "Less than" },
                      { value: ">=", label: "Greater or equal" },
                      { value: "<=", label: "Less or equal" },
                      { value: "==", label: "Equals" },
                    ]}
                  />

                  <div>
                    <label className="mb-2 block text-xs font-semibold text-slate-400">
                      Trigger Value
                    </label>

                    <input
                      type="number"
                      step="0.1"
                      value={form.trigger.value}
                      onChange={(event) =>
                        updateTrigger(
                          "value",
                          event.target.value
                        )
                      }
                      className="w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-white outline-none focus:border-cyan-400/50"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs text-slate-500">
                  {form.trigger.sensor === "temperature" ? (
                    <Thermometer size={14} />
                  ) : (
                    <Droplets size={14} />
                  )}
                  <span>
                    Example: {form.trigger.sensor === "temperature"
                      ? "Temperature > 26°C"
                      : "Humidity > 65%"}
                  </span>
                </div>
              </div>
            )}

            {form.trigger.type === "time" && (
              <div className="mt-5">
                <label className="mb-2 block text-xs font-semibold text-slate-400">
                  Trigger Time
                </label>

                <input
                  type="time"
                  value={form.trigger.time}
                  onChange={(event) =>
                    updateTrigger("time", event.target.value)
                  }
                  className="w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-white outline-none focus:border-cyan-400/50"
                />
              </div>
            )}

            {form.trigger.type === "device" && (
              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <SelectField
                  label="Device"
                  value={form.trigger.deviceId}
                  onChange={handleTriggerDevice}
                  options={[
                    { value: "", label: "Select device" },
                    ...devices.map((device) => ({
                      value: device.id,
                      label: `${device.name || device.id} · ${device.room || "Unknown room"}`,
                    })),
                  ]}
                />

                <SelectField
                  label="Device State"
                  value={form.trigger.deviceState}
                  onChange={(value) =>
                    updateTrigger("deviceState", value)
                  }
                  options={[
                    { value: "ON", label: "ON" },
                    { value: "OFF", label: "OFF" },
                  ]}
                />
              </div>
            )}
          </section>

          <section className="rounded-3xl border border-white/10 bg-white/[0.025] p-5">
            <div className="mb-5">
              <p className="text-xs font-bold uppercase tracking-wider text-violet-300">
                02 · THEN
              </p>
              <h3 className="mt-1 text-lg font-bold text-white">
                Choose an action
              </h3>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <label className="mb-2 block text-xs font-semibold text-slate-400">
                  Device
                </label>

                <select
                  value={form.action.deviceId}
                  onChange={(event) =>
                    handleActionDevice(event.target.value)
                  }
                  className="w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-white outline-none focus:border-violet-400/50"
                >
                  <option value="">Select device</option>

                  {devices.map((device) => (
                    <option key={device.id} value={device.id}>
                      {device.name || device.id} ·{" "}
                      {device.room || "Unknown room"}
                    </option>
                  ))}
                </select>
              </div>

              <SelectField
                label="Command"
                value={form.action.command}
                onChange={(value) =>
                  updateAction("command", value)
                }
                options={[
                  { value: "ON", label: "Turn ON" },
                  { value: "OFF", label: "Turn OFF" },
                ]}
              />

              <div>
                <label className="mb-2 block text-xs font-semibold text-slate-400">
                  Selected Room
                </label>

                <div className="rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-sm capitalize text-slate-300">
                  {form.action.room
                    ? getDisplayRoom(form.action.room)
                    : "Select a device"}
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-3xl border border-white/10 bg-white/[0.025] p-5">
            <div className="mb-4">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                03 · SCHEDULE
              </p>
              <h3 className="mt-1 text-lg font-bold text-white">
                Repeat
              </h3>
            </div>

            <select
              value={form.repeat}
              onChange={(event) =>
                updateForm("repeat", event.target.value)
              }
              className="w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-white outline-none focus:border-cyan-400/50"
            >
              <option value="always">Always</option>
              <option value="once">Once</option>
              <option value="daily">Daily</option>
              <option value="weekdays">Weekdays</option>
              <option value="weekends">Weekends</option>
            </select>
          </section>

          <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="font-semibold text-white">
                  Time window
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Optional schedule restriction for this automation.
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  updateSchedule(
                    "enabled",
                    !form.schedule.enabled
                  )
                }
                className={`relative h-7 w-12 rounded-full transition ${
                  form.schedule.enabled
                    ? "bg-cyan-500"
                    : "bg-slate-700"
                }`}
                aria-label="Toggle time window"
              >
                <span
                  className={`absolute top-1 h-5 w-5 rounded-full bg-white transition ${
                    form.schedule.enabled
                      ? "left-6"
                      : "left-1"
                  }`}
                />
              </button>
            </div>

            {form.schedule.enabled && (
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <TimeField
                  label="Start time"
                  value={form.schedule.startTime}
                  onChange={(value) =>
                    updateSchedule("startTime", value)
                  }
                />

                <TimeField
                  label="End time"
                  value={form.schedule.endTime}
                  onChange={(value) =>
                    updateSchedule("endTime", value)
                  }
                />
              </div>
            )}
          </section>

          <div className="flex flex-col-reverse gap-3 border-t border-white/10 pt-5 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-slate-300 transition hover:bg-white/10 hover:text-white"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-cyan-400 px-6 py-3 text-sm font-bold text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving
                ? "Saving..."
                : automation
                  ? "Save Changes"
                  : "Create Automation"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function TriggerButton({
  active,
  icon,
  label,
  onClick,
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-3 rounded-2xl border p-4 text-left transition ${
        active
          ? "border-cyan-400/40 bg-cyan-400/10 text-cyan-300"
          : "border-white/10 bg-slate-900 text-slate-400 hover:bg-white/5 hover:text-white"
      }`}
    >
      {icon}
      <span className="text-sm font-semibold">{label}</span>
    </button>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
}) {
  return (
    <div>
      <label className="mb-2 block text-xs font-semibold text-slate-400">
        {label}
      </label>

      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-white outline-none focus:border-cyan-400/50"
      >
        {options.map((option) => (
          <option key={`${option.value}-${option.label}`} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function TimeField({ label, value, onChange }) {
  return (
    <div>
      <label className="mb-2 block text-xs font-semibold text-slate-400">
        {label}
      </label>

      <input
        type="time"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-white outline-none focus:border-cyan-400/50"
      />
    </div>
  );
}
