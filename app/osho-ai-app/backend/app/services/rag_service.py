"""
Osho AI - RAG retrieval + local Llama generation.

Answers are grounded strictly in the retrieved Osho discourse passages and are
written in Osho's own voice and words (never as a generic AI assistant).

The heavy model/index are loaded lazily via `ensure_loaded()` (called from the
FastAPI lifespan on startup) so `uvicorn --reload` stays fast and a missing
index produces a clear error instead of crashing at import time.
"""

from pathlib import Path
from typing import List, Dict, Any, Optional
from datetime import date
import os
import json
import re
import random

import faiss
import requests
from sentence_transformers import SentenceTransformer


# ============================================================
# PATHS  (no hard-coded drive letters)
# ============================================================

def _find_project_root() -> Path:
    """
    Resolve the Osho-AI project root.

    Priority:
      1. OSHO_ROOT environment variable (if set)
      2. Walk up from this file until a folder containing `vector_db` is found
      3. Error with a clear message instead of silently guessing wrong
    """
    env_root = os.environ.get("OSHO_ROOT")
    if env_root:
        return Path(env_root).expanduser().resolve()

    here = Path(__file__).resolve()
    for parent in here.parents:
        if (parent / "vector_db").is_dir():
            return parent

    # Fallback: try the known layout but validate it exists.
    # <root>/app/osho-ai-app/backend/app/services/rag_service.py
    if len(here.parents) > 5:
        candidate = here.parents[5]
        if candidate.is_dir():
            return candidate

    raise RuntimeError(
        f"Cannot locate the Osho-AI project root from {here}.\n"
        f"Either place a 'vector_db' folder in the project root or set the "
        f"OSHO_ROOT environment variable to the correct path."
    )


PROJECT_ROOT = _find_project_root()

INDEX_FILE = PROJECT_ROOT / "vector_db" / "osho.index"
METADATA_FILE = PROJECT_ROOT / "vector_db" / "metadata.json"

EMBEDDING_MODEL = os.environ.get(
    "OSHO_EMBEDDING_MODEL", "paraphrase-multilingual-MiniLM-L12-v2"
)
LLAMA_MODEL = os.environ.get("OSHO_LLAMA_MODEL", "llama3.2:3b")

OLLAMA_HOST = os.environ.get("OLLAMA_HOST", "http://127.0.0.1:11434")
OLLAMA_GENERATE_URL = f"{OLLAMA_HOST}/api/generate"
OLLAMA_TAGS_URL = f"{OLLAMA_HOST}/api/tags"

TOP_K = 5

# Pull a wider candidate pool from FAISS, then filter by threshold, drop
# near-duplicate passages and keep the sources diverse before trimming to TOP_K.
# This means a weak/duplicate top hit no longer costs us a good passage further
# down the list — the answer gets richer, more grounded context.
FETCH_K = 20
MAX_PER_DISCOURSE = 3   # don't let a single discourse flood every source slot

# Minimum cosine similarity required before a passage counts as relevant.
# (The index is IndexFlatIP over normalized embeddings, so scores are cosine.)
MIN_SIMILARITY = 0.38


# ============================================================
# LAZY STATE
# ============================================================

_index = None          # faiss index
_documents = None      # list[dict] metadata
_embedding_model = None
_loaded = False


def ensure_loaded() -> None:
    """Load index, metadata and embedding model once (idempotent)."""
    global _index, _documents, _embedding_model, _loaded

    if _loaded:
        return

    print("=" * 60)
    print("OSHO AI - RAG INITIALIZATION")
    print("=" * 60)
    print("Project root:", PROJECT_ROOT)

    if not INDEX_FILE.exists():
        raise FileNotFoundError(
            f"FAISS index not found: {INDEX_FILE}\n"
            f"Run the index builder first (UPDATE_OSHO_DATA.bat / src/build_index.py)."
        )
    if not METADATA_FILE.exists():
        raise FileNotFoundError(
            f"Metadata not found: {METADATA_FILE}\n"
            f"Run the index builder first (UPDATE_OSHO_DATA.bat / src/build_index.py)."
        )

    print("Loading FAISS index...")
    _index = faiss.read_index(str(INDEX_FILE))
    print(f"  vectors: {_index.ntotal}")

    print("Loading metadata...")
    with open(METADATA_FILE, "r", encoding="utf-8") as f:
        _documents = json.load(f)
    print(f"  records: {len(_documents)}")

    print(f"Loading embedding model: {EMBEDDING_MODEL}")
    _embedding_model = SentenceTransformer(EMBEDDING_MODEL)
    print("  embedding model ready.")

    if check_ollama():
        print(f"Ollama connected. Model: {LLAMA_MODEL}")
    else:
        print("WARNING: Ollama is not currently reachable.")

    print("=" * 60)
    print("OSHO AI RAG READY")
    print("=" * 60)

    _loaded = True


