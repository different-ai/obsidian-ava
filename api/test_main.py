from fastapi.testclient import TestClient
import os
from main import app

client = TestClient(app)


def test_read_main():
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