"""
Pydantic models for every request/response the API accepts or returns.
Keeping these centralized means the frontend, the agent's tool schemas, and
the REST endpoints all agree on one shape.
"""
from typing import List, Literal, Optional
from pydantic import BaseModel, Field


class ApplianceItem(BaseModel):
    name: str
    power_w: float = Field(..., gt=0, description="Rated power in watts")
    hours_per_day: float = Field(..., ge=0, le=24)
    quantity: int = Field(1, ge=1)
    runs_simultaneously: bool = Field(
        True, description="Whether this appliance is assumed to run at the same time as other 'simultaneous' loads for peak-load estimation"
    )


class SiteInput(BaseModel):
    country: str
    city: str
    address: Optional[str] = None
    roof_type: Literal["flat_concrete", "sloped_tin", "sloped_tile", "ground_mount"]
    roof_area_m2: Optional[float] = Field(None, gt=0)
    shading: Literal["none", "partial", "significant"] = "none"
    building_type: Literal["house", "shop", "small_commercial"]


class LoadInput(BaseModel):
    appliances: List[ApplianceItem]
    system_mode: Literal["on_grid", "off_grid", "hybrid"] = "hybrid"
    autonomy_days: float = Field(1.0, gt=0, le=7)


class ChatRequest(BaseModel):
    message: str


class SessionCreateResponse(BaseModel):
    session_id: str


class ChatResponse(BaseModel):
    reply: str
    session_state: dict


class FullResultResponse(BaseModel):
    site_analysis: dict
    energy: dict
    design: dict
    cost: dict
    roadmap: dict
