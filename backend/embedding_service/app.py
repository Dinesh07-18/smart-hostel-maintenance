import os, uuid, logging
import requests
import numpy as np
from fastapi import FastAPI
from pydantic import BaseModel, Field
from sentence_transformers import SentenceTransformer

logging.basicConfig(level=logging.INFO)
log = logging.getLogger("hostel-vector")
QDRANT_URL = os.getenv("QDRANT_URL", "http://127.0.0.1:6333").rstrip("/")
COLLECTION = os.getenv("QDRANT_COLLECTION", "hostel_complaint_embeddings")
MODEL_NAME = os.getenv("EMBEDDING_MODEL", "sentence-transformers/all-MiniLM-L6-v2")
DIMENSION = 384
model = None
app = FastAPI(title="Smart Hostel Complaint Embedding Service", version="1.0.0")

def qdrant(method, path, **kwargs):
    try:
        r = requests.request(method, QDRANT_URL + path, timeout=10, **kwargs)
        if r.status_code >= 400:
            raise RuntimeError(f"Qdrant HTTP {r.status_code}: {r.text[:400]}")
        return r.json() if r.content else {}
    except requests.RequestException as e:
        raise RuntimeError(f"Qdrant connection failed: {e}") from e

def ensure_collection():
    names = [x["name"] for x in qdrant("GET", "/collections").get("result", {}).get("collections", [])]
    if COLLECTION not in names:
        qdrant("PUT", f"/collections/{COLLECTION}",
               json={"vectors": {"size": DIMENSION, "distance": "Cosine"}})
        log.info("Created collection %s", COLLECTION)
    info = qdrant("GET", f"/collections/{COLLECTION}").get("result", {})
    vectors = info.get("config", {}).get("params", {}).get("vectors", {})
    if isinstance(vectors, dict) and vectors.get("size") not in (None, DIMENSION):
        raise RuntimeError(f"Collection dimension {vectors.get('size')} != {DIMENSION}")

def encode(text):
    v = model.encode([text], normalize_embeddings=True)[0]
    if len(v) != DIMENSION or not np.isfinite(v).all():
        raise RuntimeError("Invalid embedding vector")
    return v.tolist()

@app.on_event("startup")
def startup():
    global model
    model = SentenceTransformer(MODEL_NAME)
    ensure_collection()
    log.info("Embedding model loaded and Qdrant collection ready")

class IndexRequest(BaseModel):
    complaint_id: int = Field(gt=0)
    hostel_id: int = Field(gt=0)
    category_id: int = Field(gt=0)
    title: str = Field(min_length=1, max_length=150)
    description: str = Field(min_length=1, max_length=5000)

class SearchRequest(BaseModel):
    hostel_id: int = Field(gt=0)
    text: str = Field(min_length=3, max_length=5150)
    limit: int = Field(default=5, ge=1, le=10)

@app.get("/health")
def health():
    return {"status": "ok", "model": MODEL_NAME, "vector_dimension": DIMENSION, "collection": COLLECTION}

@app.post("/index")
def index_complaint(body: IndexRequest):
    vector = encode(body.title.strip() + "\n" + body.description.strip())
    point_id = str(uuid.uuid5(uuid.NAMESPACE_URL, f"smart-hostel-complaint:{body.complaint_id}"))
    payload = {"complaint_id": body.complaint_id, "hostel_id": body.hostel_id,
               "category_id": body.category_id, "title": body.title.strip()}
    qdrant("PUT", f"/collections/{COLLECTION}/points?wait=true",
           json={"points": [{"id": point_id, "vector": vector, "payload": payload}]})
    return {"status": "indexed", "point_id": point_id, "collection": COLLECTION, "vector_dimension": DIMENSION}

@app.post("/search")
def search_similar(body: SearchRequest):
    vector = encode(body.text)
    result = qdrant("POST", f"/collections/{COLLECTION}/points/search", json={
        "vector": vector, "limit": body.limit, "with_payload": True, "with_vector": False,
        "filter": {"must": [{"key": "hostel_id", "match": {"value": body.hostel_id}}]}
    })
    matches = []
    for item in result.get("result", []):
        p = item.get("payload") or {}
        matches.append({"complaint_id": p.get("complaint_id"), "title": p.get("title"),
                        "category_id": p.get("category_id"), "similarity": item.get("score")})
    return {"collection": COLLECTION, "matches": matches}