# ============================================================
# OLLAMA
# ============================================================

def check_ollama() -> bool:
    try:
        response = requests.get(OLLAMA_TAGS_URL, timeout=3)
        return response.status_code == 200
    except requests.RequestException:
        return False


def ollama_has_model(model: str = LLAMA_MODEL) -> bool:
    """True if the given model (any tag prefix match) is pulled locally."""
    try:
        response = requests.get(OLLAMA_TAGS_URL, timeout=3)
        response.raise_for_status()
        names = [m.get("name", "") for m in response.json().get("models", [])]
        base = model.split(":")[0]
        return any(n == model or n.split(":")[0] == base for n in names)
    except requests.RequestException:
        return False


# ============================================================
# LANGUAGE DETECTION
# ============================================================

def detect_language(text: str) -> str:
    """Detect Hindi via Devanagari characters, else English."""
    devanagari = len(re.findall(r"[ऀ-ॿ]", text))
    return "hi" if devanagari >= 2 else "en"


# ============================================================
# RETRIEVAL
# ============================================================

def retrieve(question: str) -> List[Dict[str, Any]]:
    ensure_loaded()

    if _index is None or _index.ntotal == 0:
        return []

    query_embedding = _embedding_model.encode(
        [question],
        convert_to_numpy=True,
        normalize_embeddings=True,
    ).astype("float32")

    k = min(FETCH_K, _index.ntotal)
    scores, indices = _index.search(query_embedding, k)

    # Walk the ranked candidates and keep the best TOP_K that are (a) above the
    # relevance threshold, (b) not a near-duplicate of one already kept, and
    # (c) within the per-discourse cap so the context stays varied.
    results: List[Dict[str, Any]] = []
    seen_keys = set()
    per_discourse: Dict[str, int] = {}

    for score, idx in zip(scores[0], indices[0]):
        idx = int(idx)
        if idx < 0 or idx >= len(_documents):
            continue
        score = float(score)
        if score < MIN_SIMILARITY:
            continue

        item = _documents[idx]
        passage = item.get("text", "")

        # Overlapping chunks can surface almost the same text — skip repeats.
        key = " ".join(passage.split())[:180]
        if key in seen_keys:
            continue

        discourse = str(item.get("discourse", ""))
        if per_discourse.get(discourse, 0) >= MAX_PER_DISCOURSE:
            continue

        seen_keys.add(key)
        per_discourse[discourse] = per_discourse.get(discourse, 0) + 1

        results.append({
            "series": item.get("series", ""),
            "discourse": item.get("discourse", ""),
            "passage": passage,
            "score": score,
            "chunk": item.get("chunk", ""),
            "file": item.get("file", ""),
        })

        if len(results) >= TOP_K:
            break

    return results


# ============================================================
# PROMPT  (answers in Osho's own words, never "AI-sounding")
# ============================================================

# Shared, language-specific rules. The intent: the reply must read like it came
# straight out of the discourse the user fed in -- Osho's own phrasing and
# imagery, lightly clarified -- not like a chatbot summary. Strictly grounded,
# never invents, always faithful to the provided passages.

