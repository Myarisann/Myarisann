"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import BubbleBackground from "@/components/BubbleBackground";
import Toast from "@/components/Toast";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [mode, setMode] = useState<"login" | "daftar">("login");
  const [nama, setNama] = useState("");
  const [noHp, setNoHp] = useState("");
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  const pseudoEmail = (hp: string) => `${hp.replace(/\D/g, "")}@arisanchan.local`;

  async function handleDaftar() {
    if (!nama || noHp.length < 9 || pin.length < 6) {
      setToast({ msg: "Lengkapi nama, no HP, dan PIN 6 digit ya", type: "error" });
      return;
    }
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email: pseudoEmail(noHp),
      password: pin,
    });
    if (error || !data.user) {
      setToast({ msg: error?.message ?? "Gagal daftar, coba lagi", type: "error" });
      setLoading(false);
      return;
    }
    const { error: profileError } = await supabase.from("profiles").insert({
      id: data.user.id,
      nama,
      no_hp: noHp,
    });
    if (profileError) {
      setToast({ msg: profileError.message, type: "error" });
      setLoading(false);
      return;
    }
    setToast({ msg: "Akun dibuat! Masuk otomatis ya~", type: "success" });
    router.push("/dashboard");
  }

  async function handleLogin() {
    if (noHp.length < 9 || pin.length < 6) {
      setToast({ msg: "Masukin no HP dan PIN yang benar", type: "error" });
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: pseudoEmail(noHp),
      password: pin,
    });
    if (error) {
      setToast({ msg: "No HP atau PIN salah", type: "error" });
      setLoading(false);
      return;
    }
    router.push("/dashboard");
  }

  return (
    <main className="relative min-h-screen flex items-center justify-center px-6">
      <BubbleBackground />
      <Toast message={toast?.msg ?? ""} type={toast?.type} show={!!toast} />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="glass-card w-full max-w-sm rounded-xl3 p-8"
      >
        <motion.div
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="text-center text-6xl mb-3"
        >
          🌸
        </motion.div>
        <h1 className="text-center text-2xl font-black bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent mb-1">
          ArisanChan
        </h1>
        <p className="text-center text-sm text-gray-500 font-semibold mb-6">
          Nabung bareng temen, aman & seru
        </p>

        <div className="flex bg-white/60 rounded-2xl p-1 mb-6">
          {(["login", "daftar"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`flex-1 py-2 rounded-xl text-sm font-bold transition-all ${
                mode === m ? "bg-white shadow text-primary" : "text-gray-400"
              }`}
            >
              {m === "login" ? "Masuk" : "Daftar"}
            </button>
          ))}
        </div>

        <div className="space-y-4">
          {mode === "daftar" && (
            <div>
              <label className="block text-sm font-bold mb-2">Nama</label>
              <input
                value={nama}
                onChange={(e) => setNama(e.target.value)}
                placeholder="Nama panggilan kamu"
                className="w-full rounded-2xl border-2 border-gray-200 px-4 py-3 outline-none focus:border-primary transition-colors bg-white"
              />
            </div>
          )}
          <div>
            <label className="block text-sm font-bold mb-2">No. HP</label>
            <input
              value={noHp}
              onChange={(e) => setNoHp(e.target.value)}
              inputMode="numeric"
              placeholder="08xxxxxxxxxx"
              className="w-full rounded-2xl border-2 border-gray-200 px-4 py-3 outline-none focus:border-primary transition-colors bg-white"
            />
          </div>
          <div>
            <label className="block text-sm font-bold mb-2">PIN (6 digit)</label>
            <input
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              type="password"
              inputMode="numeric"
              maxLength={6}
              placeholder="••••••"
              className="w-full rounded-2xl border-2 border-gray-200 px-4 py-3 outline-none focus:border-primary transition-colors bg-white"
            />
          </div>

          <motion.button
            whileTap={{ scale: 0.96 }}
            disabled={loading}
            onClick={mode === "login" ? handleLogin : handleDaftar}
            className="w-full rounded-2xl bg-gradient-to-r from-primary to-primary-dark py-4 font-bold text-white shadow-lg shadow-pink-300/40 disabled:opacity-50"
          >
            {loading ? "Tunggu ya..." : mode === "login" ? "Masuk" : "Buat Akun"}
          </motion.button>
        </div>

        <p className="text-center text-xs text-gray-400 mt-5 font-semibold">
          Gak perlu KTP — cukup no HP & PIN 🔒
        </p>
      </motion.div>
    </main>
  );
    }
