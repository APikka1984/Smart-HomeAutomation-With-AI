import mqtt from "mqtt";

const BROKER_URL = "wss://broker.emqx.io:8084/mqtt";

let client = null;

const subscribedTopics = new Set();
const pendingSubscriptions = new Set();

let statusCallback = null;
let messageCallback = null;

/* ==============================
   CONNECT MQTT
============================== */

export const connectMQTT = ({
  onMessage,
  onStatus,
} = {}) => {
  console.log("🔌 Connecting to MQTT:", BROKER_URL);

  /*
    If an active client already exists,
    reuse it instead of creating another one.
  */

  if (client) {
    statusCallback = onStatus;
    messageCallback = onMessage;

    if (client.connected) {
      console.log("✅ MQTT already connected");
      onStatus?.(true);
    }

    return client;
  }

  statusCallback = onStatus;
  messageCallback = onMessage;

  client = mqtt.connect(BROKER_URL, {
    clientId: `smart-home-web-${Math.random()
      .toString(16)
      .slice(2)}`,

    clean: true,

    reconnectPeriod: 3000,

    connectTimeout: 10000,
  });

  /* ==============================
     CONNECTED
  ============================== */

  client.on("connect", () => {
    console.log("================================");
    console.log("✅ MQTT connected");
    console.log("================================");

    statusCallback?.(true);

    /*
      Restore all subscriptions after
      reconnecting.
    */

    subscribedTopics.forEach((topic) => {
      subscribeInternal(topic);
    });
  });

  /* ==============================
     MESSAGE
  ============================== */

  client.on("message", (topic, message) => {
    const payload = message.toString();

    console.log("📩 MQTT message:", {
      topic,
      payload,
    });

    messageCallback?.(topic, payload);
  });

  /* ==============================
     CLOSE
  ============================== */

  client.on("close", () => {
    console.log("🔴 MQTT disconnected");

    statusCallback?.(false);
  });

  /* ==============================
     OFFLINE
  ============================== */

  client.on("offline", () => {
    console.log("⚠️ MQTT offline");

    statusCallback?.(false);
  });

  /* ==============================
     ERROR
  ============================== */

  client.on("error", (error) => {
    console.error("❌ MQTT error:", error);

    statusCallback?.(false);
  });

  /* ==============================
     RECONNECT
  ============================== */

  client.on("reconnect", () => {
    console.log("🔄 MQTT reconnecting...");
  });

  return client;
};

/* ==============================
   INTERNAL SUBSCRIBE
============================== */

const subscribeInternal = (topic) => {
  if (!client || !client.connected) {
    return;
  }

  if (pendingSubscriptions.has(topic)) {
    return;
  }

  pendingSubscriptions.add(topic);

  client.subscribe(topic, (error) => {
    pendingSubscriptions.delete(topic);

    if (error) {
      console.error(
        `❌ Failed to subscribe to ${topic}:`,
        error
      );

      return;
    }

    subscribedTopics.add(topic);

    console.log(
      `📡 Subscribed to MQTT topic: ${topic}`
    );
  });
};

/* ==============================
   SUBSCRIBE
============================== */

export const subscribeToTopic = (topic) => {
  if (!topic) {
    return false;
  }

  /*
    Remember the topic even if MQTT is
    temporarily disconnected.

    It will be subscribed automatically
    when MQTT connects.
  */

  subscribedTopics.add(topic);

  if (!client || !client.connected) {
    console.log(
      "⏳ MQTT not connected yet. Subscription queued:",
      topic
    );

    return false;
  }

  subscribeInternal(topic);

  return true;
};

/* ==============================
   UNSUBSCRIBE
============================== */

export const unsubscribeFromTopic = (topic) => {
  if (!topic) {
    return false;
  }

  subscribedTopics.delete(topic);
  pendingSubscriptions.delete(topic);

  if (!client || !client.connected) {
    return false;
  }

  client.unsubscribe(topic, (error) => {
    if (error) {
      console.error(
        `❌ Failed to unsubscribe from ${topic}:`,
        error
      );

      return;
    }

    console.log(
      `🔕 Unsubscribed from MQTT topic: ${topic}`
    );
  });

  return true;
};

/* ==============================
   PUBLISH COMMAND
============================== */

export const publishCommand = (
  topic,
  command
) => {
  if (!client || !client.connected) {
    console.warn(
      "⚠️ MQTT is not connected. Cannot publish."
    );

    return false;
  }

  client.publish(
    topic,
    String(command),
    {
      qos: 0,
      retain: false,
    },
    (error) => {
      if (error) {
        console.error(
          `❌ Failed to publish to ${topic}:`,
          error
        );

        return;
      }

      console.log(
        `📤 MQTT command sent: ${topic} → ${command}`
      );
    }
  );

  return true;
};

/* ==============================
   DISCONNECT MQTT
============================== */

export const disconnectMQTT = () => {
  if (!client) {
    return;
  }

  console.log("🔌 Disconnecting MQTT...");

  statusCallback?.(false);

  /*
    Clear subscriptions only when we
    intentionally destroy MQTT.
  */

  subscribedTopics.clear();
  pendingSubscriptions.clear();

  const currentClient = client;

  client = null;
  statusCallback = null;
  messageCallback = null;

  currentClient.end(true);
};