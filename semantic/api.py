import os
import torch
from pathlib import Path
import obsidiantools.api as otools
import re
from sentence_transformers import SentenceTransformer
from sentence_transformers import util
from functools import lru_cache
import typing
import logging
from fastapi import Depends, FastAPI, status
from fastapi.middleware.cors import CORSMiddleware
from semantic.models import Input
from pydantic import BaseSettings
from fastapi.responses import JSONResponse



class Settings(BaseSettings):
    model: str = "multi-qa-MiniLM-L6-cos-v1"
    embed_cache_size: typing.Optional[int] = None
    log_level: str = "INFO"
    device: str = "cpu"
    vault_path: typing.Optional[str] = None

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

# regex to grab the file title from content (File:\n(blabla))
regex = re.compile(r"File:\n(.*)")


def compute_embeddings(wkd: typing.Union[str, Path]):
    """
    Compute vault's embeddings
    :param wkd: path to the vault
    """
    state["logger"].info(f"Loading vault from {wkd}")
    vault = otools.Vault(wkd).connect(show_nested_tags=True).gather()
    document_embeddings = []
    corpus = {}
    state["logger"].info(
        f"Loading corpus, there are {len(vault.readable_text_index.items())} notes"
    )

    for k, v in vault.readable_text_index.items():
        text_to_embed = (
            f"File:\n{k}\nTags:{vault.get_tags(k, show_nested=True)}\nContent:\n{v}"
        )

        corpus[k] = {
            "file_to_embed": text_to_embed,
            "file_tags": vault.get_tags(k, show_nested=True),
            "file_name": k,
            "file_content": v,
        }
    # TODO: refresh corupus embeddings regularly or according to files changed in the vault
    state["status"] = "computing_embeddings"
    document_embeddings = state["model"].encode(
        [v["file_to_embed"] for _, v in corpus.items()],
        convert_to_tensor=True,
        show_progress_bar=True,
    )
    state["logger"].info(f"Loaded {len(corpus)} sentences")
    return vault, corpus, document_embeddings


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

    # two level above the current directory
    wkd = (
        settings.vault_path
        if settings.vault_path
        else Path(os.getcwd()).parent.parent.parent
    )
    logger.info(f"Loading model {settings.model}")
    if torch.backends.mps.is_available() and torch.backends.mps.is_built():
        logger.info("Using MPS device")
        settings.device = "mps"
    state["model"] = SentenceTransformer(settings.model, device=settings.device)
    vault, corpus, corpus_embeddings = compute_embeddings(wkd)
    state["corpus"] = corpus
    state["corpus_embeddings"] = corpus_embeddings
    state["status"] = "ready"
    state["vault"] = vault


@lru_cache()
def no_batch_embed(sentence: str, _: Settings = Depends(get_settings)) -> torch.Tensor:
    """
    Compute the embedding for a given sentence
    """
    return state["model"].encode(
        sentence,
        convert_to_tensor=True,
    )


@app.get("/refresh")
def refresh(_: Settings = Depends(get_settings)):
    """
    Refresh the embeddings for a given file
    """

    state["status"] = "refreshing"
    wkd = state["vault"].dirpath
    # TODO: inefficient for now - recompute everything
    vault, corpus, corpus_embeddings = compute_embeddings(wkd)
    state["corpus"] = corpus
    state["corpus_embeddings"] = corpus_embeddings
    state["status"] = "ready"
    state["vault"] = vault
    return JSONResponse(status_code=status.HTTP_200_OK)


# /semantic_search usage:
# curl -X POST -H "Content-Type: application/json" -d '{"query": "reinforcement learning"}' http://localhost:3333/semantic_search | jq '.'


@app.post("/semantic_search")
def semantic_search(input: Input, _: Settings = Depends(get_settings)):
    """
    Search for a given query in the corpus
    """
    query = input.query
    top_k = min(input.top_k, len(state["corpus"]))
    query_embedding = no_batch_embed(query)
    files_paths = []
    for _, v in state["corpus"].items():
        files_paths.append(v["file_name"])

    cos_scores = util.cos_sim(
        query_embedding,
        state["corpus_embeddings"],
    )[0]
    top_results = torch.topk(cos_scores, k=top_k)

    logging.info(f"Query: {query}")
    # TODO: maybe advanced query language like elasticsearch + semantic query
    # TODO: i.e. if I want to search over tags + semantic?

    similarities = []
    for score, idx in zip(top_results[0], top_results[1]):
        file_path = files_paths[idx.item()]
        file_name = file_path.split("/")[-1]
        file_text = state["vault"].get_readable_text(file_name)
        file_tags = state["vault"].get_tags(file_name, show_nested=True)
        similarities.append(
            {
                "score": score.item(),
                "file_name": file_name,
                "file_path": file_path,
                "file_content": file_text,
                "file_tags": file_tags,
            }
        )
    return {
        "query": query,
        "similarities": similarities,
    }
    # TODO: JSONResponse(status_code=status.HTTP_200_OK, ...


# health check endpoint
@app.get("/health")
def health():
    """
    Return the status of the API
    """
    return JSONResponse(status_code=status.HTTP_200_OK, content={"status": state["status"]})
