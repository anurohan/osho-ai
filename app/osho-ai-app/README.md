# Osho AI

A meditative question-and-answer companion grounded in Osho's discourses. Ask a
question and the answer comes back in Osho's own voice — woven from the actual
passages retrieved from his talks, with the source passages shown alongside.

The system is a Retrieval-Augmented Generation (RAG) pipeline: your question is
embedded and matched against a FAISS index of discourse passages, and the most
relevant passages are handed to a local language model (via Ollama) which
responds in Osho's voice, strictly from that material.

## One-click start (Windows)

Double-click **`START_OSHO_AI.bat`** in the project root (`D:\Osho-AI\`). It will:

1. Start Ollama and make sure the `llama3.2:3b` model is present (pulling it the
   first time if needed).
2. Start the backend (FastAPI) on `http://127.0.0.1:8000`.
3. Start the frontend (Vite) on `http://localhost:5173`.
4. Open the site in your browser.

Keep the two terminal windows open while you use the app; close them to stop it.

## Updating the knowledge base

Drop new discourse text files under `data\raw\<Series Name>\` and run
**`UPDATE_OSHO_DATA.bat`**. It rebuilds the FAISS index so the new material is
searchable. Refresh the website afterwards.

## Features

- **Answers in Osho's voice** — grounded in retrieved passages, never invented,
  with the source passages listed under each answer.
- **Three languages** — English, Hindi (हिंदी), and Hinglish. Switch anytime; the
  answer follows.
- **Voice** — speak your question (speech-to-text) and have answers read aloud
  (text-to-speech), in the chosen language.
- **Conversations** — history is saved locally in your browser, so multi-turn
  follow-ups keep their context and your past chats are still there next time.
- **Discourses panel** — browse the indexed series and discourses.
- **Feedback** — mark answers helpful or not.

## Manual start (for development)

Frontend:

```powershell
cd D:\Osho-AI\app\osho-ai-app\frontend
npm install
npm run dev
```

Backend (uses the existing project virtual environment):

```powershell
cd D:\Osho-AI\app\osho-ai-app\backend
D:\Osho-AI\.venv\Scripts\python.exe -m pip install -r requirements.txt
D:\Osho-AI\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

- API: http://127.0.0.1:8000
- Interactive docs: http://127.0.0.1:8000/docs

Vite proxies `/api/*` to `http://127.0.0.1:8000` (see `frontend/vite.config.ts`),
so the frontend only calls relative `/api/...` paths.

## How the pieces fit

```
frontend (React + Vite)  ──/api──►  backend (FastAPI)
                                        │
                                        ▼
                          rag_service.py  ─ embeddings ─►  FAISS vector_db
                                        │
                                        └─ retrieved passages ─►  Ollama (llama3.2:3b)
```

The whole engine lives in `backend/app/services/rag_service.py`:
`answer_question(question, conversation_history, language)` embeds the question,
searches the FAISS index, builds a grounded prompt, and calls Ollama. It returns
`{"answer": str, "sources": [...]}`. Retrieval settings (model, top-k, similarity
threshold, Ollama host/model) are read from environment variables with sensible
defaults, so nothing is hard-coded to one machine.

## Endpoints

```
GET   /api/health     Liveness check
GET   /api/status     RAG + Ollama readiness (index size, model, reachability)
GET   /api/library    Indexed series and discourses (for the Discourses panel)
POST  /api/chat       { message, language, history } -> { answer, sources }
POST  /api/feedback   { rating: "up" | "down", question?, answer? }
```

## Configuration (optional)

These environment variables override the defaults (the launcher sets the model
cache ones for you):

```
OSHO_ROOT              Project root (auto-detected if unset)
OSHO_EMBEDDING_MODEL   default: paraphrase-multilingual-MiniLM-L12-v2
OSHO_LLAMA_MODEL       default: llama3.2:3b
OLLAMA_HOST            default: http://127.0.0.1:11434
HF_HUB_OFFLINE=1       load the embedding model from the local cache only
```
