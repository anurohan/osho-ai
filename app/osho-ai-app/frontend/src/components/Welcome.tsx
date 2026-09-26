import { useEffect, useState, useRef } from "react";
import { ArrowUpRight } from "lucide-react";
import type { AppMode, DailyVichaar, Language } from "../types";

interface Props {
  language: Language;
  daily?: DailyVichaar | null;
  onPick: (prompt: string) => void;
  mode?: AppMode;
}

// 25 famous Osho-themed questions
const oshoQuestions: Record<Language, string[]> = {
  hi: [
    "साक्षी होने का अर्थ क्या है?",
    "मन कभी शांत क्यों नहीं रहता?",
    "प्रेम क्या है?",
    "क्रोध क्यों आता है?",
    "ध्यान कैसे करें?",
    "इच्छाओं से मुक्त कैसे हुआ जाए?",
    "अकेलेपन और एकांत में क्या भेद है?",
    "मैं इतना सोचता क्यों हूँ?",
    "खुशी का राज क्या है?",
    "भय से कैसे मुक्त हों?",
    "मन और आत्मा में क्या अंतर है?",
    "जीवन का अर्थ क्या है?",
    "मृत्यु से डर क्यों लगता है?",
    "संन्यास क्या है?",
    "ईश्वर क्या है?",
    "मौन का महत्व क्या है?",
    "सत्य क्या है?",
    "अहंकार कैसे छूटे?",
    "करुणा और दया में क्या फर्क है?",
    "संबंधों में प्रेम कैसे बना रहे?",
    "ईर्ष्या क्यों होती है?",
    "स्वतंत्रता का वास्तविक अर्थ क्या है?",
    "सुख और आनंद में क्या अंतर है?",
    "चेतना क्या है?",
    "जागरण का अर्थ क्या है?",
  ],
  en: [
    "What does it mean to be a witness?",
    "Why does the mind never stay still?",
    "What is love?",
    "Why does anger arise?",
    "How to meditate?",
    "How to become free of desire?",
    "What is the difference between loneliness and aloneness?",
    "Why do I think so much?",
    "What is the secret of happiness?",
    "How to be free of fear?",
    "What is the difference between mind and soul?",
    "What is the meaning of life?",
    "Why do we fear death?",
    "What is sannyas?",
    "What is God?",
    "What is the importance of silence?",
    "What is truth?",
    "How to drop the ego?",
    "What is the difference between compassion and pity?",
    "How to keep love alive in relationships?",
    "Why does jealousy happen?",
    "What is the real meaning of freedom?",
    "What is the difference between pleasure and bliss?",
    "What is consciousness?",
    "What does it mean to be awakened?",
  ],
  hinglish: [
    "Sakshi hone ka arth kya hai?",
    "Mann kabhi shaant kyun nahi rehta?",
    "Prem kya hai?",
    "Krodh kyun aata hai?",
    "Dhyan kaise karein?",
    "Ichhaon se mukt kaise hua jaaye?",
    "Akelepan aur ekaant mein kya bhed hai?",
    "Main itna sochta kyun hoon?",
    "Khushi ka raaz kya hai?",
    "Bhay se kaise mukt hon?",
    "Mann aur aatma mein kya antar hai?",
    "Jeevan ka arth kya hai?",
    "Mrityu se darr kyun lagta hai?",
    "Sannyas kya hai?",
    "Ishwar kya hai?",
    "Maun ka mahatva kya hai?",
    "Satya kya hai?",
    "Ahankaar kaise chhoote?",
    "Karuna aur daya mein kya fark hai?",
    "Rishton mein prem kaise bana rahe?",
    "Irshya kyun hoti hai?",
    "Swatantrata ka vastavik arth kya hai?",
    "Sukh aur aanand mein kya antar hai?",
    "Chetna kya hai?",
    "Jaagran ka arth kya hai?",
  ],
};

const intro: Record<Language, { greet: string; sub: string }> = {
  en: {
    greet: "Sit a while.",
    sub: "Bring a question that lives in you. The answer will speak in Osho's own words.",
  },
  hi: {
    greet: "थोड़ी देर बैठें।",
    sub: "जो प्रश्न आपके भीतर जी रहा है, उसे लाएँ। उत्तर ओशो के अपने शब्दों में मिलेगा।",
  },
  hinglish: {
    greet: "Thodi der baithiye.",
    sub: "Jo prashn aapke bhitar jee raha hai, use laayein. Uttar Osho ke apne shabdon mein milega.",
  },
};

