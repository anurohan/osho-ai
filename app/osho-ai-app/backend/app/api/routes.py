"""API routes."""

import json
from collections import deque

from fastapi import APIRouter
from fastapi.responses import StreamingResponse

from app.models.schemas import (
    ChatRequest,
    ChatResponse,
    Source,
    LibraryResponse,
    StatusResponse,
    FeedbackRequest,
    DailyResponse,
)
from app.services import rag_service
from app.services.rag_service import answer_question, ai_answer_question

router = APIRouter()

# Simple in-memory feedback log (resets on restart). Capped at 500 entries to
# prevent unbounded memory growth; swap for a file/db later if needed.
_MAX_FEEDBACK = 500
_feedback_log: deque[dict] = deque(maxlen=_MAX_FEEDBACK)


# Localised "index not built yet" message, shared by /chat and /chat/stream.
_INDEX_MISSING = {
    "hi": "ज्ञान-सूची अभी तैयार नहीं है। पहले UPDATE_OSHO_DATA.bat चलाकर index बनाएँ।",
    "hinglish": "Knowledge index abhi taiyaar nahi hai. Pehle UPDATE_OSHO_DATA.bat chalaakar index banayein.",
    "en": "The knowledge index isn't built yet. Run UPDATE_OSHO_DATA.bat to build it first.",
}


@router.get("/health")
def health():
    return {"status": "ok"}


@router.get("/status", response_model=StatusResponse)
def status():
    return rag_service.get_status()


@router.get("/library", response_model=LibraryResponse)
def library():
    return rag_service.get_library()


@router.get("/daily", response_model=DailyResponse)
def daily(language: str = "en"):
    """A real, indexed passage for today — 'Aaj ka Vichaar'."""
    try:
        return rag_service.get_daily(language)
    except FileNotFoundError:
        return DailyResponse()


@router.post("/chat", response_model=ChatResponse)
def chat(req: ChatRequest):
    history = [{"role": t.role, "content": t.content} for t in req.history]

    try:
        if req.mode == "ai":
            result = ai_answer_question(req.message, history, req.language)
        else:
            result = answer_question(req.message, history, req.language)
    except FileNotFoundError:
        # Index not built yet.
        msg = _INDEX_MISSING.get(req.language, _INDEX_MISSING["en"])
        return ChatResponse(answer=msg, sources=[])

    sources = [Source(**s) for s in result.get("sources", [])]
    return ChatResponse(answer=result["answer"], sources=sources)


@router.post("/chat/stream")
def chat_stream(req: ChatRequest):
    """
    Same as /chat but streamed token-by-token as Server-Sent Events.
    The client falls back to /chat if streaming isn't available.
    Each SSE line is: `data: {json}` where json is one of:
      {"type":"sources","sources":[...]} | {"type":"delta","text":"..."} | {"type":"done"}
    """
    history = [{"role": t.role, "content": t.content} for t in req.history]

    def event_stream():
        def sse(obj: dict) -> str:
            return f"data: {json.dumps(obj, ensure_ascii=False)}\n\n"

        try:
            if req.mode == "ai":
                gen = rag_service.stream_ai_answer(req.message, history, req.language)
            else:
                gen = rag_service.stream_answer(req.message, history, req.language)
            for event in gen:
                yield sse(event)
        except FileNotFoundError:
            msg = _INDEX_MISSING.get(req.language, _INDEX_MISSING["en"])
            yield sse({"type": "sources", "sources": []})
            yield sse({"type": "delta", "text": msg})
            yield sse({"type": "done"})

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",  # don't let a proxy buffer the stream
        },
    )


@router.post("/feedback")
def feedback(req: FeedbackRequest):
    _feedback_log.append(req.model_dump())
    return {"ok": True, "count": len(_feedback_log)}
