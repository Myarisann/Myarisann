"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import BubbleBackground from "@/components/BubbleBackground";
import Toast from "@/components/Toast";
import type { Group, GroupMember, Setoran, Profile } from "@/types";

export default function GroupDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const supabase = createClient();

  const [group, setGroup] = useState<Group | null>(null);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [setoranList, setSetoranList] = useState<Setoran[]>([]);
  const [me, setMe] = useState<Profile | null>(null);
  const [showUpload, setShowUpload] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      router.push("/login");
      return;
    }
    const { data: prof } = await supabase.from("profiles").select("*").eq("id", userData.user.id).single();
    setMe(prof);

    const { data: g } = await supabase.from("groups").select("*").eq("id", id).single();
    setGroup(g);

    const { data: mem } = await supabase
      .from("group_members")
      .select("*, profiles(*)")
      .eq("group_id", id)
      .order("urutan_giliran");
    setMembers((mem as any) ?? []);

    if (g) {
      const { data: setor } = await supabase
        .from("setoran")
        .select("*, profiles(*)")
        .eq("group_id", id)
        .eq("periode_ke", g.periode_berjalan);
      setSetoranList((setor as any) ?? []);
    }
  }, [id, router, supabase]);

  useEffect(() => {
    load();
    const channel = supabase
      .channel(`grup-${id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "setoran", filter: `group_id=eq.${id}` }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "group_members", filter: `group_id=eq.${id}` }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "groups", filter: `id=eq.${id}` }, load)
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [id, load, supabase]);

  const giliranMember = members.find((m) => m.urutan_giliran === group?.periode_berjalan);
  const mySetoran = setoranList.find((s) => s.user_id === me?.id);
  const isGiliranSaya = giliranMember?.user_id === me?.id;
  const semuaLunas = members.length > 0 && members.every((m) =>
    setoranList.some((s) => s.user_id === m.user_id && s.status === "lunas")
  );

  async function handleSetor() {
    if (!me || !group) return;
    const { error } = await supabase.from("setoran").insert({
      group_id: group.id,
      user_id: me.id,
      periode_ke: group.periode_berjalan,
      status: "menunggu_konfirmasi",
    });
    if (error) {
      setToast({ msg: "Kamu udah setor periode ini", type: "error" });
      return;
    }
    setToast({ msg: "Ditandai udah transfer. Upload bukti ya!", type: "success" });
    setShowUpload(true);
  }

  async function handleUploadBukti() {
    if (!file || !me || !group) return;
    setBusy(true);
    const path = `${group.id}/${me.id}-${group.periode_berjalan}-${Date.now()}.jpg`;
    const { error: upErr } = await supabase.storage.from("bukti-transfer").upload(path, file);
    if (upErr) {
      setToast({ msg: "Upload gagal: " + upErr.message, type: "error" });
      setBusy(false);
      return;
    }
    const { data: urlData } = supabase.storage.from("bukti-transfer").getPublicUrl(path);
    await supabase
      .from("setoran")
      .update({ bukti_transfer_url: urlData.publicUrl })
      .eq("group_id", group.id)
      .eq("user_id", me.id)
      .eq("periode_ke", group.periode_berjalan);
    setToast({ msg: "Bukti transfer terupload ✅", type: "success" });
    setShowUpload(false);
    setBusy(false);
    load();
  }

  async function handleKonfirmasi(userId: string) {
    if (!group) return;
    await supabase
      .from("setoran")
      .update({ status: "lunas", dikonfirmasi_oleh: me?.id, confirmed_at: new Date().toISOString() })
      .eq("group_id", group.id)
      .eq("user_id", userId)
      .eq("periode_ke", group.periode_berjalan);
    setToast({ msg: "Setoran dikonfirmasi lunas", type: "success" });
  }

  async function handleTarik() {
    setBusy(true);
    const { data, error } = await supabase.rpc("proses_penarikan", { p_group_id: id });
    setBusy(false);
    if (error || !data?.sukses) {
      setToast({ msg: data?.alasan ?? error?.message ?? "Gagal narik dana", type: "error" });
      return;
    }
    setToast({ msg: `Berhasil narik Rp${Number(data.total_diterima).toLocaleString("id-ID")} 🎉`, type: "success" });
  }

  if (!group) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p className="text-gray-400 font-bold">Memuat grup...</p>
      </main>
    );
  }

  return (
    <main className="relative min-h-screen pb-24">
      <BubbleBackground />
      <Toast message={toast?.msg ?? ""} type={toast?.type} show={!!toast} />

      <header className="px-5 pt-6 pb-3 flex items-center gap-3">
        <button onClick={() => router.push("/dashboard")} className="text-gray-500 font-bold">
          ←
        </button>
        <div>
          <h1 className="font-black text-lg">{group.nama_grup}</h1>
          <p className="text-xs text-gray-500 font-semibold">
            Periode {group.periode_berjalan} · Rp{group.nominal_setoran.toLocaleString("id-ID")}/{group.periode}
          </p>
        </div>
      </header>

      <div className="px-5">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="rounded-xl3 p-6 text-white relative overflow-hidden mb-4"
          style={{ background: "linear-gradient(135deg, #ff6b9d 0%, #c084fc 50%, #60a5fa 100%)" }}
        >
          <p className="text-sm opacity-90 font-semibold mb-1">🔒 Giliran narik periode ini</p>
          <p className="text-2xl font-black mb-4">{giliranMember?.profiles?.nama ?? "-"}</p>

          {giliranMember?.profiles?.qr_pembayaran_url ? (
            <div className="bg-white rounded-2xl p-4 flex flex-col items-center">
              <img src={giliranMember.profiles.qr_pembayaran_url} alt="QR pembayaran" className="w-40 h-40 object-contain rounded-xl" />
              <p className="text-xs text-gray-500 font-bold mt-2">Scan buat setor ke {giliranMember.profiles.nama}</p>
            </div>
          ) : (
            <div className="bg-white/20 rounded-2xl p-4 text-center text-sm font-semibold">
              {giliranMember?.profiles?.nama} belum upload QR pembayaran
            </div>
          )}

          {isGiliranSaya && semuaLunas && (
            <motion.button
              whileTap={{ scale: 0.96 }}
              disabled={busy}
              onClick={handleTarik}
              className="w-full mt-4 rounded-2xl bg-white text-primary font-black py-3.5 shadow-lg disabled:opacity-50"
            >
              {busy ? "Memproses..." : "Tarik Dana Sekarang 💸"}
            </motion.button>
          )}
        </motion.div>

        {!isGiliranSaya && (
          <div className="rounded-2xl bg-white p-4 shadow-md mb-4">
            {mySetoran?.status === "lunas" ? (
              <p className="text-center font-bold text-emerald-600">✅ Kamu udah lunas periode ini</p>
            ) : mySetoran?.status === "menunggu_konfirmasi" ? (
              <div className="text-center">
                <p className="font-bold text-amber-600 mb-2">⏳ Menunggu konfirmasi</p>
                {!mySetoran.bukti_transfer_url && (
                  <button onClick={() => setShowUpload(true)} className="text-sm font-bold text-primary underline">
                    Upload bukti transfer
                  </button>
                )}
              </div>
            ) : (
              <motion.button whileTap={{ scale: 0.96 }} onClick={handleSetor} className="w-full rounded-2xl bg-gradient-to-r from-primary to-primary-dark py-3.5 font-bold text-white">
                Sudah Transfer, Tandai Setor
              </motion.button>
            )}
          </div>
        )}
      </div>

      <div className="px-5">
        <h2 className="font-black mb-3">Anggota & Status Setoran</h2>
        <div className="space-y-2.5">
          {members.map((m, i) => {
            const s = setoranList.find((x) => x.user_id === m.user_id);
            const current = m.urutan_giliran === group.periode_berjalan;
            return (
              <motion.div
                key={m.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="flex items-center gap-3 bg-white rounded-2xl p-3.5 shadow-sm"
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black text-white flex-shrink-0 ${
                    current ? "bg-gradient-to-br from-amber-400 to-amber-500 animate-pulseSoft" : "bg-gradient-to-br from-primary to-secondary"
                  }`}
                >
                  {m.urutan_giliran}
                </div>
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-300 to-blue-300 flex items-center justify-center text-white font-black text-sm flex-shrink-0">
                  {m.profiles?.nama?.[0]?.toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm truncate">{m.profiles?.nama}</p>
                  <p className="text-xs text-gray-400 font-semibold">
                    {m.sudah_narik ? "Sudah pernah narik" : current ? "Giliran narik sekarang" : "Menunggu giliran"}
                  </p>
                </div>
                {s?.status === "lunas" ? (
                  <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-600">Lunas</span>
                ) : s?.status === "menunggu_konfirmasi" ? (
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-amber-100 text-amber-600">Cek bukti</span>
                    {isGiliranSaya && (
                      <button onClick={() => handleKonfirmasi(m.user_id)} className="text-xs font-bold text-primary underline">
                        OK
                      </button>
                    )}
                  </div>
                ) : (
                  <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-gray-100 text-gray-400">Belum setor</span>
                )}
              </motion.div>
            );
          })}
        </div>
      </div>

      <div className="px-5 mt-5">
        <div className="rounded-2xl bg-white p-4 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-400 font-bold">Kode Undangan</p>
            <p className="font-black tracking-widest">{group.invite_code.toUpperCase()}</p>
          </div>
          <button
            onClick={() => {
              navigator.clipboard.writeText(group.invite_code);
              setToast({ msg: "Kode disalin!", type: "success" });
            }}
            className="text-sm font-bold text-primary"
          >
            Salin
          </button>
        </div>
      </div>

      <AnimatePresence>
        {showUpload && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end justify-center"
            onClick={() => setShowUpload(false)}
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white w-full max-w-md rounded-t-[32px] p-7"
            >
              <div className="w-10 h-1.5 bg-gray-200 rounded-full mx-auto mb-5" />
              <h2 className="font-black text-lg mb-4">Upload Bukti Transfer</h2>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                className="w-full mb-4 text-sm"
              />
              <motion.button
                whileTap={{ scale: 0.96 }}
                disabled={busy || !file}
                onClick={handleUploadBukti}
                className="w-full rounded-2xl bg-gradient-to-r from-primary to-primary-dark py-4 font-bold text-white disabled:opacity-50"
              >
                {busy ? "Mengupload..." : "Upload"}
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
    }
