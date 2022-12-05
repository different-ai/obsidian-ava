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
from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from semantic.models import Input
from pydantic import BaseSettings


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

state = {"status": "loading"}

# regex to grab the file title from content (File:\n(blabla))
regex = re.compile(r"File:\n(.*)")


@app.on_event("startup")
async def startup_event():
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

    # two level above the current directory
    wkd = Path(os.getcwd()).parent.parent.parent
    logger.debug(f"Loading vault from {wkd}")
    vault = otools.Vault(wkd).connect(show_nested_tags=True).gather()
    logger.info(f"Loading model {settings.model}")
    if settings.device == "mps" and (
        not torch.backends.mps.is_available() or not torch.backends.mps.is_built()
    ):
        logger.warning(
            "MPS was requested but is not available, check your setup, falling back to CPU"
        )
        settings.device = "cpu"
    model = SentenceTransformer(settings.model, device=settings.device)
    corpus = []
    document_embeddings = []
    logger.info(
        f"Loading corpus, there are {len(vault.readable_text_index.items())} notes"
    )

    for k, v in vault.readable_text_index.items():
        corpus.append(f"File:\n{k}\nTags:{vault.get_tags(k, show_nested=True)}\nContent:\n{v}")
    # TODO: refresh corupus embeddings regularly or according to files changed in the vault
    state["status"] = "computing_embeddings"
    document_embeddings = model.encode(
        corpus,
        convert_to_tensor=True,
        show_progress_bar=settings.log_level == "DEBUG",
        device=settings.device,
    )
    logger.info(f"Loaded {len(corpus)} sentences")
    state["status"] = "ready"
    state["logger"] = logger
    state["vault"] = vault
    state["model"] = model
    state["corpus"] = corpus
    state["document_embeddings"] = document_embeddings


@lru_cache()
def no_batch_embed(
    sentence: str, settings: Settings = Depends(get_settings)
) -> torch.Tensor:
    """"""
    return state["model"].encode(sentence, convert_to_tensor=True)


# /semantic_search usage:
# curl -X POST -H "Content-Type: application/json" -d '{"query": "reinforcement learning"}' http://localhost:3333/semantic_search | jq '.'



@app.post("/semantic_search")
def semantic_search(input: Input, _: Settings = Depends(get_settings)):
    """"""
    query = input.query
    top_k = min(input.top_k, len(state["corpus"]))
    query_embedding = no_batch_embed(query)
    cos_scores = util.cos_sim(query_embedding, state["document_embeddings"])[0]
    top_results = torch.topk(cos_scores, k=top_k)

    logging.info(f"Query: {query}")
    # TODO: maybe advanced query language like elasticsearch + semantic query
    # TODO: i.e. if I want to search over tags + semantic?

    similarities = []
    for score, idx in zip(top_results[0], top_results[1]):
        file_path = regex.findall(state["corpus"][idx])[0]
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


# health check endpoint
@app.get("/health")
def health():
    """"""
    return {"status": state["status"]}
