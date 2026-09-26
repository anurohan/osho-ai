from pathlib import Path
import os
import json
import re

import faiss
from sentence_transformers import SentenceTransformer

# Optional PDF support. If pypdf is installed, .pdf discourses are ingested too;
# if not, the build still runs on .txt files and prints a clear hint.
try:
    from pypdf import PdfReader  # type: ignore
    HAS_PDF = True
except Exception:  # pragma: no cover - depends on environment
    PdfReader = None  # type: ignore
    HAS_PDF = False


# ============================================================
# OSHO AI - BUILD CLEAN MULTILINGUAL RAG INDEX
# ============================================================
#
# HOW TO ADD MORE DISCOURSES (see ADDING_DISCOURSES.md for the full guide):
#   1. Put a plain-text (.txt) or PDF (.pdf) file of the discourse inside
#      data/raw/<SeriesName>/   e.g.  data/raw/Buddha/dhammapada-01.txt
#   2. Run UPDATE_OSHO_DATA.bat  (or:  .venv\Scripts\python.exe src\build_index.py)
#   3. That's it — the file is cleaned, chunked, embedded and added to the index.
#
# Only .txt and .pdf are read. The filename (without extension) becomes the
# discourse title shown in the app, so name files meaningfully.
# ============================================================

# Project root is resolved without a hard-coded drive letter:
#   1. OSHO_ROOT env var if set
#   2. otherwise two levels up from this file (<root>/src/build_index.py)
PROJECT_ROOT = Path(
    os.environ.get("OSHO_ROOT", Path(__file__).resolve().parents[1])
)

DATA_ROOT = PROJECT_ROOT / "data" / "raw"
VECTOR_ROOT = PROJECT_ROOT / "vector_db"

INDEX_FILE = VECTOR_ROOT / "osho.index"
METADATA_FILE = VECTOR_ROOT / "metadata.json"

# Multilingual model:
# Better for Hindi + English + Hinglish retrieval.
MODEL_NAME = "paraphrase-multilingual-MiniLM-L12-v2"

CHUNK_SIZE = 900
OVERLAP = 180

# Which file types we ingest as discourse sources.
TEXT_EXTS = {".txt"}
PDF_EXTS = {".pdf"}


# ============================================================
# CREATE VECTOR DB DIRECTORY
# ============================================================

VECTOR_ROOT.mkdir(parents=True, exist_ok=True)


# ============================================================
# CLEAN WEBPAGE / WEBSITE JUNK
# ============================================================

JUNK_PATTERNS = [
    r"^\s*login\s*$",
    r"^\s*sign\s*up\s*$",
    r"^\s*logout\s*$",
    r"^\s*share\s*$",
    r"^\s*whatsapp\s*$",
    r"^\s*facebook\s*$",
    r"^\s*instagram\s*$",
    r"^\s*twitter\s*$",
    r"^\s*telegram\s*$",
    r"^\s*download\s*$",

    r"privacy\s+policy",
    r"terms\s+(and|&)\s+conditions",
    r"cookie\s+policy",
    r"shipping\s*&?\s*delivery",
    r"cancellation\s+policy",
    r"return\s+policy",

    r"contact\s+us",
    r"email\s+address",
    r"mobile\s+number",
    r"message\s+name",
    r"post\s+comment",
    r"leave\s+a\s+reply",
    r"submit\s+comment",

    r"get\s+the\s+osho\s+world",
    r"osho\s+world\s+android\s+app",

    r"all\s+rights\s+reserved",
    r"copyright\s+©?",
]


def is_junk_line(line: str) -> bool:
    """
    Detect common website navigation/footer/comment junk.
    """
    normalized = " ".join(line.strip().split())

    if not normalized:
        return False

    for pattern in JUNK_PATTERNS:
        if re.search(pattern, normalized, re.IGNORECASE):
            return True

    return False


def clean_osho_text(text: str) -> str:
    """
    Clean webpage noise while preserving actual discourse text.
    """

    text = text.replace("﻿", "")
    text = text.replace("\r\n", "\n")
    text = text.replace("\r", "\n")

    lines = text.split("\n")

    cleaned_lines = []

    for line in lines:

        line = re.sub(r"[ \t]+", " ", line).strip()

        if not line:
            cleaned_lines.append("")
            continue

        if is_junk_line(line):
            continue

        cleaned_lines.append(line)

    text = "\n".join(cleaned_lines)

    # Remove repeated blank lines.
    text = re.sub(r"\n{3,}", "\n\n", text)

    # Remove obvious repeated website blocks.
    text = re.sub(
        r"(?is)"
        r"(privacy\s+policy.*?"
        r"(?:terms\s+(?:and|&)\s+conditions|contact\s+us))",
        "",
        text,
    )

    return text.strip()