_RULES = {
    "hi": """तुम "OSHO AI" हो — ओशो के प्रवचनों की आवाज़।

नीचे ओशो के असली प्रवचनों के कुछ अंश (SOURCE PASSAGES) दिए हैं।
इन्हीं अंशों के आधार पर उत्तर दो — ओशो की अपनी भाषा, अपने शब्दों और अपनी लय में।

भाषा नियम:
- पूरा उत्तर केवल और केवल देवनागरी हिंदी में होना चाहिए।

कैसे उत्तर दो:
- उत्तर सीधे इन अंशों से निकालो। ओशो के अपने शब्द, उपमाएँ और भाव वैसे ही रखो — उन्हें सपाट, किताबी भाषा में मत बदलो।
- जहाँ कोई पंक्ति बात को पकड़ती हो, उसे स्वाभाविक रूप से उत्तर में पिरो दो (छोटा उद्धरण दे सकते हो)।
- फिर एक-दो वाक्य की सरल स्पष्टता जोड़ो ताकि पूछने वाला समझ जाए।
- कभी मत कहो "स्रोत के अनुसार", "मैं एक AI हूँ", "दिए गए अंशों के आधार पर" — बस सीधे बोलो।
- जो अंशों में नहीं है, वैसा कोई तथ्य, उद्धरण या शिक्षा मत गढ़ो।
- यदि प्रश्न आधुनिक तकनीक, कंप्यूटर, AI या ऐसे किसी विषय पर है जिसका ओशो प्रवचनों से संबंध नहीं है, तो कोई मनगढ़ंत उत्तर मत बनाओ। केवल यह कहो: "मेरे पास उपलब्ध ओशो प्रवचनों में इस प्रश्न का पर्याप्त संदर्भ नहीं मिला।"
- उत्तर को बुलेट पॉइंट, शीर्षक या सूची में मत बाँटो — बहती हुई गद्य में लिखो, जैसे प्रवचन बोला जाता है। लगभग 4 से 8 वाक्य।""",

    "hinglish": """Tum "OSHO AI" ho — Osho ke pravachano ki awaaz.

Neeche Osho ke asli pravachano ke kuchh ansh (SOURCE PASSAGES) diye gaye hain.
Inhi ansho ke aadhaar par jawab do — Osho ki apni bhaasha aur bhaav me, par Roman (Hinglish) me likho.

Bhasha niyam:
- Pura jawab sirf aur sirf Hinglish (Roman script Hindi) me hona chahiye.

Kaise jawab do:
- Jawab seedhe in ansho se nikalo. Osho ke apne shabd, upmaayein aur bhaav waise hi rakho.
- Jahan koi pankti baat ko pakadti ho, use naturally jawab me piro do (chhota quote de sakte ho).
- Phir ek-do vaakya ki saral spashtata jodo taaki poochhne wala samajh jaaye.
- Kabhi mat kaho "source ke according", "main ek AI hoon", "diye gaye passages ke aadhaar par" — bas seedhe bolo.
- Jo ansho me nahi hai, waisa koi tathya, quote ya shiksha mat gadho.
- Agar prashn modern tech, AI, computers ya aise topic par hai jo pravachano me nahi hai, to fake answer mat banao. Seedhe kaho: "Is prashn se judi koi baat abhi uplabdh Osho pravachano me nahi mili."
- Jawab ko bullet points, headings ya list me mat baanto — bahti hui prose me likho. Lagbhag 4 se 8 vaakya.""",

    "en": """You are "OSHO AI" — the voice of Osho's discourses.

Below are excerpts (SOURCE PASSAGES) from Osho's actual discourses.
Answer strictly from these passages, in Osho's own voice and words.

CRITICAL LANGUAGE REQUIREMENT:
- You MUST write your entire answer in ENGLISH only.
- Since the source passages are in Hindi, translate and convey their wisdom and meaning into fluent, poetic, clear English. Never output Hindi text when English is requested.

How to answer:
- Draw the answer directly from the passages. Keep Osho's own phrases, images and rhythm translated into English.
- Then add one or two sentences of plain clarification so the seeker understands.
- Never say "according to the sources", "as an AI", or "based on the provided passages" — simply speak.
- Do not invent any fact, quote or teaching that is not in the passages.
- If the passages truly do not touch the question, gently say this is not addressed in the available discourses.
- Do not use bullet points, headings or numbered lists — write in flowing prose, the way a discourse is spoken.
- Answer in warm, direct, unhurried English — the way a discourse flows. Around 4 to 8 sentences.""",
}


