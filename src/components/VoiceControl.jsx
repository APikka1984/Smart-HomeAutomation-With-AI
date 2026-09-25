import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";

import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  onSnapshot,
  serverTimestamp,
} from "firebase/firestore";

import {
  connectMQTT,
  subscribeToTopic,
  publishCommand,
} from "../Services/mqttService";

import { auth, db } from "../firebase";

import Sidebar from "../components/Sidebar";

import {
  Home,
  Menu,
  Search,
  Plus,
  Pencil,
  Trash2,
  Power,
  Lightbulb,
  Thermometer,
  Droplets,
  Zap,
  Mic,
  Clock,
  Crown,
  Activity,
  X,
  ChevronDown,
  ChevronUp,
  Wifi,
  WifiOff,
  Settings,
  Palette,
  Upload,
  RotateCcw,
  Bell,
  CheckCircle2,
  AlertTriangle,
  PlusCircle,
} from "lucide-react";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";


/* =========================================================
   DASHBOARD PAGE
========================================================= */

export default function DashboardPage({
  guestMode = false,
}) {
  const navigate = useNavigate();

  /* =======================================================
     USER
  ======================================================= */

  const user = auth.currentUser;


  /* =======================================================
     SIDEBAR
  ======================================================= */

  const [sidebarOpen, setSidebarOpen] =
    useState(false);


  /* =======================================================
     MQTT
  ======================================================= */

  const [mqttConnected, setMqttConnected] =
    useState(false);

  const [mqttStates, setMqttStates] =
    useState({});


  /* =======================================================
     DEVICES
  ======================================================= */

  const [devices, setDevices] = useState([]);


  /* =======================================================
     SEARCH / ROOM FILTER
  ======================================================= */

  const [search, setSearch] = useState("");

  const [roomFilter, setRoomFilter] =
    useState("All");


  /* =======================================================
     DEVICE MODAL
  ======================================================= */

  const [showModal, setShowModal] =
    useState(false);

  const [editingDevice, setEditingDevice] =
    useState(null);


  /* =======================================================
     GUEST TIMER
  ======================================================= */

  const [guestTimeLeft, setGuestTimeLeft] =
    useState(600);


  /* =======================================================
     SENSOR DATA
  ======================================================= */

  const [sensorData, setSensorData] =
    useState({
      temperature: null,
      humidity: null,
    });


  /* =======================================================
     SENSOR GRAPH
  ======================================================= */

  const [sensorHistory, setSensorHistory] =
    useState([]);

  /*
    Used to combine temperature and humidity
    readings that arrive separately through MQTT.
  */

  const sensorSampleRef = useRef({
    temperature: null,
    humidity: null,
    temperatureTime: 0,
    humidityTime: 0,
  });


  /* =======================================================
     SENSOR PANEL
     
     IMPORTANT:
     The graph is hidden by default.
  ======================================================= */

  const [showSensors, setShowSensors] =
    useState(false);


  /* =======================================================
     APPEARANCE / PREMIUM CUSTOMIZATION
  ======================================================= */

  const [showAppearance, setShowAppearance] =
    useState(false);

  const [wallpaper, setWallpaper] =
    useState(() => {
      try {
        return localStorage.getItem("smart_home_wallpaper") || "";
      } catch {
        return "";
      }
    });

  const [wallpaperOpacity, setWallpaperOpacity] =
    useState(() => {
      try {
        return Number(localStorage.getItem("smart_home_wallpaper_opacity") || 35);
      } catch {
        return 35;
      }
    });


  /* =======================================================
     AUTOMATION RULES
  ======================================================= */

  const [automationRules, setAutomationRules] =
    useState(() => {
      try {
        return JSON.parse(localStorage.getItem("smart_home_automation_rules") || "[]");
      } catch {
        return [];
      }
    });

  const [showAutomation, setShowAutomation] =
    useState(false);


  /* =======================================================
     NOTIFICATIONS
  ======================================================= */

  const [notifications, setNotifications] =
    useState([]);

  const addNotification = (message, type = "info") => {
    const item = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      message,
      type,
      time: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };

    setNotifications((previous) => [item, ...previous].slice(0, 8));
  };


  /* =======================================================
     SAVE APPEARANCE
  ======================================================= */

  useEffect(() => {
    try {
      if (wallpaper) {
        localStorage.setItem("smart_home_wallpaper", wallpaper);
      } else {
        localStorage.removeItem("smart_home_wallpaper");
      }

      localStorage.setItem("smart_home_wallpaper_opacity", String(wallpaperOpacity));
    } catch (error) {
      console.error("Unable to save appearance settings:", error);
    }
  }, [wallpaper, wallpaperOpacity]);


  /* =======================================================
     SAVE AUTOMATION RULES
  ======================================================= */

  useEffect(() => {
    try {
      localStorage.setItem("smart_home_automation_rules", JSON.stringify(automationRules));
    } catch (error) {
      console.error("Unable to save automation rules:", error);
    }
  }, [automationRules]);


  /* =======================================================
     AUTOMATION EXECUTION
  ======================================================= */

  const automationCooldownRef = useRef({});

  useEffect(() => {
    if (!automationRules.length) return;

    automationRules.forEach((rule) => {
      if (!rule.enabled) return;

      const value = Number(sensorData[rule.sensor]);
      const threshold = Number(rule.threshold);

      if (Number.isNaN(value) || Number.isNaN(threshold)) return;

      const conditionMet =
        rule.operator === ">" ? value > threshold :
        rule.operator === "<" ? value < threshold :
        rule.operator === ">=" ? value >= threshold :
        rule.operator === "<=" ? value <= threshold :
        value === threshold;

      if (!conditionMet) return;

      const lastRun = automationCooldownRef.current[rule.id] || 0;
      if (Date.now() - lastRun < 30000) return;

      const target = devices.find((item) => item.id === rule.deviceId);
      if (!target) return;

      const command = String(rule.action).toUpperCase();
      const topic = getDeviceControlTopic(target);

      if (!topic) return;

      if (guestMode) {
        setDevices((previous) =>
          previous.map((item) =>
            item.id === target.id
              ? { ...item, status: command === "ON" }
              : item
          )
        );
        automationCooldownRef.current[rule.id] = Date.now();
        addNotification(`Automation: ${target.name} → ${command}`, "success");
        return;
      }

      if (!mqttConnected || !user) return;

      const published = publishCommand(topic, command);
      if (!published) return;

      automationCooldownRef.current[rule.id] = Date.now();

      updateDoc(
        doc(db, "users", user.uid, "devices", target.id),
        { status: command === "ON" }
      ).catch((error) => {
        console.error("Automation Firestore update failed:", error);
      });

      addNotification(`Automation: ${target.name} → ${command}`, "success");
    });
  }, [sensorData, automationRules, devices, mqttConnected, guestMode, user]);


  /* =======================================================
     GUEST TIMER
  ======================================================= */

  useEffect(() => {
    if (!guestMode) {
      return;
    }

    const key = "smart_home_guest_start";

    let startTime =
      sessionStorage.getItem(key);

    if (!startTime) {
      startTime = Date.now().toString();

      sessionStorage.setItem(
        key,
        startTime
      );
    }

    const interval = setInterval(() => {
      const elapsed = Math.floor(
        (Date.now() -
          Number(startTime)) /
          1000
      );

      const remaining = Math.max(
        600 - elapsed,
        0
      );

      setGuestTimeLeft(remaining);

      if (remaining <= 0) {
        clearInterval(interval);

        sessionStorage.removeItem(key);

        navigate("/");
      }
    }, 1000);

    return () => {
      clearInterval(interval);
    };
  }, [guestMode, navigate]);


  /* =======================================================
     FIRESTORE DEVICES
  ======================================================= */

  useEffect(() => {
    if (guestMode) {
      setDevices([
        {
          id: "guest-light",
          name: "Living Room Light",
          type: "light",
          room: "Living Room",
          status: true,
          icon: "💡",
        },

        {
          id: "guest-fan",
          name: "Bedroom Fan",
          type: "fan",
          room: "Bedroom",
          status: false,
          icon: "🌀",
        },

        {
          id: "guest-tv",
          name: "Living Room TV",
          type: "tv",
          room: "Living Room",
          status: false,
          icon: "📺",
        },
      ]);

      return;
    }

    if (!user) {
      return;
    }

    const devicesRef = collection(
      db,
      "users",
      user.uid,
      "devices"
    );

    const unsubscribe = onSnapshot(
      devicesRef,
      (snapshot) => {
        const deviceList =
          snapshot.docs.map((item) => ({
            id: item.id,
            ...item.data(),
          }));

        setDevices(deviceList);
      },
      (error) => {
        console.error(
          "Firestore device listener error:",
          error
        );
      }
    );

    return () => unsubscribe();
  }, [user, guestMode]);


  /* =======================================================
     MQTT CONNECTION
  ======================================================= */

  useEffect(() => {
    if (guestMode) {
      setMqttConnected(false);
      return;
    }

    connectMQTT({
      onStatus: (connected) => {
        console.log(
          "MQTT connection status:",
          connected
        );

        setMqttConnected(connected);
        if (connected) {
          addNotification("MQTT connection established.", "success");
        }
      },

      onMessage: (
        topic,
        payload
      ) => {
        console.log(
          "Dashboard MQTT message:",
          topic,
          payload
        );


        /* ================================================
           TEMPERATURE
        ================================================ */

        if (
          topic.endsWith(
            "/sensor/temperature"
          )
        ) {
          const value = Number(payload);

          if (!Number.isNaN(value)) {
            const now = Date.now();

            setSensorData(
              (previous) => ({
                ...previous,
                temperature: value,
              })
            );

            sensorSampleRef.current =
              {
                ...sensorSampleRef.current,
                temperature: value,
                temperatureTime: now,
              };

            addSensorReadingIfComplete();
          }

          return;
        }


        /* ================================================
           HUMIDITY
        ================================================ */

        if (
          topic.endsWith(
            "/sensor/humidity"
          )
        ) {
          const value = Number(payload);

          if (!Number.isNaN(value)) {
            const now = Date.now();

            setSensorData(
              (previous) => ({
                ...previous,
                humidity: value,
              })
            );

            sensorSampleRef.current =
              {
                ...sensorSampleRef.current,
                humidity: value,
                humidityTime: now,
              };

            addSensorReadingIfComplete();
          }

          return;
        }


        /* ================================================
           DEVICE STATUS
        ================================================ */

        const parts =
          topic.split("/");

        /*
          Expected:

          home/{room}/{deviceId}/status
        */

        if (parts.length !== 4) {
          return;
        }

        if (parts[0] !== "home") {
          return;
        }

        if (parts[3] !== "status") {
          return;
        }

        const deviceId = parts[2];

        const normalizedPayload =
          payload
            .trim()
            .toUpperCase();

        const isOn =
          normalizedPayload === "ON" ||
          normalizedPayload === "1" ||
          normalizedPayload === "TRUE";

        const isOff =
          normalizedPayload === "OFF" ||
          normalizedPayload === "0" ||
          normalizedPayload === "FALSE";

        if (!isOn && !isOff) {
          return;
        }

        const nextStatus = isOn;


        setMqttStates(
          (previous) => ({
            ...previous,
            [deviceId]:
              normalizedPayload,
          })
        );


        setDevices(
          (previous) =>
            previous.map((item) =>
              item.id === deviceId
                ? {
                    ...item,
                    status: nextStatus,
                  }
                : item
            )
        );


                if (user) {
          const deviceRef = doc(
            db,
            "users",
            user.uid,
            "devices",
            deviceId
          );

          updateDoc(deviceRef, {
            status: nextStatus,
          })
            .then(() => {
              console.log(
                "✅ MQTT device status saved:",
                deviceId,
                nextStatus
              );
            })
            .catch((error) => {
              console.error(
                "❌ Failed to save MQTT device status:",
                error
              );
            });
        }
      },
    });
    /*
      We intentionally do NOT call
      disconnectMQTT() here.

      This prevents React development
      StrictMode from immediately closing
      the WebSocket connection.
    */

    return () => {
      setMqttConnected(false);
    };
  }, [guestMode, user]);


  /* =======================================================
     ADD SENSOR READING
  ======================================================= */

  const addSensorReadingIfComplete = () => {
    const sample =
      sensorSampleRef.current;

    if (
      sample.temperature === null ||
      sample.humidity === null
    ) {
      return;
    }

    /*
      Temperature and humidity arrive as
      separate MQTT messages.

      Only create a chart point when both
      readings belong to roughly the same
      sensor cycle.
    */

    const difference =
      Math.abs(
        sample.temperatureTime -
          sample.humidityTime
      );

    if (difference > 3000) {
      return;
    }

    const reading = {
      time: new Date().toLocaleTimeString(
        [],
        {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        }
      ),

      temperature:
        sample.temperature,

      humidity:
        sample.humidity,
    };

    setSensorHistory(
      (previous) => {
        const last =
          previous[
            previous.length - 1
          ];

        if (
          last &&
          last.temperature ===
            reading.temperature &&
          last.humidity ===
            reading.humidity
        ) {
          return previous;
        }

        return [
          ...previous,
          reading,
        ].slice(-20);
      }
    );
  };


  /* =======================================================
     MQTT SUBSCRIPTIONS
  ======================================================= */

  useEffect(() => {
    if (
      guestMode ||
      !mqttConnected
    ) {
      return;
    }


    /* DEVICE STATUS TOPICS */

    devices.forEach((device) => {
      const statusTopic =
        getDeviceStatusTopic(
          device
        );

      if (statusTopic) {
        subscribeToTopic(
          statusTopic
        );
      }
    });


    /* TEMPERATURE */

    subscribeToTopic(
      "home/living-room/sensor/temperature"
    );


    /* HUMIDITY */

    subscribeToTopic(
      "home/living-room/sensor/humidity"
    );
  }, [
    devices,
    mqttConnected,
    guestMode,
  ]);


  /* =======================================================
     ADD DEVICE
  ======================================================= */

  const handleAddDevice = async (
    deviceData
  ) => {
    if (guestMode) {
      alert(
        "Guest mode is limited. Please login to add your own devices."
      );

      return;
    }

    if (!user) {
      return;
    }

    try {
      const devicesRef =
        collection(
          db,
          "users",
          user.uid,
          "devices"
        );

      await addDoc(
        devicesRef,
        {
          name: deviceData.name,

          type: deviceData.type,

          room: deviceData.room,

          icon: getDeviceIcon(
            deviceData.type
          ),

          status: false,

          createdAt:
            serverTimestamp(),
        }
      );

      setShowModal(false);
    } catch (error) {
      console.error(
        "Error adding device:",
        error
      );

      alert(
        "Unable to add device."
      );
    }
  };


  /* =======================================================
     EDIT DEVICE
  ======================================================= */

  const handleEditDevice =
    async (deviceData) => {
      if (guestMode) {
        alert(
          "Please login to edit devices."
        );

        return;
      }

      if (
        !user ||
        !editingDevice
      ) {
        return;
      }

      try {
        const deviceRef =
          doc(
            db,
            "users",
            user.uid,
            "devices",
            editingDevice.id
          );

        await updateDoc(
          deviceRef,
          {
            name:
              deviceData.name,

            type:
              deviceData.type,

            room:
              deviceData.room,

            icon:
              getDeviceIcon(
                deviceData.type
              ),
          }
        );

        setEditingDevice(null);

        setShowModal(false);
      } catch (error) {
        console.error(
          "Error updating device:",
          error
        );

        alert(
          "Unable to update device."
        );
      }
    };


  /* =======================================================
     DELETE DEVICE
  ======================================================= */

  const handleDeleteDevice =
    async (deviceId) => {
      if (guestMode) {
        alert(
          "Please login to delete devices."
        );

        return;
      }

      if (!user) {
        return;
      }

      const confirmDelete =
        window.confirm(
          "Are you sure you want to delete this device?"
        );

      if (!confirmDelete) {
        return;
      }

      try {
        await deleteDoc(
          doc(
            db,
            "users",
            user.uid,
            "devices",
            deviceId
          )
        );
      } catch (error) {
        console.error(
          "Error deleting device:",
          error
        );

        alert(
          "Unable to delete device."
        );
      }
    };


  /* =======================================================
     TOGGLE DEVICE
  ======================================================= */

  const handleToggleDevice =
    async (device) => {
      const nextStatus =
        !device.status;

      /*
        Guest mode only changes
        the local demo state.
      */

      if (guestMode) {
        setDevices(
          (previous) =>
            previous.map(
              (item) =>
                item.id ===
                device.id
                  ? {
                      ...item,
                      status:
                        nextStatus,
                    }
                  : item
            )
        );

        return;
      }


      if (!user) {
        return;
      }


      /*
        Publish MQTT command.
      */

      const controlTopic =
        getDeviceControlTopic(
          device
        );

      if (!controlTopic) {
        console.error(
          "Unable to generate MQTT control topic."
        );

        return;
      }


      const command =
        nextStatus
          ? "ON"
          : "OFF";


      console.log(
        "Publishing command:",
        controlTopic,
        command
      );


      const published =
        publishCommand(
          controlTopic,
          command
        );


      if (!published) {
        console.warn(
          "MQTT command was not published."
        );
      }


      /*
        Optimistically update
        Firestore.

        The MQTT status message will
        also synchronize the UI.
      */

      try {
        const deviceRef =
          doc(
            db,
            "users",
            user.uid,
            "devices",
            device.id
          );

        await updateDoc(
          deviceRef,
          {
            status:
              nextStatus,
          }
        );
      } catch (error) {
        console.error(
          "Error changing device status:",
          error
        );
      }
    };


  /* =======================================================
     LOGOUT
  ======================================================= */

  const handleLogout =
    async () => {
      try {
        await signOut(auth);

        navigate("/auth");
      } catch (error) {
        console.error(
          "Logout error:",
          error
        );
      }
    };


  /* =======================================================
     ROOMS
  ======================================================= */

  const rooms = useMemo(() => {
    const uniqueRooms =
      [
        ...new Set(
          devices
            .map(
              (device) =>
                device.room
            )
            .filter(Boolean)
        ),
      ];

    return [
      "All",
      ...uniqueRooms,
    ];
  }, [devices]);


  /* =======================================================
     FILTERED DEVICES
  ======================================================= */

  const filteredDevices =
    useMemo(() => {
      return devices.filter(
        (device) => {
          const matchesSearch =
            device.name
              ?.toLowerCase()
              .includes(
                search.toLowerCase()
              );

          const matchesRoom =
            roomFilter === "All" ||
            device.room ===
              roomFilter;

          return (
            matchesSearch &&
            matchesRoom
          );
        }
      );
    }, [
      devices,
      search,
      roomFilter,
    ]);


  /* =======================================================
     STATISTICS
  ======================================================= */

  const activeDevices =
    devices.filter(
      (device) =>
        device.status
    ).length;

  const totalDevices =
    devices.length;

  const energyUsage =
    activeDevices * 0.42;


  /* =======================================================
     GUEST TIME FORMAT
  ======================================================= */

  const formatTime =
    (seconds) => {
      const minutes =
        Math.floor(
          seconds / 60
        );

      const remainingSeconds =
        seconds % 60;

      return `${minutes}:${remainingSeconds
        .toString()
        .padStart(2, "0")}`;
    };


  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <div
      className="min-h-screen bg-slate-950 text-white"
      style={
        wallpaper
          ? {
              backgroundImage: `linear-gradient(rgba(2,6,23,${wallpaperOpacity / 100}), rgba(2,6,23,${wallpaperOpacity / 100})), url(${wallpaper})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
              backgroundAttachment: "fixed",
            }
          : undefined
      }
    >


      {/* ==================================================
          SIDEBAR
      ================================================== */}

      <Sidebar
        open={sidebarOpen}
        onClose={() =>
          setSidebarOpen(false)
        }
        onLogout={
          handleLogout
        }
        activeSection="Dashboard"
        onNavigate={() =>
          setSidebarOpen(false)
        }
        guestMode={guestMode}
      />


      {/* ==================================================
          HEADER
      ================================================== */}

      <header className="sticky top-0 z-30 border-b border-white/10 bg-slate-950/80 backdrop-blur-xl">

        <div className="flex min-h-16 items-center justify-between gap-3 px-3 py-2.5 sm:h-20 sm:px-6 sm:py-0 lg:px-8">

          <div className="flex items-center gap-3">

            <button
              type="button"
              onClick={() =>
                setSidebarOpen(
                  true
                )
              }
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-300 transition hover:border-cyan-400/30 hover:bg-cyan-400/10 hover:text-white sm:h-11 sm:w-11"
              aria-label="Open sidebar"
            >
              <Menu size={21} />
            </button>


            <div className="hidden sm:block">

              <h1 className="font-bold">
                Smart Home
              </h1>

              <p className="text-xs text-slate-500">
                AI Automation Dashboard
              </p>

            </div>

          </div>


          <div className="flex items-center gap-3">


            {/* MQTT STATUS */}

            <div
              className={`hidden items-center gap-2 rounded-xl border px-3 py-2 sm:flex ${
                mqttConnected
                  ? "border-emerald-400/20 bg-emerald-400/10"
                  : "border-red-400/20 bg-red-400/10"
              }`}
            >

              {mqttConnected ? (
                <Wifi
                  size={15}
                  className="text-emerald-400"
                />
              ) : (
                <WifiOff
                  size={15}
                  className="text-red-400"
                />
              )}

              <span
                className={`text-xs ${
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


            {/* GUEST TIMER */}

            {guestMode && (
              <div className="flex items-center gap-2 rounded-xl border border-amber-400/20 bg-amber-400/10 px-3 py-2 text-xs text-amber-300">

                <Clock size={15} />

                Guest{" "}
                {formatTime(
                  guestTimeLeft
                )}

              </div>
            )}


            {/* USER */}

            {!guestMode &&
              user && (
                <div className="hidden items-center gap-3 sm:flex">

                  <div className="text-right">

                    <p className="text-sm font-medium">
                      {user.displayName ||
                        user.email?.split(
                          "@"
                        )[0]}
                    </p>

                    <p className="text-xs text-slate-500">
                      {user.email}
                    </p>

                  </div>


                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-cyan-500 font-bold text-slate-950">

                    {(
                      user.displayName ||
                      user.email ||
                      "U"
                    )
                      .charAt(0)
                      .toUpperCase()}

                  </div>

                </div>
              )}

          </div>

        </div>

      </header>


      {/* ==================================================
          MAIN
      ================================================== */}

      <main className="mx-auto w-full max-w-7xl px-3 py-5 sm:px-6 sm:py-6 lg:px-8">


        {/* =================================================
            WELCOME
        ================================================= */}

        <section className="mb-8">

          <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">

            <div>

              <p className="mb-2 text-sm text-cyan-400">
                {guestMode
                  ? "Guest Preview"
                  : "Your Smart Home"}
              </p>

              <h2 className="text-2xl font-bold sm:text-4xl">
                Dashboard
              </h2>

              <p className="mt-2 text-sm text-slate-400">
                Monitor and control your connected devices.
              </p>

            </div>


            <div className="flex gap-3">

              {!guestMode && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingDevice(
                      null
                    );

                    setShowModal(
                      true
                    );
                  }}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-500 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400 sm:w-auto"
                >
                  <Plus size={18} />

                  Add Device
                </button>
              )}


              <button
                type="button"
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-300 transition hover:bg-white/10 sm:w-auto"
              >
                <Mic size={18} />

                Voice AI
              </button>

            </div>

          </div>

        </section>


        {/* =================================================
            STATISTICS
        ================================================= */}

        <section className="mb-8 grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 sm:gap-4 lg:grid-cols-4">

          <StatCard
            icon={
              <Home size={20} />
            }
            label="Total Devices"
            value={
              totalDevices
            }
          />


          <StatCard
            icon={
              <Power size={20} />
            }
            label="Active Devices"
            value={
              activeDevices
            }
          />


          <StatCard
            icon={
              <Zap size={20} />
            }
            label="Energy Usage"
            value={`${energyUsage.toFixed(
              1
            )} kWh`}
          />


          <StatCard
            icon={
              <Activity size={20} />
            }
            label="Home Status"
            value="Online"
            online
          />

        </section>


        {/* =================================================
            CURRENT SENSOR SUMMARY
        ================================================= */}

        <section className="mb-8 grid gap-4 sm:grid-cols-2">

          <EnvironmentCard
            icon={
              <Thermometer
                size={22}
              />
            }
            title="Temperature"
            value={
              sensorData.temperature !==
              null
                ? `${sensorData.temperature}°C`
                : "--"
            }
            description={
              mqttConnected
                ? "Live MQTT"
                : "Waiting for sensor"
            }
          />


          <EnvironmentCard
            icon={
              <Droplets
                size={22}
              />
            }
            title="Humidity"
            value={
              sensorData.humidity !==
              null
                ? `${sensorData.humidity}%`
                : "--"
            }
            description={
              mqttConnected
                ? "Live MQTT"
                : "Waiting for sensor"
            }
          />

        </section>


        {/* =================================================
            DEVICES
        ================================================= */}

        <section>

          <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">

            <div>

              <h3 className="text-xl font-bold">
                Your Devices
              </h3>

              <p className="mt-1 text-sm text-slate-500">

                {filteredDevices.length} device
                {filteredDevices.length !==
                1
                  ? "s"
                  : ""}{" "}
                available

              </p>

            </div>


            <div className="grid grid-cols-1 gap-2 min-[420px]:grid-cols-2 sm:flex sm:gap-3">


              {/* SEARCH */}

              <div className="relative">

                <Search
                  size={17}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
                />

                <input
                  value={search}
                  onChange={(event) =>
                    setSearch(
                      event.target.value
                    )
                  }
                  placeholder="Search devices..."
                  className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 pl-10 pr-4 text-sm text-white outline-none placeholder:text-slate-600 focus:border-cyan-400/50 sm:w-56"
                />

              </div>


              {/* ROOM FILTER */}

              <select
                value={roomFilter}
                onChange={(event) =>
                  setRoomFilter(
                    event.target.value
                  )
                }
                className="w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-2.5 text-sm text-slate-300 outline-none focus:border-cyan-400/50 sm:w-auto"
              >

                {rooms.map(
                  (room) => (
                    <option
                      key={room}
                      value={room}
                    >
                      {room}
                    </option>
                  )
                )}

              </select>

            </div>

          </div>


          {/* DEVICE CARDS */}

          {filteredDevices.length ===
          0 ? (
            <EmptyDevices
              onAdd={() => {
                setEditingDevice(
                  null
                );

                setShowModal(
                  true
                );
              }}
              guestMode={
                guestMode
              }
            />
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-3 2xl:grid-cols-4">

              {filteredDevices.map(
                (device) => (
                  <DeviceCard
                    key={device.id}
                    device={device}
                    guestMode={
                      guestMode
                    }
                    onToggle={() =>
                      handleToggleDevice(
                        device
                      )
                    }
                    onEdit={() => {
                      setEditingDevice(
                        device
                      );

                      setShowModal(
                        true
                      );
                    }}
                    onDelete={() =>
                      handleDeleteDevice(
                        device.id
                      )
                    }
                  />
                )
              )}

            </div>
          )}

        </section>


        {/* =================================================
            LIVE SENSOR BUTTON
            This is BELOW DEVICES.
        ================================================= */}

        <section className="mt-6">

          <button
            type="button"
            onClick={() =>
              setShowSensors(
                (previous) =>
                  !previous
              )
            }
            className="flex w-full items-center justify-between rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-left transition hover:border-cyan-400/30 hover:bg-white/[0.05]"
          >

            <div className="flex items-center gap-4">

              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-cyan-400/10 text-cyan-400">

                <Activity
                  size={22}
                />

              </div>


              <div>

                <div className="flex items-center gap-2">

                  <h3 className="font-semibold text-white">
                    Live Sensors
                  </h3>

                  {mqttConnected && (
                    <span className="rounded-full bg-emerald-400/10 px-2 py-1 text-[10px] font-medium text-emerald-300">
                      LIVE
                    </span>
                  )}

                </div>

                <p className="mt-1 text-sm text-slate-500">
                  Temperature, humidity and environment data
                </p>

              </div>

            </div>


            <div className="flex items-center gap-2 text-sm text-cyan-400">

              <span className="hidden sm:block">
                {showSensors
                  ? "Hide Sensors"
                  : "View Sensors"}
              </span>

              {showSensors ? (
                <ChevronUp
                  size={20}
                />
              ) : (
                <ChevronDown
                  size={20}
                />
              )}

            </div>

          </button>


          {/* =================================================
              SENSOR PANEL
          ================================================= */}

          {showSensors && (
            <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] p-3 sm:p-5">


              {/* SENSOR HEADER */}

              <div className="mb-6 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">

                <div>

                  <h3 className="text-lg font-semibold text-white">
                    Live Environment
                  </h3>

                  <p className="mt-1 text-sm text-slate-500">
                    Real-time sensor data received through MQTT.
                  </p>

                </div>


                <div className="flex items-center gap-2 text-xs">

                  {mqttConnected ? (
                    <>
                      <span className="h-2 w-2 rounded-full bg-emerald-400" />

                      <span className="text-emerald-300">
                        MQTT Live
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="h-2 w-2 rounded-full bg-red-400" />

                      <span className="text-red-300">
                        MQTT Offline
                      </span>
                    </>
                  )}

                </div>

              </div>


              {/* SENSOR VALUES */}

              <div className="grid gap-4 sm:grid-cols-2">


                <EnvironmentCard
                  icon={
                    <Thermometer
                      size={22}
                    />
                  }
                  title="Temperature"
                  value={
                    sensorData.temperature !==
                    null
                      ? `${sensorData.temperature}°C`
                      : "--"
                  }
                  description="Living Room Sensor"
                />


                <EnvironmentCard
                  icon={
                    <Droplets
                      size={22}
                    />
                  }
                  title="Humidity"
                  value={
                    sensorData.humidity !==
                    null
                      ? `${sensorData.humidity}%`
                      : "--"
                  }
                  description="Living Room Sensor"
                />

              </div>


              {/* =================================================
                  GRAPH
              ================================================= */}

              <div className="mt-6 rounded-2xl border border-white/10 bg-slate-950/40 p-3 sm:p-4">

                <div className="mb-5">

                  <h4 className="font-semibold text-white">
                    Sensor History
                  </h4>

                  <p className="mt-1 text-xs text-slate-500">
                    Latest 20 MQTT sensor readings
                  </p>

                </div>


                {sensorHistory.length ===
                0 ? (
                  <div className="flex h-72 items-center justify-center">

                    <div className="text-center">

                      <Activity
                        size={30}
                        className="mx-auto mb-3 text-slate-600"
                      />

                      <p className="text-sm text-slate-400">
                        Waiting for sensor data...
                      </p>

                      <p className="mt-1 text-xs text-slate-600">
                        MQTT readings will appear here automatically.
                      </p>

                    </div>

                  </div>
                ) : (
                  <div className="h-72 w-full">

                    <ResponsiveContainer
                      width="100%"
                      height="100%"
                    >

                      <LineChart
                        data={
                          sensorHistory
                        }
                        margin={{
                          top: 10,
                          right: 20,
                          left: 0,
                          bottom: 5,
                        }}
                      >

                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke="rgba(255,255,255,0.08)"
                        />


                        <XAxis
                          dataKey="time"
                          tick={{
                            fill: "#64748b",
                            fontSize: 11,
                          }}
                          tickLine={
                            false
                          }
                          axisLine={
                            false
                          }
                        />


                        <YAxis
                          yAxisId="temperature"
                          tick={{
                            fill: "#64748b",
                            fontSize: 11,
                          }}
                          tickLine={
                            false
                          }
                          axisLine={
                            false
                          }
                          domain={[
                            "auto",
                            "auto",
                          ]}
                        />


                        <YAxis
                          yAxisId="humidity"
                          orientation="right"
                          tick={{
                            fill: "#64748b",
                            fontSize: 11,
                          }}
                          tickLine={
                            false
                          }
                          axisLine={
                            false
                          }
                          domain={[
                            "auto",
                            "auto",
                          ]}
                        />


                        <Tooltip
                          contentStyle={{
                            backgroundColor:
                              "#0f172a",

                            border:
                              "1px solid rgba(255,255,255,0.1)",

                            borderRadius:
                              "12px",

                            color: "#fff",
                          }}
                        />


                        <Legend />


                        <Line
                          yAxisId="temperature"
                          type="monotone"
                          dataKey="temperature"
                          name="Temperature °C"
                          stroke="#22d3ee"
                          strokeWidth={2}
                          dot={false}
                          activeDot={{
                            r: 5,
                          }}
                        />


                        <Line
                          yAxisId="humidity"
                          type="monotone"
                          dataKey="humidity"
                          name="Humidity %"
                          stroke="#a78bfa"
                          strokeWidth={2}
                          dot={false}
                          activeDot={{
                            r: 5,
                          }}
                        />

                      </LineChart>

                    </ResponsiveContainer>

                  </div>
                )}

              </div>

            </div>
          )}

        </section>


        {/* =================================================
            PERSONALIZATION + AUTOMATION
        ================================================= */}

        <section className="mt-8 grid gap-5 lg:grid-cols-2">
          <div
            role="button"
            tabIndex={0}
            onClick={() => setShowAppearance(true)}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                setShowAppearance(true);
              }
            }}
            className="group cursor-pointer rounded-2xl border border-purple-400/20 bg-gradient-to-br from-purple-500/10 to-cyan-500/10 p-5 transition-all duration-300 hover:border-purple-400/40 hover:bg-purple-500/[0.15] hover:shadow-xl hover:shadow-purple-950/20 focus:outline-none focus:ring-2 focus:ring-purple-400/30"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-purple-400/10 text-purple-400 transition-transform duration-300 group-hover:scale-110">
                  <Crown size={22} />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold text-white">Premium Personalization</h3>
                    <span className="rounded-full border border-purple-400/20 bg-purple-400/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-purple-300">
                      Premium
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-slate-500">Customize your dashboard wallpaper and appearance.</p>
                </div>
              </div>

              <Palette
                size={18}
                className="shrink-0 text-purple-400 opacity-60 transition-all group-hover:rotate-12 group-hover:opacity-100"
              />
            </div>

            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  setShowAppearance(true);
                }}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-purple-400/30 bg-purple-400/10 px-4 py-3 text-sm font-semibold text-purple-200 transition hover:bg-purple-400/20"
              >
                <Palette size={17} />
                Customize Wallpaper
              </button>

              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  setWallpaper("");
                  setWallpaperOpacity(35);
                }}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 px-4 py-3 text-sm text-slate-400 transition hover:bg-white/5 hover:text-white"
              >
                <RotateCcw size={16} />
                Reset
              </button>
            </div>

            <p className="mt-4 text-xs text-slate-600">
              Click anywhere on this card to customize your dashboard.
            </p>
          </div>

          <div className="rounded-2xl border border-emerald-400/20 bg-gradient-to-br from-emerald-500/10 to-slate-900 p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-400/10 text-emerald-400">
                  <Zap size={22} />
                </div>
                <div>
                  <h3 className="font-semibold text-white">Smart Automations</h3>
                  <p className="mt-1 text-sm text-slate-500">Automatically react to live temperature and humidity.</p>
                </div>
              </div>
              <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-300">{automationRules.length} Rules</span>
            </div>

            <button
              type="button"
              onClick={() => setShowAutomation(true)}
              className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-3 text-sm font-bold text-slate-950 transition hover:bg-emerald-400"
            >
              <Settings size={17} />
              Manage Automations
            </button>
          </div>
        </section>

        {/* =================================================
            NOTIFICATIONS
        ================================================= */}

        {notifications.length > 0 && (
          <section className="mt-5 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Bell size={17} className="text-cyan-400" />
                <h3 className="font-semibold text-white">Recent Activity</h3>
              </div>
              <button
                type="button"
                onClick={() => setNotifications([])}
                className="text-xs text-slate-500 transition hover:text-white"
              >
                Clear
              </button>
            </div>

            <div className="space-y-2">
              {notifications.map((item) => (
                <div key={item.id} className="flex items-center gap-3 rounded-xl border border-white/5 bg-slate-950/40 px-3 py-3">
                  {item.type === "success" ? (
                    <CheckCircle2 size={17} className="shrink-0 text-emerald-400" />
                  ) : (
                    <AlertTriangle size={17} className="shrink-0 text-amber-400" />
                  )}
                  <p className="min-w-0 flex-1 text-sm text-slate-300">{item.message}</p>
                  <span className="shrink-0 text-[10px] text-slate-600">{item.time}</span>
                </div>
              ))}
            </div>
          </section>
        )}


      </main>


      {showAppearance && (
        <AppearanceModal
          wallpaper={wallpaper}
          opacity={wallpaperOpacity}
          onWallpaperChange={setWallpaper}
          onOpacityChange={setWallpaperOpacity}
          onClose={() => setShowAppearance(false)}
        />
      )}

      {showAutomation && (
        <AutomationModal
          devices={devices}
          rules={automationRules}
          onRulesChange={setAutomationRules}
          onClose={() => setShowAutomation(false)}
        />
      )}

      {/* ==================================================
          DEVICE MODAL
      ================================================== */}

      {showModal && (
        <DeviceModal
          device={
            editingDevice
          }
          onClose={() => {
            setShowModal(false);

            setEditingDevice(
              null
            );
          }}
          onSave={
            editingDevice
              ? handleEditDevice
              : handleAddDevice
          }
        />
      )}

    </div>
  );
}


