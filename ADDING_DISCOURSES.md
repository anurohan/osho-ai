# Osho AI — Naye Discourses Kaise Add Karein

Ye guide batati hai ki apne Osho AI me aur books / pravachan kaise jodein.
Ab pipeline **.txt aur .pdf dono** support karti hai — bas file daalo, ek command chalao, ho gaya.

---

## Sabse pehle: seedhi baat (honest note)

Main **khud Osho World website se automatically saara data (books + podcasts) scrape karke add nahi kar sakta**. Iske teen kaaran hain:

1. **Website access blocked hai** — is sandbox se main sirf ek allow-listed host tak jaa sakta hoon; `oshoworld.com` ya koi bhi bahar ki site fetch nahi kar sakta.
2. **Podcasts audio hain** — unhe pehle download, phir transcribe (speech-to-text) karna padta hai. Ye is setup me possible nahi.
3. **Copyright** — Osho ka material copyrighted hai; bulk scraping theek nahi.

Isliye tarika wahi hai jo tumne pehle kiya tha — **text/PDF khud daalo** — par ab maine usse itna aasaan bana diya hai ki bas **file drop → ek command** karna hai.

---

## Aasaan tarika (3 steps)

### Step 1 — File taiyaar karo
Discourse ki plain-text (`.txt`) ya PDF (`.pdf`) file lo.
- `.txt` best hai (sabse saaf result). UTF-8 me save karo taaki Hindi theek dikhe.
- `.pdf` bhi chalega — bas usme **asli text** hona chahiye (scan ki hui photo-only PDF nahi, kyunki usme se text nahi nikalta).

> File ka **naam hi discourse ka title** ban jaata hai app me. Isliye meaningful naam do,
> jaise `ashtavakra-11.txt` ya `dhammapada-adhyay-1.txt`.

### Step 2 — Sahi folder me daalo
File ko is folder me rakho:

```
data/raw/<SeriesName>/
```

`<SeriesName>` = book / series ka naam. Ye folders pehle se bane hain:

```
data/raw/Ashtavakra/      <- abhi ismein 10 discourses hain
data/raw/Buddha/          <- khaali (yahan Buddha series daalo)
data/raw/Dadu/            <- khaali
data/raw/Amrit_Varsha/    <- khaali
```

Nayi series chahiye? Bas ek naya folder bana do, jaise `data/raw/Geeta_Darshan/`, aur usme files daal do.

**Example:**
```
data/raw/Buddha/dhammapada-01.txt
data/raw/Buddha/dhammapada-02.pdf
data/raw/Geeta_Darshan/adhyay-01.txt
```

### Step 3 — Index rebuild karo
Project root me ye chalao (double-click bhi chalega):

```
UPDATE_OSHO_DATA.bat
```

Ya manually:
```
.venv\Scripts\python.exe src\build_index.py
```

Bas! Script khud:
- har `.txt` aur `.pdf` file padhti hai,
- website ka junk (login/share/footer) saaf karti hai,
- text ko chunks me todti hai,
- multilingual embeddings banati hai,
- FAISS index (`vector_db/osho.index`) me sab add kar deti hai.

Uske baad app ko refresh karo (ya backend restart karo) — naye discourses turant search + answers me aa jaayenge.

---

## PDF support ke liye ek baar ka setup

PDF padhne ke liye `pypdf` library chahiye. Ek baar install kar lo:

```
.venv\Scripts\pip.exe install pypdf
```

Agar `pypdf` install nahi hai to koi dikkat nahi — build phir bhi chalega, bas PDF files skip ho jaayengi aur script tumhe saaf-saaf bata degi.

---

## Achhe results ke liye tips

- **Ek discourse = ek file** rakho. Isse app me title clean dikhta hai aur retrieval behtar hota hai.
- **Saaf text** do — jitna kam website ka junk (menu, share buttons, comments) hoga, jawab utne authentic honge. Script kaafi junk khud hata deti hai, par shuruaat saaf ho to aur achha.
- **Hindi text UTF-8 me** save karo, warna Devanagari toot sakta hai.
- Scan ki hui (photo) PDF se text nahi nikalta. Aisi PDF ko pehle OCR karke `.txt` bana lo, phir daalo.
- Har baar `build_index.py` **poora index dobara banata hai** (purana + naya sab), isliye kuch delete nahi hota — bas nayi file daalke rebuild kar do.

---

## Kahan se text mil sakta hai (aap khud)

- Osho World site par bahut discourses **text** roop me hain — page se text copy karke `.txt` me paste kar sakte ho.
- Archive.org par kai Osho books **PDF** me available hain.
- Jo bhi source ho, use apne folder me daalo aur rebuild kar do.

---

Kuch atke to bata dena — main us series ke liye folder bana ke, ya kisi PDF ko clean karne me madad kar sakta hoon.
