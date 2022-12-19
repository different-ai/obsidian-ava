from fastapi.testclient import TestClient
import os
from main import app
import json

client = TestClient(app)


def test_image_create():
    response = client.post(
        "/v1/image/create",
        json={
            "size": 512,
            "limit": 1,
            "prompt": "A group of Giraffes visiting a zoo on mars populated by humans",
        },
    )
    assert response.status_code == 200
    # Write generated image to file
    with open("giraffes.jpg", "wb") as f:
        f.write(response.content)
    assert response.headers["content-type"] == "image/jpeg"
    # check image is written
    assert os.path.exists("giraffes.jpg")
    # delete image
    os.remove("giraffes.jpg")

# TODO: should we make it usable even with openai client?

def test_text_create():
    response = client.post(
        "/v1/text/create",
        json={
            "model": "text-davinci-003",
            "prompt": "1 + 1 =",
            "stop": ["\n"],
        },
    )
    assert response.status_code == 200
    json_response = response.json()
    text = json_response["choices"][0]["text"]
    assert text == " 2"

def test_text_create_stream():
    for e in client.stream(
        "POST",
        "/v1/text/create",
        json={
            "model": "ada",
            "prompt": "1 + 1 = 2\n2 + 2 = 4\n4 + 4 =",
            "stream": True,
            "max_tokens": 20,
        },
    ).gen:
        json.loads(e.read())
