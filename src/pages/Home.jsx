import { Link } from "react-router-dom";
import {
  Home as HomeIcon,
  Lightbulb,
  ShieldCheck,
  Mic,
  Wifi,
  BarChart3,
  ArrowRight,
  Zap,
  Smartphone,
} from "lucide-react";

export default function Home() {
  const features = [
    {
      icon: <Lightbulb size={28} />,
      title: "Smart Device Control",
      description:
        "Control lights, fans, ACs, TVs and other connected devices from one dashboard.",
    },
    {
      icon: <Mic size={28} />,
      title: "Voice AI Control",
      description:
        "Use natural voice commands to control your smart home devices quickly.",
    },
    {
      icon: <Wifi size={28} />,
      title: "MQTT Connectivity",
      description:
        "Communicate with IoT devices in real time using MQTT communication.",
    },
    {
      icon: <BarChart3 size={28} />,
      title: "Live Monitoring",
      description:
        "Monitor temperature, humidity, power consumption and device activity.",
    },
    {
      icon: <ShieldCheck size={28} />,
      title: "Secure Authentication",
      description:
        "Protect your smart home dashboard using Firebase authentication.",
    },
    {
      icon: <Smartphone size={28} />,
      title: "Responsive Dashboard",
      description:
        "Access and manage your smart home from desktop, tablet or mobile.",
    },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-white">

      {/* ================= NAVBAR ================= */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/10 bg-slate-950/90 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">

          {/* Logo */}
          <Link
            to="/"
            className="flex items-center gap-3"
          >
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center">
              <HomeIcon size={22} />
            </div>

            <div>
              <h1 className="text-lg font-bold">
                Smart Home
              </h1>

              <p className="text-xs text-slate-400">
                AI Automation
              </p>
            </div>
          </Link>

          {/* Navigation */}
          <div className="hidden md:flex items-center gap-8 text-sm">
            <a
              href="#home"
              className="text-slate-300 hover:text-white transition"
            >
              Home
            </a>

            <a
              href="#features"
              className="text-slate-300 hover:text-white transition"
            >
              Features
            </a>

            <a
              href="#about"
              className="text-slate-300 hover:text-white transition"
            >
              About
            </a>
          </div>

          {/* Login */}
          <Link
            to="/auth"
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 px-5 py-2.5 rounded-lg font-medium transition"
          >
            Login
            <ArrowRight size={17} />
          </Link>
        </div>
      </nav>

      {/* ================= HERO ================= */}
      <section
        id="home"
        className="pt-32 pb-20 px-6"
      >
        <div className="max-w-7xl mx-auto">

          <div className="grid lg:grid-cols-2 gap-14 items-center">

            {/* Hero Text */}
            <div>

              <div className="inline-flex items-center gap-2 px-4 py-2 mb-6 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm">
                <Zap size={16} />
                AI Powered Smart Home
              </div>

              <h1 className="text-5xl md:text-6xl font-bold leading-tight">
                Control Your Home
                <span className="block text-blue-500">
                  Intelligently
                </span>
              </h1>

              <p className="mt-6 text-lg text-slate-400 max-w-xl leading-8">
                A modern IoT smart home platform that lets you
                monitor and control connected devices using
                real-time MQTT communication and AI-powered
                voice commands.
              </p>

              {/* Buttons */}
              <div className="flex flex-wrap gap-4 mt-8">

                <Link
                  to="/auth"
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded-xl font-semibold transition"
                >
                  Get Started
                  <ArrowRight size={19} />
                </Link>

                <a
                  href="#features"
                  className="px-6 py-3 rounded-xl border border-slate-700 hover:bg-slate-800 transition font-semibold"
                >
                  Explore Features
                </a>

              </div>

              {/* Small Stats */}
              <div className="grid grid-cols-3 gap-6 mt-12 max-w-lg">

                <div>
                  <h3 className="text-2xl font-bold">
                    24/7
                  </h3>
                  <p className="text-sm text-slate-500">
                    Monitoring
                  </p>
                </div>

                <div>
                  <h3 className="text-2xl font-bold">
                    MQTT
                  </h3>
                  <p className="text-sm text-slate-500">
                    IoT Protocol
                  </p>
                </div>

                <div>
                  <h3 className="text-2xl font-bold">
                    AI
                  </h3>
                  <p className="text-sm text-slate-500">
                    Voice Control
                  </p>
                </div>

              </div>
            </div>

            {/* Hero Dashboard Preview */}
            <div className="relative">

              {/* Glow */}
              <div className="absolute inset-0 bg-blue-600/20 blur-3xl rounded-full" />

              <div className="relative bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl">

                {/* Dashboard Header */}
                <div className="flex justify-between items-center mb-6">

                  <div>
                    <p className="text-sm text-slate-400">
                      Smart Dashboard
                    </p>

                    <h2 className="text-xl font-bold">
                      Good Evening 👋
                    </h2>
                  </div>

                  <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center">
                    <HomeIcon size={20} />
                  </div>

                </div>

                {/* Status */}
                <div className="bg-slate-800 rounded-2xl p-4 mb-5">

                  <div className="flex items-center justify-between">

                    <div className="flex items-center gap-3">

                      <div className="w-10 h-10 bg-green-500/20 text-green-400 rounded-lg flex items-center justify-center">
                        <Wifi size={20} />
                      </div>

                      <div>
                        <p className="font-semibold">
                          MQTT Connection
                        </p>

                        <p className="text-xs text-green-400">
                          Connected
                        </p>
                      </div>

                    </div>

                    <div className="w-3 h-3 bg-green-500 rounded-full" />

                  </div>

                </div>

                {/* Devices */}
                <div className="grid grid-cols-2 gap-4">

                  {/* Light */}
                  <div className="bg-slate-800 rounded-2xl p-4">

                    <div className="flex justify-between items-center">

                      <div className="w-10 h-10 rounded-xl bg-yellow-500/20 text-yellow-400 flex items-center justify-center">
                        <Lightbulb size={21} />
                      </div>

                      <div className="w-10 h-5 rounded-full bg-blue-600 relative">
                        <div className="absolute right-1 top-1 w-3 h-3 bg-white rounded-full" />
                      </div>

                    </div>

                    <p className="mt-4 font-semibold">
                      Living Room Light
                    </p>

                    <p className="text-xs text-green-400 mt-1">
                      ON
                    </p>

                  </div>

                  {/* Fan */}
                  <div className="bg-slate-800 rounded-2xl p-4">

                    <div className="flex justify-between items-center">

                      <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center">
                        <span className="text-xl">
                          🌀
                        </span>
                      </div>

                      <div className="w-10 h-5 rounded-full bg-slate-600 relative">
                        <div className="absolute left-1 top-1 w-3 h-3 bg-white rounded-full" />
                      </div>

                    </div>

                    <p className="mt-4 font-semibold">
                      Bedroom Fan
                    </p>

                    <p className="text-xs text-slate-500 mt-1">
                      OFF
                    </p>

                  </div>

                </div>

                {/* Sensor Data */}
                <div className="grid grid-cols-3 gap-3 mt-4">

                  <div className="bg-slate-800 rounded-xl p-3 text-center">
                    <p className="text-xs text-slate-500">
                      Temperature
                    </p>
                    <p className="text-lg font-bold mt-1">
                      24°C
                    </p>
                  </div>

                  <div className="bg-slate-800 rounded-xl p-3 text-center">
                    <p className="text-xs text-slate-500">
                      Humidity
                    </p>
                    <p className="text-lg font-bold mt-1">
                      58%
                    </p>
                  </div>

                  <div className="bg-slate-800 rounded-xl p-3 text-center">
                    <p className="text-xs text-slate-500">
                      Power
                    </p>
                    <p className="text-lg font-bold mt-1">
                      120W
                    </p>
                  </div>

                </div>

              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ================= FEATURES ================= */}
      <section
        id="features"
        className="py-24 px-6 bg-slate-900/60"
      >
        <div className="max-w-7xl mx-auto">

          <div className="text-center max-w-2xl mx-auto mb-14">

            <p className="text-blue-500 font-semibold mb-3">
              FEATURES
            </p>

            <h2 className="text-4xl font-bold">
              Everything You Need for a Smart Home
            </h2>

            <p className="text-slate-400 mt-4">
              Manage your IoT devices, monitor sensors and
              interact with your home through a single platform.
            </p>

          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">

            {features.map((feature) => (
              <div
                key={feature.title}
                className="bg-slate-900 border border-slate-800 rounded-2xl p-6 hover:border-blue-500/50 hover:-translate-y-1 transition"
              >

                <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center mb-5">
                  {feature.icon}
                </div>

                <h3 className="text-xl font-semibold">
                  {feature.title}
                </h3>

                <p className="text-slate-400 mt-3 leading-7">
                  {feature.description}
                </p>

              </div>
            ))}

          </div>
        </div>
      </section>

      {/* ================= ABOUT ================= */}
      <section
        id="about"
        className="py-24 px-6"
      >
        <div className="max-w-5xl mx-auto text-center">

          <div className="w-16 h-16 mx-auto rounded-2xl bg-blue-600 flex items-center justify-center mb-6">
            <HomeIcon size={32} />
          </div>

          <h2 className="text-4xl font-bold">
            Built for Modern IoT Automation
          </h2>

          <p className="text-slate-400 mt-6 text-lg leading-8 max-w-3xl mx-auto">
            Smart Home combines React, Firebase, MQTT and
            machine-learning based voice intent recognition
            to create an intelligent home automation system.
          </p>

          <div className="flex flex-wrap justify-center gap-3 mt-8">

            {[
              "React",
              "Firebase",
              "MQTT",
              "EMQX",
              "Machine Learning",
              "Web Speech API",
              "Recharts",
            ].map((technology) => (
              <span
                key={technology}
                className="px-4 py-2 rounded-full bg-slate-900 border border-slate-800 text-sm text-slate-300"
              >
                {technology}
              </span>
            ))}

          </div>

        </div>
      </section>

      {/* ================= CTA ================= */}
      <section className="px-6 pb-24">

        <div className="max-w-5xl mx-auto bg-blue-600 rounded-3xl p-10 md:p-14 text-center">

          <h2 className="text-3xl md:text-4xl font-bold">
            Ready to Make Your Home Smarter?
          </h2>

          <p className="mt-4 text-blue-100 max-w-2xl mx-auto">
            Start controlling and monitoring your smart devices
            from a single intelligent dashboard.
          </p>

          <Link
            to="/auth"
            className="inline-flex items-center gap-2 mt-8 bg-white text-blue-600 px-7 py-3 rounded-xl font-bold hover:bg-slate-100 transition"
          >
            Get Started
            <ArrowRight size={19} />
          </Link>

        </div>

      </section>

      {/* ================= FOOTER ================= */}
      <footer className="border-t border-slate-800 py-8 px-6">

        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">

          <div className="flex items-center gap-2">

            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <HomeIcon size={17} />
            </div>

            <span className="font-semibold">
              Smart Home AI
            </span>

          </div>

          <p className="text-sm text-slate-500">
            © {new Date().getFullYear()} Smart Home Automation.
            All rights reserved.
          </p>

        </div>

      </footer>

    </div>
  );
}