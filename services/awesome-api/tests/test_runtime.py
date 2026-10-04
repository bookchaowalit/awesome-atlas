import pytest
from fastapi.testclient import TestClient

from awesome_api.app import create_app
from awesome_api.config import Config
from awesome_api.lake import Lake
from awesome_api.store import Store
from awesome_api.sync import Coordinator


ROOT = "sindresorhus/awesome"
CATALOG = b"""# Awesome
## Developer Tools
- [Tools](https://github.com/org/awesome-tools) - Tools to explore.
## Databases
- [Databases](https://github.com/org/awesome-databases)
"""
TOOLS = b"""# Tools
- [Alpha](https://github.com/a/alpha) - Alpha useful project.
- [Beta](https://github.com/b/beta) - Beta useful project.
"""
DATABASES = b"""# Databases
- [Alpha DB](https://github.com/A/ALPHA#setup) - Alpha in another category.
- [Gamma](https://github.com/c/gamma) - A database.
"""


@pytest.fixture
def runtime(tmp_path):
    config = Config(runtime_dir=tmp_path, sync_enabled=False, max_sources=16)
    payloads = {ROOT: CATALOG, "org/awesome-tools": TOOLS, "org/awesome-databases": DATABASES}
    store = Store(tmp_path / "catalog.sqlite3")
    lake = Lake(tmp_path / "lake")
    worker = Coordinator(config, store, lake, fetch=lambda source: payloads[source], daily_fetch=lambda source, day: None)
    return config, store, lake, worker, payloads


def test_sync_archives_before_projection_and_deduplicates_memberships(runtime):
    _, store, lake, worker, _ = runtime
    assert worker.sync() is True
    assert len(list((lake.root / "manifests").glob("*.json"))) == 3
    assert store.projects()["total"] == 3
    alpha = store.projects(ids=["a/alpha"])["items"][0]
    assert alpha["categories"] == ["databases", "developer-tools"]
    assert alpha["source_ids"] == ["org/awesome-databases", "org/awesome-tools"]
    assert alpha["stars"] is None and alpha["language"] is None
    assert store.projects(kind="list")["total"] == 2
    assert worker.status()["sources_synced"] == 2


def test_api_filter_pagination_sort_ids_and_read_only(runtime):
    config, store, lake, worker, _ = runtime
    worker.sync()
    with TestClient(create_app(config, store=store, lake=lake, coordinator=worker)) as client:
        assert client.get("/health").status_code == 200
        assert client.get("/api/v1/projects", params={"q": "database"}).json()["total"] == 1
        assert client.get("/api/v1/projects", params={"category": "databases"}).json()["total"] == 2
        assert client.get("/api/v1/projects", params={"source": "org/awesome-tools"}).json()["total"] == 2
        page = client.get("/api/v1/projects", params={"sort": "name", "limit": 1, "offset": 1}).json()
        assert page["total"] == 3 and page["items"][0]["id"] == "b/beta"
        assert page["limit"] == 1 and page["offset"] == 1
        assert client.get("/api/v1/projects", params={"ids": "A/ALPHA,c/gamma"}).json()["total"] == 2
        assert client.get("/api/v1/projects", params={"kind": "all"}).json()["total"] == 5
        categories = client.get("/api/v1/categories").json()["items"]
        assert {c["id"]: c["count"] for c in categories} == {"databases": 2, "developer-tools": 2}
        assert len(client.get("/api/v1/sources").json()["items"]) == 2
        assert client.get("/api/v1/status").json()["state"] == "idle"
        for params in [{"limit": 101}, {"offset": -1}, {"kind": "bad"}, {"sort": "bad"}]:
            assert client.get("/api/v1/projects", params=params).status_code == 422
        assert client.get("/api/v1/projects", params={"ids": ",".join(f"a/r{i}" for i in range(201))}).status_code == 400
        assert client.post("/api/v1/projects").status_code == 405


def test_search_wildcards_are_literal(runtime):
    _, store, _, worker, _ = runtime
    worker.sync()
    assert store.projects(q="%")["total"] == 0
    assert store.projects(q="'")["total"] == 0
    assert store.projects(category="databases' OR 1=1 --")["total"] == 0


def test_lake_failure_is_closed_before_sqlite(runtime, monkeypatch):
    _, store, lake, worker, _ = runtime
    worker.sync()
    before = store.projects(kind="all")
    monkeypatch.setattr(lake, "commit", lambda **kwargs: (_ for _ in ()).throw(OSError("lake unavailable")))
    assert worker.sync() is False
    assert store.projects(kind="all") == before
    assert worker.status()["state"] == "degraded"
    assert "lake unavailable" in worker.status()["last_error"]


def test_manifest_write_failure_preserves_previous_projection(runtime, monkeypatch):
    _, store, lake, worker, payloads = runtime
    worker.sync()
    before = store.projects(kind="all")
    payloads["org/awesome-tools"] = b"- [Changed](https://github.com/new/changed)"
    original = lake._write

    def fail_manifest(path, data):
        if path.parent.name == "manifests":
            raise OSError("manifest unavailable")
        return original(path, data)

    monkeypatch.setattr(lake, "_write", fail_manifest)
    assert worker.sync() is False
    assert store.projects(kind="all") == before


