import asyncio
from contextlib import asynccontextmanager
from typing import Literal

from fastapi import FastAPI, HTTPException, Query

from .config import Config
from .lake import Lake
from .parser import canonical_repository
from .store import Store
from .sync import Coordinator
from .daily import DAILY_SOURCE, validate_date


def create_app(config: Config | None = None, *, store=None, lake=None, coordinator=None):
    config = config or Config.from_env()

    @asynccontextmanager
    async def lifespan(app):
        app.state.store = store or Store(config.runtime_dir / "catalog.sqlite3")
        app.state.lake = lake or Lake(config.runtime_dir / "lake")
        app.state.coordinator = coordinator or Coordinator(config, app.state.store, app.state.lake)
        stop = asyncio.Event()
        task = asyncio.create_task(app.state.coordinator.run(stop)) if config.sync_enabled else None
        try:
            yield
        finally:
            stop.set()
            if task:
                await task

    app = FastAPI(title="Awesome Explore API", version="0.1.0", lifespan=lifespan)

    @app.get("/health")
    def health():
        app.state.store.metadata("last_synced_at")
        return {"status": "ok", "service": "awesome-api"}

    @app.get("/api/v1/projects")
    def projects(q: str = Query("", max_length=256), category: str = Query("", max_length=256),
                 source: str = Query("", max_length=150),
                 kind: Literal["project", "list", "all"] = "project",
                 sort: Literal["recent", "name", "mentions"] = "recent",
                 min_sources: int = Query(0, ge=0, le=1000), section: str = Query("", max_length=256),
                 limit: int = Query(30, ge=1, le=100), offset: int = Query(0, ge=0),
                 ids: str | None = Query(None, max_length=30000)):
        requested_ids = None
        if ids is not None:
            parts = [part.strip().lower() for part in ids.split(",") if part.strip()]
            if len(parts) > 200:
                raise HTTPException(400, "ids รองรับไม่เกิน 200 รายการ")
            if any(canonical_repository(f"https://github.com/{part}") != part for part in parts):
                raise HTTPException(400, "ids ต้องอยู่ในรูป owner/repo")
            requested_ids = list(dict.fromkeys(parts))
        return app.state.store.projects(q=q, category=category, source=source, kind=kind,
                                        sort=sort, limit=limit, offset=offset, ids=requested_ids,
                                        min_sources=min_sources, section=section)

    @app.get("/api/v1/categories")
    def categories():
        return {"items": app.state.store.categories()}

    @app.get("/api/v1/sources")
    def sources():
        return {"items": app.state.store.sources()}

    def source_id(value):
        value = value.strip().lower()
        if canonical_repository(f"https://github.com/{value}") != value:
            raise HTTPException(400, "source ต้องอยู่ในรูป owner/repo")
        return value

    @app.get("/api/v1/compare")
    def compare(left: str = Query(..., max_length=150), right: str = Query(..., max_length=150),
                mode: Literal["shared", "left_only", "right_only", "all"] = "shared",
                kind: Literal["all", "project", "list"] = "all", q: str = Query("", max_length=256),
                limit: int = Query(30, ge=1, le=100), offset: int = Query(0, ge=0)):
        left_id, right_id = source_id(left), source_id(right)
        if left_id == right_id:
            raise HTTPException(400, "เลือกคนละ source เพื่อเปรียบเทียบ")
        try:
            return app.state.store.compare(left_id, right_id, mode=mode, kind=kind, q=q, limit=limit, offset=offset)
        except KeyError:
            raise HTTPException(404, "ไม่พบ Awesome source ที่ active") from None

    @app.get("/api/v1/daily/sources")
    def daily_sources():
        return {"items": app.state.store.daily_sources()}

    @app.get("/api/v1/daily")
    def daily(source: str = Query(DAILY_SOURCE["id"], max_length=150), date: str | None = Query(None, max_length=10),
              q: str = Query("", max_length=256), limit: int = Query(30, ge=1, le=100), offset: int = Query(0, ge=0)):
        source = source_id(source)
        if date is not None:
            try:
                validate_date(date)
            except ValueError:
                raise HTTPException(422, "date ต้องเป็นวันที่จริงในรูป YYYY-MM-DD") from None
        try:
            return app.state.store.daily(source=source, date=date, q=q, limit=limit, offset=offset)
        except KeyError:
            raise HTTPException(404, "ไม่พบ daily source") from None

    @app.get("/api/v1/status")
    def status():
        return app.state.coordinator.status()

    return app


app = create_app()
