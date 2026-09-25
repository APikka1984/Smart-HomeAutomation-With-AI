import mqtt from "mqtt";

const BROKER_URL = "mqtt://broker.emqx.io:1883";

const client = mqtt.connect(BROKER_URL, {
  clientId: `virtual-esp32-${Math.random()
    .toString(16)
    .slice(2)}`,
  clean: true,
  reconnectPeriod: 3000,
  connectTimeout: 10000,
});

/* =========================================================
   SENSOR CONFIGURATION
========================================================= */

const SENSOR_ROOM = "living-room";

let temperature = 24.6;
let humidity = 58;

let sensorInterval = null;

/* =========================================================
   MQTT CONNECT
========================================================= */

client.on("connect", () => {
  console.log("");
  console.log("================================");
  console.log("✅ Virtual ESP32 connected");
  console.log("================================");
  console.log("📡 Listening for device commands...");

  /*
    Subscribe to device control commands.
  */

  client.subscribe("home/+/+/control", (error) => {
    if (error) {
      console.error(
        "❌ Subscription failed:",
        error
      );

      return;
    }

    console.log(
      "📡 Device command subscription active"
    );
  });

  /*
    Publish the first sensor reading immediately.
  */

  publishSensorData();

  /*
    Start sensor simulation only once.

    This prevents multiple intervals from
    being created after MQTT reconnects.
  */

  if (!sensorInterval) {
    sensorInterval = setInterval(() => {
      generateSensorData();
      publishSensorData();
    }, 5000);
  }
});

/* =========================================================
   DEVICE COMMANDS
========================================================= */

client.on(
  "message",
  (topic, message) => {
    const command = message
      .toString()
      .trim()
      .toUpperCase();

    /*
      Ignore sensor topics.

      We only process /control topics.
    */

    if (!topic.endsWith("/control")) {
      return;
    }

    console.log("");
    console.log("📩 Command received");
    console.log("Topic:", topic);
    console.log("Command:", command);

    /*
      Only ON and OFF are supported.
    */

    if (
      command !== "ON" &&
      command !== "OFF"
    ) {
      console.log("⚠️ Unknown command");
      return;
    }

    /*
      Convert:

      /control

      into:

      /status
    */

    const statusTopic =
      topic.replace(
        "/control",
        "/status"
      );

    console.log(
      "📤 Publishing status:",
      statusTopic,
      command
    );

    client.publish(
      statusTopic,
      command,
      (error) => {
        if (error) {
          console.error(
            "❌ Failed to publish status:",
            error
          );

          return;
        }

        console.log(
          "✅ Status published successfully"
        );
      }
    );
  }
);

/* =========================================================
   SENSOR DATA GENERATION
========================================================= */

function generateSensorData() {
  /*
    Generate simulated temperature.

    Range:
    23.0°C - 27.0°C
  */

  temperature =
    23 +
    Math.random() * 4;

  /*
    Generate simulated humidity.

    Range:
    50% - 65%
  */

  humidity =
    50 +
    Math.random() * 15;

  /*
    Keep one decimal place.
  */

  temperature =
    Number(
      temperature.toFixed(1)
    );

  humidity =
    Number(
      humidity.toFixed(1)
    );
}

/* =========================================================
   PUBLISH SENSOR DATA
========================================================= */

function publishSensorData() {
  const temperatureTopic =
    `home/${SENSOR_ROOM}/sensor/temperature`;

  const humidityTopic =
    `home/${SENSOR_ROOM}/sensor/humidity`;

  /*
    Publish temperature.
  */

  client.publish(
    temperatureTopic,
    String(temperature)
  );

  /*
    Publish humidity.
  */

  client.publish(
    humidityTopic,
    String(humidity)
  );

  console.log(
    `🌡️ Temperature: ${temperature}°C`
  );

  console.log(
    `💧 Humidity: ${humidity}%`
  );
}

/* =========================================================
   MQTT EVENTS
========================================================= */

client.on(
  "error",
  (error) => {
    console.error(
      "❌ Virtual ESP32 MQTT error:",
      error
    );
  }
);

client.on(
  "offline",
  () => {
    console.log(
      "⚠️ Virtual ESP32 offline"
    );
  }
);

client.on(
  "reconnect",
  () => {
    console.log(
      "🔄 Virtual ESP32 reconnecting..."
    );
  }
);