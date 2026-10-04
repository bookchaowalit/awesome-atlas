from dataclasses import dataclass
import os
from pathlib import Path


@dataclass(frozen=True)
class Config:
    runtime_dir: Path = Path(__file__).resolve().parents[1] / ".runtime"
    sync_enabled: bool = True
    sync_interval_seconds: int = 1800
    max_sources: int = 16
    fetch_timeout_seconds: int = 12
    max_readme_bytes: int = 4 * 1024 * 1024

    @classmethod
    def from_env(cls):
        def integer(name, default, minimum, maximum):
            value = int(os.environ.get(name, default))
            if not minimum <= value <= maximum:
                raise ValueError(f"{name} ต้องอยู่ระหว่าง {minimum} และ {maximum}")
            return value

        return cls(
            runtime_dir=Path(os.environ.get("AWESOME_API_RUNTIME_DIR", cls.runtime_dir)),
            sync_enabled=os.environ.get("AWESOME_API_SYNC_ENABLED", "true").lower() == "true",
            sync_interval_seconds=integer("AWESOME_API_SYNC_INTERVAL_SECONDS", 1800, 60, 86400),
            max_sources=integer("AWESOME_API_MAX_SOURCES", 16, 1, 100),
            fetch_timeout_seconds=integer("AWESOME_API_FETCH_TIMEOUT_SECONDS", 12, 1, 60),
        )
