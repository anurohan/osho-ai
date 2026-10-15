# Osho AI

Osho AI is a local-first question-and-answer application for exploring an indexed collection of Osho discourses. It combines semantic retrieval with a local language model so answers are grounded in retrieved passages and can show their sources.

## How it works

1. Discourse text is prepared and indexed for semantic search.
2. A user's question is embedded and matched against the FAISS index.
3. The most relevant passages are added to a grounded prompt.
4. Ollama generates an answer from that context, and the application returns the answer with source passages.

The repository contains a React/Vite frontend, a FastAPI backend, retrieval/indexing utilities, discourse data, and the vector index. The detailed application guide is in [`app/osho-ai-app/README.md`](app/osho-ai-app/README.md).

## Features

- Retrieval-grounded answers with source passages.
- English, Hindi, and Hinglish response modes.
- Voice input and spoken answers in supported browsers.
- Local browser conversation history and follow-up questions.
- A discourse library browser and answer feedback controls.
- Local inference through Ollama rather than a hosted model API.

## Run on Windows

Install Python, Node.js/npm, and [Ollama](https://ollama.com/) first. From the repository root, run:

```bat
START_OSHO_AI.bat
```

The launcher starts the local Ollama model, API, and frontend; keep its terminal windows open while using the application. The app guide documents manual development setup and the local model requirements.

## Update the discourse index

Add text files that you are permitted to use under `data/raw/<Series Name>/`, then run:

```bat
UPDATE_OSHO_DATA.bat
```

The indexing process rebuilds the retrieval data. Refresh the application after it completes. Do not add material unless you have the right to store and use it.

## Repository map

- `app/osho-ai-app/backend/` — FastAPI application and RAG services.
- `app/osho-ai-app/frontend/` — Vite/React user interface.
- `data/raw/` — source text used to prepare the knowledge base.
- `vector_db/` — persisted retrieval index.
- `src/` — index-building and retrieval test utilities.
- `retrieval_test.py` — sample multilingual retrieval questions.
- `ADDING_DISCOURSES.md` — instructions for adding discourse material.

## Local API

The backend runs at `http://127.0.0.1:8000`; its interactive API documentation is available at `http://127.0.0.1:8000/docs` while it is running. The frontend development server uses `http://localhost:5173`.

## Notes

The model is local, but generated responses can still be incomplete or mistaken. Treat retrieved source passages as the reference and verify important interpretations against them. Browser speech features depend on browser support and permissions.