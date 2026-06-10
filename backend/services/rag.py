import os
import json
import logging
from typing import List, Dict, Optional
from qdrant_client import QdrantClient
from qdrant_client.models import Distance, VectorParams, PointStruct
from sentence_transformers import SentenceTransformer
from rank_bm25 import BM25Okapi

logger = logging.getLogger("rag-service")

# Configurations
QDRANT_PATH = "data/qdrant_db"
COLLECTION_NAME = "compliance_kb"
# Lightweight, high-performance bi-encoder (384 dimensions)
EMBEDDING_MODEL_NAME = "BAAI/bge-small-en-v1.5"

# Global states
_qdrant_client: Optional[QdrantClient] = None
_embedding_model: Optional[SentenceTransformer] = None
_bm25_instance: Optional[BM25Okapi] = None
_bm25_corpus: List[Dict] = []  # In-memory storage for fast BM25 matching

def get_qdrant_client() -> QdrantClient:
    global _qdrant_client
    if _qdrant_client is None:
        os.makedirs("data", exist_ok=True)
        # Using local persistent sqlite-based storage (no docker required!)
        _qdrant_client = QdrantClient(path=QDRANT_PATH)
    return _qdrant_client

def get_embedding_model() -> SentenceTransformer:
    global _embedding_model
    if _embedding_model is None:
        # If ROCm-enabled torch is available, it automatically maps to 'cuda' (HIP backend reports as cuda)
        import torch
        device = "cuda" if torch.cuda.is_available() else "cpu"
        logger.info(f"Loading embedding model '{EMBEDDING_MODEL_NAME}' on device: {device}")
        _embedding_model = SentenceTransformer(EMBEDDING_MODEL_NAME, device=device)
    return _embedding_model

def init_rag_system():
    """Initializes the Qdrant collections and prepares RAG models."""
    client = get_qdrant_client()
    
    # Check if collection exists, if not create it
    collections = client.get_collections().collections
    exists = any(c.name == COLLECTION_NAME for c in collections)
    
    if not exists:
        logger.info(f"Creating Qdrant collection: {COLLECTION_NAME}")
        client.create_collection(
            collection_name=COLLECTION_NAME,
            vectors_config=VectorParams(
                size=384,  # bge-small-en-v1.5 produces 384 dimensions
                distance=Distance.COSINE
            )
        )
    else:
        logger.info(f"Qdrant collection '{COLLECTION_NAME}' already exists.")
        
    # Pre-load embedding model
    get_embedding_model()
    # Reload BM25 cache if data exists
    build_bm25_index()

def build_bm25_index():
    """Builds the BM25 index from all vectors stored in Qdrant payload."""
    global _bm25_instance, _bm25_corpus
    client = get_qdrant_client()
    
    try:
        # Retrieve all items from Qdrant (limit to 2000 for hackathon scale)
        scroll_results = client.scroll(
            collection_name=COLLECTION_NAME,
            limit=2000,
            with_payload=True,
            with_vectors=False
        )
        points = scroll_results[0]
        
        if not points:
            _bm25_corpus = []
            _bm25_instance = None
            return
            
        _bm25_corpus = []
        tokenized_corpus = []
        
        for pt in points:
            if pt.payload:
                text = pt.payload.get("text", "")
                _bm25_corpus.append({
                    "id": pt.id,
                    "text": text,
                    "source": pt.payload.get("source", "unknown"),
                    "page": pt.payload.get("page", 0),
                    "section": pt.payload.get("section", ""),
                    "regulator": pt.payload.get("regulator", "")
                })
                # Simple lower-case word tokenization for BM25
                tokenized_corpus.append(text.lower().split())
                
        if tokenized_corpus:
            _bm25_instance = BM25Okapi(tokenized_corpus)
            logger.info(f"BM25 search index built successfully with {len(_bm25_corpus)} documents.")
    except Exception as e:
        logger.error(f"Failed to build BM25 index: {e}")

def add_document_chunks(chunks: List[Dict]):
    """
    Ingests text chunks into the vector store.
    chunks parameter is a list of dicts:
    [
        {"text": "...", "source": "...", "page": 1, "section": "...", "regulator": "..."},
        ...
    ]
    """
    client = get_qdrant_client()
    model = get_embedding_model()
    
    points = []
    # Calculate embeddings in batch for efficiency
    texts = [c["text"] for c in chunks]
    embeddings = model.encode(texts)
    
    # Query current count to auto-increment IDs
    scroll_res = client.scroll(collection_name=COLLECTION_NAME, limit=1)
    current_max_id = len(client.scroll(collection_name=COLLECTION_NAME, limit=10000)[0])
    
    for i, (chunk, vector) in enumerate(zip(chunks, embeddings)):
        point_id = current_max_id + i + 1
        points.append(
            PointStruct(
                id=point_id,
                vector=vector.tolist(),
                payload={
                    "text": chunk["text"],
                    "source": chunk["source"],
                    "page": chunk.get("page", 0),
                    "section": chunk.get("section", ""),
                    "regulator": chunk.get("regulator", "")
                }
            )
        )
        
    client.upsert(
        collection_name=COLLECTION_NAME,
        points=points
    )
    logger.info(f"Successfully uploaded {len(points)} chunks to Qdrant.")
    
    # Re-build BM25 index after upload
    build_bm25_index()

def hybrid_search(query: str, limit: int = 5) -> List[Dict]:
    """
    Executes hybrid search (Vector + BM25) and fuses findings using Reciprocal Rank Fusion (RRF).
    """
    client = get_qdrant_client()
    model = get_embedding_model()
    
    # 1. Vector Search
    query_vector = model.encode(query).tolist()
    vector_results = client.search(
        collection_name=COLLECTION_NAME,
        query_vector=query_vector,
        limit=limit * 2,
        with_payload=True
    )
    
    vector_ranked = []
    for hit in vector_results:
        if hit.payload:
            vector_ranked.append({
                "text": hit.payload.get("text", ""),
                "source": hit.payload.get("source", ""),
                "page": hit.payload.get("page", 0),
                "section": hit.payload.get("section", ""),
                "regulator": hit.payload.get("regulator", "")
            })
            
    # 2. BM25 Search
    bm25_ranked = []
    if _bm25_instance and _bm25_corpus:
        query_tokens = query.lower().split()
        scores = _bm25_instance.get_scores(query_tokens)
        # Get indices sorted by score descending
        sorted_indices = sorted(range(len(scores)), key=lambda i: scores[i], reverse=True)
        
        # Take top limit*2 results
        for idx in sorted_indices[:limit * 2]:
            if scores[idx] > 0:
                bm25_ranked.append(_bm25_corpus[idx])
                
    # 3. Reciprocal Rank Fusion (RRF)
    # RRF Score = Sum( 1 / (60 + rank) )
    rrf_scores = {}
    
    def add_ranks(items_list):
        for rank, item in enumerate(items_list):
            key = (item["text"], item["source"], item["page"])
            if key not in rrf_scores:
                rrf_scores[key] = {"item": item, "score": 0.0}
            rrf_scores[key]["score"] += 1.0 / (60.0 + (rank + 1))
            
    add_ranks(vector_ranked)
    add_ranks(bm25_ranked)
    
    # Sort by RRF score descending
    sorted_rrf = sorted(rrf_scores.values(), key=lambda x: x["score"], reverse=True)
    
    # Return top N items
    results = [entry["item"] for entry in sorted_rrf[:limit]]
    
    # Fallback to pure vector search if BM25 is not populated yet
    if not results and vector_ranked:
        return vector_ranked[:limit]
        
    return results
