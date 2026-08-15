"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import BubbleBackground from "@/components/BubbleBackground";
import Toast from "@/components/Toast";

export default function BuatGrupPage() {
  const router = useRouter();
  const supabase = createClient();
  const [namaGrup, setNamaGrup] = useState("");
  const [nominal, setNominal] = useState("");
  const [periode, setPeriode] = useState<"mingguan" | "bulanan">("bulanan");
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  async function handleBuat() {
    if (!namaGrup || !nominal) {
      setToast({ msg: "Isi nama grup dan nominal dulu ya", type: "error" });
      return;
    }
    setLoading(true);
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;

    const { data: group, error } = await supabase
      .from("groups")
      .insert({
        nama_grup: namaGrup,
        nominal_setoran: Number(nominal),
        periode,
        admin_id: userData.user.id,
      })
      .select()
      .single();

    if (error || !group) {
      setToast({ msg: error?.message ?? "Gagal bikin grup", type: "error" });
      setLoading(false);
      return;
    }

    await supabase.from("group_members").insert({
      group_id: group.id,
      user_id: userData.user.id,
      urutan_giliran: 1,
    });

    setToast({ msg: "Grup berhasil dibuat! 🎊", type: "success" });
    router.push(`/group/${group.id}`);
  }

  return (
    <main className="relative min-h-screen px-5 pt-6 pb-10">
      <BubbleBackground />
      <Toast message={toast?.msg ?? ""} type={toast?.type} show={!!toast} />

      <button onClick={() => router.back()} className="text-sm font-bold text-gray-500 mb-4">
        ← Kembali
      </button>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card rounded-xl3 p-6"
      >
        <h1 className="text-xl font-black mb-1">Buat Grup Arisan Baru</h1>
        <p className="text-sm text-gray-500 font-semibold mb-6">
          Urutan giliran otomatis sesuai urutan gabung
        </p>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-bold mb-2">Nama Grup</label>
            <input
              value={namaGrup}
              onChange={(e) => setNamaGrup(e.target.value)}
              placeholder="Arisan Squad 2026"
              className="w-full rounded-2xl border-2 border-gray-200 px-4 py-3 outline-none focus:border-primary bg-white"
            />
          </div>
          <div>
            <label className="block text-sm font-bold mb-2">Nominal Setoran (Rp)</label>
            <input
              value={nominal}
              onChange={(e) => setNominal(e.target.value.replace(/\D/g, ""))}
              inputMode="numeric"
              placeholder="100000"
              className="w-full rounded-2xl border-2 border-gray-200 px-4 py-3 outline-none focus:border-primary bg-white"
            />
          </div>
          <div>
            <label className="block text-sm font-bold mb-2">Periode</label>
            <select
              value={periode}
              onChange={(e) => setPeriode(e.target.value as "mingguan" | "bulanan")}
              className="w-full rounded-2xl border-2 border-gray-200 px-4 py-3 outline-none focus:border-primary bg-white appearance-none"
            >
              <option value="mingguan">Mingguan</option>
              <option value="bulanan">Bulanan</option>
            </select>
          </div>

          <motion.button
            whileTap={{ scale: 0.96 }}
            disabled={loading}
            onClick={handleBuat}
            className="w-full rounded-2xl bg-gradient-to-r from-primary to-primary-dark py-4 font-bold text-white shadow-lg disabled:opacity-50 mt-2"
          >
            {loading ? "Bikin grup..." : "Buat Grup 🚀"}
          </motion.button>
        </div>
      </motion.div>
    </main>
  );
    }
