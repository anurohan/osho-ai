/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        // "Brahma Muhurta" — pre-dawn indigo giving way to saffron first light.
        abyss: "#100d17", // deepest point of the sky (gradient floor)
        night: "#14121d", // deep pre-dawn base
        dusk: "#1d1a29", // raised surface
        veil: "#2b2740", // borders / elevated edges
        mist: "#3a3552", // hover borders
        dawn: {
          DEFAULT: "#e8a14c", // saffron sunrise — the hero accent
          soft: "#f2c17d", // lighter glow
          deep: "#c9822f", // pressed / gradient end
          ember: "#ffb15e", // brightest catch-light
        },
        aura: "#6f4ea1", // pre-dawn violet in the sky
        parchment: "#efe7d6", // manuscript reading text
        ash: "#97907f", // muted secondary text
        jade: "#6fae93", // serene "connected" counterpoint (status only)
      },
      fontFamily: {
        display: ["Fraunces", "Georgia", "serif"],
        read: ["Spectral", "Georgia", "serif"],
        ui: ["Inter", "system-ui", "sans-serif"],
        deva: ["Tiro Devanagari Hindi", "Noto Serif Devanagari", "serif"],
      },
      letterSpacing: {
        eyebrow: "0.22em",
      },
      backgroundImage: {
        // Saffron sunrise, used on the hero accents and the send action.
        "dawn-grad":
          "linear-gradient(135deg, #f2c17d 0%, #e8a14c 48%, #c9822f 100%)",
        "dawn-veil":
          "linear-gradient(180deg, rgba(232,161,76,0.16), rgba(232,161,76,0.04))",
        // A hairline that catches the first light in the middle and fades out.
        horizon:
          "linear-gradient(90deg, transparent, rgba(232,161,76,0.55), transparent)",
        // Faint top-edge highlight for glass surfaces.
        "glass-sheen":
          "linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.012) 40%, transparent)",
      },
      boxShadow: {
        dawn: "0 0 80px -20px rgba(232, 161, 76, 0.45)",
        lift: "0 20px 50px -24px rgba(0, 0, 0, 0.7)",
        glow: "0 0 24px -6px rgba(232, 161, 76, 0.55)",
        "glow-lg": "0 0 70px -14px rgba(232, 161, 76, 0.5)",
        // Glass: a bright top-inner edge over a deep drop shadow.
        glass:
          "inset 0 1px 0 0 rgba(255,255,255,0.07), 0 24px 60px -34px rgba(0,0,0,0.9)",
        card: "0 14px 44px -26px rgba(0,0,0,0.85)",
      },
      transitionTimingFunction: {
        dawn: "cubic-bezier(0.16, 1, 0.3, 1)",
      },
      keyframes: {
        breathe: {
          "0%, 100%": { transform: "scale(1)", opacity: "0.5" },
          "50%": { transform: "scale(1.12)", opacity: "0.85" },
        },
        rise: {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        drift: {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        pulseDot: {
          "0%, 100%": { opacity: "0.3", transform: "translateY(0)" },
          "50%": { opacity: "1", transform: "translateY(-3px)" },
        },
        listening: {
          "0%, 100%": { transform: "scaleY(0.4)" },
          "50%": { transform: "scaleY(1)" },
        },
        // Slow ambient drift for the layered dawn glows.
        haze: {
          "0%, 100%": { opacity: "0.55", transform: "translateY(0) scale(1)" },
          "50%": { opacity: "0.85", transform: "translateY(-8px) scale(1.04)" },
        },
        // Soft float for the hero orb.
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-6px)" },
        },
        // Gentle glow pulse for the "present" status ring.
        glowPulse: {
          "0%, 100%": { boxShadow: "0 0 0 0 rgba(111,174,147,0.5)" },
          "70%": { boxShadow: "0 0 0 6px rgba(111,174,147,0)" },
        },
        // Concentric rings radiating from the danda — the visible pulse of
        // sound settling into silence, like the resonance of an ॐ.
        ripple: {
          "0%": { transform: "scale(0.5)", opacity: "0" },
          "12%": { opacity: "0.5" },
          "100%": { transform: "scale(2.7)", opacity: "0" },
        },
        // Embers of first light drifting slowly upward, like incense smoke.
        ember: {
          "0%": { transform: "translateY(0) translateX(0)", opacity: "0" },
          "14%": { opacity: "0.65" },
          "78%": { opacity: "0.5" },
          "100%": {
            transform: "translateY(-240px) translateX(14px)",
            opacity: "0",
          },
        },
        // Warmth sweeping slowly across the greeting.
        shimmer: {
          "0%, 100%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
        },
      },
      animation: {
        breathe: "breathe 6s ease-in-out infinite",
        rise: "rise 0.55s cubic-bezier(0.16, 1, 0.3, 1) both",
        drift: "drift 0.5s cubic-bezier(0.16, 1, 0.3, 1)",
        pulseDot: "pulseDot 1.2s ease-in-out infinite",
        listening: "listening 0.8s ease-in-out infinite",
        haze: "haze 11s ease-in-out infinite",
        float: "float 7s ease-in-out infinite",
        glowPulse: "glowPulse 2.4s ease-out infinite",
        ripple: "ripple 5s cubic-bezier(0, 0, 0.2, 1) infinite",
        ember: "ember 9s ease-in-out infinite",
        shimmer: "shimmer 7s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
