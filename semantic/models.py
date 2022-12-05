from pydantic import BaseModel


class Input(BaseModel):
    query: str
    top_k: int = 6