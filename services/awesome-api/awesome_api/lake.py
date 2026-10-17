"""Immutable local pilot lake. A manifest is the capture commit boundary."""

import hashlib
import json
import os
from datetime import UTC, datetime
from pathlib import Path
from uuid import uuid4

import pyarrow as pa
import pyarrow.parquet as pq

from .daily import DAILY_SOURCE, validate_date
from .parser import canonical_repository

SCHEMA = pa.schema(
    [
        ("id", pa.string()),
        ("name", pa.string()),
        ("owner", pa.string()),
        ("description", pa.string()),
        ("url", pa.string()),
        ("kind", pa.string()),
        ("categories", pa.list_(pa.string())),
        ("sections", pa.list_(pa.string())),
    ]
)
DAILY_SCHEMA = pa.schema(
    [*SCHEMA, pa.field("rank", pa.int32()), pa.field("snapshot_date", pa.string())]
)


def utc_now() -> str:
    return datetime.now(UTC).isoformat()


def checksum(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


class Lake:
    def __init__(self, root: Path):
        self.root = Path(root).resolve()

    def _write(self, path: Path, data: bytes):
        path.parent.mkdir(parents=True, exist_ok=True)
        temporary = path.parent / f".pending-{uuid4().hex}"
        try:
            with temporary.open("xb") as stream:
                stream.write(data)
                stream.flush()
                os.fsync(stream.fileno())
            # Publish a complete object atomically, refusing to replace any immutable object.
            os.link(temporary, path)
        finally:
            temporary.unlink(missing_ok=True)
        # Persist the directory entry, too, before authorizing a projection.
        directory = os.open(path.parent, os.O_RDONLY)
        try:
            os.fsync(directory)
        finally:
            os.close(directory)

    def commit(
        self,
        *,
        source: dict,
        raw: bytes,
        records: list[dict],
        role: str,
        category_names: dict | None = None,
        snapshot_date: str | None = None,
    ) -> Path:
        if canonical_repository(source["url"]) != source["id"] or role not in {
            "root",
            "list",
            "daily",
        }:
            raise ValueError("ข้อมูล source ไม่ถูกต้อง")
        if role == "daily":
            if source["id"] != DAILY_SOURCE["id"] or snapshot_date is None:
                raise ValueError("daily source หรือ date ไม่ถูกต้อง")
            validate_date(snapshot_date)
        run_id = uuid4().hex
        source_path = source["id"]
        filename = "snapshot.json" if role == "daily" else "readme.md"
        raw_path = f"landing/{source_path}/{run_id}/{filename}"
        bronze_path = f"bronze/{source_path}/{run_id}/records.parquet"
        sink = pa.BufferOutputStream()
        schema = DAILY_SCHEMA if role == "daily" else SCHEMA
        pq.write_table(
            pa.Table.from_pylist(records, schema=schema), sink, compression="zstd"
        )
        bronze = sink.getvalue().to_pybytes()
        self._write(self.root / raw_path, raw)
        self._write(self.root / bronze_path, bronze)
        manifest = {
            "schema": "awesome.capture.v1",
            "schema_version": 2,
            "domain": "awesome",
            "dataset": "github_daily_rankings"
            if role == "daily"
            else "github_repositories",
            "privacy": "public",
            "retention_class": "operational",
            "source": source,
            "role": role,
            "run_id": run_id,
            "event_id": run_id,
            "captured_at": utc_now(),
            "category_names": category_names or {},
            "snapshot_date": snapshot_date,
            "raw": {"path": raw_path, "sha256": checksum(raw), "bytes": len(raw)},
            "bronze": {
                "path": bronze_path,
                "sha256": checksum(bronze),
                "rows": len(records),
            },
        }
        manifest_path = self.root / "manifests" / f"{run_id}.json"
        self._write(
            manifest_path,
            json.dumps(manifest, ensure_ascii=False, sort_keys=True).encode(),
        )
        return manifest_path

    def read(self, manifest_path: Path) -> tuple[dict, list[dict]]:
        path = Path(manifest_path).resolve()
        if not path.is_relative_to(self.root / "manifests"):
            raise ValueError("manifest ต้องอยู่ใน lake ของ service")
        manifest = json.loads(path.read_bytes())
        if (
            manifest.get("schema") != "awesome.capture.v1"
            or manifest.get("role") not in {"root", "list", "daily"}
            or manifest.get("schema_version", 1) not in {1, 2}
        ):
            raise ValueError("รูปแบบ manifest ไม่ถูกต้อง")
        source = manifest["source"]
        if canonical_repository(source["url"]) != source["id"]:
            raise ValueError("source ใน manifest ไม่ถูกต้อง")
        manifest.setdefault("retention_class", "operational")
        if manifest["role"] == "daily":
            if source["id"] != DAILY_SOURCE["id"]:
                raise ValueError("daily source ไม่อยู่ใน allowlist")
            validate_date(manifest["snapshot_date"])
        blobs = {}
        for layer in ("raw", "bronze"):
            blob_path = (self.root / manifest[layer]["path"]).resolve()
            if not blob_path.is_relative_to(
                self.root / layer.replace("raw", "landing")
            ):
                raise ValueError("artifact ต้องอยู่ใน lake layer ที่กำหนด")
            blob = blob_path.read_bytes()
            if checksum(blob) != manifest[layer]["sha256"]:
                raise ValueError(f"{layer} checksum ไม่ตรงกับ manifest")
            blobs[layer] = blob
        records = pq.read_table(pa.BufferReader(blobs["bronze"])).to_pylist()
        if len(records) != manifest["bronze"]["rows"]:
            raise ValueError("จำนวน Bronze records ไม่ตรงกับ manifest")
        for record in records:
            record["sections"] = record.get("sections") or []
            if canonical_repository(record["url"]) != record["id"] or record[
                "kind"
            ] not in {"project", "list"}:
                raise ValueError("Bronze record ไม่ถูกต้อง")
        if manifest["role"] == "daily":
            if not records or any(
                record["snapshot_date"] != manifest["snapshot_date"]
                or record["rank"] < 1
                for record in records
            ):
                raise ValueError("date หรือ rank ใน daily Bronze record ไม่ถูกต้อง")
            if len({record["id"] for record in records}) != len(records) or len(
                {record["rank"] for record in records}
            ) != len(records):
                raise ValueError("daily Bronze มี repository หรือ rank ซ้ำ")
        return manifest, records

    def captures(self):
        captures = [
            self.read(path) for path in (self.root / "manifests").glob("*.json")
        ]
        return sorted(
            captures,
            key=lambda capture: (capture[0]["captured_at"], capture[0]["run_id"]),
        )