# ============================================================
# READ SOURCE FILES  (.txt and, if pypdf is available, .pdf)
# ============================================================

def read_txt(path: Path) -> str:
    """Read a UTF-8 text file, tolerating a BOM or stray bytes."""
    try:
        return path.read_text(encoding="utf-8-sig")
    except UnicodeDecodeError:
        return path.read_text(encoding="utf-8", errors="ignore")


def read_pdf(path: Path) -> str:
    """
    Extract text from a PDF, page by page. Returns "" if pypdf is missing or
    the PDF has no extractable text (e.g. a scanned image-only PDF).
    """
    if not HAS_PDF:
        return ""

    try:
        reader = PdfReader(str(path))
    except Exception as error:  # corrupt / encrypted / unreadable
        print(f"    WARNING: could not open PDF ({error})")
        return ""

    pages = []
    for page in reader.pages:
        try:
            pages.append(page.extract_text() or "")
        except Exception:
            # A single bad page shouldn't sink the whole file.
            continue

    return "\n\n".join(pages)


def load_source_text(path: Path) -> str:
    """Dispatch on file extension to the right reader."""
    ext = path.suffix.lower()
    if ext in PDF_EXTS:
        return read_pdf(path)
    return read_txt(path)


def rel_path(path: Path) -> str:
    """Store a portable (relative, forward-slash) path in metadata."""
    try:
        return path.relative_to(PROJECT_ROOT).as_posix()
    except ValueError:
        return path.name


# ============================================================
# LOAD DOCUMENTS
# ============================================================

documents = []
skipped_files = []       # (name, reason)
empty_series = []        # series folders with no usable source files
pdf_seen = False         # did we encounter any .pdf at all?

print()
print("=" * 70)
print("OSHO AI - CLEAN MULTILINGUAL INDEX BUILD")
print("=" * 70)

print()
print("Data root:")
print(DATA_ROOT)
print(f"PDF support: {'ON (pypdf found)' if HAS_PDF else 'OFF (pypdf not installed)'}")

if not DATA_ROOT.exists():
    raise RuntimeError(
        f"Data directory not found: {DATA_ROOT}"
    )


for series_dir in sorted(DATA_ROOT.iterdir()):

    if not series_dir.is_dir():
        continue

    series = series_dir.name

    print()
    print(f"Series: {series}")

    # Gather both text and PDF discourses, sorted by filename for stable order.
    source_files = sorted(
        [
            p
            for p in series_dir.iterdir()
            if p.is_file() and p.suffix.lower() in (TEXT_EXTS | PDF_EXTS)
        ],
        key=lambda p: p.name.lower(),
    )

    if not source_files:
        print("  (empty — no .txt or .pdf files here yet)")
        empty_series.append(series)
        continue

    chunks_before_series = len(documents)

    for source_file in source_files:

        is_pdf = source_file.suffix.lower() in PDF_EXTS
        if is_pdf:
            pdf_seen = True

        kind = "PDF" if is_pdf else "text"
        print(f"  Reading ({kind}): {source_file.name}")

        # If it's a PDF but we have no PDF library, say so clearly and skip.
        if is_pdf and not HAS_PDF:
            print("    SKIPPED: pypdf not installed (pip install pypdf)")
            skipped_files.append((source_file.name, "pypdf not installed"))
            continue

        text = load_source_text(source_file)

        if not text.strip():
            reason = (
                "no extractable text (scanned image PDF?)"
                if is_pdf
                else "empty file"
            )
            print(f"    SKIPPED: {reason}")
            skipped_files.append((source_file.name, reason))
            continue

        original_length = len(text)

        # ----------------------------------------------------
        # CLEAN
        # ----------------------------------------------------

        text = clean_osho_text(text)

        cleaned_length = len(text)

        print(
            f"    Characters: "
            f"{original_length:,} -> {cleaned_length:,}"
        )

        if not text:
            print("    SKIPPED: empty after cleaning")
            skipped_files.append((source_file.name, "empty after cleaning"))
            continue

        # ----------------------------------------------------
        # CHUNK
        # ----------------------------------------------------

        start = 0
        chunk_number = 1

        while start < len(text):

            end = min(
                start + CHUNK_SIZE,
                len(text)
            )

            # Try to end at a natural boundary.
            if end < len(text):

                possible_breaks = [
                    text.rfind("।", start, end),
                    text.rfind(".", start, end),
                    text.rfind("!", start, end),
                    text.rfind("?", start, end),
                    text.rfind("\n", start, end),
                ]

                best_break = max(possible_breaks)

                if best_break > start + 450:
                    end = best_break + 1

            chunk = text[start:end].strip()

            if chunk:

                documents.append({
                    "id": len(documents),
                    "series": series,
                    "discourse": source_file.stem,
                    "file": rel_path(source_file),
                    "chunk": chunk_number,
                    "text": chunk,
                })

                chunk_number += 1

            if end >= len(text):
                break

            start = max(
                end - OVERLAP,
                start + 1
            )

    series_chunks = len(documents) - chunks_before_series
    print(f"  -> {series_chunks} chunks from this series")