def test_partial_failure_retains_projects_and_success_removes_only_own_membership(runtime):
    _, store, _, worker, payloads = runtime
    worker.sync()
    payloads["org/awesome-tools"] = b"- [Beta](https://github.com/b/beta) - Updated."

    def fetch(source):
        if source == "org/awesome-databases":
            raise TimeoutError("source timeout")
        return payloads[source]

    worker.fetch = fetch
    assert worker.sync() is False
    alpha = store.projects(ids=["a/alpha"])["items"][0]
    assert alpha["source_ids"] == ["org/awesome-databases"]
    assert store.projects()["total"] == 3
    assert worker.status()["state"] == "degraded"
    assert next(s for s in store.sources() if s["id"] == "org/awesome-databases")["error"] == "source timeout"


def test_root_failure_does_not_prune_known_sources(runtime):
    _, store, _, worker, payloads = runtime
    worker.sync()
    worker.fetch = lambda source: (_ for _ in ()).throw(TimeoutError("root unavailable")) if source == ROOT else payloads[source]
    assert worker.sync() is False
    assert len(store.sources()) == 2 and store.projects()["total"] == 3


def test_rotation_is_fair_even_for_failing_sources(tmp_path):
    config = Config(runtime_dir=tmp_path, sync_enabled=False, max_sources=1)
    store, lake = Store(tmp_path / "catalog.sqlite3"), Lake(tmp_path / "lake")
    fetched = []

    def fetch(source):
        if source == ROOT:
            return CATALOG
        fetched.append(source)
        if source == "org/awesome-tools":
            raise TimeoutError("unavailable")
        return DATABASES

    worker = Coordinator(config, store, lake, fetch=fetch, daily_fetch=lambda source, day: None)
    worker.sync()
    worker.sync()
    worker.sync()
    assert len(set(fetched[:2])) == 2
    assert fetched[0] == fetched[2]


def test_empty_or_malformed_capture_does_not_prune_previous_data(runtime):
    _, store, _, worker, payloads = runtime
    worker.sync()
    before = store.projects()["total"]
    payloads[ROOT] = b"<!doctype html><html>upstream error</html>"
    payloads["org/awesome-tools"] = b""
    assert worker.sync() is False
    assert store.projects()["total"] == before


@pytest.mark.parametrize("raw", [
    b"Temporarily unavailable. Please try again later.",
    b'<section><a href="https://github.com/new/project">Project</a></section>',
    b"# Tools\n- [External website](https://example.test/tool)",
])
def test_nonempty_unparsed_source_preserves_snapshot_and_reports_failure(runtime, raw):
    _, store, lake, worker, payloads = runtime
    worker.sync()
    source_id = "org/awesome-tools"
    before = store.projects(source=source_id, kind="all")
    last_synced_at = store.source_detail(source_id)["last_synced_at"]
    manifests = list((lake.root / "manifests").glob("*.json"))
    payloads[source_id] = raw

    assert worker._capture(source_id) is False
    assert store.projects(source=source_id, kind="all") == before
    assert store.source_detail(source_id)["last_synced_at"] == last_synced_at
    assert list((lake.root / "manifests").glob("*.json")) == manifests
    assert worker.status()["state"] == "degraded"
    assert "ไม่พบ GitHub repository" in store.source_detail(source_id)["error"]


def test_no_overlapping_sync(runtime):
    _, _, _, worker, _ = runtime
    worker.lock.acquire()
    try:
        assert worker.sync() is False
        assert worker.status()["state"] == "syncing"
    finally:
        worker.lock.release()


def test_rebuild_validates_committed_lake_and_replays_without_network(runtime):
    _, store, lake, worker, _ = runtime
    worker.sync()
    expected = store.projects(kind="all")
    rebuilt = Store(store.path.parent / "rebuilt.sqlite3")
    assert rebuilt.rebuild(lake) == 3
    assert rebuilt.projects(kind="all") == expected
    assert not list(rebuilt.path.parent.glob("*.md"))


def test_corrupt_bronze_rebuild_fails_before_any_projection_write(runtime):
    _, store, lake, worker, _ = runtime
    worker.sync()
    expected = store.projects(kind="all")
    next((lake.root / "bronze").rglob("*.parquet")).write_bytes(b"corrupt")
    with pytest.raises(ValueError, match="checksum"):
        store.rebuild(lake)
    assert store.projects(kind="all") == expected


def test_root_success_prunes_removed_sources_only_after_committed_capture(runtime):
    _, store, _, worker, payloads = runtime
    worker.sync()
    payloads[ROOT] = b"## Developer Tools\n- [Tools](https://github.com/org/awesome-tools)"
    assert worker.sync() is True
    assert len(store.sources()) == 1
    assert store.projects()["total"] == 2
    assert store.projects(ids=["a/alpha"])["items"][0]["categories"] == ["developer-tools"]


def test_replaying_same_committed_manifest_is_idempotent(runtime):
    _, store, lake, worker, _ = runtime
    worker.sync()
    before = store.projects(kind="all")
    for manifest in (lake.root / "manifests").glob("*.json"):
        store.replace_capture(lake, manifest)
    assert store.projects(kind="all") == before


def test_lake_objects_are_immutable_and_manifest_publication_is_atomic(tmp_path, monkeypatch):
    import os
    lake = Lake(tmp_path)
    path = tmp_path / "manifests" / "one.json"
    lake._write(path, b"complete")
    with pytest.raises(FileExistsError):
        lake._write(path, b"replacement")
    assert path.read_bytes() == b"complete"
    monkeypatch.setattr(os, "link", lambda *args: (_ for _ in ()).throw(OSError("publish failed")))
    with pytest.raises(OSError):
        lake._write(tmp_path / "manifests" / "two.json", b"incomplete")
    assert not (tmp_path / "manifests" / "two.json").exists()
    assert not list(tmp_path.rglob(".pending-*"))
