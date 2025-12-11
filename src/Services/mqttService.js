import mqtt from "mqtt";

class MQTTService {
  constructor() {
    this.client = null;
    this.handlers = [];
  }

  connect() {
    if (this.client) return;

    const options = {
      clientId: "web_client_" + Math.random().toString(16).slice(2),
      clean: true,
      reconnectPeriod: 2000,
    };

    this.client = mqtt.connect("ws://broker.emqx.io:8083/mqtt", options);

    this.client.on("connect", () => {
      console.log("🔥 MQTT Connected");

      this.client.subscribe("smarthome/livingroom/sensors/temperature");
      this.client.subscribe("smarthome/livingroom/sensors/humidity");
      this.client.subscribe("smarthome/livingroom/status/#");
    });

    this.client.on("error", (err) => {
      console.error("MQTT Connection Error:", err);
      this.client.end();
    });

    this.client.on("message", (topic, message) => {
      let payload;
      try {
        payload = JSON.parse(message.toString());
      } catch {
        payload = { value: message.toString() };
      }

      this.handlers.forEach((cb) => cb(topic, payload));
    });
  }

  publish(topic, data = {}) {
    if (!this.client || !this.client.connected) {
      console.warn("⚠ MQTT not connected yet!");
      return;
    }
    this.client.publish(topic, JSON.stringify(data));
  }

  disconnect() {
    if (this.client) {
      this.client.end();
      this.client = null;
      this.handlers = []; // clean handlers on disconnect
      console.log("🔌 MQTT Disconnected");
    }
  }

  addMessageHandler(cb) {
    if (typeof cb === "function") this.handlers.push(cb);
  }

  removeMessageHandler(cb) {
    this.handlers = this.handlers.filter((fn) => fn !== cb);
  }
}

const mqttService = new MQTTService();
export default mqttService;
