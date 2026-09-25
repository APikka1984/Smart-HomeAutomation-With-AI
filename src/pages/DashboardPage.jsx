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
import { processMQTTMessage } from "../Services/automationEngine";

import Sidebar from "../components/Sidebar";
import VoiceControl from "../components/VoiceControl";

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
  ChevronRight,
  Wifi,
  WifiOff,
  Bell,
  Sparkles,
  ArrowUpRight,
  Upload,
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

  const [activeSection, setActiveSection] =
    useState("dashboard");


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

  const [historyLimit, setHistoryLimit] =
    useState(30);

  const [historyLoaded, setHistoryLoaded] =
    useState(false);

  /* =======================================================
     PREMIUM APPEARANCE
  ======================================================= */

  const [showAppearance, setShowAppearance] =
    useState(false);

  const [showVoiceControl, setShowVoiceControl] =
    useState(false);

  const [wallpaper, setWallpaper] = useState(() => {
    try {
      return localStorage.getItem("smart_home_wallpaper") || "";
    } catch {
      return "";
    }
  });

  const [wallpaperOpacity, setWallpaperOpacity] = useState(() => {
    try {
      const value = Number(
        localStorage.getItem("smart_home_wallpaper_opacity") || 35
      );
      return Number.isFinite(value) ? value : 35;
    } catch {
      return 35;
    }
  });

  useEffect(() => {
    try {
      if (wallpaper) {
        localStorage.setItem("smart_home_wallpaper", wallpaper);
      } else {
        localStorage.removeItem("smart_home_wallpaper");
      }

      localStorage.setItem(
        "smart_home_wallpaper_opacity",
        String(wallpaperOpacity)
      );
    } catch (error) {
      console.error("Failed to save appearance settings:", error);
    }
  }, [wallpaper, wallpaperOpacity]);

  /* =======================================================
     SENSOR HISTORY PERSISTENCE + SUMMARY
  ======================================================= */

  useEffect(() => {
    try {
      const saved =
        localStorage.getItem(
          "smart_home_sensor_history"
        );

      if (saved) {
        const parsed = JSON.parse(saved);

        if (Array.isArray(parsed)) {
          setSensorHistory(
            parsed
              .filter(
                (item) =>
                  item &&
                  typeof item.temperature === "number" &&
                  typeof item.humidity === "number"
              )
              .slice(-100)
          );
        }
      }
    } catch (error) {
      console.error(
        "Failed to load sensor history:",
        error
      );
    } finally {
      setHistoryLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (!historyLoaded) return;

    try {
      localStorage.setItem(
        "smart_home_sensor_history",
        JSON.stringify(sensorHistory.slice(-100))
      );
    } catch (error) {
      console.error(
        "Failed to save sensor history:",
        error
      );
    }
  }, [sensorHistory, historyLoaded]);

  const visibleSensorHistory = useMemo(
    () => sensorHistory.slice(-historyLimit),
    [sensorHistory, historyLimit]
  );

  const sensorSummary = useMemo(() => {
    if (sensorHistory.length === 0) {
      return {
        currentTemperature: sensorData.temperature,
        currentHumidity: sensorData.humidity,
        avgTemperature: null,
        avgHumidity: null,
        minTemperature: null,
        maxTemperature: null,
        minHumidity: null,
        maxHumidity: null,
      };
    }

    const temperatures = sensorHistory.map(
      (item) => item.temperature
    );
    const humidities = sensorHistory.map(
      (item) => item.humidity
    );

    const average = (values) =>
      values.reduce((sum, value) => sum + value, 0) /
      values.length;

    return {
      currentTemperature: sensorData.temperature,
      currentHumidity: sensorData.humidity,
      avgTemperature: average(temperatures),
      avgHumidity: average(humidities),
      minTemperature: Math.min(...temperatures),
      maxTemperature: Math.max(...temperatures),
      minHumidity: Math.min(...humidities),
      maxHumidity: Math.max(...humidities),
    };
  }, [sensorHistory, sensorData]);

  const clearSensorHistory = () => {
    setSensorHistory([]);
    sensorSampleRef.current = {
      temperature: null,
      humidity: null,
      temperatureTime: 0,
      humidityTime: 0,
    };

    try {
      localStorage.removeItem(
        "smart_home_sensor_history"
      );
    } catch (error) {
      console.error(
        "Failed to clear sensor history:",
        error
      );
    }
  };


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
           AUTOMATION ENGINE
        ================================================= */

        if (user?.uid) {
          processMQTTMessage(user.uid, {
            topic,
            payload,
          }).catch((error) => {
            console.error(
              "❌ Automation Engine error:",
              error
            );
          });
        }


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
      timestamp: Date.now(),
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
        ].slice(-100);
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


  const displayName =
    user?.displayName ||
    user?.email?.split("@")[0] ||
    "Guest";

  const currentHour = new Date().getHours();
  const greeting =
    currentHour < 12
      ? "Good Morning"
      : currentHour < 18
        ? "Good Afternoon"
        : "Good Evening";

  const handleAllDevices = async (nextStatus) => {
    if (devices.length === 0) return;

    if (guestMode) {
      setDevices((previous) =>
        previous.map((item) => ({
          ...item,
          status: nextStatus,
        }))
      );
      return;
    }

    if (!user) return;

    const command = nextStatus ? "ON" : "OFF";

    setDevices((previous) =>
      previous.map((item) => ({
        ...item,
        status: nextStatus,
      }))
    );

    await Promise.all(
      devices.map(async (device) => {
        const topic = getDeviceControlTopic(device);

        if (topic) {
          publishCommand(topic, command);
        }

        try {
          await updateDoc(
            doc(
              db,
              "users",
              user.uid,
              "devices",
              device.id
            ),
            { status: nextStatus }
          );
        } catch (error) {
          console.error(
            "Failed to update device:",
            device.id,
            error
          );
        }
      })
    );
  };

  /* =======================================================
     SIDEBAR NAVIGATION
  ======================================================= */

  const handleNavigation = (id) => {
    console.log("Dashboard navigation received:", id);

    setActiveSection(id);
    setSidebarOpen(false);

    switch (id) {
      case "dashboard":
        navigate("/dashboard");
        break;

      case "rooms":
        document
          .getElementById("rooms-section")
          ?.scrollIntoView({
            behavior: "smooth",
            block: "start",
          });
        break;

      case "devices":
        document
          .getElementById("devices-section")
          ?.scrollIntoView({
            behavior: "smooth",
            block: "start",
          });
        break;

      case "sensors":
        document
          .getElementById("sensors-section")
          ?.scrollIntoView({
            behavior: "smooth",
            block: "start",
          });
        break;

      case "automation":
        console.log("Opening automation page...");
        navigate("/automation");
        break;

      case "voice":
        setShowVoiceControl(true);
        break;

      case "profile":
        alert("Profile section coming next.");
        break;

      case "settings":
        setShowAppearance(true);
        break;

      default:
        console.warn("Unknown navigation ID:", id);
    }
  };


  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <div
      className="relative min-h-screen overflow-x-hidden bg-[#020817] text-white"
      style={
        wallpaper
          ? {
              backgroundImage: `linear-gradient(rgba(2,8,23,${wallpaperOpacity / 100}), rgba(2,8,23,${wallpaperOpacity / 100})), url(${wallpaper})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
              backgroundAttachment: "fixed",
            }
          : undefined
      }
    >
      {/* Decorative ambient light */}
      <div className="pointer-events-none fixed inset-0 -z-0 overflow-hidden">
        <div className="absolute left-[15%] top-20 h-72 w-72 rounded-full bg-cyan-500/8 blur-3xl" />
        <div className="absolute right-[10%] top-[35%] h-80 w-80 rounded-full bg-violet-500/7 blur-3xl" />
        <div className="absolute bottom-0 left-[40%] h-72 w-72 rounded-full bg-blue-500/6 blur-3xl" />
      </div>

      {/* Sidebar */}
      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onLogout={handleLogout}
        activeSection={activeSection}
        onNavigate={handleNavigation}
        guestMode={guestMode}
      />

      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-slate-700/70 bg-[#080d1d]/95 shadow-lg shadow-black/20 backdrop-blur-2xl">
        <div className="flex min-h-[72px] items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-600/80 bg-slate-800/90 text-slate-200 shadow-sm transition hover:border-cyan-400/60 hover:bg-slate-700 hover:text-white active:scale-95"
              aria-label="Open sidebar"
            >
              <Menu size={21} />
            </button>

            <div className="hidden min-w-0 sm:block">
              <div className="flex items-center gap-2">
                <Home size={19} className="text-cyan-400" />
                <h1 className="truncate text-lg font-bold text-white">
                  Smart Home
                </h1>
              </div>
              <p className="text-xs text-slate-400">
                AI Automation Dashboard
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <div
              className={`hidden items-center gap-2 rounded-xl border px-3 py-2.5 sm:flex ${
                mqttConnected
                  ? "border-emerald-400/40 bg-emerald-500/10"
                  : "border-red-400/30 bg-red-500/10"
              }`}
            >
              {mqttConnected ? (
                <Wifi size={15} className="text-emerald-400" />
              ) : (
                <WifiOff size={15} className="text-red-400" />
              )}
              <span
                className={`text-xs font-semibold ${
                  mqttConnected
                    ? "text-emerald-300"
                    : "text-red-300"
                }`}
              >
                {mqttConnected
                  ? "MQTT Connected"
                  : "MQTT Offline"}
              </span>
              <span
                className={`h-2 w-2 rounded-full ${
                  mqttConnected
                    ? "bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.9)]"
                    : "bg-red-400"
                }`}
              />
            </div>

            {guestMode && (
              <div className="flex items-center gap-2 rounded-xl border border-amber-400/35 bg-amber-400/10 px-3 py-2 text-xs font-semibold text-amber-300">
                <Clock size={14} />
                <span className="hidden xs:inline">Guest</span>
                {formatTime(guestTimeLeft)}
              </div>
            )}

            {!guestMode && user && (
              <>
                <button
                  type="button"
                  className="hidden h-10 w-10 items-center justify-center rounded-xl border border-slate-700 bg-slate-800/80 text-slate-300 transition hover:border-cyan-400/40 hover:text-white sm:flex"
                  aria-label="Notifications"
                >
                  <Bell size={18} />
                </button>

                <div className="hidden items-center gap-3 md:flex">
                  <div className="text-right">
                    <p className="text-sm font-semibold text-white">
                      {displayName}
                    </p>
                    <p className="max-w-[180px] truncate text-xs text-slate-400">
                      {user.email}
                    </p>
                  </div>

                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-cyan-400 font-bold text-slate-950 shadow-lg shadow-cyan-500/20">
                    {displayName.charAt(0).toUpperCase()}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="relative z-10 mx-auto w-full max-w-[1500px] px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        {/* Hero */}
        <section className="mb-7">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <p className="mb-2 text-sm font-semibold text-cyan-400">
                {guestMode ? "Guest Preview" : "Your Smart Home"}
              </p>

              <h2 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
                {greeting}, {displayName}
                <span className="ml-2">👋</span>
              </h2>

              <p className="mt-2 text-sm font-medium text-slate-300 sm:text-base">
                {guestMode
                  ? "Explore your smart home dashboard in demo mode."
                  : "Your smart home is running smoothly."}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="hidden items-center gap-3 rounded-2xl border border-slate-700/80 bg-slate-900/90 px-4 py-3 shadow-xl shadow-black/20 sm:flex">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/15 text-cyan-300">
                  <Thermometer size={20} />
                </div>
                <div>
                  <p className="text-lg font-bold text-white">
                    {sensorData.temperature !== null
                      ? `${sensorData.temperature}°C`
                      : "--"}
                  </p>
                  <p className="text-xs text-slate-400">
                    Live temperature
                  </p>
                </div>
                <div className="mx-1 h-8 w-px bg-slate-700" />
                <div>
                  <p className="text-lg font-bold text-white">
                    {new Date().toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                  <p className="text-xs text-slate-400">
                    {new Date().toLocaleDateString([], {
                      weekday: "short",
                      day: "numeric",
                      month: "short",
                    })}
                  </p>
                </div>
              </div>

              {!guestMode && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingDevice(null);
                    setShowModal(true);
                  }}
                  className="inline-flex items-center gap-2 rounded-xl bg-cyan-500 px-4 py-3 text-sm font-bold text-slate-950 shadow-lg shadow-cyan-500/20 transition hover:bg-cyan-400 active:scale-[0.98]"
                >
                  <Plus size={18} />
                  Add Device
                </button>
              )}

              <button
                type="button"
                onClick={() => setShowVoiceControl(true)}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-600/80 bg-slate-800/90 px-4 py-3 text-sm font-semibold text-slate-200 transition hover:border-violet-400/50 hover:bg-violet-500/10 hover:text-violet-200 active:scale-[0.98]"
              >
                <Mic size={18} />
                <span className="hidden sm:inline">Voice AI</span>
              </button>
            </div>
          </div>
        </section>

        {/* Statistics */}
        <section className="mb-7 grid grid-cols-1 gap-4 min-[520px]:grid-cols-2 xl:grid-cols-4">
          <StatCard
            icon={<Home size={21} />}
            label="Total Devices"
            value={totalDevices}
            accent="cyan"
            hint="Connected devices"
          />

          <StatCard
            icon={<Power size={21} />}
            label="Active Devices"
            value={activeDevices}
            accent="emerald"
            hint="Devices are ON"
          />

          <StatCard
            icon={<Zap size={21} />}
            label="Energy Usage"
            value={`${energyUsage.toFixed(1)} kWh`}
            accent="amber"
            hint="Estimated today"
          />

          <StatCard
            icon={<Activity size={21} />}
            label="Home Status"
            value={guestMode ? "Demo" : mqttConnected ? "Online" : "Offline"}
            accent="violet"
            hint={
              guestMode
                ? "Guest preview active"
                : mqttConnected
                  ? "All systems operational"
                  : "MQTT connection required"
            }
            online={!guestMode && mqttConnected}
          />
        </section>

        {/* Sensors + Premium */}
        <section id="sensors-section" className="scroll-mt-24 mb-8 grid gap-5 xl:grid-cols-[minmax(0,1.65fr)_minmax(300px,0.8fr)]">
          <div className="rounded-3xl border border-slate-700/80 bg-[#081225]/95 p-5 shadow-2xl shadow-black/20 sm:p-6">
            <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-1">
                <EnvironmentCard
                  icon={<Thermometer size={24} />}
                  title="Temperature"
                  value={
                    sensorData.temperature !== null
                      ? `${sensorData.temperature}°C`
                      : "--"
                  }
                  description={
                    mqttConnected
                      ? "Live MQTT"
                      : "Waiting for sensor"
                  }
                  accent="cyan"
                />

                <EnvironmentCard
                  icon={<Droplets size={24} />}
                  title="Humidity"
                  value={
                    sensorData.humidity !== null
                      ? `${sensorData.humidity}%`
                      : "--"
                  }
                  description={
                    mqttConnected
                      ? "Live MQTT"
                      : "Waiting for sensor"
                  }
                  accent="blue"
                />
              </div>

              <div className="min-w-0">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold text-white">
                      Live Environment
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      Latest MQTT readings
                    </p>
                  </div>

                  <div className="flex items-center gap-3 text-[11px]">
                    <span className="flex items-center gap-1.5 text-amber-300">
                      <span className="h-2 w-2 rounded-full bg-amber-400" />
                      Temperature
                    </span>
                    <span className="flex items-center gap-1.5 text-cyan-300">
                      <span className="h-2 w-2 rounded-full bg-cyan-400" />
                      Humidity
                    </span>
                  </div>
                </div>

                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-1 rounded-xl border border-slate-700/70 bg-slate-950/70 p-1">
                    {[20, 50, 100].map((limit) => (
                      <button
                        key={limit}
                        type="button"
                        onClick={() => setHistoryLimit(limit)}
                        className={`rounded-lg px-2.5 py-1.5 text-[10px] font-bold transition ${
                          historyLimit === limit
                            ? "bg-cyan-500 text-slate-950"
                            : "text-slate-400 hover:bg-white/5 hover:text-white"
                        }`}
                      >
                        {limit}
                      </button>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={clearSensorHistory}
                    disabled={sensorHistory.length === 0}
                    className="rounded-lg border border-slate-700/70 px-2.5 py-1.5 text-[10px] font-bold text-slate-400 transition hover:border-red-400/30 hover:bg-red-500/5 hover:text-red-300 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Clear History
                  </button>
                </div>

                <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <SensorMetric label="Average Temp" value={sensorSummary.avgTemperature !== null ? `${sensorSummary.avgTemperature.toFixed(1)}°C` : "--"} />
                  <SensorMetric label="Peak Temp" value={sensorSummary.maxTemperature !== null ? `${sensorSummary.maxTemperature.toFixed(1)}°C` : "--"} />
                  <SensorMetric label="Average Humidity" value={sensorSummary.avgHumidity !== null ? `${sensorSummary.avgHumidity.toFixed(1)}%` : "--"} />
                  <SensorMetric label="Peak Humidity" value={sensorSummary.maxHumidity !== null ? `${sensorSummary.maxHumidity.toFixed(1)}%` : "--"} />
                </div>

                <div className="h-56 w-full rounded-2xl border border-slate-700/70 bg-slate-950/80 p-2 sm:h-60">
                  {sensorHistory.length === 0 ? (
                    <div className="flex h-full flex-col items-center justify-center text-center">
                      <Activity
                        size={28}
                        className="mb-3 text-slate-600"
                      />
                      <p className="text-sm font-medium text-slate-300">
                        Waiting for sensor data
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        MQTT readings will appear automatically.
                      </p>
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={visibleSensorHistory}
                        margin={{
                          top: 8,
                          right: 8,
                          left: -20,
                          bottom: 0,
                        }}
                      >
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke="rgba(148,163,184,0.12)"
                        />
                        <XAxis
                          dataKey="time"
                          tick={{
                            fill: "#94a3b8",
                            fontSize: 10,
                          }}
                          tickLine={false}
                          axisLine={false}
                          minTickGap={18}
                        />
                        <YAxis
                          yAxisId="temperature"
                          tick={{
                            fill: "#94a3b8",
                            fontSize: 10,
                          }}
                          tickLine={false}
                          axisLine={false}
                          domain={["auto", "auto"]}
                        />
                        <YAxis
                          yAxisId="humidity"
                          orientation="right"
                          tick={{
                            fill: "#94a3b8",
                            fontSize: 10,
                          }}
                          tickLine={false}
                          axisLine={false}
                          domain={["auto", "auto"]}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "#07111f",
                            border:
                              "1px solid rgba(148,163,184,0.25)",
                            borderRadius: "12px",
                            color: "#fff",
                          }}
                        />
                        <Line
                          yAxisId="temperature"
                          type="monotone"
                          dataKey="temperature"
                          name="Temperature °C"
                          stroke="#f59e0b"
                          strokeWidth={2.5}
                          dot={false}
                          activeDot={{ r: 5 }}
                        />
                        <Line
                          yAxisId="humidity"
                          type="monotone"
                          dataKey="humidity"
                          name="Humidity %"
                          stroke="#06b6d4"
                          strokeWidth={2.5}
                          dot={false}
                          activeDot={{ r: 5 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>
            </div>
          </div>

          <PremiumCard
            wallpaper={wallpaper}
            onOpen={() => setShowAppearance(true)}
          />
        </section>

        {/* Devices + Quick Actions */}
        <section id="devices-section" className="scroll-mt-24 grid gap-5 xl:grid-cols-[minmax(0,1.65fr)_minmax(300px,0.8fr)]">
          <div>
            <div id="rooms-section" className="scroll-mt-24 mb-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h3 className="text-2xl font-extrabold text-white">
                  Your Devices
                </h3>
                <p className="mt-1 text-sm text-slate-400">
                  {filteredDevices.length} device
                  {filteredDevices.length !== 1 ? "s" : ""} available
                </p>
              </div>

              <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
                <div className="relative">
                  <Search
                    size={17}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    value={search}
                    onChange={(event) =>
                      setSearch(event.target.value)
                    }
                    placeholder="Search devices..."
                    className="h-11 w-full rounded-xl border border-slate-700 bg-slate-900/95 py-2.5 pl-10 pr-4 text-sm font-medium text-white outline-none placeholder:text-slate-500 focus:border-cyan-400/60 focus:ring-2 focus:ring-cyan-400/10 sm:w-56"
                  />
                </div>

                <select
                  value={roomFilter}
                  onChange={(event) =>
                    setRoomFilter(event.target.value)
                  }
                  className="h-11 rounded-xl border border-slate-700 bg-slate-900/95 px-4 text-sm font-semibold text-slate-200 outline-none focus:border-cyan-400/60"
                >
                  {rooms.map((room) => (
                    <option
                      key={room}
                      value={room}
                      className="bg-slate-900 text-white"
                    >
                      {room === "All" ? "All Rooms" : room}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {filteredDevices.length === 0 ? (
              <EmptyDevices
                onAdd={() => {
                  setEditingDevice(null);
                  setShowModal(true);
                }}
                guestMode={guestMode}
              />
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {filteredDevices.map((device) => (
                  <DeviceCard
                    key={device.id}
                    device={device}
                    guestMode={guestMode}
                    onToggle={() => handleToggleDevice(device)}
                    onEdit={() => {
                      setEditingDevice(device);
                      setShowModal(true);
                    }}
                    onDelete={() =>
                      handleDeleteDevice(device.id)
                    }
                  />
                ))}
              </div>
            )}

            {/* Live sensor data */}
            <div className="mt-5 rounded-3xl border border-slate-700/80 bg-[#081225]/95 p-5 shadow-xl shadow-black/10">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-300">
                    <Activity size={20} />
                  </div>
                  <div>
                    <h4 className="font-bold text-white">
                      Live Sensor Data
                    </h4>
                    <p className="text-xs text-slate-400">
                      Real-time environment readings
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowSensors((previous) => !previous)}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-cyan-300 transition hover:text-cyan-200"
                >
                  {showSensors ? "Hide Details" : "View Details"}
                  {showSensors ? (
                    <ChevronUp size={15} />
                  ) : (
                    <ChevronRight size={15} />
                  )}
                </button>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <MiniSensorCard
                  icon={<Thermometer size={20} />}
                  label="Temperature"
                  value={
                    sensorData.temperature !== null
                      ? `${sensorData.temperature}°C`
                      : "--"
                  }
                  accent="cyan"
                />
                <MiniSensorCard
                  icon={<Droplets size={20} />}
                  label="Humidity"
                  value={
                    sensorData.humidity !== null
                      ? `${sensorData.humidity}%`
                      : "--"
                  }
                  accent="blue"
                />
              </div>

              {showSensors && (
                <div className="mt-4 rounded-2xl border border-slate-700/70 bg-slate-950/70 p-4">
                  <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm font-bold text-white">
                        Sensor History
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        Latest {visibleSensorHistory.length} of {sensorHistory.length} saved readings
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      {[20, 50, 100].map((limit) => (
                        <button
                          key={limit}
                          type="button"
                          onClick={() => setHistoryLimit(limit)}
                          className={`rounded-lg px-2.5 py-1.5 text-[10px] font-bold transition ${
                            historyLimit === limit
                              ? "bg-cyan-500 text-slate-950"
                              : "bg-slate-900 text-slate-400 hover:text-white"
                          }`}
                        >
                          {limit}
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={clearSensorHistory}
                        disabled={sensorHistory.length === 0}
                        className="rounded-lg border border-slate-700 px-2.5 py-1.5 text-[10px] font-bold text-slate-400 hover:text-red-300 disabled:opacity-40"
                      >
                        Clear
                      </button>
                    </div>

                    <span
                      className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${
                        mqttConnected
                          ? "bg-emerald-500/10 text-emerald-300"
                          : "bg-red-500/10 text-red-300"
                      }`}
                    >
                      {mqttConnected ? "MQTT LIVE" : "OFFLINE"}
                    </span>
                  </div>

                  <div className="h-72 w-full">
                    {sensorHistory.length === 0 ? (
                      <div className="flex h-full items-center justify-center text-sm text-slate-500">
                        Waiting for sensor history...
                      </div>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart
                          data={visibleSensorHistory}
                          margin={{
                            top: 10,
                            right: 12,
                            left: 0,
                            bottom: 5,
                          }}
                        >
                          <CartesianGrid
                            strokeDasharray="3 3"
                            stroke="rgba(148,163,184,0.12)"
                          />
                          <XAxis
                            dataKey="time"
                            tick={{
                              fill: "#94a3b8",
                              fontSize: 10,
                            }}
                            tickLine={false}
                            axisLine={false}
                          />
                          <YAxis
                            yAxisId="temperature"
                            tick={{
                              fill: "#94a3b8",
                              fontSize: 10,
                            }}
                            tickLine={false}
                            axisLine={false}
                            domain={["auto", "auto"]}
                          />
                          <YAxis
                            yAxisId="humidity"
                            orientation="right"
                            tick={{
                              fill: "#94a3b8",
                              fontSize: 10,
                            }}
                            tickLine={false}
                            axisLine={false}
                            domain={["auto", "auto"]}
                          />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: "#07111f",
                              border:
                                "1px solid rgba(148,163,184,0.25)",
                              borderRadius: "12px",
                              color: "#fff",
                            }}
                          />
                          <Legend />
                          <Line
                            yAxisId="temperature"
                            type="monotone"
                            dataKey="temperature"
                            name="Temperature °C"
                            stroke="#f59e0b"
                            strokeWidth={2}
                            dot={false}
                          />
                          <Line
                            yAxisId="humidity"
                            type="monotone"
                            dataKey="humidity"
                            name="Humidity %"
                            stroke="#22d3ee"
                            strokeWidth={2}
                            dot={false}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right rail */}
          <aside className="space-y-5">
            <QuickActions
              guestMode={guestMode}
              onAllOn={() => handleAllDevices(true)}
              onAllOff={() => handleAllDevices(false)}
              onVoice={() => setShowVoiceControl(true)}
              onAdd={() => {
                setEditingDevice(null);
                setShowModal(true);
              }}
            />

            <RecentActivity devices={devices} mqttConnected={mqttConnected} />

            {guestMode && (
              <div className="rounded-3xl border border-amber-400/30 bg-amber-500/10 p-5">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-400/15 text-amber-300">
                    <Clock size={19} />
                  </div>
                  <div>
                    <p className="font-bold text-white">
                      Guest Mode
                    </p>
                    <p className="mt-1 text-xs leading-5 text-amber-100/70">
                      You have {formatTime(guestTimeLeft)} remaining in the demo.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </aside>
        </section>
      </main>

      {/* Voice AI Modal */}
      {showVoiceControl && (
        <div
          className="fixed inset-0 z-[90] flex items-center justify-center bg-black/80 p-4 backdrop-blur-md"
          role="dialog"
          aria-modal="true"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setShowVoiceControl(false);
            }
          }}
        >
          <div className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-violet-400/25 bg-[#07101f] p-5 shadow-2xl shadow-violet-950/40 sm:p-6">
            <button
              type="button"
              onClick={() => setShowVoiceControl(false)}
              className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-xl border border-slate-700 bg-slate-900 text-slate-300 transition hover:border-violet-400/40 hover:text-white"
              aria-label="Close voice control"
            >
              <X size={19} />
            </button>

            <div className="mb-5 pr-12">
              <div className="mb-2 flex items-center gap-2 text-violet-300">
                <Sparkles size={18} />
                <span className="text-xs font-bold uppercase tracking-wider">
                  AI Voice Control
                </span>
              </div>
              <h3 className="text-2xl font-extrabold text-white">
                Control your home with your voice
              </h3>
              <p className="mt-2 text-sm text-slate-400">
                Use the current voice pipeline to control devices through MQTT.
              </p>
            </div>

            <VoiceControl
              devices={devices}
              mqttConnected={mqttConnected}
            />
          </div>
        </div>
      )}

      {/* Premium Appearance Modal */}
      {showAppearance && (
        <AppearanceModal
          wallpaper={wallpaper}
          opacity={wallpaperOpacity}
          onWallpaperChange={setWallpaper}
          onOpacityChange={setWallpaperOpacity}
          onClose={() => setShowAppearance(false)}
        />
      )}

      {/* Device Modal */}
      {showModal && (
        <DeviceModal
          device={editingDevice}
          onClose={() => {
            setShowModal(false);
            setEditingDevice(null);
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
   DEVICE CARD
========================================================= */

function DeviceCard({
  device,
  onToggle,
  onEdit,
  onDelete,
  guestMode,
}) {
  const icon = device.icon || getDeviceIcon(device.type);

  return (
    <div
      className={`group relative overflow-hidden rounded-3xl border p-5 shadow-xl transition duration-300 ${
        device.status
          ? "border-cyan-400/40 bg-[#081b2c]/95 shadow-cyan-950/20 hover:border-cyan-300/60"
          : "border-slate-700/80 bg-[#081225]/95 hover:border-slate-500"
      }`}
    >
      <div
        className={`pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full blur-3xl ${
          device.status
            ? "bg-cyan-400/10"
            : "bg-slate-400/5"
        }`}
      />

      <div className="relative z-10 flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <div
            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border text-2xl ${
              device.status
                ? "border-cyan-400/30 bg-cyan-500/15 shadow-lg shadow-cyan-500/10"
                : "border-slate-700 bg-slate-800"
            }`}
          >
            {icon}
          </div>

          <div className="min-w-0">
            <h4 className="truncate text-base font-bold text-white">
              {device.name}
            </h4>
            <p className="mt-1 truncate text-xs font-medium text-slate-400">
              {device.room}
            </p>
          </div>
        </div>

        <span
          className={`shrink-0 rounded-full px-3 py-1 text-[10px] font-extrabold tracking-wider ${
            device.status
              ? "bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-400/20"
              : "bg-slate-800 text-slate-400 ring-1 ring-slate-700"
          }`}
        >
          {device.status ? "ON" : "OFF"}
        </span>
      </div>

      <div className="relative z-10 mt-7 flex items-center justify-between">
        <button
          type="button"
          onClick={onToggle}
          className={`flex h-11 w-11 items-center justify-center rounded-full transition active:scale-95 ${
            device.status
              ? "bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/20 hover:bg-emerald-400"
              : "bg-slate-800 text-slate-400 ring-1 ring-slate-700 hover:bg-slate-700 hover:text-white"
          }`}
          aria-label={`Turn ${device.status ? "off" : "on"} ${device.name}`}
        >
          <Power size={19} />
        </button>

        <div className="flex items-center gap-1">
          {!guestMode && (
            <>
              <button
                type="button"
                onClick={onEdit}
                className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-800 hover:text-cyan-300"
                aria-label="Edit device"
              >
                <Pencil size={17} />
              </button>

              <button
                type="button"
                onClick={onDelete}
                className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-400 transition hover:bg-red-500/10 hover:text-red-300"
                aria-label="Delete device"
              >
                <Trash2 size={17} />
              </button>
            </>
          )}

          <ChevronRight
            size={18}
            className="ml-1 text-slate-600 transition group-hover:translate-x-1 group-hover:text-slate-300"
          />
        </div>
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
  hint,
  accent = "cyan",
  online = false,
}) {
  const accents = {
    cyan: {
      icon: "bg-cyan-500/15 text-cyan-300 ring-cyan-400/20",
      glow: "bg-cyan-400/10",
      line: "bg-cyan-400",
    },
    emerald: {
      icon: "bg-emerald-500/15 text-emerald-300 ring-emerald-400/20",
      glow: "bg-emerald-400/10",
      line: "bg-emerald-400",
    },
    amber: {
      icon: "bg-amber-500/15 text-amber-300 ring-amber-400/20",
      glow: "bg-amber-400/10",
      line: "bg-amber-400",
    },
    violet: {
      icon: "bg-violet-500/15 text-violet-300 ring-violet-400/20",
      glow: "bg-violet-400/10",
      line: "bg-violet-400",
    },
  };

  const theme = accents[accent] || accents.cyan;

  return (
    <div className="relative overflow-hidden rounded-3xl border border-slate-700/80 bg-[#081225]/95 p-5 shadow-xl shadow-black/15 transition hover:-translate-y-0.5 hover:border-slate-500">
      <div
        className={`pointer-events-none absolute -bottom-12 right-0 h-28 w-32 rounded-full blur-3xl ${theme.glow}`}
      />

      <div className="relative z-10">
        <div className="mb-5 flex items-center justify-between">
          <div
            className={`flex h-11 w-11 items-center justify-center rounded-2xl ring-1 ${theme.icon}`}
          >
            {icon}
          </div>

          {online && (
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.8)]" />
          )}
        </div>

        <p className="text-sm font-semibold text-slate-300">
          {label}
        </p>

        <p className="mt-1 text-3xl font-extrabold tracking-tight text-white">
          {value}
        </p>

        <p className="mt-2 text-xs font-medium text-slate-400">
          {hint}
        </p>

        <div className="mt-4 h-1 overflow-hidden rounded-full bg-slate-800">
          <div
            className={`h-full w-2/3 rounded-full ${theme.line}`}
          />
        </div>
      </div>
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
  accent = "cyan",
}) {
  const iconClass =
    accent === "blue"
      ? "bg-blue-500/15 text-blue-300 ring-blue-400/20"
      : "bg-cyan-500/15 text-cyan-300 ring-cyan-400/20";

  return (
    <div className="flex items-center gap-4 rounded-2xl border border-slate-700/80 bg-slate-950/65 p-4 shadow-lg">
      <div
        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ring-1 ${iconClass}`}
      >
        {icon}
      </div>

      <div className="min-w-0">
        <p className="text-sm font-semibold text-slate-300">
          {title}
        </p>
        <p className="mt-0.5 text-2xl font-extrabold text-white">
          {value}
        </p>
        <span className="mt-1 inline-flex rounded-full bg-emerald-500/10 px-2.5 py-1 text-[10px] font-bold text-emerald-300">
          {description}
        </span>
      </div>
    </div>
  );
}


/* =========================================================
   SENSOR METRIC
========================================================= */

function SensorMetric({
  label,
  value,
}) {
  return (
    <div className="rounded-xl border border-slate-700/70 bg-slate-950/60 px-3 py-2.5">
      <p className="truncate text-[10px] font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-0.5 text-sm font-extrabold text-white">
        {value}
      </p>
    </div>
  );
}


/* =========================================================
   MINI SENSOR CARD
========================================================= */

function MiniSensorCard({
  icon,
  label,
  value,
  accent = "cyan",
}) {
  const iconClass =
    accent === "blue"
      ? "bg-blue-500/15 text-blue-300"
      : "bg-cyan-500/15 text-cyan-300";

  return (
    <div className="flex items-center gap-3 rounded-2xl border border-slate-700/80 bg-slate-950/70 p-4">
      <div
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${iconClass}`}
      >
        {icon}
      </div>
      <div>
        <p className="text-xs font-medium text-slate-400">
          {label}
        </p>
        <p className="mt-0.5 text-xl font-extrabold text-white">
          {value}
        </p>
      </div>
    </div>
  );
}


/* =========================================================
   PREMIUM CARD
========================================================= */

function PremiumCard({
  wallpaper,
  onOpen,
}) {
  return (
    <div className="group relative min-h-[260px] overflow-hidden rounded-3xl border border-violet-400/50 bg-gradient-to-br from-violet-950/90 via-slate-950/95 to-cyan-950/80 p-6 shadow-2xl shadow-violet-950/20">
      {wallpaper ? (
        <div
          className="absolute inset-0 bg-cover bg-center opacity-35 transition duration-700 group-hover:scale-105"
          style={{
            backgroundImage: `url(${wallpaper})`,
          }}
        />
      ) : (
        <>
          <div className="absolute -right-12 -top-12 h-48 w-48 rounded-full bg-violet-500/20 blur-3xl" />
          <div className="absolute bottom-0 right-0 h-36 w-56 bg-gradient-to-tl from-violet-500/25 to-transparent blur-2xl" />
        </>
      )}

      <div className="absolute inset-0 bg-gradient-to-br from-violet-950/80 via-slate-950/55 to-slate-950/80" />

      <div className="relative z-10 flex h-full min-h-[210px] flex-col justify-between">
        <div>
          <div className="flex items-start justify-between gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-500/20 text-violet-300 ring-1 ring-violet-400/20">
              <Crown size={23} />
            </div>

            <span className="rounded-full bg-violet-500 px-3 py-1 text-[10px] font-extrabold tracking-wider text-white shadow-lg shadow-violet-500/30">
              PREMIUM
            </span>
          </div>

          <h3 className="mt-5 text-xl font-extrabold text-violet-200">
            Premium Personalization
          </h3>

          <p className="mt-2 max-w-sm text-sm leading-6 text-slate-300">
            Customize your dashboard wallpaper and appearance with images or animated GIFs.
          </p>
        </div>

        <button
          type="button"
          onClick={onOpen}
          className="mt-6 inline-flex w-fit items-center gap-2 rounded-xl bg-violet-500 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-violet-500/25 transition hover:bg-violet-400 active:scale-[0.98]"
        >
          <Sparkles size={17} />
          Explore Premium
          <ArrowUpRight size={16} />
        </button>
      </div>
    </div>
  );
}


/* =========================================================
   QUICK ACTIONS
========================================================= */

function QuickActions({
  guestMode,
  onAllOn,
  onAllOff,
  onVoice,
  onAdd,
}) {
  return (
    <div className="rounded-3xl border border-slate-700/80 bg-[#081225]/95 p-5 shadow-xl">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-300">
          <Home size={19} />
        </div>
        <div>
          <h3 className="font-bold text-white">
            Quick Actions
          </h3>
          <p className="text-xs text-slate-400">
            Control your home faster
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={onAllOn}
          className="rounded-2xl border border-emerald-400/25 bg-emerald-500/10 p-3 text-left transition hover:border-emerald-400/50 hover:bg-emerald-500/15"
        >
          <Power size={18} className="text-emerald-300" />
          <p className="mt-2 text-xs font-bold text-white">
            Turn All On
          </p>
        </button>

        <button
          type="button"
          onClick={onAllOff}
          className="rounded-2xl border border-rose-400/25 bg-rose-500/10 p-3 text-left transition hover:border-rose-400/50 hover:bg-rose-500/15"
        >
          <Power size={18} className="text-rose-300" />
          <p className="mt-2 text-xs font-bold text-white">
            Turn All Off
          </p>
        </button>

        <button
          type="button"
          onClick={onVoice}
          className="rounded-2xl border border-violet-400/25 bg-violet-500/10 p-3 text-left transition hover:border-violet-400/50 hover:bg-violet-500/15"
        >
          <Mic size={18} className="text-violet-300" />
          <p className="mt-2 text-xs font-bold text-white">
            Voice Control
          </p>
        </button>

        <button
          type="button"
          onClick={onAdd}
          disabled={guestMode}
          className="rounded-2xl border border-cyan-400/25 bg-cyan-500/10 p-3 text-left transition hover:border-cyan-400/50 hover:bg-cyan-500/15 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Plus size={18} className="text-cyan-300" />
          <p className="mt-2 text-xs font-bold text-white">
            Add Device
          </p>
        </button>
      </div>
    </div>
  );
}


/* =========================================================
   RECENT ACTIVITY
========================================================= */

function RecentActivity({
  devices,
  mqttConnected,
}) {
  const items = [
    ...devices.slice(0, 3).map((device) => ({
      label: `${device.name} is ${device.status ? "ON" : "OFF"}`,
      color: device.status
        ? "bg-emerald-400"
        : "bg-slate-500",
    })),
    {
      label: mqttConnected
        ? "MQTT connection active"
        : "MQTT connection offline",
      color: mqttConnected
        ? "bg-cyan-400"
        : "bg-red-400",
    },
  ];

  return (
    <div className="rounded-3xl border border-slate-700/80 bg-[#081225]/95 p-5 shadow-xl">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="font-bold text-white">
            Recent Activity
          </h3>
          <p className="mt-1 text-xs text-slate-400">
            Current home events
          </p>
        </div>
        <Activity size={18} className="text-slate-500" />
      </div>

      <div className="space-y-3">
        {items.map((item, index) => (
          <div
            key={`${item.label}-${index}`}
            className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-950/50 px-3 py-2.5"
          >
            <span
              className={`h-2.5 w-2.5 shrink-0 rounded-full ${item.color}`}
            />
            <p className="min-w-0 flex-1 truncate text-xs font-medium text-slate-300">
              {item.label}
            </p>
            <span className="text-[10px] text-slate-600">
              Now
            </span>
          </div>
        ))}
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
    <div className="rounded-3xl border border-dashed border-slate-700 bg-[#081225]/95 px-6 py-16 text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-cyan-500/10 text-cyan-300">
        <Lightbulb size={30} />
      </div>

      <h3 className="mt-5 text-lg font-bold text-white">
        No devices found
      </h3>

      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-400">
        {guestMode
          ? "Try the demo devices or login to add your own devices."
          : "Add your first smart device to start controlling your home."}
      </p>

      {!guestMode && (
        <button
          type="button"
          onClick={onAdd}
          className="mt-5 inline-flex items-center gap-2 rounded-xl bg-cyan-500 px-4 py-3 text-sm font-bold text-slate-950 transition hover:bg-cyan-400"
        >
          <Plus size={17} />
          Add Device
        </button>
      )}
    </div>
  );
}


/* =========================================================
   DEVICE MODAL
========================================================= */

function DeviceModal({
  device,
  onClose,
  onSave,
}) {
  const [name, setName] = useState(
    device?.name || ""
  );
  const [type, setType] = useState(
    device?.type || "light"
  );
  const [room, setRoom] = useState(
    device?.room || "Living Room"
  );
  const [saving, setSaving] = useState(false);

  const deviceTypes = [
    {
      value: "light",
      icon: "💡",
      label: "Light",
      description: "Bulbs & lighting",
    },
    {
      value: "fan",
      icon: "🌀",
      label: "Fan",
      description: "Ceiling & room fans",
    },
    {
      value: "tv",
      icon: "📺",
      label: "TV",
      description: "Television",
    },
    {
      value: "ac",
      icon: "❄️",
      label: "AC",
      description: "Air conditioner",
    },
    {
      value: "appliance",
      icon: "⚡",
      label: "Appliance",
      description: "Other smart appliance",
    },
  ];

  const rooms = [
    "Living Room",
    "Bedroom",
    "Kitchen",
    "Bathroom",
    "Dining Room",
    "Office",
    "Garage",
    "Other",
  ];

  const selectedType =
    deviceTypes.find(
      (item) => item.value === type
    ) || deviceTypes[0];

  const handleSubmit = async (event) => {
    event.preventDefault();

    const trimmedName = name.trim();

    if (!trimmedName) {
      alert("Please enter a device name.");
      return;
    }

    if (trimmedName.length < 2) {
      alert(
        "Device name must contain at least 2 characters."
      );
      return;
    }

    setSaving(true);

    try {
      await Promise.resolve(
        onSave({
          name: trimmedName,
          type,
          room,
        })
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/80 p-0 backdrop-blur-md sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="device-modal-title"
      onMouseDown={(event) => {
        if (
          event.target === event.currentTarget &&
          !saving
        ) {
          onClose();
        }
      }}
    >
      <div className="max-h-[94vh] w-full overflow-y-auto rounded-t-3xl border border-slate-700 bg-[#07101f] shadow-2xl shadow-black/60 sm:max-w-lg sm:rounded-3xl">
        <div className="sticky top-0 z-10 border-b border-slate-700/80 bg-[#07101f]/95 px-5 py-5 backdrop-blur-xl sm:px-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-cyan-400/20 bg-cyan-500/10 text-2xl">
                {selectedType.icon}
              </div>
              <div>
                <h2
                  id="device-modal-title"
                  className="text-lg font-bold text-white sm:text-xl"
                >
                  {device
                    ? "Edit Device"
                    : "Add Device"}
                </h2>
                <p className="mt-1 text-xs text-slate-400 sm:text-sm">
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
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-700 bg-slate-900 text-slate-400 transition hover:bg-slate-800 hover:text-white disabled:opacity-50"
              aria-label="Close device modal"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-6 p-5 sm:p-6"
        >
          <div>
            <div className="mb-2 flex items-center justify-between">
              <label
                htmlFor="device-name"
                className="text-sm font-semibold text-slate-200"
              >
                Device Name
              </label>
              <span className="text-[11px] text-slate-500">
                {name.length}/40
              </span>
            </div>

            <input
              id="device-name"
              value={name}
              maxLength={40}
              autoFocus
              onChange={(event) =>
                setName(event.target.value)
              }
              placeholder="e.g. Living Room Light"
              className="h-12 w-full rounded-xl border border-slate-700 bg-slate-900 px-4 text-sm font-medium text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-400/60 focus:ring-2 focus:ring-cyan-400/10"
            />
          </div>

          <div>
            <label className="mb-3 block text-sm font-semibold text-slate-200">
              Device Type
            </label>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {deviceTypes.map((item) => {
                const selected =
                  type === item.value;

                return (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() =>
                      setType(item.value)
                    }
                    className={`rounded-2xl border p-3 text-left transition ${
                      selected
                        ? "border-cyan-400/60 bg-cyan-500/10 shadow-lg shadow-cyan-500/5"
                        : "border-slate-700 bg-slate-900 hover:border-slate-500"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">
                        {item.icon}
                      </span>
                      <span
                        className={`text-sm font-bold ${
                          selected
                            ? "text-cyan-300"
                            : "text-white"
                        }`}
                      >
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
            <label
              htmlFor="device-room"
              className="mb-2 block text-sm font-semibold text-slate-200"
            >
              Room
            </label>

            <div className="relative">
              <select
                id="device-room"
                value={room}
                onChange={(event) =>
                  setRoom(event.target.value)
                }
                className="h-12 w-full appearance-none rounded-xl border border-slate-700 bg-slate-900 px-4 pr-10 text-sm font-medium text-white outline-none focus:border-cyan-400/60"
              >
                {rooms.map((item) => (
                  <option
                    key={item}
                    value={item}
                    className="bg-slate-900 text-white"
                  >
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

          <div className="rounded-2xl border border-slate-700 bg-slate-900/80 p-4">
            <p className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-500">
              Preview
            </p>

            <div className="flex items-center justify-between gap-4">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-slate-700 bg-slate-800 text-2xl">
                  {selectedType.icon}
                </div>

                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-white">
                    {name.trim() ||
                      "Your Device"}
                  </p>
                  <p className="mt-1 truncate text-xs text-slate-400">
                    {room} · {selectedType.label}
                  </p>
                </div>
              </div>

              <span className="rounded-full bg-slate-800 px-2.5 py-1 text-[10px] font-bold text-slate-400 ring-1 ring-slate-700">
                OFF
              </span>
            </div>
          </div>

          <div className="flex flex-col-reverse gap-3 sm:flex-row">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="h-12 flex-1 rounded-xl border border-slate-700 bg-slate-900 px-4 text-sm font-semibold text-slate-300 transition hover:bg-slate-800 hover:text-white disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={saving}
              className="h-12 flex-1 rounded-xl bg-cyan-500 px-4 text-sm font-extrabold text-slate-950 transition hover:bg-cyan-400 disabled:opacity-60"
            >
              {saving
                ? "Saving..."
                : device
                  ? "Save Changes"
                  : "Add Device"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}


/* =========================================================
   EMPTY / MQTT HELPERS
========================================================= */

function slugify(value = "") {
  return value
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

function getDeviceControlTopic(device) {
  if (!device || !device.id || !device.room) {
    return null;
  }

  return `home/${slugify(device.room)}/${device.id}/control`;
}

function getDeviceStatusTopic(device) {
  if (!device || !device.id || !device.room) {
    return null;
  }

  return `home/${slugify(device.room)}/${device.id}/status`;
}

function getDeviceIcon(type) {
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


/* =========================================================
   PREMIUM APPEARANCE MODAL
========================================================= */

function AppearanceModal({
  wallpaper,
  opacity,
  onWallpaperChange,
  onOpacityChange,
  onClose,
}) {
  const handleImageUpload = (event) => {
    const file = event.target.files?.[0];

    if (!file) return;

    const allowedTypes = [
      "image/png",
      "image/jpeg",
      "image/webp",
      "image/gif",
    ];

    if (!allowedTypes.includes(file.type)) {
      alert(
        "Please select a PNG, JPG, WEBP or GIF image."
      );
      return;
    }

    if (file.size > 3 * 1024 * 1024) {
      alert(
        "Please choose an image or GIF smaller than 3 MB."
      );
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      if (typeof reader.result === "string") {
        onWallpaperChange(reader.result);
      }
    };

    reader.onerror = () => {
      alert("Unable to load this image.");
    };

    reader.readAsDataURL(file);
  };

  return (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center bg-black/85 p-4 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-labelledby="appearance-modal-title"
      onMouseDown={(event) => {
        if (
          event.target === event.currentTarget
        ) {
          onClose();
        }
      }}
    >
      <div className="w-full max-w-lg overflow-hidden rounded-3xl border border-violet-400/30 bg-[#07101f] shadow-2xl shadow-violet-950/50">
        <div className="flex items-center justify-between border-b border-slate-700/80 px-5 py-5 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-500/15 text-violet-300 ring-1 ring-violet-400/20">
              <Crown size={20} />
            </div>
            <div>
              <h2
                id="appearance-modal-title"
                className="text-lg font-extrabold text-white"
              >
                Premium Personalization
              </h2>
              <p className="mt-1 text-xs text-slate-400">
                Add an image or animated GIF background.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-700 bg-slate-900 text-slate-400 transition hover:bg-slate-800 hover:text-white"
            aria-label="Close appearance settings"
          >
            <X size={20} />
          </button>
        </div>

        <div className="space-y-5 p-5 sm:p-6">
          <div>
            <label className="mb-3 block text-sm font-bold text-slate-200">
              Dashboard Wallpaper
            </label>

            <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-violet-400/35 bg-violet-500/5 px-5 py-8 text-center transition hover:border-violet-400/70 hover:bg-violet-500/10">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-violet-500/15 text-violet-300">
                <Upload size={21} />
              </div>

              <p className="text-sm font-bold text-white">
                Upload image or GIF
              </p>

              <p className="mt-1 text-xs text-slate-500">
                PNG, JPG, WEBP or animated GIF · Max 3 MB
              </p>

              <input
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                onChange={handleImageUpload}
                className="hidden"
              />
            </label>
          </div>

          {wallpaper ? (
            <div className="overflow-hidden rounded-2xl border border-slate-700 bg-slate-950">
              <div
                className="h-40 bg-cover bg-center"
                style={{
                  backgroundImage: `url(${wallpaper})`,
                }}
              />
              <div className="flex items-center justify-between border-t border-slate-700 bg-slate-900 px-4 py-3">
                <p className="text-xs font-semibold text-slate-300">
                  Current wallpaper
                </p>
                <button
                  type="button"
                  onClick={() => onWallpaperChange("")}
                  className="text-xs font-bold text-rose-300 hover:text-rose-200"
                >
                  Remove
                </button>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-700 bg-gradient-to-br from-slate-900 to-violet-950/50 p-5">
              <p className="text-sm font-bold text-white">
                No custom wallpaper
              </p>
              <p className="mt-1 text-xs leading-5 text-slate-400">
                Upload a room photo, abstract image, or animated GIF to personalize the dashboard.
              </p>
            </div>
          )}

          <div>
            <div className="mb-2 flex items-center justify-between">
              <label
                htmlFor="wallpaper-opacity"
                className="text-sm font-bold text-slate-200"
              >
                Overlay Darkness
              </label>
              <span className="rounded-full bg-slate-800 px-2.5 py-1 text-xs font-bold text-slate-300">
                {opacity}%
              </span>
            </div>

            <input
              id="wallpaper-opacity"
              type="range"
              min="10"
              max="90"
              value={opacity}
              onChange={(event) =>
                onOpacityChange(
                  Number(event.target.value)
                )
              }
              className="w-full accent-violet-500"
            />

            <p className="mt-2 text-xs text-slate-500">
              Increase the overlay when text or icons are difficult to read.
            </p>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => {
                onWallpaperChange("");
                onOpacityChange(45);
              }}
              className="h-11 flex-1 rounded-xl border border-slate-700 bg-slate-900 px-4 text-sm font-semibold text-slate-300 transition hover:bg-slate-800 hover:text-white"
            >
              Reset
            </button>

            <button
              type="button"
              onClick={onClose}
              className="h-11 flex-1 rounded-xl bg-violet-500 px-4 text-sm font-extrabold text-white transition hover:bg-violet-400"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