def _build_prompt(
    question: str,
    retrieved: List[Dict[str, Any]],
    language: str,
    history: Optional[List[Dict[str, str]]] = None,
) -> str:
    context_parts = []
    for i, item in enumerate(retrieved, start=1):
        context_parts.append(
            f"SOURCE {i}\n"
            f"Series: {item['series']}\n"
            f"Discourse: {item['discourse']}\n"
            f"Passage:\n{item['passage']}\n"
        )
    context = "\n".join(context_parts)

    rules = _RULES.get(language, _RULES["en"])

    history_block = ""
    if history:
        recent = [h for h in history if h.get("role") in ("user", "assistant")][-4:]
        if recent:
            lines = []
            for h in recent:
                who = "Seeker" if h["role"] == "user" else "Osho AI"
                lines.append(f"{who}: {h['content']}")
            history_block = (
                "RECENT CONVERSATION (for context only, do not repeat):\n"
                + "\n".join(lines)
                + "\n\n"
            )

    return (
        f"{rules}\n\n"
        f"{history_block}"
        f"SOURCE PASSAGES:\n{context}\n"
        f"QUESTION:\n{question}\n\n"
        f"ANSWER:\n"
    )


# ============================================================
# GENERATION
# ============================================================

def generate_with_llama(
    question: str,
    retrieved: List[Dict[str, Any]],
    language: str,
    history: Optional[List[Dict[str, str]]] = None,
) -> str:
    prompt = _build_prompt(question, retrieved, language, history)

    payload = {
        "model": LLAMA_MODEL,
        "prompt": prompt,
        "stream": False,
        "options": {
            "temperature": 0.35,   # natural voice, still faithful
            "top_p": 0.9,
            "repeat_penalty": 1.1,
            "num_predict": 480,    # room for a full, discourse-like answer
        },
    }

    try:
        response = requests.post(OLLAMA_GENERATE_URL, json=payload, timeout=180)
        response.raise_for_status()
        response.encoding = "utf-8"
        data = response.json()
        answer = data.get("response", "").strip()
        return answer or _fallback_generation_failed(language)
    except requests.RequestException as error:
        print("Ollama error:", error)
        return _fallback_ollama_down(language)


# ============================================================
# STREAMING GENERATION  (token-by-token, for the live-typing UI)
# ============================================================
#
# The non-streaming answer_question() above stays as the reliable fallback.
# stream_answer() yields small event dicts that the API layer serialises as
# Server-Sent Events. Sources are emitted first (they're known before the model
# runs), then the answer arrives token by token, then a final "done".

