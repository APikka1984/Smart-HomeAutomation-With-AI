const DEVICE_CONTROL_PATTERNS = [
  "turn on",
  "turn off",
  "switch on",
  "switch off",
  "switch",
  "activate",
  "deactivate",
  "enable",
  "disable",
  "start",
  "stop",
];

export function predictIntent(text = "") {
  const normalizedText = text.toLowerCase().trim();

  const isDeviceCommand = DEVICE_CONTROL_PATTERNS.some((pattern) =>
    normalizedText.includes(pattern)
  );

  if (isDeviceCommand) {
    return "DEVICE_CONTROL";
  }

  return "UNKNOWN";
}