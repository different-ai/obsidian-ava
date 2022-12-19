from typing import List, Optional
from pydantic import BaseModel



class Note(BaseModel):
    note_path: Optional[str] = None
    note_tags: Optional[List[str]] = None
    note_content: Optional[str] = None
    path_to_delete: Optional[str] = None

class Notes(BaseModel):
    notes: List[Note]

class Input(BaseModel):
    query: str
    top_k: int = 6
