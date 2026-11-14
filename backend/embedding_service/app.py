import os
import uuid
import logging
from pathlib import Path
from typing import List, Optional

import requests
import numpy as np
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field, field_validator
from sentence_transformers import SentenceTransformer

# Share the backend service configuration without requiring secrets in source.
load_dotenv(Path(__file__).resolve().parents[1] / ".env")

logging.basicConfig(level=os.getenv("LOG_LEVEL", "INFO"))
log = logging.getLogger("hostel-vector")
QDRANT_URL = os.getenv("QDRANT_URL", "http://127.0.0.1:6333").rstrip("/")
QDRANT_API_KEY = os.getenv("QDRANT_API_KEY")
COLLECTION = os.getenv("QDRANT_COLLECTION", "hostel_complaint_embeddings")
MODEL_NAME = os.getenv("EMBEDDING_MODEL", "sentence-transformers/all-MiniLM-L6-v2")
MODEL = None
DIMENSION = None
app = FastAPI(title="Hostel Complaint Management - Semantic Search", version="1.1.0")


def qdrant(method: str, path: str, **kwargs):
    headers = kwargs.pop("headers", {})
    if QDRANT_API_KEY:
        headers["api-key"] = QDRANT_API_KEY
    try:
        response = requests.request(method, QDRANT_URL + path, timeout=10, headers=headers, **kwargs)
        if response.status_code >= 400:
            raise RuntimeError(f"Qdrant HTTP {response.status_code}: {response.text[:300]}")
        return response.json() if response.content else {}
    except requests.RequestException as exc:
        raise RuntimeError(f"Qdrant connection failed: {exc}") from exc


def ensure_collection():
    names = [item["name"] for item in qdrant("GET", "/collections").get("result", {}).get("collections", [])]
    if COLLECTION not in names:
        qdrant("PUT", f"/collections/{COLLECTION}", json={"vectors": {"size": DIMENSION, "distance": "Cosine"}})
        log.info("Created Qdrant collection %s", COLLECTION)
    info = qdrant("GET", f"/collections/{COLLECTION}").get("result", {})
    vectors = info.get("config", {}).get("params", {}).get("vectors", {})
    if not isinstance(vectors, dict) or vectors.get("size") != DIMENSION:
        raise RuntimeError(f"Qdrant collection dimension mismatch: expected {DIMENSION}, got {vectors.get('size') if isinstance(vectors, dict) else 'unknown'}")
    if vectors.get("distance") != "Cosine":
        raise RuntimeError(f"Qdrant collection distance must be Cosine, got {vectors.get('distance')}")


def encode(text: str):
    if MODEL is None or DIMENSION is None:
        raise RuntimeError("Embedding model is not ready")
    vector = MODEL.encode([text], normalize_embeddings=True)[0]
    if len(vector) != DIMENSION or not np.isfinite(vector).all():
        raise RuntimeError("Model returned an invalid embedding vector")
    return vector.tolist()


@app.on_event("startup")
def startup():
    global MODEL, DIMENSION
    MODEL = SentenceTransformer(MODEL_NAME)
    DIMENSION = int(MODEL.get_sentence_embedding_dimension())
    if DIMENSION <= 0:
        raise RuntimeError("Embedding model returned an invalid dimension")
    ensure_collection()
    log.info("Model %s loaded with %s dimensions; Qdrant collection ready", MODEL_NAME, DIMENSION)


class IndexRequest(BaseModel):
    complaint_id: int = Field(gt=0)
    hostel_id: int = Field(gt=0)
    category_id: int = Field(gt=0)
    title: str = Field(min_length=1, max_length=150)
    description: str = Field(min_length=1, max_length=5000)

    @field_validator("title", "description")
    @classmethod
    def non_blank(cls, value):
        if not value.strip():
            raise ValueError("Field cannot be blank")
        return value.strip()


class SearchRequest(BaseModel):
    # hostel_id remains accepted for compatibility with the previous API.
    hostel_id: Optional[int] = Field(default=None, gt=0)
    hostel_ids: Optional[List[int]] = Field(default=None, min_length=1, max_length=100)
    text: str = Field(min_length=3, max_length=5150)
    limit: int = Field(default=5, ge=1, le=10)

    @field_validator("text")
    @classmethod
    def valid_text(cls, value):
        if not value.strip():
            raise ValueError("Search text cannot be blank")
        return value.strip()

    @field_validator("hostel_ids")
    @classmethod
    def valid_hostel_ids(cls, value):
        if value is not None and any(not isinstance(item, int) or item <= 0 for item in value):
            raise ValueError("Every hostel ID must be a positive integer")
        return sorted(set(value)) if value is not None else value


def qdrant_filter(hostel_ids):
    return {"must": [{"key": "hostel_id", "match": {"any": hostel_ids}}]}


@app.get("/health")
def health():
    try:
        qdrant("GET", f"/collections/{COLLECTION}")
        qdrant_status = "connected"
    except Exception as exc:
        qdrant_status = "unavailable"
        raise HTTPException(status_code=503, detail=f"Qdrant unavailable: {exc}")
    return {"status": "ok", "qdrant": qdrant_status, "model": MODEL_NAME,
            "vector_dimension": DIMENSION, "collection": COLLECTION}


@app.post("/index")
def index_complaint(body: IndexRequest):
    try:
        vector = encode(body.title + "\n" + body.description)
        point_id = str(uuid.uuid5(uuid.NAMESPACE_URL, f"smart-hostel-complaint:{body.complaint_id}"))
        payload = {"complaint_id": body.complaint_id, "hostel_id": body.hostel_id,
                   "category_id": body.category_id, "title": body.title}
        qdrant("PUT", f"/collections/{COLLECTION}/points?wait=true",
               json={"points": [{"id": point_id, "vector": vector, "payload": payload}]})
        return {"status": "indexed", "point_id": point_id, "collection": COLLECTION,
                "vector_dimension": DIMENSION, "model": MODEL_NAME}
    except Exception as exc:
        log.exception("Complaint indexing failed")
        raise HTTPException(status_code=503, detail="Complaint indexing is temporarily unavailable") from exc



@app.post("/search")
def search_similar(body: SearchRequest):
    hostel_ids = body.hostel_ids or (
        [body.hostel_id] if body.hostel_id else []
    )

    if not hostel_ids:
        raise HTTPException(
            status_code=422,
            detail="hostel_id or hostel_ids is required"
        )

    SIMILARITY_THRESHOLD = 0.50

    try:
        vector = encode(body.text)

        result = qdrant(
            "POST",
            f"/collections/{COLLECTION}/points/search",
            json={
                "vector": vector,
                "limit": body.limit,
                "with_payload": True,
                "with_vector": False,
                "filter": qdrant_filter(hostel_ids)
            }
        )

        matches = []

        for item in result.get("result", []):
            score = float(item.get("score", -1))

            # Exclude matches below 50% cosine similarity
            if score < SIMILARITY_THRESHOLD:
                continue

            payload = item.get("payload") or {}

            # Preserve hostel-level authorization
            if int(payload.get("hostel_id", -1)) not in hostel_ids:
                continue

            matches.append({
                "complaint_id": payload.get("complaint_id"),
                "title": payload.get("title"),
                "category_id": payload.get("category_id"),
                "similarity": score
            })

        return {
            "collection": COLLECTION,
            "model": MODEL_NAME,
            "vector_dimension": DIMENSION,
            "matches": matches
        }

    except Exception as exc:
        log.exception("Semantic search failed")
        raise HTTPException(
            status_code=503,
            detail="Semantic search is temporarily unavailable"
        ) from exc
