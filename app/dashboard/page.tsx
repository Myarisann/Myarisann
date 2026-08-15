"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import BubbleBackground from "@/components/BubbleBackground";
import Toast from "@/components/Toast";
import type { Group, GroupMember, Profile } from "@/types";

type GroupWithMeta = Group & { anggota_count: number; giliran_sekarang: string };

export default function DashboardPage() {
  const router = useRouter();
  const supabase = createClient();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [groups, setGroups] = useState<GroupWithMeta[]>([]);
  const [showJoin, setShowJoin] = useState(false);
  const [inviteCode, setInviteCode] = useState("");
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      router.push("/login");
      return;
    }
    const { data: prof } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userData.user.id)
      .single();
    setProfile(prof);

    const { data: memberships } = await supabase
      .from("group_members")
      .select("group_id, groups(*)")
      .eq("user_id", userData.user.id);

    if (!memberships) return;

    const groupsWithMeta: GroupWithMeta[] = [];
    for (const m of memberships as any[]) {
      const g = m.groups as Group;
      if (!g) continue;
      const { count } = await supabase
        .from("group_members")
        .select("*", { count: "exact", head: true })
        .eq("group_id", g.id);
      const { data: giliranMember } = await supabase
        .from("group_members")
        .select("profiles(nama)")
        .eq("group_id", g.id)
        .eq("urutan_giliran", g.periode_berjalan)
        .single();
      groupsWithMeta.push({
        ...g,
        anggota_count: count ?? 0,
        giliran_sekarang: (giliranMember as any)?.profiles?.nama ?? "-",
      });
    }
    setGroups(groupsWithMeta);
  }

  async function handleJoin() {
    if (!inviteCode) return;
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;

    const { data: group, error: findError } = await supabase
      .from("groups")
      .select("id")
      .eq("invite_code", inviteCode.trim())
      .single();

    if (findError || !group) {
      setToast({ msg: "Kode undangan gak ditemukan", type: "error" });
      return;
    }

    const { count } = await supabase
      .from("group_members")
      .select("*", { count: "exact", head: true })
      .eq("group_id", group.id);

    const { error: joinError } = await supabase.from("group_members").insert({
      group_id: group.id,
      user_id: userData.user.id,
      urutan_giliran: (count ?? 0) + 1,
    });

    if (joinError) {
      setToast({ msg: "Gagal join, mungkin udah jadi anggota", type: "error" });
      return;
    }

    setToast({ msg: "Berhasil join grup! 🎉", type: "success" });
    setShowJoin(false);
    setInviteCode("");
    loadData();
  }

  return (
    <main className="relative min-h-screen pb-28">
      <BubbleBackground />
      <Toast message={toast?.msg ?? ""} type={toast?.type} show={!!toast} />

      <header className="flex items-center justify-between px-5 pt-6 pb-2">
        <div>
          <p className="text-sm text-gray-500 font-semibold">Halo, {profile?.nama ?? "..."} 👋</p>
          <h1 className="text-2xl font-black bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            Grup Arisan Kamu
          </h1>
        </div>
        <div className="w-11 h-11 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white font-black shadow-lg">
          {profile?.nama?.[0]?.toUpperCase() ?? "?"}
        </div>
      </header>

      <div className="px-5 space-y-3 mt-4">
        {groups.length === 0 && (
          <div className="text-center py-16 text-gray-400">
            <div className="text-6xl mb-3">🐣</div>
            <p className="font-bold">Belum ada grup arisan</p>
            <p className="text-sm">Buat baru atau join pakai kode undangan</p>
          </div>
        )}

        {groups.map((g, i) => (
          <motion.div
            key={g.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => router.push(`/group/${g.id}`)}
            className="flex items-center gap-4 rounded-2xl bg-white p-4 shadow-md cursor-pointer border border-white"
          >
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-pink-200 to-purple-200 flex items-center justify-center text-2xl flex-shrink-0">
              💰
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-black truncate">{g.nama_grup}</p>
              <p className="text-xs text-gray-500 font-semibold">
                Rp{g.nominal_setoran.toLocaleString("id-ID")}/{g.periode} · {g.anggota_count} anggota
              </p>
            </div>
            <span className="text-xs font-bold px-3 py-1.5 rounded-full bg-amber-100 text-amber-600 whitespace-nowrap">
              🔒 {g.giliran_sekarang}
            </span>
          </motion.div>
        ))}
      </div>

      <div className="fixed bottom-6 left-0 right-0 px-5 flex gap-3 max-w-md mx-auto">
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => setShowJoin(true)}
          className="flex-1 rounded-2xl bg-white border-2 border-primary text-primary font-bold py-3.5 shadow-lg"
        >
          Join Grup
        </motion.button>
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => router.push("/dashboard/buat-grup")}
          className="flex-1 rounded-2xl bg-gradient-to-r from-primary to-primary-dark text-white font-bold py-3.5 shadow-lg shadow-pink-300/40"
        >
          + Buat Grup
        </motion.button>
      </div>

      {showJoin && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end justify-center"
          onClick={() => setShowJoin(false)}
        >
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            transition={{ type: "spring", damping: 28, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white w-full max-w-md rounded-t-[32px] p-7"
          >
            <div className="w-10 h-1.5 bg-gray-200 rounded-full mx-auto mb-5" />
            <h2 className="font-black text-lg mb-4">Join Grup Arisan</h2>
            <input
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value)}
              placeholder="Masukin kode undangan"
              className="w-full rounded-2xl border-2 border-gray-200 px-4 py-3 outline-none focus:border-primary mb-4 uppercase"
            />
            <motion.button
              whileTap={{ scale: 0.96 }}
              onClick={handleJoin}
              className="w-full rounded-2xl bg-gradient-to-r from-primary to-primary-dark py-4 font-bold text-white"
            >
              Gabung Sekarang
            </motion.button>
          </motion.div>
        </motion.div>
      )}
    </main>
  );
                                      }
