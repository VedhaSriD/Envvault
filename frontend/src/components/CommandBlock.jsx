import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

export default function CommandBlock({ title, lines }) {
  const [copied, setCopied] = useState(false);
  const text = lines.join("\n");

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="cmd">
      <div className="cmd-head">
        <span className="cmd-title">{title}</span>
        <motion.button
          type="button"
          whileTap={{ scale: 0.94 }}
          className="btn btn-ghost btn-sm"
          onClick={copy}
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={copied ? "copied" : "copy"}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
            >
              {copied ? "Copied" : "Copy"}
            </motion.span>
          </AnimatePresence>
        </motion.button>
      </div>
      <pre>
        <code>{text}</code>
      </pre>
    </div>
  );
}