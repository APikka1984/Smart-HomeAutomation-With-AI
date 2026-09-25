import {
  Bell,
  Wifi,
  WifiOff,
  Moon,
  Sun,
} from "lucide-react";
import { useState } from "react";

export default function Navbar({
  user,
  mqttConnected = false,
}) {
  const [dark, setDark] = useState(false);

  const toggleTheme = () => {
    document.documentElement.classList.toggle("dark");
    setDark(!dark);
  };

  return (
    <header className="bg-white dark:bg-slate-900 shadow-sm px-6 py-4 flex justify-between items-center rounded-xl">

      {/* LEFT */}

      <div>
        <h1 className="text-2xl font-bold">
          Smart Home Dashboard
        </h1>

        <p className="text-gray-500 text-sm">
          Welcome back,
          <span className="font-semibold ml-1">
            {user?.displayName || "User"}
          </span>
        </p>
      </div>

      {/* RIGHT */}

      <div className="flex items-center gap-5">

        {/* MQTT */}

        <div
          className={`flex items-center gap-2 px-3 py-2 rounded-full text-sm
          ${
            mqttConnected
              ? "bg-green-100 text-green-700"
              : "bg-red-100 text-red-600"
          }`}
        >
          {mqttConnected ? (
            <Wifi size={18} />
          ) : (
            <WifiOff size={18} />
          )}

          {mqttConnected
            ? "MQTT Connected"
            : "Disconnected"}
        </div>

        {/* Notification */}

        <button className="relative">

          <Bell />

          <span className="absolute -top-1 -right-1 bg-red-600 rounded-full w-2 h-2"></span>

        </button>

        {/* Theme */}

        <button
          onClick={toggleTheme}
          className="p-2 rounded-full bg-slate-100 hover:bg-slate-200"
        >
          {dark ? <Sun /> : <Moon />}
        </button>

        {/* User */}

        <div className="flex items-center gap-3">

          <img
            src={
              user?.photoURL ||
              "https://i.pravatar.cc/150?img=5"
            }
            alt=""
            className="w-10 h-10 rounded-full"
          />

          <div>

            <p className="font-semibold">
              {user?.displayName || "Smart User"}
            </p>

            <p className="text-xs text-gray-500">
              {user?.email}
            </p>

          </div>

        </div>

      </div>

    </header>
  );
}