/* =========================================================
   APPEARANCE MODAL
========================================================= */

function AppearanceModal({
  wallpaper,
  opacity,
  onWallpaperChange,
  onOpacityChange,
  onClose,
}) {
  const handleWallpaper = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Please select an image file.");
      return;
    }

    if (file.size > 4 * 1024 * 1024) {
      alert("Please choose an image smaller than 4 MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => onWallpaperChange(reader.result);
    reader.readAsDataURL(file);
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/80 p-0 backdrop-blur-md sm:items-center sm:p-4">
      <div className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-3xl border border-white/10 bg-slate-950 shadow-2xl sm:rounded-3xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-white/10 bg-slate-950/95 px-5 py-4 backdrop-blur-xl">
          <div>
            <div className="flex items-center gap-2">
              <Palette size={18} className="text-purple-400" />
              <h2 className="font-semibold text-white">Dashboard Appearance</h2>
            </div>
            <p className="mt-1 text-xs text-slate-500">Personalize your smart-home workspace.</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-xl p-2 text-slate-500 hover:bg-white/10 hover:text-white">
            <X size={19} />
          </button>
        </div>

        <div className="space-y-5 p-5">
          <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03]">
            <div
              className="h-40 bg-slate-900"
              style={wallpaper ? {
                backgroundImage: `linear-gradient(rgba(2,6,23,${opacity / 100}), rgba(2,6,23,${opacity / 100})), url(${wallpaper})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
              } : undefined}
            >
              <div className="flex h-full items-center justify-center bg-gradient-to-br from-cyan-400/10 to-purple-400/10">
                <span className="rounded-xl border border-white/10 bg-slate-950/60 px-4 py-2 text-sm text-slate-300 backdrop-blur">
                  Dashboard Preview
                </span>
              </div>
            </div>
          </div>

          <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-purple-400/30 bg-purple-400/10 px-4 py-3 text-sm font-semibold text-purple-200 hover:bg-purple-400/20">
            <Upload size={17} />
            Choose Wallpaper
            <input type="file" accept="image/*" onChange={handleWallpaper} className="hidden" />
          </label>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="text-sm font-medium text-slate-300">Wallpaper Overlay</label>
              <span className="text-xs text-slate-500">{opacity}%</span>
            </div>
            <input
              type="range"
              min="10"
              max="75"
              value={opacity}
              onChange={(event) => onOpacityChange(Number(event.target.value))}
              className="w-full accent-cyan-400"
            />
          </div>

          <div className="rounded-xl border border-amber-400/10 bg-amber-400/5 p-3 text-xs leading-5 text-slate-500">
            Wallpaper is stored locally in this browser. A future production version can move images to Firebase Storage for account-wide syncing.
          </div>

          <div className="flex gap-3">
            <button type="button" onClick={() => { onWallpaperChange(""); onOpacityChange(35); }} className="flex-1 rounded-xl border border-white/10 px-4 py-3 text-sm text-slate-300 hover:bg-white/5">
              Reset
            </button>
            <button type="button" onClick={onClose} className="flex-1 rounded-xl bg-cyan-500 px-4 py-3 text-sm font-bold text-slate-950 hover:bg-cyan-400">
              Save Appearance
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}


/* =========================================================
   AUTOMATION MODAL
========================================================= */

function AutomationModal({ devices, rules, onRulesChange, onClose }) {
  const [sensor, setSensor] = useState("temperature");
  const [operator, setOperator] = useState(">");
  const [threshold, setThreshold] = useState("30");
  const [action, setAction] = useState("ON");
  const [deviceId, setDeviceId] = useState(devices[0]?.id || "");

  const addRule = () => {
    if (!deviceId || threshold === "") {
      alert("Select a device and enter a threshold.");
      return;
    }

    const target = devices.find((item) => item.id === deviceId);

    const rule = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      sensor,
      operator,
      threshold: Number(threshold),
      action,
      deviceId,
      deviceName: target?.name || "Device",
      enabled: true,
    };

    onRulesChange((previous) => [...previous, rule]);
  };

  const removeRule = (id) => {
    onRulesChange((previous) => previous.filter((rule) => rule.id !== id));
  };

  const toggleRule = (id) => {
    onRulesChange((previous) => previous.map((rule) => rule.id === id ? { ...rule, enabled: !rule.enabled } : rule));
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/80 p-0 backdrop-blur-md sm:items-center sm:p-4">
      <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-t-3xl border border-white/10 bg-slate-950 shadow-2xl sm:rounded-3xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-white/10 bg-slate-950/95 px-5 py-4 backdrop-blur-xl">
          <div>
            <div className="flex items-center gap-2">
              <Settings size={18} className="text-emerald-400" />
              <h2 className="font-semibold text-white">Automation Rules</h2>
            </div>
            <p className="mt-1 text-xs text-slate-500">React to live MQTT sensor readings automatically.</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-xl p-2 text-slate-500 hover:bg-white/10 hover:text-white">
            <X size={19} />
          </button>
        </div>

        <div className="space-y-5 p-5">
          <div className="rounded-2xl border border-emerald-400/10 bg-emerald-400/[0.04] p-4">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Create Rule</p>

            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Sensor">
                <select value={sensor} onChange={(event) => setSensor(event.target.value)} className="h-11 w-full rounded-xl border border-white/10 bg-slate-900 px-3 text-sm text-white outline-none focus:border-cyan-400/40">
                  <option value="temperature">Temperature (°C)</option>
                  <option value="humidity">Humidity (%)</option>
                </select>
              </Field>

              <Field label="Condition">
                <div className="flex gap-2">
                  <select value={operator} onChange={(event) => setOperator(event.target.value)} className="h-11 w-full rounded-xl border border-white/10 bg-slate-900 px-3 text-sm text-white outline-none focus:border-cyan-400/40 w-24">
                    <option value=">">&gt;</option>
                    <option value="<">&lt;</option>
                    <option value=">=">≥</option>
                    <option value="<=">≤</option>
                    <option value="=">=</option>
                  </select>
                  <input type="number" value={threshold} onChange={(event) => setThreshold(event.target.value)} className="h-11 w-full rounded-xl border border-white/10 bg-slate-900 px-3 text-sm text-white outline-none focus:border-cyan-400/40 flex-1" placeholder="30" />
                </div>
              </Field>

              <Field label="Device">
                <select value={deviceId} onChange={(event) => setDeviceId(event.target.value)} className="h-11 w-full rounded-xl border border-white/10 bg-slate-900 px-3 text-sm text-white outline-none focus:border-cyan-400/40">
                  {devices.length === 0 ? <option value="">No devices</option> : devices.map((device) => <option key={device.id} value={device.id}>{device.name}</option>)}
                </select>
              </Field>

              <Field label="Action">
                <select value={action} onChange={(event) => setAction(event.target.value)} className="h-11 w-full rounded-xl border border-white/10 bg-slate-900 px-3 text-sm text-white outline-none focus:border-cyan-400/40">
                  <option value="ON">Turn ON</option>
                  <option value="OFF">Turn OFF</option>
                </select>
              </Field>
            </div>

            <button type="button" onClick={addRule} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-3 text-sm font-bold text-slate-950 hover:bg-emerald-400">
              <PlusCircle size={17} />
              Add Automation Rule
            </button>
          </div>

          <div>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white">Your Rules</h3>
              <span className="text-xs text-slate-600">{rules.length} total</span>
            </div>

            {rules.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-white/10 p-8 text-center text-sm text-slate-600">
                No automation rules yet.
              </div>
            ) : (
              <div className="space-y-2">
                {rules.map((rule) => (
                  <div key={rule.id} className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:flex-row sm:items-center">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-slate-200">
                        If <span className="font-semibold text-cyan-300">{rule.sensor}</span> {rule.operator} <span className="font-semibold text-white">{rule.threshold}</span>, turn <span className="font-semibold text-emerald-300">{rule.deviceName}</span> {rule.action}
                      </p>
                      <p className="mt-1 text-[11px] text-slate-600">Sensor rules are evaluated from live MQTT readings.</p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button type="button" onClick={() => toggleRule(rule.id)} className={`rounded-lg px-3 py-2 text-xs font-semibold ${rule.enabled ? "bg-emerald-400/10 text-emerald-300" : "bg-slate-800 text-slate-500"}`}>
                        {rule.enabled ? "Enabled" : "Disabled"}
                      </button>
                      <button type="button" onClick={() => removeRule(rule.id)} className="rounded-lg p-2 text-slate-500 hover:bg-red-500/10 hover:text-red-400" aria-label="Delete automation">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-xl border border-amber-400/10 bg-amber-400/5 p-3 text-xs leading-5 text-slate-500">
            Automation runs in the dashboard browser. Keep the dashboard open for the rules to execute. A future backend version can run automations continuously in the cloud.
          </div>

          <button type="button" onClick={onClose} className="w-full rounded-xl border border-white/10 px-4 py-3 text-sm font-medium text-slate-300 hover:bg-white/5">
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-medium text-slate-400">{label}</span>
      {children}
    </label>
  );
}

/* =========================================================
   DEVICE CARD
========================================================= */

function DeviceCard({
  device,
  onToggle,
  onEdit,
  onDelete,
  guestMode,
}) {
  return (
    <div
      className={`group relative overflow-hidden rounded-2xl border p-4 shadow-sm transition duration-200 sm:p-5 ${
        device.status
          ? "border-cyan-400/20 bg-cyan-400/[0.04] shadow-cyan-500/5 hover:border-cyan-400/40"
          : "border-white/10 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.045]"
      }`}
    >
      <div
        className={`pointer-events-none absolute -right-12 -top-12 h-28 w-28 rounded-full blur-3xl ${
          device.status ? "bg-cyan-400/10" : "bg-white/[0.02]"
        }`}
      />

      <div className="flex items-start justify-between">


        <div className="flex items-center gap-3">

          <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-xl transition sm:h-12 sm:w-12 sm:text-2xl ${device.status ? "bg-cyan-400/10" : "bg-white/5"}`}>

            {device.icon ||
              getDeviceIcon(
                device.type
              )}

          </div>


          <div>

            <h4 className="font-semibold">
              {device.name}
            </h4>

            <p className="text-xs text-slate-500">
              {device.room}
            </p>

          </div>

        </div>


        <span
          className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold tracking-wide sm:text-xs ${
            device.status
              ? "bg-cyan-400/10 text-cyan-400"
              : "bg-slate-800 text-slate-500"
          }`}
        >
          {device.status
            ? "ON"
            : "OFF"}
        </span>

      </div>


      <div className="mt-5 flex items-center justify-between">


        <button
          type="button"
          onClick={onToggle}
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition duration-200 active:scale-95 ${
            device.status
              ? "bg-cyan-500 text-slate-950 hover:bg-cyan-400"
              : "bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white"
          }`}
          aria-label={`Turn ${
            device.status
              ? "off"
              : "on"
          } ${device.name}`}
        >
          <Power size={19} />
        </button>


        <div className="flex gap-2">

          {!guestMode && (
            <>
              <button
                type="button"
                onClick={onEdit}
                className="rounded-lg p-2 text-slate-500 transition hover:bg-white/10 hover:text-white"
                aria-label="Edit device"
              >
                <Pencil
                  size={17}
                />
              </button>


              <button
                type="button"
                onClick={onDelete}
                className="rounded-lg p-2 text-slate-500 transition hover:bg-red-500/10 hover:text-red-400"
                aria-label="Delete device"
              >
                <Trash2
                  size={17}
                />
              </button>
            </>
          )}

        </div>

      </div>

    </div>
  );
}


