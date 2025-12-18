/**
 * MQTT Mock Publisher
 * Simulates ESP8266 sensor & device status data for testing UI without hardware
 */

const mqtt = require('mqtt');

const TOPIC_PREFIX = "smarthome/test";
const client = mqtt.connect('wss://test.mosquitto.org:8081');

client.on('connect', () => {
  console.log("📡 MQTT Connected - Mock publisher running");

  setInterval(() => {
    const temp = (20 + Math.random() * 10).toFixed(2);

    client.publish(`${TOPIC_PREFIX}/sensors/temperature`, temp);
    console.log("🔥 Temp Update →", temp);

    const lightState = Math.random() > 0.5;
    client.publish(`${TOPIC_PREFIX}/status/light`, JSON.stringify({ state: lightState }));
    console.log("💡 Light State →", lightState ? "ON" : "OFF");
  }, 2000);
});

client.on('error', err => console.error("MQTT Error:", err));
