import { motion } from "framer-motion";

export default function Button({ variant = "primary", loading = false, className = "", children, ...props }) {
  return (
    <motion.button
      type="button"
      whileHover={{ y: -1 }}
      whileTap={{ scale: 0.96 }}
      transition={{ type: "spring", stiffness: 500, damping: 30 }}
      {...props}
      className={`btn btn-${variant} ${className}`.trim()}
      disabled={loading || props.disabled}
    >
      {loading ? <span className="spinner" aria-hidden="true" /> : null}
      <span>{children}</span>
    </motion.button>
  );
}