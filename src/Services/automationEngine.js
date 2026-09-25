import {
  getAutomationsOnce,
} from "./automationService";

import {
  publishCommand,
} from "./mqttService";

/* =========================================================
   AUTOMATION ENGINE STATE
========================================================= */

const triggeredOnceRules = new Map();

const executionLocks = new Map();

const lastExecutionTimes = new Map();

const EXECUTION_COOLDOWN_MS = 1500;

/* =========================================================
   HELPERS
========================================================= */

function normalizeRoom(room = "") {
  return String(room)
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

function normalizeState(state = "") {
  return String(state)
    .trim()
    .toUpperCase();
}

function toNumber(value) {
  const number = Number(value);

  return Number.isFinite(number)
    ? number
    : null;
}

/* =========================================================
   CONDITION
========================================================= */

function compareValues(
  actual,
  operator,
  expected
) {
  switch (operator) {
    case ">":
      return actual > expected;

    case "<":
      return actual < expected;

    case ">=":
      return actual >= expected;

    case "<=":
      return actual <= expected;

    case "==":
      return actual === expected;

    default:
      console.warn(
        "⚠️ Unknown automation operator:",
        operator
      );

      return false;
  }
}

/* =========================================================
   SENSOR TRIGGER
========================================================= */

function matchesSensorTrigger(
  automation,
  message
) {
  const trigger =
    automation?.trigger;

  if (!trigger) {
    return false;
  }

  if (trigger.type !== "sensor") {
    return false;
  }

  const messageRoom =
    normalizeRoom(message.room);

  const triggerRoom =
    normalizeRoom(trigger.room);

  if (
    !messageRoom ||
    !triggerRoom ||
    messageRoom !== triggerRoom
  ) {
    return false;
  }

  if (
    message.sensor !==
    trigger.sensor
  ) {
    return false;
  }

  const actualValue =
    toNumber(message.value);

  const expectedValue =
    toNumber(trigger.value);

  if (
    actualValue === null ||
    expectedValue === null
  ) {
    console.warn(
      "⚠️ Invalid sensor value:",
      {
        actualValue,
        expectedValue,
      }
    );

    return false;
  }

  return compareValues(
    actualValue,
    trigger.operator,
    expectedValue
  );
}

/* =========================================================
   DEVICE TRIGGER
========================================================= */

function matchesDeviceTrigger(
  automation,
  message
) {
  const trigger =
    automation?.trigger;

  if (!trigger) {
    return false;
  }

  if (trigger.type !== "device") {
    return false;
  }

  if (
    trigger.deviceId !==
    message.deviceId
  ) {
    return false;
  }

  const expectedState =
    normalizeState(
      trigger.deviceState
    );

  const actualState =
    normalizeState(
      message.state
    );

  return (
    expectedState ===
    actualState
  );
}

/* =========================================================
   TIME TRIGGER
========================================================= */

function matchesTimeTrigger(
  automation,
  message
) {
  const trigger =
    automation?.trigger;

  if (!trigger) {
    return false;
  }

  if (trigger.type !== "time") {
    return false;
  }

  return (
    trigger.time ===
    message.time
  );
}

/* =========================================================
   GENERIC TRIGGER
========================================================= */

function matchesTrigger(
  automation,
  message
) {
  const triggerType =
    automation?.trigger?.type;

  switch (triggerType) {
    case "sensor":
      return matchesSensorTrigger(
        automation,
        message
      );

    case "device":
      return matchesDeviceTrigger(
        automation,
        message
      );

    case "time":
      return matchesTimeTrigger(
        automation,
        message
      );

    default:
      return false;
  }
}

/* =========================================================
   SCHEDULE
========================================================= */

function isWithinSchedule(
  automation,
  currentTime = null
) {
  const schedule =
    automation?.schedule;

  if (!schedule?.enabled) {
    return true;
  }

  if (
    !schedule.startTime ||
    !schedule.endTime
  ) {
    return true;
  }

  const now =
    currentTime ||
    new Date();

  const currentMinutes =
    now.getHours() * 60 +
    now.getMinutes();

  const startParts =
    schedule.startTime
      .split(":")
      .map(Number);

  const endParts =
    schedule.endTime
      .split(":")
      .map(Number);

  const startHour =
    startParts[0];

  const startMinute =
    startParts[1];

  const endHour =
    endParts[0];

  const endMinute =
    endParts[1];

  if (
    !Number.isFinite(startHour) ||
    !Number.isFinite(startMinute) ||
    !Number.isFinite(endHour) ||
    !Number.isFinite(endMinute)
  ) {
    return true;
  }

  const startMinutes =
    startHour * 60 +
    startMinute;

  const endMinutes =
    endHour * 60 +
    endMinute;

  if (
    startMinutes <= endMinutes
  ) {
    return (
      currentMinutes >=
        startMinutes &&
      currentMinutes <=
        endMinutes
    );
  }

  return (
    currentMinutes >=
      startMinutes ||
    currentMinutes <=
      endMinutes
  );
}

/* =========================================================
   ONCE RULE STATE
========================================================= */

function hasOnceRuleTriggered(
  automationId
) {
  return (
    triggeredOnceRules.get(
      automationId
    ) === true
  );
}

function markOnceRuleTriggered(
  automationId
) {
  triggeredOnceRules.set(
    automationId,
    true
  );
}

function resetOnceRule(
  automationId
) {
  triggeredOnceRules.delete(
    automationId
  );
}

/* =========================================================
   COOLDOWN
========================================================= */

function isInCooldown(
  automationId
) {
  const lastExecution =
    lastExecutionTimes.get(
      automationId
    );

  if (!lastExecution) {
    return false;
  }

  return (
    Date.now() -
      lastExecution <
    EXECUTION_COOLDOWN_MS
  );
}

function updateExecutionTime(
  automationId
) {
  lastExecutionTimes.set(
    automationId,
    Date.now()
  );
}

/* =========================================================
   EXECUTE AUTOMATION
========================================================= */

async function executeAutomation(
  automation
) {
  const automationId =
    automation.id;

  if (!automationId) {
    console.warn(
      "⚠️ Automation has no ID."
    );

    return false;
  }

  if (
    executionLocks.get(
      automationId
    )
  ) {
    console.log(
      "⏳ Automation already executing:",
      automation.name
    );

    return false;
  }

  if (
    isInCooldown(
      automationId
    )
  ) {
    console.log(
      "⏱️ Automation cooldown:",
      automation.name
    );

    return false;
  }

  const action =
    automation.action;

  if (!action?.deviceId) {
    console.warn(
      "⚠️ Automation action has no deviceId:",
      automation.name
    );

    return false;
  }

  const room =
    normalizeRoom(
      action.room
    );

  if (!room) {
    console.warn(
      "⚠️ Automation action has no room:",
      automation.name
    );

    return false;
  }

  const command =
    normalizeState(
      action.command
    );

  if (
    command !== "ON" &&
    command !== "OFF"
  ) {
    console.warn(
      "⚠️ Invalid automation command:",
      command
    );

    return false;
  }

  /*
   * Build the same MQTT topic format
   * used by your Virtual ESP32.
   */
  const topic =
    `home/${room}/${action.deviceId}/control`;

  executionLocks.set(
    automationId,
    true
  );

  try {
    console.log("");
    console.log(
      "🤖 AUTOMATION TRIGGERED"
    );

    console.log(
      "Rule:",
      automation.name
    );

    console.log(
      "Topic:",
      topic
    );

    console.log(
      "Command:",
      command
    );

    const published =
      publishCommand(
        topic,
        command
      );

    if (!published) {
      console.warn(
        "⚠️ MQTT command was not published."
      );

      return false;
    }

    updateExecutionTime(
      automationId
    );

    console.log(
      "✅ Automation command published"
    );

    return true;
  } catch (error) {
    console.error(
      "❌ Automation execution failed:",
      error
    );

    return false;
  } finally {
    executionLocks.delete(
      automationId
    );
  }
}

/* =========================================================
   PROCESS ONE AUTOMATION
========================================================= */

async function processAutomation(
  automation,
  message
) {
  if (!automation?.enabled) {
    return false;
  }

  if (
    !isWithinSchedule(
      automation
    )
  ) {
    return false;
  }

  const matched =
    matchesTrigger(
      automation,
      message
    );

  /*
   * Condition became false.
   *
   * Reset "once" state so the automation
   * can trigger again later.
   */
  if (!matched) {
    if (
      automation.repeat ===
      "once"
    ) {
      resetOnceRule(
        automation.id
      );
    }

    return false;
  }

  /*
   * Condition is TRUE.
   */

  if (
    automation.repeat ===
    "once"
  ) {
    if (
      hasOnceRuleTriggered(
        automation.id
      )
    ) {
      return false;
    }
  }

  const executed =
    await executeAutomation(
      automation
    );

  if (
    executed &&
    automation.repeat ===
      "once"
  ) {
    markOnceRuleTriggered(
      automation.id
    );
  }

  return executed;
}

/* =========================================================
   PROCESS MQTT MESSAGE
========================================================= */

export async function processMQTTMessage(
  userId,
  mqttMessage
) {
  if (!userId) {
    console.warn(
      "⚠️ Automation Engine: missing user ID."
    );

    return;
  }

  if (!mqttMessage) {
    return;
  }

  const topic =
    mqttMessage.topic || "";

  const payload =
    mqttMessage.payload ?? "";

  if (!topic) {
    return;
  }

  console.log(
    "🤖 Automation Engine received:",
    topic,
    payload
  );

  const parts =
    topic.split("/");

  /*
   * Expected sensor:
   *
   * home/living-room/sensor/temperature
   *
   * Expected status:
   *
   * home/living-room/light-lngddy/status
   */
  if (parts.length < 4) {
    return;
  }

  const room =
    normalizeRoom(parts[1]);

  const target =
    parts[2];

  const valueType =
    parts[3];

  let message = null;

  /* =======================================================
     SENSOR MESSAGE
  ======================================================= */

  if (
    target === "sensor"
  ) {
    if (
      valueType !==
        "temperature" &&
      valueType !==
        "humidity"
    ) {
      return;
    }

    const numericValue =
      toNumber(payload);

    if (
      numericValue === null
    ) {
      return;
    }

    message = {
      type: "sensor",

      room,

      sensor:
        valueType,

      value:
        numericValue,
    };
  }

  /* =======================================================
     DEVICE STATUS MESSAGE
  ======================================================= */

  else if (
    valueType === "status"
  ) {
    message = {
      type: "device",

      room,

      deviceId:
        target,

      state:
        normalizeState(
          payload
        ),
    };
  }

  else {
    return;
  }

  /* =======================================================
     LOAD USER AUTOMATIONS
  ======================================================= */

  let automations = [];

  try {
    automations =
      await getAutomationsOnce(
        userId
      );
  } catch (error) {
    console.error(
      "❌ Failed to load automations:",
      error
    );

    return;
  }

  if (
    !automations.length
  ) {
    console.log(
      "ℹ️ No automations configured."
    );

    return;
  }

  console.log(
    `🤖 Checking ${automations.length} automation(s)...`
  );

  /* =======================================================
     PROCESS AUTOMATIONS
  ======================================================= */

  for (
    const automation of automations
  ) {
    try {
      await processAutomation(
        automation,
        message
      );
    } catch (error) {
      console.error(
        "❌ Automation processing error:",
        automation?.name,
        error
      );
    }
  }
}

/* =========================================================
   TEST FUNCTION
========================================================= */

export async function testAutomationEngine(
  userId,
  topic,
  payload
) {
  console.log(
    "🧪 Testing automation engine..."
  );

  await processMQTTMessage(
    userId,
    {
      topic,
      payload,
    }
  );
}

/* =========================================================
   CLEAR STATE
========================================================= */

export function clearAutomationEngineState() {
  triggeredOnceRules.clear();

  executionLocks.clear();

  lastExecutionTimes.clear();

  console.log(
    "🧹 Automation engine state cleared."
  );
}