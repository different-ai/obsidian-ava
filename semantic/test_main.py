from httpx import AsyncClient
import pytest

from semantic.api import app


@pytest.mark.asyncio
async def test_semantic_search():
    async with AsyncClient(app=app) as client:
        response = await client.post("/semantic_search", json={"query": "foo"})
        assert response.status_code == 200

