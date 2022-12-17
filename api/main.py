from io import BytesIO
import os
from fastapi import FastAPI, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from fastapi.responses import JSONResponse, StreamingResponse
from stability_sdk import client
import stability_sdk.interfaces.gooseai.generation.generation_pb2 as generation

app = FastAPI()

origins = ["app://obsidian.md", "*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class RequestImageCreate(BaseModel):
    # e.g. 512, 768, 1024
    size: int
    # e.g. 1, 2, 3, 4
    limit: int
    # e.g. "A group of Giraffes visiting a zoo on mars populated by humans"
    prompt: str

# curl -X POST "http://localhost:8000/v1/image/create" -H "Content-Type: application/json" -d '{"size":512,"limit":1,"prompt":"A group of Giraffes visiting a zoo on mars populated by humans"}' > giraffes.jpg

@app.post("/v1/image/create")
async def create(request: RequestImageCreate, response_class=StreamingResponse):
    stability_api = client.StabilityInference(
        key=os.environ["STABILITY_KEY"],
        verbose=True,
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