/* =========================================================
   DEVICE MODAL
========================================================= */

function DeviceModal({ device, onClose, onSave }) {
  const [name, setName] = useState(device?.name || "");
  const [type, setType] = useState(device?.type || "light");
  const [room, setRoom] = useState(device?.room || "Living Room");
  const [saving, setSaving] = useState(false);

  const deviceTypes = [
    { value: "light", icon: "💡", label: "Light", description: "Bulbs & lighting" },
    { value: "fan", icon: "🌀", label: "Fan", description: "Ceiling & room fans" },
    { value: "tv", icon: "📺", label: "TV", description: "Television" },
    { value: "ac", icon: "❄️", label: "AC", description: "Air conditioner" },
    { value: "appliance", icon: "⚡", label: "Appliance", description: "Other smart appliance" },
  ];

  const rooms = [
    "Living Room", "Bedroom", "Kitchen", "Bathroom",
    "Dining Room", "Office", "Garage", "Other",
  ];

  const selectedType =
    deviceTypes.find((item) => item.value === type) || deviceTypes[0];

  const handleSubmit = async (event) => {
    event.preventDefault();

    const trimmedName = name.trim();

    if (!trimmedName) {
      alert("Please enter a device name.");
      return;
    }

    if (trimmedName.length < 2) {
      alert("Device name must contain at least 2 characters.");
      return;
    }

    setSaving(true);

    try {
      await Promise.resolve(
        onSave({ name: trimmedName, type, room })
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/75 px-0 backdrop-blur-md sm:items-center sm:px-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="device-modal-title"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !saving) onClose();
      }}
    >
      <div className="max-h-[92vh] w-full overflow-y-auto rounded-t-3xl border border-white/10 bg-slate-950 shadow-2xl shadow-black/50 sm:max-w-lg sm:rounded-3xl">
        <div className="sticky top-0 z-10 border-b border-white/10 bg-slate-950/95 px-5 py-5 backdrop-blur-xl sm:px-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-cyan-400/20 bg-cyan-400/10 text-2xl">
                {selectedType.icon}
              </div>
              <div>
                <h2 id="device-modal-title" className="text-lg font-bold text-white sm:text-xl">
                  {device ? "Edit Device" : "Add Device"}
                </h2>
                <p className="mt-1 text-xs text-slate-500 sm:text-sm">
                  {device
                    ? "Update your smart device details."
                    : "Add a new device to your smart home."}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-400 transition hover:bg-white/10 hover:text-white disabled:opacity-50"
              aria-label="Close device modal"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 p-5 sm:p-6">
          <div>
            <div className="mb-2 flex items-center justify-between">
              <label htmlFor="device-name" className="text-sm font-medium text-slate-200">
                Device Name
              </label>
              <span className="text-[11px] text-slate-600">{name.length}/40</span>
            </div>
            <input
              id="device-name"
              value={name}
              maxLength={40}
              autoFocus
              onChange={(event) => setName(event.target.value)}
              placeholder="e.g. Living Room Light"
              className="h-12 w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-400/50 focus:bg-white/[0.06] focus:ring-2 focus:ring-cyan-400/10"
            />
          </div>

          <div>
            <label className="mb-3 block text-sm font-medium text-slate-200">
              Device Type
            </label>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {deviceTypes.map((item) => {
                const selected = type === item.value;

                return (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => setType(item.value)}
                    className={`rounded-xl border p-3 text-left transition ${
                      selected
                        ? "border-cyan-400/50 bg-cyan-400/10 shadow-lg shadow-cyan-400/5"
                        : "border-white/10 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.06]"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{item.icon}</span>
                      <span className={`text-sm font-semibold ${selected ? "text-cyan-300" : "text-white"}`}>
                        {item.label}
                      </span>
                    </div>
                    <p className="mt-1 text-[10px] leading-4 text-slate-500">
                      {item.description}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label htmlFor="device-room" className="mb-2 block text-sm font-medium text-slate-200">
              Room
            </label>
            <div className="relative">
              <select
                id="device-room"
                value={room}
                onChange={(event) => setRoom(event.target.value)}
                className="h-12 w-full appearance-none rounded-xl border border-white/10 bg-white/[0.04] px-4 pr-10 text-sm text-white outline-none transition focus:border-cyan-400/50 focus:bg-white/[0.06] focus:ring-2 focus:ring-cyan-400/10"
              >
                {rooms.map((item) => (
                  <option key={item} value={item} className="bg-slate-900 text-white">
                    {item}
                  </option>
                ))}
              </select>
              <ChevronDown
                size={17}
                className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-500"
              />
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <p className="mb-3 text-xs font-medium uppercase tracking-wider text-slate-500">
              Preview
            </p>
            <div className="flex items-center justify-between gap-4">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-2xl">
                  {selectedType.icon}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-white">
                    {name.trim() || "Your Device"}
                  </p>
                  <p className="mt-1 truncate text-xs text-slate-500">
                    {room} · {selectedType.label}
                  </p>
                </div>
              </div>
              <span className="shrink-0 rounded-full border border-slate-700 bg-slate-800/70 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                OFF
              </span>
            </div>
          </div>

          <div className="flex flex-col-reverse gap-3 pt-1 sm:flex-row">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="h-12 flex-1 rounded-xl border border-white/10 bg-white/[0.03] px-4 text-sm font-medium text-slate-300 transition hover:bg-white/[0.07] hover:text-white disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="h-12 flex-1 rounded-xl bg-cyan-500 px-4 text-sm font-bold text-slate-950 transition hover:bg-cyan-400 disabled:opacity-60"
            >
              {saving ? "Saving..." : device ? "Save Changes" : "Add Device"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* =========================================================
   STAT CARD
========================================================= */

function StatCard({
  icon,
  label,
  value,
  online = false,
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">

      <div className="mb-4 flex items-center justify-between">

        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-400/10 text-cyan-400">
          {icon}
        </div>


        {online && (
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
        )}

      </div>


      <p className="text-sm text-slate-500">
        {label}
      </p>

      <p className="mt-1 text-2xl font-bold">
        {value}
      </p>

    </div>
  );
}


/* =========================================================
   ENVIRONMENT CARD
========================================================= */

function EnvironmentCard({
  icon,
  title,
  value,
  description,
}) {
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-5">

      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-cyan-400/10 text-cyan-400">
        {icon}
      </div>


      <div className="min-w-0">

        <p className="text-sm text-slate-500">
          {title}
        </p>

        <p className="text-2xl font-bold">
          {value}
        </p>

        <p className="text-xs text-emerald-400">
          {description}
        </p>

      </div>

    </div>
  );
}


/* =========================================================
   EMPTY DEVICES
========================================================= */

function EmptyDevices({
  onAdd,
  guestMode,
}) {
  return (
    <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] px-6 py-16 text-center">

      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-cyan-400/10 text-cyan-400">

        <Lightbulb
          size={30}
        />

      </div>


      <h3 className="mt-5 text-lg font-semibold">
        No devices found
      </h3>


      <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">

        {guestMode
          ? "Try the demo devices or login to add your own devices."
          : "Add your first smart device to start controlling your home."}

      </p>


      {!guestMode && (
        <button
          type="button"
          onClick={onAdd}
          className="mt-5 inline-flex items-center gap-2 rounded-xl bg-cyan-500 px-4 py-3 text-sm font-semibold text-slate-950"
        >

          <Plus size={17} />

          Add Device

        </button>
      )}

    </div>
  );
}


/* =========================================================
   DEVICE ID / MQTT HELPERS
========================================================= */

function slugify(value = "") {
  return value
    .toLowerCase()
    .trim()
    .replace(
      /\s+/g,
      "-"
    )
    .replace(
      /[^a-z0-9-]/g,
      ""
    );
}


/* =========================================================
   DEVICE CONTROL TOPIC
========================================================= */

function getDeviceControlTopic(
  device
) {
  if (
    !device ||
    !device.id ||
    !device.room
  ) {
    return null;
  }

  const room = slugify(
    device.room
  );

  return `home/${room}/${device.id}/control`;
}


/* =========================================================
   DEVICE STATUS TOPIC
========================================================= */

function getDeviceStatusTopic(
  device
) {
  if (
    !device ||
    !device.id ||
    !device.room
  ) {
    return null;
  }

  const room = slugify(
    device.room
  );

  return `home/${room}/${device.id}/status`;
}


/* =========================================================
   DEVICE ICON
========================================================= */

function getDeviceIcon(
  type
) {
  switch (type) {
    case "light":
      return "💡";

    case "fan":
      return "🌀";

    case "tv":
      return "📺";

    case "ac":
      return "❄️";

    case "appliance":
      return "⚡";

    default:
      return "🔌";
  }
}