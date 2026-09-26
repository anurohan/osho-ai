import sys

sys.path.insert(0, r"D:\Osho-AI\app\osho-ai-app\backend")

from app.services.rag_service import retrieve

questions = [
    "अष्टावक्र के अनुसार मनुष्य दुखी क्यों होता है?",
    "Ashtavakra ke according man ko shant kaise kiya ja sakta hai?",
    "What is the nature of knowledge according to Ashtavakra?"
]

for q in questions:
    print()
    print("=" * 70)
    print("QUESTION:", q)
    print("=" * 70)

    results = retrieve(q)

    for i, r in enumerate(results, 1):
        print(
            f"{i}. {r['series']} | "
            f"Discourse {r['discourse']} | "
            f"Score {r['score']:.4f}"
        )
        print(r["passage"][:300].replace("\n", " "))
        print()
