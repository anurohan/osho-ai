from sentence_transformers import SentenceTransformer
import faiss
import numpy as np
import re

DATA_FILE = r"D:\Osho-AI\data\raw\Ashtavakra\01.txt"

# ==========================================
# 1. READ REAL TEXT
# ==========================================

print("\nReading:", DATA_FILE)

with open(DATA_FILE, "r", encoding="utf-8-sig") as f:
    text = f.read()

print("Characters loaded:", len(text))

# ==========================================
# 2. CLEAN BASIC WHITESPACE
# ==========================================

text = text.replace("\r\n", "\n")
text = re.sub(r"[ \t]+", " ", text)
text = re.sub(r"\n{3,}", "\n\n", text)
text = text.strip()

# ==========================================
# 3. CREATE SMALL OVERLAPPING CHUNKS
# ==========================================

CHUNK_SIZE = 800
OVERLAP = 150

chunks = []

start = 0

while start < len(text):

    end = min(start + CHUNK_SIZE, len(text))

    # Try to finish at a sentence/paragraph boundary
    if end < len(text):

        possible_breaks = [
            text.rfind("।", start, end),
            text.rfind(".", start, end),
            text.rfind("\n", start, end)
        ]

        best_break = max(possible_breaks)

        if best_break > start + 400:
            end = best_break + 1

    chunk = text[start:end].strip()

    if chunk:
        chunks.append(chunk)

    if end >= len(text):
        break

    start = max(end - OVERLAP, start + 1)

print("Chunks created:", len(chunks))

# ==========================================
# 4. LOAD EMBEDDING MODEL
# ==========================================

print("\nLoading embedding model...")

model = SentenceTransformer("all-MiniLM-L6-v2")

# ==========================================
# 5. CREATE EMBEDDINGS
# ==========================================

print("\nCreating embeddings...")

embeddings = model.encode(
    chunks,
    convert_to_numpy=True,
    normalize_embeddings=True,
    show_progress_bar=True,
    batch_size=32
).astype("float32")

# ==========================================
# 6. CREATE FAISS INDEX
# ==========================================

index = faiss.IndexFlatIP(embeddings.shape[1])
index.add(embeddings)

print("\n========================================")
print("FAISS READY")
print("========================================")
print("Vectors:", index.ntotal)

# ==========================================
# 7. QUESTION LOOP
# ==========================================

while True:

    question = input(
        "\nAsk a question (type 'exit' to stop): "
    ).strip()

    if question.lower() == "exit":
        break

    query_embedding = model.encode(
        [question],
        convert_to_numpy=True,
        normalize_embeddings=True
    ).astype("float32")

    k = min(5, len(chunks))

    scores, indices = index.search(
        query_embedding,
        k
    )

    print("\n========================================")
    print("TOP ASHTAVAKRA PASSAGES")
    print("========================================")

    for rank, (score, idx) in enumerate(
        zip(scores[0], indices[0]),
        start=1
    ):

        print(
            f"\nResult {rank} | "
            f"Similarity: {score:.4f}"
        )

        print("-" * 60)
        print(chunks[idx])

print("\nRAG TEST FINISHED.")
