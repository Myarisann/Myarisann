"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import BubbleBackground from "@/components/BubbleBackground";
import Toast from "@/components/Toast";

export default function OnboardingPage() {
  const router = useRouter();
  const supabase = createClient();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  function onFile(f: File | null) {
    setFile(f);
    setPreview(f ? URL.createObjectURL(f) : null);
  }

  async function handleSimpan() {
    if (!file) return;
    setBusy(true);
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;

    const path = `${userData.user.id}/qr-pembayaran-${Date.now()}.jpg`;
    const { error: upErr } = await supabase.storage.from("qr-pembayaran").upload(path, file);
    if (upErr) {
      setToast({ msg: "Upload gagal: " + upErr.message, type: "error" });
      setBusy(false);
      return;
    }
    const { data: urlData } = supabase.storage.from("qr-pembayaran").getPublicUrl(path);
    await supabase.from("profiles").update({ qr_pembayaran_url: urlData.publicUrl }).eq("id", userData.user.id);

    setToast({ msg: "QR pembayaran tersimpan! 🎉", type: "success" });
    setBusy(false);
    router.push("/dashboard");
  }

  return (
    <main className="relative min-h-screen flex flex-col items-center justify-center px-6">
      <BubbleBackground />
      <Toast message={toast?.msg ?? ""} type={toast?.type} show={!!toast} />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card w-full max-w-sm rounded-xl3 p-8 text-center"
      >
        <div className="text-6xl mb-3">📱</div>
        <h1 className="text-xl font-black mb-2">Upload QR Pembayaran Kamu</h1>
        <p className="text-sm text-gray-500 font-semibold mb-6">
          Ini QR e-wallet pribadi kamu (DANA/OVO/GoPay dll). Ditampilkan ke anggota lain
          cuma pas giliran kamu narik dana.
        </p>

        <label className="block rounded-2xl border-2 border-dashed border-primary/40 p-6 cursor-pointer mb-5 bg-white/60">
          {preview ? (
            <img src={preview} alt="preview QR" className="w-40 h-40 object-contain mx-auto rounded-xl" />
          ) : (
            <span className="text-sm font-bold text-primary">Ketuk buat pilih gambar QR</span>
          )}
          <input type="file" accept="image/*" className="hidden" onChange={(e) => onFile(e.target.files?.[0] ?? null)} />
        </label>

        <motion.button
          whileTap={{ scale: 0.96 }}
          disabled={busy || !file}
          onClick={handleSimpan}
          className="w-full rounded-2xl bg-gradient-to-r from-primary to-primary-dark py-4 font-bold text-white disabled:opacity-50"
        >
          {busy ? "Menyimpan..." : "Simpan QR"}
        </motion.button>

        <button onClick={() => router.push("/dashboard")} className="text-xs font-bold text-gray-400 mt-4">
          Lewati dulu, upload nanti
        </button>
      </motion.div>
    </main>
  );
    }
