from sentence_transformers import SentenceTransformer
import faiss
import numpy as np

DATA_FILE = r"D:\Osho-AI\data\test_knowledge.txt"

# Read test knowledge
with open(DATA_FILE, "r", encoding="utf-8") as f:
    text = f.read()

# Split into paragraphs
documents = [
    paragraph.strip()
    for paragraph in text.split("\n\n")
    if paragraph.strip()
]

print("\nLoaded documents:", len(documents))

# Load embedding model
print("Loading embedding model...")
model = SentenceTransformer("all-MiniLM-L6-v2")

# Create embeddings
embeddings = model.encode(
    documents,
    convert_to_numpy=True,
    normalize_embeddings=True
).astype("float32")

# Create FAISS index
index = faiss.IndexFlatIP(embeddings.shape[1])
index.add(embeddings)

# Test question
question = input("\nAsk a question: ")

# Convert question to embedding
query_embedding = model.encode(
    [question],
    convert_to_numpy=True,
    normalize_embeddings=True
).astype("float32")

# Search
scores, indices = index.search(query_embedding, 3)

print("\n========================================")
print("MOST RELEVANT KNOWLEDGE")
print("========================================")

for rank, (score, idx) in enumerate(zip(scores[0], indices[0]), start=1):
    print(f"\nResult {rank} | Similarity: {score:.4f}")
    print(documents[idx])

print("\n========================================")
print("RAG RETRIEVAL TEST COMPLETE")
print("========================================")
