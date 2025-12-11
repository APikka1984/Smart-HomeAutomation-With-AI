import React from "react";
import { Pencil } from "lucide-react";

export default function DeviceCard({ device, onToggle, onEdit }) {
  return (
    <div className="bg-white p-4 shadow rounded-lg flex items-center justify-between">
      <div className="flex items-center space-x-3">
        {/* Icon */}
        <div className="w-12 h-12 bg-gray-100 rounded-md flex items-center justify-center">
          <span className="text-xl">{device.icon ?? "🔌"}</span>
        </div>

        <div>
          <div className="text-sm text-gray-500">{device.id}</div>
          <div className="font-medium">{device.name}</div>
        </div>
      </div>

      <div className="flex space-x-2">
        {/* Edit Button */}
        <button
          onClick={() => onEdit(device)}
          className="p-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
        >
          <Pencil size={16} />
        </button>

        {/* Toggle Button */}
        <button
          onClick={() => onToggle(device.id, !device.state)}
          className={`px-4 py-2 rounded-md text-white transition ${
            device.state
              ? "bg-green-500 hover:bg-green-600"
              : "bg-gray-500 hover:bg-gray-600"
          }`}
        >
          {device.state ? "ON" : "OFF"}
        </button>
      </div>
    </div>
  );
}
