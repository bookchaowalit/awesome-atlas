import argparse
import json
from dataclasses import replace

import uvicorn

from .config import Config
from .lake import Lake
from .store import Store
from .sync import Coordinator


def main():
    parser = argparse.ArgumentParser(description="Awesome Explore backend")
    parser.add_argument(
        "command",
        choices=["serve", "sync", "status", "rebuild"],
        nargs="?",
        default="serve",
    )
    parser.add_argument(
        "--once", action="store_true", help="ดึงข้อมูลหนึ่งรอบแล้วจบ (เท่ากับ sync)"
    )
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=3510)
    args = parser.parse_args()
    command = "sync" if args.once else args.command
    if command == "serve":
        uvicorn.run("awesome_api.app:app", host=args.host, port=args.port, workers=1)
        return
    config = replace(Config.from_env(), sync_enabled=False)
    store, lake = (
        Store(config.runtime_dir / "catalog.sqlite3"),
        Lake(config.runtime_dir / "lake"),
    )
    worker = Coordinator(config, store, lake)
    if command == "sync":
        ok = worker.sync()
        print(json.dumps({"success": ok, **worker.status()}, ensure_ascii=False))
        if not ok:
            raise SystemExit(1)
    elif command == "rebuild":
        print(
            json.dumps(
                {"captures_replayed": store.rebuild(lake), "status": worker.status()},
                ensure_ascii=False,
            )
        )
    else:
        print(json.dumps(worker.status(), ensure_ascii=False))


if __name__ == "__main__":
    main()
