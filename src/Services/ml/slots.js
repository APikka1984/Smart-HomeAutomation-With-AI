const ACTIONS = {
  on: [
    "turn on",
    "switch on",
    "activate",
    "enable",
    "start",
  ],

  off: [
    "turn off",
    "switch off",
    "deactivate",
    "disable",
    "stop",
  ],
};

const DEVICES = [
  "light",
  "lights",
  "bulb",
  "fan",
  "ac",
  "air conditioner",
  "tv",
  "television",
  "heater",
  "appliance",
];

const ROOMS = [
  "living room",
  "bedroom",
  "kitchen",
  "bathroom",
  "dining room",
  "study room",
  "office",
];

function findAction(text) {
  for (const phrase of ACTIONS.on) {
    if (text.includes(phrase)) {
      return "on";
    }
  }

  for (const phrase of ACTIONS.off) {
    if (text.includes(phrase)) {
      return "off";
    }
  }

  return null;
}

function findDevice(text) {
  // Check longer names first.
  const sortedDevices = [...DEVICES].sort(
    (a, b) => b.length - a.length
  );

  for (const device of sortedDevices) {
    if (text.includes(device)) {
      if (device === "lights" || device === "bulb") {
        return "light";
      }

      if (device === "television") {
        return "tv";
      }

      if (device === "air conditioner") {
        return "ac";
      }

      return device;
    }
  }

  return null;
}

function findRoom(text) {
  const sortedRooms = [...ROOMS].sort(
    (a, b) => b.length - a.length
  );

  for (const room of sortedRooms) {
    if (text.includes(room)) {
      return room;
    }
  }

  return null;
}

export function extractSlots(text = "") {
  const normalizedText = text.toLowerCase().trim();

  return {
    device: findDevice(normalizedText),
    room: findRoom(normalizedText),
    action: findAction(normalizedText),
  };
}