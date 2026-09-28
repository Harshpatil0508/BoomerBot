import chromadb
from chromadb.utils import embedding_functions
from app.core.config import settings


class LLMaaSEmbeddingFunction(embedding_functions.EmbeddingFunction):
    """Chroma embedding function backed by VW LLMaaS, batched to avoid per-chunk round trips."""

    def __call__(self, input):
        from app.core.llmaas import embed_texts
        if isinstance(input, str):
            input = [input]
        return embed_texts(list(input))

    @staticmethod
    def name() -> str:
        return "llmaas"


ef = LLMaaSEmbeddingFunction()

chroma_client = chromadb.PersistentClient(path="./chroma_db")

COLLECTION_NAMES = ("boomerbot_knowledge", "semantic_cache", "asset_generation_cache")


def _get_or_create(name: str):
    """Chroma pins the embedding function to the collection. If the configured model has
    changed, the old vectors are unusable anyway, so drop and rebuild rather than crash."""
    try:
        return chroma_client.get_or_create_collection(name=name, embedding_function=ef)
    except ValueError as e:
        if "conflict" not in str(e).lower():
            raise
        print(f"[chroma] Embedding model changed; rebuilding collection '{name}'. Re-index required.")
        chroma_client.delete_collection(name)
        return chroma_client.get_or_create_collection(name=name, embedding_function=ef)


collection = _get_or_create("boomerbot_knowledge")
cache_collection = _get_or_create("semantic_cache")
asset_cache_collection = _get_or_create("asset_generation_cache")


def reset_collections():
    """Drops all three collections. Required whenever the embedding model changes, since
    Chroma cannot mix vector dimensions within a collection."""
    global collection, cache_collection, asset_cache_collection
    for name in COLLECTION_NAMES:
        try:
            chroma_client.delete_collection(name)
        except Exception as e:
            print(f"Could not delete collection {name}:", e)
    collection = _get_or_create("boomerbot_knowledge")
    cache_collection = _get_or_create("semantic_cache")
    asset_cache_collection = _get_or_create("asset_generation_cache")


def index_knowledge_asset(asset_id: str, title: str, content: str, asset_type: str, domain: str, sensitivity: str = "General"):
    chunks = _chunk_content(content)
    documents = []
    ids = []
    metadatas = []
    
    for i, chunk in enumerate(chunks):
        if len(chunk.strip()) > 20:
            documents.append(chunk)
            ids.append(f"{asset_id}-chunk-{i}")
            metadatas.append({
                "asset_id": asset_id,
                "title": title,
                "asset_type": asset_type,
                "domain": domain,
                "sensitivity": sensitivity
            })
            
    if documents:
        collection.add(
            documents=documents,
            metadatas=metadatas,
            ids=ids
        )


def _chunk_content(content: str) -> list[str]:
    """Chunk on markdown headings so each FAQ question stays glued to its answer.
    Splitting on blank lines alone separated '## question' from its answer paragraph,
    which let the retriever surface a question with no answer text."""
    lines = content.split("\n")
    chunks: list[str] = []
    current: list[str] = []
    for line in lines:
        if line.lstrip().startswith("## ") and current:
            chunks.append("\n".join(current).strip())
            current = []
        current.append(line)
    if current:
        chunks.append("\n".join(current).strip())

    # No headings found (plain-paragraph asset) -> fall back to blank-line splitting.
    if len(chunks) <= 1:
        chunks = content.split("\n\n")

    return [c for c in chunks if len(c.strip()) > 20]

def delete_knowledge_asset(asset_id: str):
    try:
        collection.delete(where={"asset_id": asset_id})
    except Exception as e:
        print("Chroma delete error:", e)

def query_knowledge(question: str, n_results: int = 3, filter_dict: dict = None):
    try:
        if collection.count() == 0:
            return {"documents": [[]], "metadatas": [[]]}
            
        kwargs = {
            "query_texts": [question],
            "n_results": n_results
        }
        if filter_dict:
            kwargs["where"] = filter_dict
            
        results = collection.query(**kwargs)
        return results
    except Exception as e:
        print("Chroma query error:", e)
        return {"documents": [[]], "metadatas": [[]]}

import json
import hashlib

def check_semantic_cache(query: str):
    try:
        if cache_collection.count() == 0:
            return None
            
        results = cache_collection.query(
            query_texts=[query],
            n_results=1
        )
        
        # ChromaDB returns distances if available, but for simplicity we check if there's a result
        if results and results["documents"] and len(results["documents"][0]) > 0:
            # We assume distance is returned, but default to checking threshold if distances exist
            distances = results.get("distances", [[1.0]])[0]
            if len(distances) > 0 and distances[0] < settings.semantic_cache_threshold:
                metadata = results["metadatas"][0][0]
                return json.loads(metadata["response_json"])
        return None
    except Exception as e:
        print("Cache check error:", e)
        return None

def store_semantic_cache(query: str, response_dict: dict):
    try:
        query_hash = hashlib.md5(query.encode()).hexdigest()
        cache_collection.add(
            documents=[query],
            metadatas=[{"response_json": json.dumps(response_dict)}],
            ids=[f"cache-{query_hash}"]
        )
    except Exception as e:
        print("Cache store error:", e)


def clear_semantic_cache():
    """Wipe the Q&A cache. Called whenever the knowledge base changes so a stale
    'I couldn't find that' answer never shadows newly published knowledge."""
    global cache_collection
    try:
        chroma_client.delete_collection("semantic_cache")
    except Exception as e:
        print("Cache clear error:", e)
    cache_collection = _get_or_create("semantic_cache")

def check_asset_cache(transcript_hash: str):
    try:
        if asset_cache_collection.count() == 0:
            return None
            
        results = asset_cache_collection.get(
            ids=[f"asset-cache-{transcript_hash}"]
        )
        
        if results and results["metadatas"] and len(results["metadatas"]) > 0:
            metadata = results["metadatas"][0]
            return json.loads(metadata["assets_json"])
        return None
    except Exception as e:
        print("Asset cache check error:", e)
        return None

def store_asset_cache(transcript_hash: str, assets: list):
    try:
        asset_cache_collection.add(
            documents=["transcript_cache"],
            metadatas=[{"assets_json": json.dumps(assets)}],
            ids=[f"asset-cache-{transcript_hash}"]
        )
    except Exception as e:
        print("Asset cache store error:", e)
