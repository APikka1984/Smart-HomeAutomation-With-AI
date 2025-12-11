import React, { useState } from "react";
import DeviceCard from "./DeviceCard";
import LiveChart from "./LiveChart";
import VoiceControl from "./VoiceControl";
import { Plus } from "lucide-react";

export default function Dashboard() {
  const [devices, setDevices] = useState([
    { id: "dev1", name: "Living Room Light", state: false, icon: "💡" },
    { id: "dev2", name: "Fan", state: true, icon: "🌀" },
  ]);

  const [showModal, setShowModal] = useState(false);
  const [editDevice, setEditDevice] = useState(null);

  const [formData, setFormData] = useState({
    id: "",
    name: "",
    icon: "",
  });

  // Toggle device
  const handleToggle = (id, newState) => {
    setDevices((prev) =>
      prev.map((dev) =>
        dev.id === id ? { ...dev, state: newState } : dev
      )
    );
  };

  // Open add modal
  const openAddModal = () => {
    setEditDevice(null);
    setFormData({ id: "", name: "", icon: "" });
    setShowModal(true);
  };

  // Open edit modal
  const openEditModal = (device) => {
    setEditDevice(device);
    setFormData(device);
    setShowModal(true);
  };

  // Save device
  const handleSave = () => {
    if (formData.name.trim() === "" || formData.id.trim() === "") return;

    // Editing existing
    if (editDevice) {
      setDevices((prev) =>
        prev.map((d) => (d.id === editDevice.id ? formData : d))
      );
    } else {
      setDevices((prev) => [...prev, { ...formData, state: false }]);
    }

    setShowModal(false);
  };

  return (
    <div className="p-6 space-y-6">

      {/* ===== PROFILE SECTION ===== */}
      <div className="bg-white shadow rounded-lg p-4 flex items-center space-x-4">
        <img
          src="https://i.pravatar.cc/100"
          alt="Profile"
          className="w-16 h-16 rounded-full shadow"
        />

        <div>
          <h2 className="text-xl font-bold">Anuj Kumar</h2>
          <p className="text-gray-600">Smart Home User</p>
        </div>
      </div>

      {/* ===== HEADER ===== */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">My Devices</h1>

        <button
          onClick={openAddModal}
          className="flex items-center bg-blue-600 text-white px-4 py-2 rounded-lg shadow hover:bg-blue-700"
        >
          <Plus size={18} className="mr-2" />
          Add Device
        </button>
      </div>

      {/* ===== DEVICES GRID ===== */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {devices.map((device) => (
          <DeviceCard
            key={device.id}
            device={device}
            onToggle={handleToggle}
            onEdit={openEditModal}
          />
        ))}
      </div>

      {/* ===== SENSOR DATA ===== */}
      <h2 className="text-xl font-bold mt-8">Sensor Data</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <LiveChart dataPoints={[{ t: Date.now(), value: 25 }]} label="Temperature (°C)" />
        <LiveChart dataPoints={[{ t: Date.now(), value: 65 }]} label="Humidity (%)" />
      </div>

      {/* ===== VOICE CONTROL ===== */}
      <h2 className="text-xl font-bold mt-8">Voice Assistant</h2>
      <VoiceControl onCommand={(msg) => console.log("Voice:", msg)} />

      {/* ===== ADD / EDIT MODAL ===== */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg shadow-lg w-80">
            <h2 className="text-lg font-bold mb-4">
              {editDevice ? "Edit Device" : "Add Device"}
            </h2>

            <input
              type="text"
              placeholder="Device ID"
              className="border p-2 w-full rounded mb-2"
              value={formData.id}
              readOnly={!!editDevice}
              onChange={(e) =>
                setFormData({ ...formData, id: e.target.value })
              }
            />

            <input
              type="text"
              placeholder="Device Name"
              className="border p-2 w-full rounded mb-2"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
            />

            <input
              type="text"
              placeholder="Icon (emoji)"
              className="border p-2 w-full rounded mb-4"
              value={formData.icon}
              onChange={(e) =>
                setFormData({ ...formData, icon: e.target.value })
              }
            />

            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 bg-gray-400 text-white rounded"
              >
                Cancel
              </button>

              <button
                onClick={handleSave}
                className="px-4 py-2 bg-green-600 text-white rounded"
              >
                Save
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
