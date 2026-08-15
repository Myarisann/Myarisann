"use client";

import { AnimatePresence, motion } from "framer-motion";

type ToastProps = {
  message: string;
  type?: "success" | "error" | "info";
  show: boolean;
};

const borderColor = {
  success: "#34d399",
  error: "#f87171",
  info: "#60a5fa",
};

const icon = {
  success: "✅",
  error: "⚠️",
  info: "ℹ️",
};

export default function Toast({ message, type = "info", show }: ToastProps) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ y: -100, opacity: 0, x: "-50%" }}
          animate={{ y: 20, opacity: 1, x: "-50%" }}
          exit={{ y: -100, opacity: 0, x: "-50%" }}
          transition={{ type: "spring", stiffness: 300, damping: 22 }}
          className="fixed top-0 left-1/2 z-[9999] flex items-center gap-3 rounded-2xl bg-white px-6 py-4 font-bold shadow-2xl"
          style={{ borderLeft: `4px solid ${borderColor[type]}` }}
        >
          <span>{icon[type]}</span>
          <span className="text-sm">{message}</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
          }
