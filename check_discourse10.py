import json

p = r"D:\Osho-AI\vector_db\metadata.json"

with open(p, "r", encoding="utf-8") as f:
    data = json.load(f)

print("TOTAL:", len(data))
print()

for d in data:
    if str(d.get("discourse", "")) == "10":
        text = d.get("text", d.get("passage", ""))
        print("FILE:", d.get("file"))
        print("SERIES:", d.get("series"))
        print("CHARS:", len(text))
        print("TEXT:")
        print(text[:700])
        print("=" * 80)
