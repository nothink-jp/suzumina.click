from fastapi import FastAPI, HTTPException
from src.api.youtube import get_channel_info, get_latest_videos, get_video_details, search_videos
from src.api.hello import hello

# FastAPIアプリケーションインスタンスを作成
app = FastAPI(
    title="suzumina.click API (Python)",
    description="YouTube API integration for suzumina.click, migrated to Cloud Run.",
    version="0.1.0",
)

# --- API Endpoints ---

@app.get("/api/hello", tags=["General"])
async def route_hello():
    return hello()

@app.get("/api/youtube/channel", tags=["YouTube"])
async def route_get_channel_info(channel_id: str):
    # Pass parameter explicitly using FastAPI's dependency injection
    return get_channel_info(channel_id=channel_id) 

@app.get("/api/youtube/videos", tags=["YouTube"])
async def route_get_latest_videos(channel_id: str, max_results: int = 10):
    # Pass parameters explicitly
    return get_latest_videos(channel_id=channel_id, max_results=max_results)

@app.get("/api/youtube/video/{video_id}", tags=["YouTube"])
async def route_get_video_details(video_id: str):
    # Pass path parameter explicitly
    return get_video_details(video_id=video_id)

@app.get("/api/youtube/search", tags=["YouTube"])
async def route_search_videos(query: str, max_results: int = 10):
    # Pass query parameters explicitly
    return search_videos(query=query, max_results=max_results)