# Semantic Complaint Search — Phase 3 Implementation

## API

`POST /api/search/complaints`

Requires a bearer token. Request body:

```json
{ "text": "Water is leaking from the ceiling", "limit": 5 }
```

`limit` is optional and must be an integer from 1 to 10. Search text must contain 3–5150 characters.

## Authorization scope

The backend derives permitted hostels from the authenticated user's database relationships. A client-supplied hostel ID is not accepted by this public API.

- `STUDENT`: active `student_room_history` assignment.
- `WARDEN`: active `warden_assignments`.
- `MAINTENANCE_STAFF`: active `staff_hostel_assignments`.
- `ADMINISTRATOR`: all currently registered hostels.

The vector service applies the derived hostel filter in Qdrant. The Express service then retrieves matching complaint IDs from MySQL with a second role-specific authorization join. MySQL remains authoritative for complaint details and current access.

## Embedding service

The model dimension is read from `SentenceTransformer.get_sentence_embedding_dimension()` at startup. The existing Qdrant collection is checked for matching dimension and cosine distance. The service does not automatically delete or recreate a mismatched collection.

Environment variables:

- `QDRANT_URL` (default `http://127.0.0.1:6333`)
- `QDRANT_API_KEY` (optional)
- `QDRANT_COLLECTION` (default `hostel_complaint_embeddings`)
- `EMBEDDING_MODEL` (default `sentence-transformers/all-MiniLM-L6-v2`)
- `EMBEDDING_SERVICE_URL` (Express backend; default `http://127.0.0.1:8001`)
- `EMBEDDING_MODEL_VERSION` (metadata version recorded in MySQL; default `2.7.0`)

Indexing remains handled by the existing background worker and `/index` endpoint. Index and search use normalized embeddings from the same loaded model.

## Compatibility

The embedding service accepts both the legacy single `hostel_id` request and the new `hostel_ids` list. The existing student-only `/api/complaints/similar` endpoint remains available for complaint-submission duplicate suggestions. The new `/api/search/complaints` endpoint supports all four authenticated roles.

## Limitations requiring runtime verification

This source-level implementation does not prove that MySQL, Qdrant or the model are running in the target environment. Verify the `/health` endpoint, create/index sample complaints, and execute role-specific search tests against the actual database and Qdrant collection before production use. Search quality metrics (Precision@K, Recall@K and MRR) have not yet been measured; they require a labeled query-to-complaint evaluation dataset.

## Dashboard integration

The shared `frontend/src/components/SemanticComplaintSearch.js` component is integrated into the Maintenance Staff, Warden and Administrator dashboards. The Student dashboard uses the same `/api/search/complaints` endpoint for inline similar-complaint suggestions while a complaint is being composed. All clients send only search text and a result limit; they do not accept or send a hostel identifier. The authenticated backend derives the user's authorized hostel set.


## Student result privacy

Semantic-search results are revalidated against MySQL after Qdrant returns candidate complaint IDs. For Student accounts, the API suppresses complaint descriptions and does not return room numbers; students see only the limited complaint metadata needed to identify a related issue. Staff, Wardens and Administrators receive the fields allowed by their active hostel scope. The backend remains the authorization boundary; frontend visibility is not relied upon for access control.
