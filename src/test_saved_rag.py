from pathlib import Path
import json
import faiss
from sentence_transformers import SentenceTransformer

PROJECT_ROOT = Path(r"D:\Osho-AI")
INDEX_FILE = PROJECT_ROOT / "vector_db" / "osho.index"
METADATA_FILE = PROJECT_ROOT / "vector_db" / "metadata.json"

print()
print("=" * 60)
print("OSHO AI - SAVED RAG TEST")
print("=" * 60)

# Check files
if not INDEX_FILE.exists():
    raise FileNotFoundError(f"Index not found: {INDEX_FILE}")

if not METADATA_FILE.exists():
    raise FileNotFoundError(f"Metadata not found: {METADATA_FILE}")

# Load FAISS
print("\nLoading FAISS index...")
index = faiss.read_index(str(INDEX_FILE))

# Load metadata
print("Loading metadata...")
documents = json.loads(
    METADATA_FILE.read_text(encoding="utf-8")
)

print("Vectors :", index.ntotal)
print("Metadata:", len(documents))

# Load embedding model
print("\nLoading embedding model...")
model = SentenceTransformer("all-MiniLM-L6-v2")

# Ask question
question = input(
    "\nAsk an Ashtavakra question (type 'exit' to stop): "
).strip()

if question.lower() == "exit":
    raise SystemExit

# Embed question
query_embedding = model.encode(
    [question],
    convert_to_numpy=True,
    normalize_embeddings=True
).astype("float32")

# Search
k = min(5, index.ntotal)

scores, indices = index.search(
    query_embedding,
    k
)

print()
print("=" * 60)
print("TOP RETRIEVED PASSAGES")
print("=" * 60)

for rank, (score, idx) in enumerate(
    zip(scores[0], indices[0]),
    start=1
):

    item = documents[int(idx)]

    print()
    print(f"Result {rank}")
    print("-" * 60)
    print(f"Similarity : {score:.4f}")
    print(f"Series     : {item['series']}")
    print(f"Discourse  : {item['discourse']}")
    print(f"Chunk      : {item['chunk']}")
    print(f"File       : {item['file']}")
    print()
    print(item["text"])

print()
print("=" * 60)
print("SAVED RAG TEST COMPLETE")
print("=" * 60)
