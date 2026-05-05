/**
 * ThemeContext.jsx
 * Provides dark/light theme state across the entire app.
 * Usage:
 *   import { useTheme } from './ThemeContext';
 *   const { theme, toggleTheme, T } = useTheme();
 */
import { createContext, useContext, useState } from "react";

const DARK = {
  bg0: "#09090F", bg1: "#111118", bg2: "#18181F", bg3: "#202028",
  border: "rgba(255,255,255,0.07)",
  text1: "#F0EFF8", text2: "#8B8A9E", text3: "#4A4960",
  violet: "#7C3AED", violetMid: "#8B5CF6",
  violetSoft: "rgba(124,58,237,0.14)", violetGlow: "rgba(124,58,237,0.38)",
  coral: "#F97316", coralSoft: "rgba(249,115,22,0.12)",
  green: "#10B981", greenSoft: "rgba(16,185,129,0.12)",
  amber: "#F59E0B", amberSoft: "rgba(245,158,11,0.12)",
  red: "#EF4444", redSoft: "rgba(239,68,68,0.12)",
  gradViolet: "linear-gradient(135deg,#7C3AED 0%,#6D28D9 100%)",
  gradHero: "linear-gradient(135deg,#7C3AED 0%,#9333EA 60%,#F97316 100%)",
  cardBg: "#111118",
  inputBg: "#18181F",
  mode: "dark",
};

const LIGHT = {
  bg0: "#F4F3F8", bg1: "#FFFFFF", bg2: "#F0EFF8", bg3: "#E8E7F4",
  border: "rgba(0,0,0,0.08)",
  text1: "#1A1929", text2: "#6B6A82", text3: "#B0AFBF",
  violet: "#7C3AED", violetMid: "#8B5CF6",
  violetSoft: "rgba(124,58,237,0.10)", violetGlow: "rgba(124,58,237,0.25)",
  coral: "#F97316", coralSoft: "rgba(249,115,22,0.10)",
  green: "#059669", greenSoft: "rgba(5,150,105,0.10)",
  amber: "#D97706", amberSoft: "rgba(217,119,6,0.10)",
  red: "#DC2626", redSoft: "rgba(220,38,38,0.10)",
  gradViolet: "linear-gradient(135deg,#7C3AED 0%,#6D28D9 100%)",
  gradHero: "linear-gradient(135deg,#7C3AED 0%,#9333EA 60%,#F97316 100%)",
  cardBg: "#FFFFFF",
  inputBg: "#F0EFF8",
  mode: "light",
};

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  // Detect system preference on first load
  const prefersDark = window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? true;
  const [theme, setTheme] = useState(prefersDark ? "dark" : "light");

  const toggleTheme = () => setTheme(t => t === "dark" ? "light" : "dark");
  const T = theme === "dark" ? DARK : LIGHT;

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, T }}>
      <div style={{ background: T.bg0, minHeight: "100vh", fontFamily: "Outfit,sans-serif", transition: "background 0.3s ease" }}>
        {children}
      </div>
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used inside ThemeProvider");
  return ctx;
}
