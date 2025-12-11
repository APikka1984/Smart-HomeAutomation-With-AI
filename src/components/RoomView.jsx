import { useState, useEffect } from "react";
import mqttService from "../Services/mqttService";
import { devices } from "../Services/devices";
import "./RoomView.css";

export default function RoomView() {
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

  const toggle = (device) => {
    const newState = status[device.id] === "ON" ? "OFF" : "ON";
    mqttService.publish(device.topic, { status: newState });
  };

  const groupedByRoom = devices.reduce((acc, d) => {
    if (!acc[d.room]) acc[d.room] = [];
    acc[d.room].push(d);
    return acc;
  }, {});

  return (
    <div className="rooms-container">
      {Object.keys(groupedByRoom).map((room) => (
        <div key={room} className="room-card">
          <h3>{room}</h3>
          <div className="device-list">
            {groupedByRoom[room].map((d) => {
              const Icon = d.icon;
              const isOn = status[d.id] === "ON";
              return (
                <div key={d.id}
                  className={`device-card ${isOn ? "on" : "off"}`}
                  onClick={() => toggle(d)}>
                  <Icon size={32} />
                  <p>{d.name}</p>
                  <span>{isOn ? "ON" : "OFF"}</span>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