def _public_sources(retrieved: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Trim internal retrieval fields down to what the client needs."""
    return [
        {
            "series": s.get("series", ""),
            "discourse": s.get("discourse", ""),
            "passage": s.get("passage", ""),
            "score": s.get("score", 0.0),
        }
        for s in retrieved
    ]


def _ollama_stream(prompt: str):
    """Yield answer tokens from Ollama as they are generated."""
    payload = {
        "model": LLAMA_MODEL,
        "prompt": prompt,
        "stream": True,
        "options": {
            "temperature": 0.35,
            "top_p": 0.9,
            "repeat_penalty": 1.1,
            "num_predict": 480,
        },
    }

    try:
        response = requests.post(
            OLLAMA_GENERATE_URL, json=payload, stream=True, timeout=180
        )
    except requests.ConnectionError:
        raise requests.ConnectionError(
            f"Cannot connect to Ollama at {OLLAMA_HOST}. Is it running?"
        )

    if response.status_code == 404:
        response.close()
        raise requests.RequestException(
            f"Model '{LLAMA_MODEL}' not found. Run: ollama pull {LLAMA_MODEL}"
        )
    response.raise_for_status()

    try:
        for raw_line in response.iter_lines(decode_unicode=True):
            if not raw_line:
                continue
            try:
                data = json.loads(raw_line)
            except json.JSONDecodeError:
                continue
            token = data.get("response", "")
            if token:
                yield token
            if data.get("done"):
                break
    finally:
        response.close()


def _enrich_short_followup(
    question: str,
    conversation_history: Optional[List[Dict[str, str]]],
) -> str:
    """
    For tiny follow-ups like "और?", "more", "aur batao" prepend the previous
    user question so retrieval has enough signal.  Substantive questions
    (>= 8 chars) are returned unchanged.
    """
    if conversation_history and len(question) < 8:
        prev_user = next(
            (h["content"] for h in reversed(conversation_history) if h.get("role") == "user"),
            None,
        )
        if prev_user:
            return f"{prev_user} {question}"
    return question


def stream_answer(
    question: str,
    conversation_history: Optional[List[Dict[str, str]]] = None,
    language: str = "en",
):
    """
    Generator form of answer_question for live streaming.

    Yields event dicts:
      {"type": "sources", "sources": [...]}   (once, first)
      {"type": "delta",   "text": "..."}      (many)
      {"type": "done"}                          (once, last)

    Grounded and honest: sources come only from the index, and any failure
    yields a graceful fallback message as delta text rather than an invented
    answer.
    """
    question = (question or "").strip()
    if not question:
        yield {"type": "sources", "sources": []}
        yield {"type": "delta", "text": _fallback_generation_failed(language)}
        yield {"type": "done"}
        return

    if language not in ("en", "hi", "hinglish"):
        language = detect_language(question)

    retrieval_query = _enrich_short_followup(question, conversation_history)
    retrieved = retrieve(retrieval_query)

    print("-" * 60)
    print("QUESTION (stream):", question)
    print("RETRIEVED:", len(retrieved))

    yield {"type": "sources", "sources": _public_sources(retrieved)}

    if not retrieved:
        yield {"type": "delta", "text": _fallback_no_context(language)}
        yield {"type": "done"}
        return

    prompt = _build_prompt(question, retrieved, language, conversation_history)

    got_any = False
    try:
        for token in _ollama_stream(prompt):
            got_any = True
            yield {"type": "delta", "text": token}
    except requests.RequestException as error:
        print("Ollama stream error:", error)
        if not got_any:
            yield {"type": "delta", "text": _fallback_ollama_down(language)}
        yield {"type": "done"}
        return

    if not got_any:
        yield {"type": "delta", "text": _fallback_generation_failed(language)}

    yield {"type": "done"}


# ============================================================
# GRACEFUL FALLBACK MESSAGES  (clean, correct text — no mojibake)
# ============================================================

def _fallback_no_context(language: str) -> str:
    if language == "hi":
        return (
            "मेरे पास उपलब्ध ओशो प्रवचनों में इस प्रश्न का पर्याप्त संदर्भ नहीं मिला। "
            "कोई और प्रश्न पूछो, या इसे थोड़ा और स्पष्ट करके पूछो।"
        )
    if language == "hinglish":
        return (
            "Is prashn se judi koi baat abhi uplabdh Osho pravachano me nahi mili. "
            "Koi aur prashn poochho, ya ise thoda aur spasht karke poochho."
        )
    return (
        "This question is not addressed in the available Osho discourses yet. "
        "Try asking it differently, or ask something else."
    )


def _fallback_ollama_down(language: str) -> str:
    if language == "hi":
        return (
            "स्थानीय Llama मॉडल अभी उपलब्ध नहीं है। "
            "कृपया सुनिश्चित करें कि Ollama चल रहा है।"
        )
    if language == "hinglish":
        return (
            "Local Llama model abhi uplabdh nahi hai. "
            "Kripya sunishchit karein ki Ollama chal raha hai."
        )
    return (
        "The local Llama model is currently unavailable. "
        "Please make sure Ollama is running."
    )


def _fallback_generation_failed(language: str) -> str:
    if language == "hi":
        return "अभी उत्तर नहीं बन पाया। कृपया फिर से पूछें।"
    if language == "hinglish":
        return "Abhi jawab nahi ban paaya. Kripya phir se poochhein."
    return "I could not generate an answer just now. Please try again."


# ============================================================
# MAIN ENTRY
# ============================================================

def answer_question(
    question: str,
    conversation_history: Optional[List[Dict[str, str]]] = None,
    language: str = "en",
) -> Dict[str, Any]:
    question = (question or "").strip()
    if not question:
        return {"answer": _fallback_generation_failed(language), "sources": []}

    if language not in ("en", "hi", "hinglish"):
        language = detect_language(question)

    retrieval_query = _enrich_short_followup(question, conversation_history)
    retrieved = retrieve(retrieval_query)

    print("-" * 60)
    print("QUESTION:", question)
    print("RETRIEVED:", len(retrieved))
    for item in retrieved[:3]:
        print(f"  {item['series']} / {item['discourse']} / score={item['score']:.4f}")

    if not retrieved:
        return {"answer": _fallback_no_context(language), "sources": []}

    answer = generate_with_llama(question, retrieved, language, conversation_history)
    return {"answer": answer, "sources": retrieved}


# ============================================================
# LIBRARY / STATUS  (for the Discourses + Settings panels)
# ============================================================

def get_library() -> Dict[str, Any]:
    """Group the indexed corpus by series -> discourses, for the UI."""
    ensure_loaded()

    by_series: Dict[str, Dict[str, int]] = {}
    for item in _documents:
        series = item.get("series", "Unknown")
        discourse = str(item.get("discourse", ""))
        by_series.setdefault(series, {})
        by_series[series][discourse] = by_series[series].get(discourse, 0) + 1

    series_list = []
    for series in sorted(by_series):
        discourses = sorted(by_series[series])
        series_list.append({
            "name": series,
            "discourses": discourses,
            "discourse_count": len(discourses),
            "chunks": sum(by_series[series].values()),
        })

    return {
        "series": series_list,
        "total_series": len(series_list),
        "total_chunks": len(_documents),
    }


# ============================================================
# AAJ KA VICHAAR  (a real, indexed passage for the day)
# ============================================================

def _clean_excerpt(text: str, max_len: int = 340) -> str:
    """
    Tidy a raw chunk into a self-contained excerpt: collapse whitespace, skip a
    leading half-sentence if one is obvious, and end on a sentence boundary.
    Never rewrites the words — it only trims — so the passage stays authentic.
    """
    text = " ".join((text or "").split())
    if not text:
        return ""

    # If the chunk begins mid-sentence, start from the first clean break nearby.
    boundary = -1
    for mark in ("। ", ". ", "! ", "? "):
        p = text.find(mark)
        if 0 <= p <= 120:
            boundary = max(boundary, p + len(mark))
    if boundary > 0:
        candidate = text[boundary:].strip()
        if len(candidate) >= 120:
            text = candidate

    if len(text) <= max_len:
        return text

    cut = text[:max_len]
    last = max(cut.rfind("।"), cut.rfind("."), cut.rfind("!"), cut.rfind("?"))
    if last > max_len * 0.5:
        return cut[: last + 1].strip()
    return cut.strip() + "…"


def get_daily(language: str = "en") -> Dict[str, Any]:
    """
    'Aaj ka Vichaar' — one real passage drawn from the indexed corpus, chosen
    deterministically for today (same all day, a new one tomorrow). It is always
    an actual excerpt from a discourse; nothing is fabricated.
    """
    ensure_loaded()

    if not _documents:
        return {"series": "", "discourse": "", "passage": ""}

    # Prefer passages that read well standalone — not too short, not too long.
    candidates = [
        i for i, d in enumerate(_documents)
        if 220 <= len(d.get("text", "")) <= 900
    ]
    if not candidates:
        candidates = list(range(len(_documents)))

    # Deterministic per-day pick: stable within a day, rotates each day.
    rng = random.Random(date.today().toordinal())
    doc = _documents[rng.choice(candidates)]

    return {
        "series": doc.get("series", ""),
        "discourse": str(doc.get("discourse", "")),
        "passage": _clean_excerpt(doc.get("text", "")),
    }


def get_status() -> Dict[str, Any]:
    """Lightweight health/status for the Settings panel."""
    ollama_up = check_ollama()
    return {
        "rag_loaded": _loaded,
        "vectors": (_index.ntotal if _loaded and _index is not None else 0),
        "embedding_model": EMBEDDING_MODEL,
        "llama_model": LLAMA_MODEL,
        "ollama_reachable": ollama_up,
        "ollama_has_model": (ollama_has_model() if ollama_up else False),
    }


# ============================================================
# AI MODE  (general assistant, no RAG grounding)
# ============================================================

_AI_SYSTEM = {
    "hi": """तुम एक बुद्धिमान AI सहायक हो। तुम किसी भी विषय पर जानकारी दे सकते हो — विज्ञान, तकनीक, इतिहास, दर्शन, स्वास्थ्य, शिक्षा, या कुछ भी।
तुम ओशो या कोई आध्यात्मिक गुरु नहीं हो। तुम एक आधुनिक AI हो।
जवाब हमेशा हिंदी (देवनागरी) में दो। स्पष्ट, सटीक और सहायक बनो। 4-8 वाक्य।""",
    "hinglish": """Tum ek intelligent AI assistant ho. Tum kisi bhi topic par information de sakte ho — science, tech, history, philosophy, health, education, ya kuch bhi.
Tum Osho ya koi spiritual guru nahi ho. Tum ek modern AI ho.
Jawab hamesha Hinglish (Roman Hindi) mein do. Clear, accurate aur helpful bano. 4-8 sentences.""",
    "en": """You are an intelligent AI assistant. You can provide information on any topic — science, technology, history, philosophy, health, education, or anything else.
You are NOT Osho or any spiritual guru. You are a modern AI assistant.
ALWAYS answer in English. Be clear, accurate, and helpful. 4-8 sentences.""",
}


def _build_ai_prompt(
    question: str,
    language: str,
    history: Optional[List[Dict[str, str]]] = None,
) -> str:
    system = _AI_SYSTEM.get(language, _AI_SYSTEM["en"])
    history_block = ""
    if history:
        recent = [h for h in history if h.get("role") in ("user", "assistant")][-4:]
        if recent:
            lines = []
            for h in recent:
                who = "User" if h["role"] == "user" else "Assistant"
                lines.append(f"{who}: {h['content']}")
            history_block = (
                "RECENT CONVERSATION:\n"
                + "\n".join(lines)
                + "\n\n"
            )
    return f"{system}\n\n{history_block}QUESTION:\n{question}\n\nANSWER:\n"


def stream_ai_answer(
    question: str,
    conversation_history: Optional[List[Dict[str, str]]] = None,
    language: str = "en",
):
    """AI MODE streaming — general assistant, no RAG."""
    question = (question or "").strip()
    if not question:
        yield {"type": "sources", "sources": []}
        yield {"type": "delta", "text": _fallback_generation_failed(language)}
        yield {"type": "done"}
        return

    if language not in ("en", "hi", "hinglish"):
        language = detect_language(question)

    yield {"type": "sources", "sources": []}  # AI mode has no sources

    prompt = _build_ai_prompt(question, language, conversation_history)

    got_any = False
    try:
        for token in _ollama_stream(prompt):
            got_any = True
            yield {"type": "delta", "text": token}
    except requests.RequestException as error:
        print("Ollama stream error (AI mode):", error)
        if not got_any:
            yield {"type": "delta", "text": _fallback_ollama_down(language)}
        yield {"type": "done"}
        return

    if not got_any:
        yield {"type": "delta", "text": _fallback_generation_failed(language)}

    yield {"type": "done"}


def ai_answer_question(
    question: str,
    conversation_history: Optional[List[Dict[str, str]]] = None,
    language: str = "en",
) -> Dict[str, Any]:
    """AI MODE non-streaming — general assistant, no RAG."""
    question = (question or "").strip()
    if not question:
        return {"answer": _fallback_generation_failed(language), "sources": []}

    if language not in ("en", "hi", "hinglish"):
        language = detect_language(question)

    prompt = _build_ai_prompt(question, language, conversation_history)

    payload = {
        "model": LLAMA_MODEL,
        "prompt": prompt,
        "stream": False,
        "options": {
            "temperature": 0.7,
            "top_p": 0.9,
            "repeat_penalty": 1.1,
            "num_predict": 480,
        },
    }

    try:
        response = requests.post(OLLAMA_GENERATE_URL, json=payload, timeout=180)
        response.raise_for_status()
        response.encoding = "utf-8"
        data = response.json()
        answer = data.get("response", "").strip()
        return {"answer": answer or _fallback_generation_failed(language), "sources": []}
    except requests.RequestException as error:
        print("Ollama error (AI mode):", error)
        return {"answer": _fallback_ollama_down(language), "sources": []}