const aiIntro: Record<Language, { greet: string; sub: string }> = {
  en: {
    greet: "Explore the Digital Universe",
    sub: "A highly advanced, general-purpose intelligence capable of code generation, logic reasoning, and information retrieval.",
  },
  hi: {
    greet: "डिजिटल ब्रह्मांड में आपका स्वागत है",
    sub: "कोड जनरेशन, तार्किक विश्लेषण और सूचना पुनर्प्राप्ति में सक्षम एक अत्यधिक उन्नत एआई सहायक।",
  },
  hinglish: {
    greet: "Digital Universe Explore Karein",
    sub: "Advanced intelligence jo code, logic aur har tarah ki information ko instantly solve kar sakta hai.",
  },
};

const dailyLabel: Record<Language, string> = {
  en: "Today's Reflection",
  hi: "आज का विचार",
  hinglish: "Aaj ka Vichaar",
};

export default function Welcome({ language, daily, onPick, mode = "osho" }: Props) {
  const isAi = mode === "ai";
  const t = isAi ? aiIntro[language] : intro[language];
  const deva = language === "hi";

  // 3D sphere state for Osho Mode
  const [angle, setAngle] = useState(0);
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const animationRef = useRef<number | null>(null);

  // Auto rotation loop for the 3D Sphere
  useEffect(() => {
    if (isAi) return;
    const animate = () => {
      // Rotate slower if hovering
      setAngle((prev) => prev + (hoveredIdx === null ? 0.003 : 0.0006));
      animationRef.current = requestAnimationFrame(animate);
    };
    animationRef.current = requestAnimationFrame(animate);
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [isAi, hoveredIdx]);

  // Clean layout for AI Mode
  if (isAi) {
    return (
      <div className="relative isolate flex min-h-full flex-col items-center justify-center overflow-hidden px-6 py-12 text-center select-none">
        {/* Cyber Grid Background */}
        <div className="cyber-grid absolute inset-0 -z-10 opacity-30" />
        {/* Light nodes */}
        <div className="neon-light absolute top-10 left-10 h-64 w-64 bg-[#6ea8fe]/10 rounded-full blur-[120px]" />
        <div className="neon-light absolute bottom-10 right-10 h-80 w-80 bg-[#3c64b4]/10 rounded-full blur-[140px]" />

        {/* Dynamic Holographic Core */}
        <div className="relative mb-12 flex flex-col items-center">
          <div className="relative grid h-48 w-48 place-items-center">
            {/* Spinning Rings */}
            <div className="absolute inset-0 rounded-full border border-dashed border-[#6ea8fe]/30 animate-spin-slow" />
            <div className="absolute inset-2 rounded-full border border-double border-[#3c64b4]/20 animate-spin-reverse" />
            <div className="absolute inset-6 rounded-full border border-[#6ea8fe]/40 animate-pulse" />
            {/* Glow Core */}
            <div className="absolute h-16 w-16 rounded-full bg-[#6ea8fe]/30 blur-md animate-ping" />
            <div className="absolute h-12 w-12 rounded-full bg-[#6ea8fe]/70 blur-xs" />
            <span className="relative font-mono text-3xl font-extrabold tracking-widest text-white drop-shadow-[0_0_12px_rgba(110,168,254,0.8)]">
              AI
            </span>
          </div>
          <div className="cyber-line mt-6 w-56 bg-gradient-to-r from-transparent via-[#6ea8fe] to-transparent h-[2px]" />
        </div>

        {/* Greet text */}
        <div className="max-w-2xl">
          <h1 className="ai-title font-mono text-3xl font-extrabold uppercase tracking-widest sm:text-5xl bg-gradient-to-r from-[#6ea8fe] via-white to-[#9ec5fe] bg-clip-text text-transparent drop-shadow-[0_0_8px_rgba(110,168,254,0.4)]">
            {t.greet}
          </h1>
          <p className="mx-auto mt-6 max-w-lg font-mono text-sm leading-relaxed text-[#7c92b0] border border-[#6ea8fe]/15 bg-[#0a0e1a]/40 backdrop-blur-md rounded-xl p-4 shadow-2xl">
            {t.sub}
          </p>
        </div>
      </div>
    );
  }

  // Calculate 3D sphere distribution for 25 questions (Fibonacci Lattice)
  const qList = oshoQuestions[language];
  const sphereQuestions = qList.map((q, idx) => {
    const total = qList.length;
    // Golden ratio spherical coordinates distribution
    const phi = Math.acos(-1 + (2 * idx) / total);
    const theta = Math.sqrt(total * Math.PI) * phi;
    
    // Rotated position calculation
    const initialX = Math.cos(theta) * Math.sin(phi);
    const initialY = Math.sin(theta) * Math.sin(phi);
    const initialZ = Math.cos(phi);

    // Apply rotation around Y axis
    const x = initialX * Math.cos(angle) - initialZ * Math.sin(angle);
    const z = initialX * Math.sin(angle) + initialZ * Math.cos(angle);
    const y = initialY;

    // Projection factors
    const depth = 280; // Distance of camera
    const scale = (z + 1.5) / 2.2; // Scaling logic based on Z depth
    const opacity = (z + 1) / 2; // Opacity based on depth
    
    // Screen mappings
    const screenX = x * 260; // Sphere width radius
    const screenY = y * 160; // Sphere height radius

    return {
      text: q,
      x: screenX,
      y: screenY,
      z,
      scale,
      opacity,
      index: idx,
    };
  });

  // Sort by Z index so rendering preserves proper depth layering (draw background elements first)
  const sortedQuestions = [...sphereQuestions].sort((a, b) => a.z - b.z);

  return (
    <div className="relative isolate flex min-h-full flex-col items-center justify-between px-6 py-8 text-center overflow-hidden select-none">
      {/* Warm Ambient Zen Light */}
      <div className="zen-halo absolute inset-0 -z-10" />

      {/* Sunrise Hero Title */}
      <div className="mt-4 flex flex-col items-center animate-rise">
        <h1 className="dawn-title font-display text-4xl font-light tracking-[0.05em] sm:text-5xl dawn-shimmer uppercase select-none">
          {t.greet}
        </h1>
        <p className={`mx-auto mt-2 max-w-md text-xs tracking-wider text-ash/80 ${deva ? "font-deva" : "font-ui"}`}>
          {t.sub}
        </p>
      </div>

      {/* Spectacular 3D Interactive Sphere Container */}
      <div className="relative flex-1 w-full max-w-4xl min-h-[380px] grid place-items-center my-6">
        {/* Core Sun / Meditation Energy Ball */}
        <div className="absolute h-36 w-36 rounded-full bg-dawn/20 blur-3xl animate-pulse" />
        <div className="absolute h-20 w-20 rounded-full bg-dawn-soft/10 blur-xl" />
        <div className="absolute h-6 w-6 rounded-full bg-dawn-soft/40 border border-dawn/30 animate-spin-slow" />

        {/* 3D Questions Sphere viewport */}
        <div className="relative w-full h-[360px] preserve-3d">
          {sortedQuestions.map((q) => {
            const isHovered = hoveredIdx === q.index;
            return (
              <button
                key={q.index}
                onClick={() => onPick(q.text)}
                onMouseEnter={() => setAngle(q.index * 0.25)} // Face user on hover
                onMouseOver={() => setHoveredIdx(q.index)}
                onMouseLeave={() => setHoveredIdx(null)}
                style={{
                  position: "absolute",
                  left: "50%",
                  top: "50%",
                  transform: `translate(-50%, -50%) translate3d(${q.x}px, ${q.y}px, ${q.z * 100}px) scale(${isHovered ? 1.15 : q.scale})`,
                  opacity: isHovered ? 1 : Math.max(0.15, q.opacity),
                  zIndex: Math.round((q.z + 1) * 100),
                  transition: "transform 0.2s ease-out, opacity 0.2s ease-out",
                }}
                className={`tag-3d group shrink-0 rounded-2xl glass px-4 py-2 border transition-all duration-300 ${
                  isHovered
                    ? "border-dawn/60 text-white shadow-[0_0_25px_-5px_rgba(232,161,76,0.6)]"
                    : "border-white/5 text-parchment/75"
                }`}
              >
                <div className="flex items-center gap-1.5 whitespace-nowrap">
                  <span className={`text-[12px] ${/[ऀ-ॿ]/.test(q.text) ? "font-deva" : "font-ui"}`}>
                    {q.text}
                  </span>
                  <ArrowUpRight size={10} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Aaj ka Vichaar */}
      {daily && daily.passage && (
        <div className="w-full max-w-xl animate-rise mb-4">
          <div className="glass relative overflow-hidden rounded-2xl p-4 text-left border border-white/5 bg-white/[0.02] backdrop-blur-md">
            <div className="mb-2 flex items-center gap-2">
              <span className="select-none text-dawn font-deva text-xs leading-none">॥</span>
              <span className="font-ui text-[9px] font-bold uppercase tracking-widest text-dawn-soft">{dailyLabel[language]}</span>
            </div>
            <p className={`text-[13.5px] leading-relaxed text-parchment/90 ${/[ऀ-ॿ]/.test(daily.passage) ? "font-deva" : "font-read"}`}>
              {daily.passage}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
