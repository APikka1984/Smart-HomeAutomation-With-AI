import {
  Plus,
  Search,
  Menu,
  Zap,
  CheckCircle2,
  PauseCircle,
  X,
  RefreshCw,
} from "lucide-react";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  useNavigate,
} from "react-router-dom";

import {
  collection,
  onSnapshot,
  orderBy,
  query,
} from "firebase/firestore";

import {
  signOut,
} from "firebase/auth";

import { auth, db } from "../firebase";

import Sidebar from "../components/Sidebar";

import AutomationCard from "../components/automation/AutomationCard";

import AutomationModal from "../components/automation/AutomationModal";

import {
  createAutomation,
  updateAutomation,
  deleteAutomation,
  duplicateAutomation,
  toggleAutomation,
  subscribeToAutomations,
} from "../Services/automationService";

import toast from "react-hot-toast";

/* =========================================================
   HELPERS
========================================================= */

function getDeviceName(device) {
  return (
    device?.name ||
    device?.deviceName ||
    device?.type ||
    "Unnamed Device"
  );
}

/* =========================================================
   PAGE
========================================================= */

export default function AutomationPage() {
  const navigate =
    useNavigate();

  const user =
    auth.currentUser;

  const [sidebarOpen, setSidebarOpen] =
    useState(false);

  const [devices, setDevices] =
    useState([]);

  const [automations, setAutomations] =
    useState([]);

  const [loadingDevices, setLoadingDevices] =
    useState(true);

  const [loadingAutomations, setLoadingAutomations] =
    useState(true);

  const [modalOpen, setModalOpen] =
    useState(false);

  const [editingAutomation, setEditingAutomation] =
    useState(null);

  const [saving, setSaving] =
    useState(false);

  const [search, setSearch] =
    useState("");

  const [filter, setFilter] =
    useState("all");

  /* =======================================================
     NAVIGATION
  ======================================================= */

  const handleNavigation =
    useCallback(
      (id) => {
        if (id === "dashboard") {
          navigate("/dashboard");
          return;
        }

        if (id === "automation") {
          setSidebarOpen(false);
          return;
        }

        if (id === "voice") {
          navigate("/dashboard");
          return;
        }

        if (id === "devices") {
          navigate("/dashboard");
          return;
        }

        if (id === "rooms") {
          navigate("/dashboard");
          return;
        }

        if (id === "sensors") {
          navigate("/dashboard");
          return;
        }

        if (id === "profile") {
          navigate("/dashboard");
          return;
        }

        if (id === "settings") {
          navigate("/dashboard");
          return;
        }

        setSidebarOpen(false);
      },
      [navigate]
    );

  /* =======================================================
     LOGOUT
  ======================================================= */

  const handleLogout =
    useCallback(async () => {
      try {
        await signOut(auth);

        toast.success(
          "Logged out successfully."
        );

        navigate("/auth");
      } catch (error) {
        console.error(
          "Logout error:",
          error
        );

        toast.error(
          "Unable to logout."
        );
      }
    }, [navigate]);

  /* =======================================================
     DEVICES LISTENER
  ======================================================= */

  useEffect(() => {
    if (!user?.uid) {
      setDevices([]);
      setLoadingDevices(false);
      return;
    }

    const devicesRef =
      collection(
        db,
        "users",
        user.uid,
        "devices"
      );

    const devicesQuery =
      query(
        devicesRef,
        orderBy(
          "createdAt",
          "asc"
        )
      );

    const unsubscribe =
      onSnapshot(
        devicesQuery,
        (snapshot) => {
          const nextDevices =
            snapshot.docs.map(
              (item) => ({
                id: item.id,
                ...item.data(),
              })
            );

          setDevices(
            nextDevices
          );

          setLoadingDevices(
            false
          );
        },
        (error) => {
          console.error(
            "Device listener error:",
            error
          );

          setLoadingDevices(
            false
          );

          toast.error(
            "Unable to load devices."
          );
        }
      );

    return () =>
      unsubscribe();
  }, [user?.uid]);

  /* =======================================================
     AUTOMATION LISTENER
  ======================================================= */

  useEffect(() => {
    if (!user?.uid) {
      setAutomations([]);
      setLoadingAutomations(false);
      return;
    }

    setLoadingAutomations(
      true
    );

    const unsubscribe =
      subscribeToAutomations(
        user.uid,
        (items) => {
          setAutomations(items);
          setLoadingAutomations(
            false
          );
        },
        (error) => {
          console.error(
            "Automation listener error:",
            error
          );

          setLoadingAutomations(
            false
          );

          toast.error(
            "Unable to load automation rules."
          );
        }
      );

    return () =>
      unsubscribe();
  }, [user?.uid]);

  /* =======================================================
     OPEN CREATE
  ======================================================= */

  const handleCreate =
    () => {
      setEditingAutomation(
        null
      );

      setModalOpen(true);
    };

  /* =======================================================
     OPEN EDIT
  ======================================================= */

  const handleEdit =
    (automation) => {
      setEditingAutomation(
        automation
      );

      setModalOpen(true);
    };

  /* =======================================================
     CLOSE MODAL
  ======================================================= */

  const handleCloseModal =
    () => {
      if (saving) return;

      setModalOpen(false);

      setEditingAutomation(
        null
      );
    };

  /* =======================================================
     SAVE
  ======================================================= */

  const handleSave =
    async (
      form,
      automationId
    ) => {
      if (!user?.uid) {
        throw new Error(
          "You must be logged in."
        );
      }

      try {
        setSaving(true);

        if (automationId) {
          await updateAutomation(
            user.uid,
            automationId,
            form
          );

          toast.success(
            "Automation updated."
          );
        } else {
          await createAutomation(
            user.uid,
            form
          );

          toast.success(
            "Automation created."
          );
        }

        setModalOpen(false);

        setEditingAutomation(
          null
        );
      } catch (error) {
        console.error(
          "Save automation error:",
          error
        );

        toast.error(
          error?.message ||
            "Unable to save automation."
        );

        throw error;
      } finally {
        setSaving(false);
      }
    };

  /* =======================================================
     DELETE
  ======================================================= */

  const handleDelete =
    async (automation) => {
      if (!user?.uid) return;

      const confirmed =
        window.confirm(
          `Delete "${automation.name}"?`
        );

      if (!confirmed) {
        return;
      }

      try {
        await deleteAutomation(
          user.uid,
          automation.id
        );

        toast.success(
          "Automation deleted."
        );
      } catch (error) {
        console.error(
          "Delete automation error:",
          error
        );

        toast.error(
          "Unable to delete automation."
        );
      }
    };

  /* =======================================================
     DUPLICATE
  ======================================================= */

  const handleDuplicate =
    async (automation) => {
      if (!user?.uid) return;

      try {
        await duplicateAutomation(
          user.uid,
          automation
        );

        toast.success(
          "Automation duplicated."
        );
      } catch (error) {
        console.error(
          "Duplicate automation error:",
          error
        );

        toast.error(
          "Unable to duplicate automation."
        );
      }
    };

  /* =======================================================
     TOGGLE
  ======================================================= */

  const handleToggle =
    async (
      automation,
      enabled
    ) => {
      if (!user?.uid) return;

      try {
        await toggleAutomation(
          user.uid,
          automation.id,
          enabled
        );

        toast.success(
          enabled
            ? "Automation enabled."
            : "Automation disabled."
        );
      } catch (error) {
        console.error(
          "Toggle automation error:",
          error
        );

        toast.error(
          "Unable to update automation."
        );
      }
    };

  /* =======================================================
     FILTERED AUTOMATIONS
  ======================================================= */

  const filteredAutomations =
    useMemo(() => {
      const normalizedSearch =
        search
          .trim()
          .toLowerCase();

      return automations.filter(
        (automation) => {
          const matchesSearch =
            !normalizedSearch ||
            automation.name
              ?.toLowerCase()
              .includes(
                normalizedSearch
              );

          const matchesFilter =
            filter === "all" ||
            (filter === "active" &&
              automation.enabled) ||
            (filter === "disabled" &&
              !automation.enabled);

          return (
            matchesSearch &&
            matchesFilter
          );
        }
      );
    }, [
      automations,
      search,
      filter,
    ]);

  /* =======================================================
     STATS
  ======================================================= */

  const totalRules =
    automations.length;

  const activeRules =
    automations.filter(
      (item) =>
        item.enabled
    ).length;

  const disabledRules =
    totalRules -
    activeRules;

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Sidebar */}
      <Sidebar
        open={sidebarOpen}
        onClose={() =>
          setSidebarOpen(false)
        }
        onLogout={
          handleLogout
        }
        activeSection="automation"
        onNavigate={
          handleNavigation
        }
        guestMode={false}
      />

      {/* Main */}
      <div className="min-h-screen lg:pl-0">
        {/* Header */}
        <header className="sticky top-0 z-40 border-b border-white/10 bg-slate-950/95 shadow-lg shadow-black/20 backdrop-blur-xl">
          <div className="flex h-16 items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
            <div className="flex min-w-0 items-center gap-3">
              <button
                type="button"
                onClick={() =>
                  setSidebarOpen(
                    true
                  )
                }
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-300 transition hover:border-cyan-400/30 hover:bg-cyan-400/10 hover:text-cyan-300"
                aria-label="Open sidebar"
              >
                <Menu size={20} />
              </button>

              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-white">
                  Automation
                </p>

                <p className="hidden truncate text-xs text-slate-500 sm:block">
                  Create rules for your smart home
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={
                handleCreate
              }
              className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-cyan-400 px-3 py-2.5 text-xs font-bold text-slate-950 shadow-lg shadow-cyan-400/10 transition hover:bg-cyan-300 sm:px-4 sm:text-sm"
            >
              <Plus size={17} />
              <span className="hidden sm:inline">
                Add Automation
              </span>
              <span className="sm:hidden">
                Add
              </span>
            </button>
          </div>
        </header>

        <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          {/* Hero */}
          <section className="mb-6 overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-slate-900 via-slate-900 to-cyan-950/30 p-5 shadow-2xl shadow-black/20 sm:p-7">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div className="max-w-2xl">
                <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-cyan-300">
                  <Zap size={13} />
                  Smart Rules
                </div>

                <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
                  Automate your home
                </h1>

                <p className="mt-2 text-sm leading-6 text-slate-400 sm:text-base">
                  Create editable rules that respond to sensors, time, or device states and control your smart devices automatically.
                </p>
              </div>

              <div className="grid grid-cols-3 gap-2 sm:gap-3">
                <StatCard
                  label="Total"
                  value={totalRules}
                  icon={Zap}
                />

                <StatCard
                  label="Active"
                  value={activeRules}
                  icon={
                    CheckCircle2
                  }
                />

                <StatCard
                  label="Disabled"
                  value={
                    disabledRules
                  }
                  icon={
                    PauseCircle
                  }
                />
              </div>
            </div>
          </section>

          {/* Controls */}
          <section className="mb-6 flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
              />

              <input
                type="text"
                value={search}
                onChange={(event) =>
                  setSearch(
                    event.target
                      .value
                  )
                }
                placeholder="Search automations..."
                className="h-11 w-full rounded-xl border border-white/10 bg-slate-900/95 pl-10 pr-10 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-400/30"
              />

              {search && (
                <button
                  type="button"
                  onClick={() =>
                    setSearch("")
                  }
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
                  aria-label="Clear search"
                >
                  <X size={16} />
                </button>
              )}
            </div>

            <div className="flex rounded-xl border border-white/10 bg-slate-900/95 p-1">
              {[
                ["all", "All"],
                ["active", "Active"],
                [
                  "disabled",
                  "Disabled",
                ],
              ].map(
                ([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() =>
                      setFilter(
                        value
                      )
                    }
                    className={`rounded-lg px-3 py-2 text-xs font-semibold transition sm:px-4 ${
                      filter === value
                        ? "bg-cyan-400 text-slate-950"
                        : "text-slate-500 hover:text-white"
                    }`}
                  >
                    {label}
                  </button>
                )
              )}
            </div>
          </section>

          {/* Loading */}
          {(loadingDevices ||
            loadingAutomations) && (
            <div className="flex min-h-[300px] items-center justify-center rounded-2xl border border-white/10 bg-slate-900/90">
              <div className="flex flex-col items-center gap-3">
                <RefreshCw
                  size={24}
                  className="animate-spin text-cyan-400"
                />

                <p className="text-sm text-slate-500">
                  Loading automation data...
                </p>
              </div>
            </div>
          )}

          {/* Empty state */}
          {!loadingDevices &&
            !loadingAutomations &&
            filteredAutomations.length ===
              0 && (
              <div className="flex min-h-[360px] flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 bg-slate-900/80 px-6 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-cyan-400/10 text-cyan-300">
                  <Zap size={30} />
                </div>

                <h2 className="mt-5 text-lg font-semibold text-white">
                  {automations.length ===
                  0
                    ? "No automation rules yet"
                    : "No matching automations"}
                </h2>

                <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
                  {automations.length ===
                  0
                    ? "Create your first automation rule to make your smart home respond automatically."
                    : "Try changing your search or filter."}
                </p>

                {automations.length ===
                  0 && (
                  <button
                    type="button"
                    onClick={
                      handleCreate
                    }
                    className="mt-5 inline-flex items-center gap-2 rounded-xl bg-cyan-400 px-4 py-3 text-sm font-bold text-slate-950 transition hover:bg-cyan-300"
                  >
                    <Plus size={17} />
                    Create First Automation
                  </button>
                )}
              </div>
            )}

          {/* Cards */}
          {!loadingDevices &&
            !loadingAutomations &&
            filteredAutomations.length >
              0 && (
              <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {filteredAutomations.map(
                  (automation) => (
                    <AutomationCard
                      key={
                        automation.id
                      }
                      automation={
                        automation
                      }
                      onEdit={
                        handleEdit
                      }
                      onDelete={
                        handleDelete
                      }
                      onDuplicate={
                        handleDuplicate
                      }
                      onToggle={
                        handleToggle
                      }
                    />
                  )
                )}
              </section>
            )}

          {/* Device notice */}
          {!loadingDevices &&
            devices.length ===
              0 && (
              <div className="mt-6 rounded-2xl border border-amber-400/20 bg-amber-400/5 p-4">
                <div className="flex gap-3">
                  <div className="mt-0.5 text-amber-300">
                    <Zap size={18} />
                  </div>

                  <div>
                    <p className="text-sm font-semibold text-amber-200">
                      No devices found
                    </p>

                    <p className="mt-1 text-xs leading-5 text-slate-500">
                      Add a device from the Dashboard before creating an automation action.
                    </p>
                  </div>
                </div>
              </div>
            )}
        </main>
      </div>

      {/* Modal */}
      {modalOpen && (
        <AutomationModal
          open={modalOpen}
          automation={
            editingAutomation
          }
          devices={devices}
          saving={saving}
          onClose={
            handleCloseModal
          }
          onSave={
            handleSave
          }
        />
      )}
    </div>
  );
}

/* =========================================================
   STAT CARD
========================================================= */

function StatCard({
  label,
  value,
  icon: Icon,
}) {
  return (
    <div className="min-w-[82px] rounded-xl border border-white/10 bg-black/20 p-3 sm:min-w-[100px]">
      <Icon
        size={15}
        className="text-cyan-300"
      />

      <p className="mt-2 text-xl font-bold text-white">
        {value}
      </p>

      <p className="text-[10px] text-slate-500">
        {label}
      </p>
    </div>
  );
}