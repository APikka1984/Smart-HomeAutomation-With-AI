import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { db } from "../firebase";

const AUTOMATIONS_COLLECTION = "automations";

/* =========================================================
   FIRESTORE REFERENCES
========================================================= */

function automationsRef(userId) {
  if (!userId) {
    throw new Error("Missing user ID.");
  }

  return collection(
    db,
    "users",
    userId,
    AUTOMATIONS_COLLECTION
  );
}

function automationRef(userId, automationId) {
  if (!userId || !automationId) {
    throw new Error(
      "Missing user ID or automation ID."
    );
  }

  return doc(
    db,
    "users",
    userId,
    AUTOMATIONS_COLLECTION,
    automationId
  );
}

/* =========================================================
   NORMALIZATION HELPERS
========================================================= */

function normalizeRoom(room = "") {
  return String(room)
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

function normalizeCommand(command = "") {
  const value = String(command)
    .trim()
    .toUpperCase();

  if (value !== "ON" && value !== "OFF") {
    throw new Error(
      "Automation command must be ON or OFF."
    );
  }

  return value;
}

function normalizeOperator(operator = "") {
  const allowedOperators = [
    "<",
    ">",
    "<=",
    ">=",
    "==",
  ];

  if (!allowedOperators.includes(operator)) {
    throw new Error(
      "Invalid automation condition."
    );
  }

  return operator;
}

/* =========================================================
   NORMALIZE AUTOMATION
========================================================= */

/**
 * Converts the Automation Modal data into a clean,
 * predictable Firestore structure.
 *
 * Sensor automation:
 *
 * trigger:
 *   type: sensor
 *   room: living-room
 *   sensor: temperature
 *   operator: >
 *   value: 26
 *
 * Device automation:
 *
 * trigger:
 *   type: device
 *   deviceId: xyz
 *   deviceState: ON
 *
 * Time automation:
 *
 * trigger:
 *   type: time
 *   time: 20:00
 */
export function normalizeAutomation(input = {}) {
  const triggerInput = input.trigger || {};
  const actionInput = input.action || {};
  const scheduleInput = input.schedule || {};

  const triggerType =
    triggerInput.type || "sensor";

  const automation = {
    name: String(input.name || "").trim(),

    enabled: Boolean(input.enabled),

    trigger: {
      type: triggerType,
    },

    action: {
      deviceId: String(
        actionInput.deviceId || ""
      ),

      room: normalizeRoom(
        actionInput.room || ""
      ),

      command: normalizeCommand(
        actionInput.command || "ON"
      ),
    },

    repeat: input.repeat || "always",

    schedule: {
      enabled: Boolean(
        scheduleInput.enabled
      ),

      startTime:
        scheduleInput.startTime || "",

      endTime:
        scheduleInput.endTime || "",
    },
  };

  /* -------------------------------------------------------
     BASIC VALIDATION
  ------------------------------------------------------- */

  if (!automation.name) {
    throw new Error(
      "Automation name is required."
    );
  }

  if (!automation.action.deviceId) {
    throw new Error(
      "Action device is required."
    );
  }

  /* -------------------------------------------------------
     SENSOR TRIGGER
  ------------------------------------------------------- */

  if (triggerType === "sensor") {
    const value = Number(
      triggerInput.value
    );

    if (!triggerInput.room) {
      throw new Error(
        "Sensor trigger room is required."
      );
    }

    if (
      ![
        "temperature",
        "humidity",
      ].includes(triggerInput.sensor)
    ) {
      throw new Error(
        "Invalid sensor type."
      );
    }

    if (!Number.isFinite(value)) {
      throw new Error(
        "Sensor trigger value must be a number."
      );
    }

    automation.trigger = {
      type: "sensor",

      room: normalizeRoom(
        triggerInput.room
      ),

      sensor: triggerInput.sensor,

      operator: normalizeOperator(
        triggerInput.operator
      ),

      value,
    };
  }

  /* -------------------------------------------------------
     DEVICE TRIGGER
  ------------------------------------------------------- */

  else if (triggerType === "device") {
    if (!triggerInput.deviceId) {
      throw new Error(
        "Trigger device is required."
      );
    }

    const deviceState = String(
      triggerInput.deviceState || ""
    ).toUpperCase();

    if (
      !["ON", "OFF"].includes(
        deviceState
      )
    ) {
      throw new Error(
        "Trigger device state must be ON or OFF."
      );
    }

    automation.trigger = {
      type: "device",

      deviceId:
        triggerInput.deviceId,

      deviceState,
    };
  }

  /* -------------------------------------------------------
     TIME TRIGGER
  ------------------------------------------------------- */

  else if (triggerType === "time") {
    if (!triggerInput.time) {
      throw new Error(
        "Trigger time is required."
      );
    }

    automation.trigger = {
      type: "time",

      time: triggerInput.time,
    };
  }

  /* -------------------------------------------------------
     INVALID TRIGGER
  ------------------------------------------------------- */

  else {
    throw new Error(
      "Unsupported automation trigger type."
    );
  }

  return automation;
}

/* =========================================================
   CREATE AUTOMATION
========================================================= */

export async function createAutomation(
  userId,
  data
) {
  const automation =
    normalizeAutomation(data);

  const ref = await addDoc(
    automationsRef(userId),
    {
      ...automation,

      createdAt:
        serverTimestamp(),

      updatedAt:
        serverTimestamp(),
    }
  );

  console.log(
    "✅ Automation created:",
    ref.id
  );

  return ref.id;
}

/* =========================================================
   UPDATE AUTOMATION
========================================================= */

export async function updateAutomation(
  userId,
  automationId,
  data
) {
  const automation =
    normalizeAutomation(data);

  await updateDoc(
    automationRef(
      userId,
      automationId
    ),
    {
      ...automation,

      updatedAt:
        serverTimestamp(),
    }
  );

  console.log(
    "✅ Automation updated:",
    automationId
  );
}

/* =========================================================
   DELETE AUTOMATION
========================================================= */

export async function deleteAutomation(
  userId,
  automationId
) {
  await deleteDoc(
    automationRef(
      userId,
      automationId
    )
  );

  console.log(
    "🗑️ Automation deleted:",
    automationId
  );
}

/* =========================================================
   ENABLE / DISABLE
========================================================= */

export async function toggleAutomation(
  userId,
  automationId,
  enabled
) {
  await updateDoc(
    automationRef(
      userId,
      automationId
    ),
    {
      enabled: Boolean(enabled),

      updatedAt:
        serverTimestamp(),
    }
  );

  console.log(
    `🔄 Automation ${
      enabled ? "enabled" : "disabled"
    }:`,
    automationId
  );
}

/* =========================================================
   DUPLICATE AUTOMATION
========================================================= */

export async function duplicateAutomation(
  userId,
  automation
) {
  if (!automation) {
    throw new Error(
      "Automation is required."
    );
  }

  const copy =
    normalizeAutomation({
      name: `${
        automation.name ||
        "Automation"
      } (Copy)`,

      enabled:
        Boolean(
          automation.enabled
        ),

      trigger:
        automation.trigger,

      action:
        automation.action,

      repeat:
        automation.repeat ||
        "always",

      schedule:
        automation.schedule,
    });

  const ref = await addDoc(
    automationsRef(userId),
    {
      ...copy,

      createdAt:
        serverTimestamp(),

      updatedAt:
        serverTimestamp(),
    }
  );

  console.log(
    "📋 Automation duplicated:",
    ref.id
  );

  return ref.id;
}

/* =========================================================
   REAL-TIME AUTOMATION LISTENER
========================================================= */

export function subscribeToAutomations(
  userId,
  onData,
  onError
) {
  if (!userId) {
    console.warn(
      "⚠️ Cannot subscribe to automations: missing user ID."
    );

    return () => {};
  }

  const ref =
    automationsRef(userId);

  const automationQuery =
    query(
      ref,
      orderBy(
        "createdAt",
        "desc"
      )
    );

  return onSnapshot(
    automationQuery,
    (snapshot) => {
      const automations =
        snapshot.docs.map(
          (item) => ({
            id: item.id,
            ...item.data(),
          })
        );

      console.log(
        "📋 Automations loaded:",
        automations.length
      );

      onData?.(automations);
    },

    (error) => {
      console.error(
        "❌ Automation listener error:",
        error
      );

      onError?.(error);
    }
  );
}

/* =========================================================
   TIMESTAMP HELPER
========================================================= */

export function timestampToDate(
  timestamp
) {
  if (!timestamp) {
    return null;
  }

  if (
    typeof timestamp.toDate ===
    "function"
  ) {
    return timestamp.toDate();
  }

  if (
    timestamp instanceof Date
  ) {
    return timestamp;
  }

  return null;
}
export async function getAutomationsOnce(userId) {
  const ref = automationsRef(userId);

  const automationQuery = query(
    ref,
    orderBy("createdAt", "desc")
  );

  const snapshot = await getDocs(automationQuery);

  return snapshot.docs.map((item) => ({
    id: item.id,
    ...item.data(),
  }));
}