from pydantic import BaseModel


class Input(BaseModel):
    query: str