# ============================================================
# VERIFY DOCUMENTS
# ============================================================

print()
print("=" * 70)
print("DOCUMENT / CHUNK SUMMARY")
print("=" * 70)

print()
print("Total chunks:", len(documents))

if not documents:
    raise RuntimeError(
        f"No usable .txt or .pdf documents found in {DATA_ROOT}\n"
        f"Add discourse files under data/raw/<SeriesName>/ and run again.\n"
        f"See ADDING_DISCOURSES.md for step-by-step instructions."
    )


series_counts = {}

for item in documents:

    series = item["series"]

    series_counts[series] = (
        series_counts.get(series, 0) + 1
    )


print()
print("Series:")

for series, count in sorted(series_counts.items()):

    print(
        f"  {series}: {count} chunks"
    )

# Surface anything that was skipped or empty so the user knows what to fix.
if empty_series:
    print()
    print("Empty series folders (no discourses added yet):")
    for series in empty_series:
        print(f"  {series}")

if skipped_files:
    print()
    print("Skipped files:")
    for name, reason in skipped_files:
        print(f"  {name}  ({reason})")

if pdf_seen and not HAS_PDF:
    print()
    print("NOTE: PDF files were found but pypdf is not installed.")
    print("      Install it to ingest PDFs:  pip install pypdf")


# ============================================================
# LOAD MULTILINGUAL EMBEDDING MODEL
# ============================================================

print()
print("=" * 70)
print("LOADING EMBEDDING MODEL")
print("=" * 70)

print()
print(MODEL_NAME)

model = SentenceTransformer(MODEL_NAME)

print()
print("Embedding model ready.")


# ============================================================
# CREATE EMBEDDINGS
# ============================================================

print()
print("=" * 70)
print("CREATING EMBEDDINGS")
print("=" * 70)

texts = [
    item["text"]
    for item in documents
]

embeddings = model.encode(
    texts,
    convert_to_numpy=True,
    normalize_embeddings=True,
    show_progress_bar=True,
    batch_size=32,
).astype("float32")


# ============================================================
# CREATE FAISS INDEX
# ============================================================

print()
print("=" * 70)
print("CREATING FAISS INDEX")
print("=" * 70)

index = faiss.IndexFlatIP(
    embeddings.shape[1]
)

index.add(embeddings)


# ============================================================
# SAVE FAISS INDEX
# ============================================================

faiss.write_index(
    index,
    str(INDEX_FILE)
)


# ============================================================
# SAVE METADATA
# ============================================================

METADATA_FILE.write_text(
    json.dumps(
        documents,
        ensure_ascii=False,
        indent=2,
    ),
    encoding="utf-8",
)


# ============================================================
# FINAL VERIFICATION
# ============================================================

print()
print("=" * 70)
print("INDEX CREATED SUCCESSFULLY")
print("=" * 70)

print()
print("Vectors :", index.ntotal)
print("Dimension:", embeddings.shape[1])
print("Index   :", INDEX_FILE)
print("Metadata:", METADATA_FILE)

print()
print("Series found:")

for series, count in sorted(series_counts.items()):

    print(
        f"  {series}: {count} chunks"
    )

print()
print("=" * 70)
print("DONE")
print("=" * 70)
