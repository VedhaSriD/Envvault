import { motion } from "framer-motion";
import { easeOut } from "../lib/motion.js";

export default function PageTransition({ children, className = "" }) {
  return (
    <motion.main
      className={`page ${className}`.trim()}
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.35, ease: easeOut }}
    >
      {children}
    </motion.main>
  );
}