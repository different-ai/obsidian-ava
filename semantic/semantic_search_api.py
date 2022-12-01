"""Start a server with NLP functionality."""
import os
import torch
from pathlib import Path
import obsidiantools.api as otools
import re
import bottle
from sentence_transformers import SentenceTransformer
from sentence_transformers import util
from functools import lru_cache
import typing
import argparse

parser = argparse.ArgumentParser(description="Start an NLP server.")
parser.add_argument(
    "--port",
    type=int,
    help="Server port",
    required=True,
)
parser.add_argument(
    "--model",
    type=str,
    help="Transformer model ID",
    required=True,
)
parser.add_argument(
    "--embed_cache_size",
    type=typing.Optional[int],
    help="Cache size for sentence embeddings",
    default=None,
)
args = parser.parse_args()


# regex to grab the file title from content (File:\n(blabla))
regex = re.compile(r"File:\n(.*)")

# two level above the current directory
wkd = Path(os.getcwd()).parent.parent.parent
print(f"Loading vault from {wkd}")
vault = otools.Vault(wkd).connect().gather()
print(f"Loading model {args.model}")
model = SentenceTransformer(args.model)
corpus = []
document_embeddings = []
print(f"Loading corpus, there are", len(vault.readable_text_index.items()), "notes")
for k, v in vault.readable_text_index.items():
    corpus.append(f"File:\n{k}\nTags:{vault.get_tags(k)}\nContent:\n{v}")
# TODO: refresh corupus embeddings regularly or according to files changed in the vault
document_embeddings = model.encode(corpus, convert_to_tensor=True, show_progress_bar=True)
print(f"Loaded {len(corpus)} sentences")

@bottle.error(405)
def method_not_allowed(res):
    """Adds headers to allow cross-origin requests to all OPTION requests.
    Essentially this allows requests from external domains to be processed."""
    if bottle.request.method == "OPTIONS":
        new_res = bottle.HTTPResponse()
        new_res.set_header("Access-Control-Allow-Origin", "*")
        new_res.set_header("Access-Control-Allow-Headers", "content-type")
        return new_res
    res.headers["Allow"] += ", OPTIONS"
    return bottle.request.app.default_error_handler(res)


@bottle.hook("after_request")
def enable_cors():
    """Sets the CORS header to `*` in all responses. This signals the clients
    that the response can be read by any domain."""
    bottle.response.set_header("Access-Control-Allow-Origin", "*")
    bottle.response.set_header("Access-Control-Allow-Headers", "content-type")


@lru_cache(maxsize=args.embed_cache_size)
def no_batch_embed(sentence: str) -> torch.Tensor:
    """"""
    return model.encode(sentence, convert_to_tensor=True)


@bottle.post("/embedding")
def embedding():
    """"""
    documents = bottle.request.json["documents"]
    embeddings = [no_batch_embed(document) for document in documents]
    return {"embeddings": embeddings}


@bottle.post("/semantic_search")
def semantic_search():
    """"""
    query = bottle.request.json["query"]
    top_k = min(5, len(corpus))
    query_embedding = no_batch_embed(query)
    cos_scores = util.cos_sim(query_embedding, document_embeddings)[0]
    top_results = torch.topk(cos_scores, k=top_k)

    # TODO: maybe advanced query language like elasticsearch + semantic query
    # TODO: i.e. if I want to search over tags + semantic?

    similarities = []
    for score, idx in zip(top_results[0], top_results[1]):
        file_path = regex.findall(corpus[idx])[0]
        file_name = file_path.split("/")[-1]
        file_text = vault.get_readable_text(file_name)
        file_tags = vault.get_tags(file_name)
        similarities.append({
            "score": score.item(),
            "file_name": file_name,
            "file_path": file_path,
            "file_content": file_text,
            "file_tags": file_tags,
        })
    return {
        "query": query,
        "similarities": similarities,
    }
# /semantic_search usage:
# curl -X POST -H "Content-Type: application/json" -d '{"query": "reinforcement learning"}' http://localhost:3000/semantic_search | jq '.'

bottle.run(port=args.port, server="cheroot", debug=True)