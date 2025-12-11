import { FaLightbulb, FaFan, FaTv, FaSnowflake, FaPlug } from "react-icons/fa";

export const devices = [
  { id: "bulb1", name: "Bulb 1", room: "Living Room", icon: FaLightbulb, topic: "smarthome/livingroom/status/bulb1" },
  { id: "bulb2", name: "Bulb 2", room: "Bedroom", icon: FaLightbulb, topic: "smarthome/bedroom/status/bulb2" },
  { id: "ac", name: "Air Conditioner", room: "Living Room", icon: FaSnowflake, topic: "smarthome/livingroom/status/ac" },
  { id: "tv", name: "Television", room: "Hall", icon: FaTv, topic: "smarthome/hall/status/tv" },
  { id: "fan", name: "Ceiling Fan", room: "Bedroom", icon: FaFan, topic: "smarthome/bedroom/status/fan" },
  { id: "appliance", name: "Appliance", room: "Kitchen", icon: FaPlug, topic: "smarthome/kitchen/status/appliance" }
];
