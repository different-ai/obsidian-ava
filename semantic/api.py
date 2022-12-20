import time
import torch
import re
from sentence_transformers import SentenceTransformer
from sentence_transformers import util
from functools import lru_cache
import typing
import logging
from fastapi import Depends, FastAPI, status
from fastapi.middleware.cors import CORSMiddleware
from semantic.models import Input, Notes
from pydantic import BaseSettings
from fastapi.responses import JSONResponse


class Settings(BaseSettings):
    model: str = "multi-qa-MiniLM-L6-cos-v1"
    embed_cache_size: typing.Optional[int] = None
    log_level: str = "INFO"
    device: str = "cpu"

    class Config:
        env_file = ".env"


@lru_cache()
def get_settings():
    return Settings()


app = FastAPI()

origins = ["app://obsidian.md", "*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

state = {"corpus": {}, "status": "loading", "model": None, "logger": None}


def note_to_embedding_format(
    note_path: str, note_tags: typing.List[str], note_content: str
) -> str:
    """
    Convert a note to the format expected by the embedding model
    """
    return f"File:\n{note_path}\nTags:\n{note_tags}\nContent:\n{note_content}"



@app.on_event("startup")
def startup_event():
    settings = get_settings()
    logger = logging.getLogger("ava_semantic_search_api")
    logger.setLevel(settings.log_level)
    handler = logging.StreamHandler()
    handler.setLevel(settings.log_level)
    formatter = logging.Formatter(
        "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
    )
    handler.setFormatter(formatter)
    logger.addHandler(handler)
    state["logger"] = logger

    logger.info(f"Loading model {settings.model}")
    # TODO cuda
    if torch.backends.mps.is_available() and torch.backends.mps.is_built():
        logger.info("Using MPS device")
        settings.device = "mps"
    state["model"] = SentenceTransformer(settings.model, device=settings.device)
    state["status"] = "ready"


@lru_cache()
def no_batch_embed(sentence: str, _: Settings = Depends(get_settings)) -> torch.Tensor:
    """
    Compute the embedding for a given sentence
    """
    return state["model"].encode(
        sentence,
        convert_to_tensor=True,
    )


# curl -X POST -H "Content-Type: application/json" -d '{"note_path": "Bob.md", "note_tags": ["Humans", "Bob"], "note_content": "Bob is a human"}' http://localhost:3333/refresh | jq '.'


@app.post("/refresh")
def refresh(request: Notes, _: Settings = Depends(get_settings)):
    """
    Refresh the embeddings for a given file
    """
    notes = request.notes
    start_time = time.time()
    state["logger"].info(
        f"Refreshing {len(notes)} embeddings"
    )
    notes_embedding_format = []
    for note in notes:
        if note.path_to_delete:
            state["logger"].info(f"Deleting {note.path_to_delete}")
            try:
                del state["corpus"][note.path_to_delete]
            except KeyError:
                pass

        if not note.note_path:
            continue
        note_embedding_format = note_to_embedding_format(
            note.note_path, note.note_tags, note.note_content
        )

        state["corpus"][note.note_path] = {
            "note_embedding_format": note_embedding_format,
            "note_tags": note.note_tags,
            "note_path": note.note_path,
            "note_content": note.note_content,
        }
        notes_embedding_format.append(note_embedding_format)
    # Batch is much faster than online
    document_embeddings = state["model"].encode(
        notes_embedding_format,
        convert_to_tensor=True,
        show_progress_bar=True,
        batch_size=16, # Seems to be optimal on my machine
    )
    for i, n in enumerate(notes):
        if note.path_to_delete or not note.note_path:
            continue
        state["corpus"][n.note_path]["note_embedding"] = document_embeddings[i]

    state["logger"].debug(f"Loaded {len(notes)} sentences")
    end_time = time.time()
    state["logger"].debug(f"Loaded in {end_time - start_time} seconds")

    return JSONResponse(status_code=status.HTTP_200_OK, content={"status": "success"})


# /semantic_search usage:
# curl -X POST -H "Content-Type: application/json" -d '{"query": "Bob"}' http://localhost:3333/semantic_search | jq '.'


@app.post("/semantic_search")
def semantic_search(input: Input, _: Settings = Depends(get_settings)):
    """
    Search for a given query in the corpus
    """
    query = input.query
    top_k = min(input.top_k, len(state["corpus"]))
    query_embedding = no_batch_embed(query)
    notes_paths = []
    note_embeddings = []
    corpus_items = state["corpus"].items()
    for _, v in corpus_items:
        notes_paths.append(v["note_path"])
        note_embeddings.append(v["note_embedding"])

    cos_scores = util.cos_sim(
        query_embedding,
        torch.stack(note_embeddings),
    )[0]
    top_results = torch.topk(cos_scores, k=top_k)

    logging.info(f"Query: {query}")
    # TODO: maybe advanced query language like elasticsearch + semantic query
    # TODO: i.e. if I want to search over tags + semantic?

    similarities = []
    for score, idx in zip(top_results[0], top_results[1]):
        note_path = notes_paths[idx.item()]
        note_relative_path = note_path.split("/")[-1]
        note_content = state["corpus"][note_path]["note_content"]
        note_tags = state["corpus"][note_path]["note_tags"]
        similarities.append(
            {
                "score": score.item(),
                "note_name": note_relative_path,
                "note_path": note_path,
                "note_content": note_content,
                "note_tags": note_tags,
            }
        )
    return JSONResponse(
        status_code=status.HTTP_200_OK,
        content={"query": query, "similarities": similarities},
    )


# health check endpoint
@app.get("/health")
def health():
    """
    Return the status of the API
    """
    return JSONResponse(
        status_code=status.HTTP_200_OK, content={"status": state["status"]}
    )
