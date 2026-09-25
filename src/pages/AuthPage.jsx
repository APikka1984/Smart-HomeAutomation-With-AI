import { useState } from "react";
import {
  Mail,
  Lock,
  User,
  Eye,
  EyeOff,
  LogIn,
  UserPlus,
  ArrowLeft,
  Home,
  ShieldCheck,
  Mic,
  Wifi,
} from "lucide-react";

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  updateProfile,
} from "firebase/auth";

import { useNavigate, Link } from "react-router-dom";
import toast from "react-hot-toast";

import { auth, googleProvider } from "../firebase";

export default function AuthPage() {
  const navigate = useNavigate();

  const [mode, setMode] = useState("login");
  const [showPassword, setShowPassword] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
  });

  const [loading, setLoading] = useState(false);

  const isLogin = mode === "login";

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const name = formData.name.trim();
    const email = formData.email.trim();
    const password = formData.password;

    if (!email || !password) {
      toast.error("Please enter your email and password.");
      return;
    }

    if (!isLogin && !name) {
      toast.error("Please enter your name.");
      return;
    }

    if (password.length < 6) {
      toast.error("Password must contain at least 6 characters.");
      return;
    }

    try {
      setLoading(true);

      if (isLogin) {
        // LOGIN
        await signInWithEmailAndPassword(auth, email, password);

        toast.success("Login successful!");

        navigate("/dashboard");
      } else {
        // REGISTER
        const userCredential =
          await createUserWithEmailAndPassword(
            auth,
            email,
            password
          );

        // Save user's name in Firebase Auth profile
        await updateProfile(userCredential.user, {
          displayName: name,
        });

        toast.success("Account created successfully!");

        navigate("/dashboard");
      }
    } catch (error) {
      console.error("Authentication error:", error);

      let message = "Something went wrong.";

      switch (error.code) {
        case "auth/invalid-email":
          message = "Please enter a valid email address.";
          break;

        case "auth/user-not-found":
          message = "No account found with this email.";
          break;

        case "auth/wrong-password":
        case "auth/invalid-credential":
          message = "Invalid email or password.";
          break;

        case "auth/email-already-in-use":
          message = "An account already exists with this email.";
          break;

        case "auth/weak-password":
          message = "Password should contain at least 6 characters.";
          break;

        case "auth/popup-closed-by-user":
          message = "Google login was cancelled.";
          break;

        case "auth/popup-blocked":
          message = "Popup was blocked by your browser.";
          break;

        case "auth/network-request-failed":
          message = "Network error. Please check your internet.";
          break;

        default:
          message = error.message || "Authentication failed.";
      }

      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      setLoading(true);

      await signInWithPopup(auth, googleProvider);

      toast.success("Google login successful!");

      navigate("/dashboard");
    } catch (error) {
      console.error("Google login error:", error);

      let message = "Google login failed.";

      switch (error.code) {
        case "auth/popup-closed-by-user":
          message = "Google login was cancelled.";
          break;

        case "auth/popup-blocked":
          message = "Popup was blocked by your browser.";
          break;

        case "auth/account-exists-with-different-credential":
          message =
            "An account already exists with another login method.";
          break;

        case "auth/network-request-failed":
          message = "Network error. Please try again.";
          break;

        default:
          message = error.message || "Google login failed.";
      }

      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleGuestMode = () => {
    navigate("/guest");
  };

  const switchMode = () => {
    setMode((prev) => (prev === "login" ? "register" : "login"));

    setFormData({
      name: "",
      email: "",
      password: "",
    });

    setShowPassword(false);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Background */}
      <div className="fixed inset-0 -z-0 overflow-hidden">
        <div className="absolute left-[-150px] top-[-150px] h-[400px] w-[400px] rounded-full bg-cyan-500/20 blur-[120px]" />

        <div className="absolute right-[-150px] top-[20%] h-[400px] w-[400px] rounded-full bg-blue-600/20 blur-[120px]" />

        <div className="absolute bottom-[-150px] left-[30%] h-[400px] w-[400px] rounded-full bg-purple-600/20 blur-[120px]" />

        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.025)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.025)_1px,transparent_1px)] bg-[size:50px_50px]" />
      </div>

      {/* Navbar */}
      <header className="relative z-10 border-b border-white/10 bg-slate-950/70 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 lg:px-8">
          <Link
            to="/"
            className="flex items-center gap-2"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-500 text-slate-950">
              <Home size={20} />
            </div>

            <div>
              <h1 className="text-sm font-bold sm:text-base">
                Smart Home
              </h1>

              <p className="hidden text-[10px] text-slate-400 sm:block">
                AI Automation
              </p>
            </div>
          </Link>

          <Link
            to="/"
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-300 transition hover:bg-white/10 hover:text-white"
          >
            <ArrowLeft size={17} />
            <span className="hidden sm:block">
              Back to Home
            </span>
          </Link>
        </div>
      </header>

      {/* Main */}
      <main className="relative z-10 flex min-h-[calc(100vh-64px)] items-center justify-center px-4 py-10">
        <div className="grid w-full max-w-6xl overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04] shadow-2xl backdrop-blur-xl lg:grid-cols-2">

          {/* Left Side */}
          <section className="hidden flex-col justify-between bg-gradient-to-br from-cyan-500/10 via-blue-500/5 to-purple-500/10 p-10 lg:flex xl:p-14">

            <div>
              <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-4 py-2 text-sm text-cyan-300">
                <Wifi size={16} />
                Connected Home
              </div>

              <h2 className="max-w-lg text-4xl font-bold leading-tight xl:text-5xl">
                Control your home
                <span className="block text-cyan-400">
                  intelligently.
                </span>
              </h2>

              <p className="mt-6 max-w-md leading-7 text-slate-400">
                Manage your smart devices, monitor your
                environment, and control your home using
                AI-powered voice commands.
              </p>
            </div>

            <div className="mt-10 space-y-4">
              <Feature
                icon={<ShieldCheck size={20} />}
                title="Secure Authentication"
                text="Your account and smart-home data stay protected."
              />

              <Feature
                icon={<Mic size={20} />}
                title="AI Voice Control"
                text="Control lights, fans and appliances naturally."
              />

              <Feature
                icon={<Wifi size={20} />}
                title="Real-time MQTT"
                text="Communicate with your smart devices in real time."
              />
            </div>
          </section>

          {/* Right Side */}
          <section className="p-6 sm:p-8 lg:p-10 xl:p-12">

            {/* Mobile Logo */}
            <div className="mb-8 flex items-center justify-center lg:hidden">
              <div className="flex items-center gap-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500 text-slate-950">
                  <Home size={21} />
                </div>

                <div>
                  <h1 className="font-bold">
                    Smart Home
                  </h1>

                  <p className="text-xs text-slate-400">
                    AI Automation
                  </p>
                </div>
              </div>
            </div>

            {/* Heading */}
            <div className="mb-8 text-center">
              <h2 className="text-2xl font-bold sm:text-3xl">
                {isLogin
                  ? "Welcome Back"
                  : "Create Your Account"}
              </h2>

              <p className="mt-2 text-sm text-slate-400">
                {isLogin
                  ? "Sign in to control your smart home"
                  : "Start building your intelligent home"}
              </p>
            </div>

            {/* Login/Register Tabs */}
            <div className="mb-7 grid grid-cols-2 rounded-xl bg-slate-900/80 p-1">
              <button
                type="button"
                onClick={() => setMode("login")}
                className={`flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-medium transition ${
                  isLogin
                    ? "bg-cyan-500 text-slate-950 shadow-lg shadow-cyan-500/20"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <LogIn size={17} />
                Login
              </button>

              <button
                type="button"
                onClick={() => setMode("register")}
                className={`flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-medium transition ${
                  !isLogin
                    ? "bg-cyan-500 text-slate-950 shadow-lg shadow-cyan-500/20"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <UserPlus size={17} />
                Register
              </button>
            </div>

            {/* Form */}
            <form
              onSubmit={handleSubmit}
              className="space-y-5"
            >

              {/* Name */}
              {!isLogin && (
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-300">
                    Full Name
                  </label>

                  <div className="relative">
                    <User
                      size={18}
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"
                    />

                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      placeholder="Enter your name"
                      autoComplete="name"
                      className="w-full rounded-xl border border-white/10 bg-slate-900/70 py-3.5 pl-11 pr-4 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-400/60 focus:ring-2 focus:ring-cyan-400/10"
                    />
                  </div>
                </div>
              )}

              {/* Email */}
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">
                  Email Address
                </label>

                <div className="relative">
                  <Mail
                    size={18}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"
                  />

                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="you@example.com"
                    autoComplete="email"
                    className="w-full rounded-xl border border-white/10 bg-slate-900/70 py-3.5 pl-11 pr-4 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-400/60 focus:ring-2 focus:ring-cyan-400/10"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">
                  Password
                </label>

                <div className="relative">
                  <Lock
                    size={18}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"
                  />

                  <input
                    type={
                      showPassword
                        ? "text"
                        : "password"
                    }
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="Enter your password"
                    autoComplete={
                      isLogin
                        ? "current-password"
                        : "new-password"
                    }
                    className="w-full rounded-xl border border-white/10 bg-slate-900/70 py-3.5 pl-11 pr-12 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-400/60 focus:ring-2 focus:ring-cyan-400/10"
                  />

                  <button
                    type="button"
                    onClick={() =>
                      setShowPassword(
                        (prev) => !prev
                      )
                    }
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-2 text-slate-500 transition hover:text-white"
                    aria-label={
                      showPassword
                        ? "Hide password"
                        : "Show password"
                    }
                  >
                    {showPassword ? (
                      <EyeOff size={18} />
                    ) : (
                      <Eye size={18} />
                    )}
                  </button>
                </div>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-500 py-3.5 font-semibold text-slate-950 shadow-lg shadow-cyan-500/20 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <span className="h-5 w-5 animate-spin rounded-full border-2 border-slate-950/30 border-t-slate-950" />
                    Please wait...
                  </>
                ) : isLogin ? (
                  <>
                    <LogIn size={18} />
                    Login
                  </>
                ) : (
                  <>
                    <UserPlus size={18} />
                    Create Account
                  </>
                )}
              </button>
            </form>

            {/* Divider */}
            <div className="my-6 flex items-center gap-3">
              <div className="h-px flex-1 bg-white/10" />

              <span className="text-xs text-slate-500">
                OR
              </span>

              <div className="h-px flex-1 bg-white/10" />
            </div>

            {/* Google Login */}
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={loading}
              className="flex w-full items-center justify-center gap-3 rounded-xl border border-white/10 bg-white py-3.5 font-medium text-slate-800 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {/* Don't use Google/Chrome from lucide-react */}
              <span className="flex h-6 w-6 items-center justify-center rounded-full border border-slate-200 text-sm font-bold">
                G
              </span>

              Continue with Google
            </button>

            {/* Guest */}
            <button
              type="button"
              onClick={handleGuestMode}
              disabled={loading}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-cyan-400/20 bg-cyan-400/5 py-3.5 text-sm font-medium text-cyan-300 transition hover:bg-cyan-400/10 disabled:opacity-60"
            >
              <Home size={18} />
              Explore as Guest
            </button>

            <p className="mt-3 text-center text-xs text-slate-500">
              Guest access is limited to 10 minutes.
            </p>

            {/* Switch */}
            <p className="mt-7 text-center text-sm text-slate-400">
              {isLogin
                ? "Don't have an account?"
                : "Already have an account?"}

              <button
                type="button"
                onClick={switchMode}
                className="ml-2 font-semibold text-cyan-400 hover:text-cyan-300"
              >
                {isLogin
                  ? "Create account"
                  : "Login"}
              </button>
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}

/* Feature component */
function Feature({ icon, title, text }) {
  return (
    <div className="flex gap-4">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-cyan-400/20 bg-cyan-400/10 text-cyan-400">
        {icon}
      </div>

      <div>
        <h3 className="font-semibold text-white">
          {title}
        </h3>

        <p className="mt-1 text-sm leading-6 text-slate-500">
          {text}
        </p>
      </div>
    </div>
  );
}