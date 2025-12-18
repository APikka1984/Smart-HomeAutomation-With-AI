import { useState, useEffect } from "react";
import mqttService from "../Services/mqttService";
import { devices } from "../Services/devices";

export default function DevicesPanel() {
  const [status, setStatus] = useState({});

  useEffect(() => {
    mqttService.connect();

    mqttService.addMessageHandler((topic, payload) => {
      devices.forEach((device) => {
        if (topic.includes(device.id)) {
          setStatus((prev) => ({ ...prev, [device.id]: payload.status }));
        }
      });
    });

    devices.forEach((d) => mqttService.client?.subscribe(d.topic));
  }, []);

  const toggleDevice = (device) => {
    const newStatus = status[device.id] === "ON" ? "OFF" : "ON";

    mqttService.publish(device.topic, {
      status: newStatus,
    });
  };

  return (
    <div style={{ padding: 20 }}>
      <h2>Smart Devices</h2>
      {devices.map((device) => (
        <div key={device.id} style={{ marginBottom: 12 }}>
          <strong>{device.name}</strong> — Status:{" "}
          <span style={{ color: status[device.id] === "ON" ? "green" : "red" }}>
            {status[device.id] || "OFFLINE"}
          </span>
          <button
            style={{ marginLeft: 15 }}
            onClick={() => toggleDevice(device)}
          >
            Toggle
          </button>
        </div>
      ))}
    </div>
  );
}
