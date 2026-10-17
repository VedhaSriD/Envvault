import { useEffect } from "react";

// G then D: go to the dashboard.
// Ctrl/Cmd + K: focus the page search if one exists, otherwise go to the dashboard.
export function useGlobalHotkeys(navigate) {
  useEffect(() => {
    let gPressedAt = 0;

    function isTyping(target) {
      const tag = target && target.tagName;
      return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || Boolean(target && target.isContentEditable);
    }

    function handleKey(event) {
      const key = event.key.toLowerCase();

      if ((event.metaKey || event.ctrlKey) && key === "k") {
        event.preventDefault();
        const search = document.querySelector("[data-search]");
        if (search) search.focus();
        else navigate("/dashboard");
        return;
      }

      if (isTyping(event.target) || event.metaKey || event.ctrlKey || event.altKey) return;

      if (key === "g") {
        gPressedAt = Date.now();
        return;
      }
      if (key === "d" && Date.now() - gPressedAt < 900) {
        gPressedAt = 0;
        navigate("/dashboard");
      }
    }

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [navigate]);
}