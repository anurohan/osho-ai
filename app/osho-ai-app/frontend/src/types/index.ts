export type Language = "en" | "hi" | "hinglish";
export type AppMode = "osho" | "ai";

export interface Source {
  series: string;
  discourse: string;
  passage: string;
  score?: number;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: Source[];
  pending?: boolean;
  feedback?: "up" | "down" | null;
}

export interface Conversation {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: number;
}

export interface LibrarySeries {
  name: string;
  discourses: string[];
  discourse_count: number;
  chunks: number;
}

export interface Library {
  series: LibrarySeries[];
  total_series: number;
  total_chunks: number;
}

export interface DailyVichaar {
  series: string;
  discourse: string;
  passage: string;
}

export interface Status {
  rag_loaded: boolean;
  vectors: number;
  embedding_model: string;
  llama_model: string;
  ollama_reachable: boolean;
  ollama_has_model: boolean;
}

export interface Settings {
  language: Language;
  speechRate: number;
  autoSpeak: boolean;
  mode: AppMode;
}
