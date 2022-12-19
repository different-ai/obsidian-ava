from functools import lru_cache
from io import BytesIO
import json
import os
from typing import List, Optional
from fastapi import Depends, FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, BaseSettings
from fastapi.responses import JSONResponse, StreamingResponse
from stability_sdk import client
import stability_sdk.interfaces.gooseai.generation.generation_pb2 as generation
import openai
from sse_starlette.sse import EventSourceResponse

app = FastAPI()

origins = ["app://obsidian.md", "*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# hosted vs local
SECRET_PATH = "/secrets/" if os.path.exists("/secrets") else "."
class Settings(BaseSettings):
    stability_key: str
    openai_api_key: str
    openai_organization: str

    class Config:
        env_file = SECRET_PATH + "/.env"


@lru_cache()
def get_settings():
    return Settings()


class RequestImageCreate(BaseModel):
    # e.g. 512, 768, 1024
    size: int
    # e.g. 1, 2, 3, 4
    limit: int
    # e.g. "A group of Giraffes visiting a zoo on mars populated by humans"
    prompt: str


@app.on_event("startup")
def startup_event():
    print("Starting up...")


@app.get("/")
def hello():
    return {"hello": "world"}

# URL="https://obsidian-ai.web.app"
# curl -X POST "$URL/v1/image/create" -H "Content-Type: application/json" -d '{"size":512,"limit":1,"prompt":"A group of Giraffes visiting a zoo on mars populated by humans"}' > giraffes.jpg


@app.post("/v1/image/create")
def create(request: RequestImageCreate, settings: Settings = Depends(get_settings)):
    # TODO: currently only supports 1 image
    if request.limit != 1:
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={
                "status": "error",
                "message": "Currently only 1 image is supported.",
            },
        )
    stability_api = client.StabilityInference(
        key=settings.stability_key,
        verbose=True,
        # TODO: use the latest model
        # https://platform.stability.ai/docs/features/text-to-image
        # https://github.com/Stability-AI/stability-sdk/issues/159
        engine="stable-diffusion-768-v2-1",
    )

    answers = stability_api.generate(
        prompt=request.prompt,
        height=request.size,
        width=request.size,
        samples=request.limit,
    )
    # https://github.com/Stability-AI/api-interfaces/blob/9aaf59a7a81f4e7a1b2559a64076a1969dae5cd7/src/proto/generation.proto#L41
    # TODO: malloc crash 50% times on mac m1 here - issue with grpc or something?
    for resp in answers:
        for artifact in resp.artifacts:
            if artifact.finish_reason == generation.FILTER:
                return JSONResponse(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    content={
                        "status": "error",
                        "message": "Your request activated the API's safety filters and \
                            could not be processed."
                        "Please modify the prompt and try again.",
                    },
                )
            if artifact.type == generation.ARTIFACT_IMAGE:
                img = artifact.binary
                img = BytesIO(img)
                return StreamingResponse(img, media_type="image/jpeg")
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "status": "error",
            "message": "An error occurred while processing your request. Please try again.",
        },
    )


class RequestTextCreate(BaseModel):
    # e.g. "text-davinci-003", "code-davinci-003" ...
    model: str
    # e.g. "Write a short story about group of Giraffes visiting a zoo on mars populated by humans."
    prompt: str
    # e.g. 0.7
    temperature: Optional[float] = 0.7
    # e.g. 256
    max_tokens: Optional[int] = 256
    # e.g. 1
    top_p: Optional[float] = 1
    # e.g. 0
    frequency_penalty: Optional[float] = 0
    # e.g. 0
    presence_penalty: Optional[float] = 0
    # e.g. False
    stream: Optional[bool] = False
    # e.g. ["\n", " "]
    stop: Optional[List[str]] = None


"""
URL="https://obsidian-ai.web.app"
curl $URL/v1/text/create \
  -H "Content-Type: application/json" \
  -d '{"model": "ada",  "prompt": "Write a short story about group of Giraffes visiting a zoo on mars populated by humans."}' | jq '.'

"""

# Keep the endpoint as close to possible as the openai endpoint.
# Only abstract the key and organization.
@app.post("/v1/text/create")
async def create(
    request: Request,
    request_body: RequestTextCreate,
    settings: Settings = Depends(get_settings),
):
    openai.api_key = settings.openai_api_key
    openai.organization = settings.openai_organization
    def _g():
        return openai.Completion.create(
            engine=request_body.model,
            prompt=request_body.prompt,
            temperature=request_body.temperature,
            max_tokens=request_body.max_tokens,
            top_p=request_body.top_p,
            frequency_penalty=request_body.frequency_penalty,
            presence_penalty=request_body.presence_penalty,
            stream=request_body.stream,
            stop=request_body.stop,
            user="obsidian-ava",
        )

    async def event_generator():
        response = _g()

        while True:
            # If client closes connection, stop sending events
            if await request.is_disconnected():
                break

            data = next(response, None)

            if not data or not data["choices"][0]["text"]:
                continue
            data_json = json.dumps(data)
            yield {
                "data": data_json,
            }

            if data["choices"][0]["finish_reason"]:
                break

    if not request_body.stream:
        return _g()

    return EventSourceResponse(event_generator())
