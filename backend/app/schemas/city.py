from typing import Optional
from pydantic import BaseModel, Field

class CityBase(BaseModel):
    name: str = Field(..., example="Delhi")
    state: Optional[str] = Field(None, example="Delhi (NCT)")
    country: Optional[str] = Field("India", example="India")
    latitude: Optional[float] = Field(None, example=28.6139)
    longitude: Optional[float] = Field(None, example=77.2090)

class CityCreate(CityBase):
    pass

class CityResponse(CityBase):
    id: str

    class Config:
        from_attributes = True
