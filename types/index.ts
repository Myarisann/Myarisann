export type Profile = {
  id: string;
  nama: string;
  no_hp: string;
  qr_pembayaran_url: string | null;
  created_at: string;
};

export type Group = {
  id: string;
  nama_grup: string;
  nominal_setoran: number;
  periode: "mingguan" | "bulanan";
  admin_id: string;
  invite_code: string;
  periode_berjalan: number;
  status: "aktif" | "selesai";
  created_at: string;
};

export type GroupMember = {
  id: string;
  group_id: string;
  user_id: string;
  urutan_giliran: number;
  sudah_narik: boolean;
  joined_at: string;
  profiles?: Profile;
};

export type Setoran = {
  id: string;
  group_id: string;
  user_id: string;
  periode_ke: number;
  status: "menunggu" | "menunggu_konfirmasi" | "lunas";
  bukti_transfer_url: string | null;
  dikonfirmasi_oleh: string | null;
  created_at: string;
  confirmed_at: string | null;
  profiles?: Profile;
};

export type Penarikan = {
  id: string;
  group_id: string;
  user_id: string;
  periode_ke: number;
  total_diterima: number;
  created_at: string;
};
