"""Initialize the mounted runtime, then replace PID 1 with an unprivileged API."""

import os
import pwd
import sys
from pathlib import Path


def prepare_runtime(runtime: Path, uid: int, gid: int):
    runtime.mkdir(parents=True, exist_ok=True)
    if os.geteuid() == 0:
        # Railway mounts fresh volumes as root; restored captures may also be root-owned.
        os.chown(runtime, uid, gid)
        for directory, directories, filenames in os.walk(runtime, followlinks=False):
            for name in [*directories, *filenames]:
                os.chown(Path(directory) / name, uid, gid, follow_symlinks=False)


def main():
    try:
        port = int(os.environ.get("PORT") or "3510")
    except ValueError:
        raise SystemExit("PORT ต้องเป็นเลขพอร์ต") from None
    if not 1 <= port <= 65535:
        raise SystemExit("PORT ต้องอยู่ระหว่าง 1 และ 65535")

    runtime = Path(os.environ.get("AWESOME_API_RUNTIME_DIR") or "/data").resolve()
    if not any(
        runtime == base or runtime.is_relative_to(base)
        for base in (Path("/data"), Path("/app/.runtime"))
    ):
        raise SystemExit("Docker runtime ต้องอยู่ใต้ /data หรือ /app/.runtime")
    os.environ["AWESOME_API_RUNTIME_DIR"] = str(runtime)
    app = pwd.getpwnam("app")
    if os.geteuid() not in {0, app.pw_uid}:
        raise SystemExit("entrypoint ต้องเริ่มด้วย root หรือ app")
    prepare_runtime(runtime, app.pw_uid, app.pw_gid)
    if os.geteuid() == 0:
        os.setgroups([])
        os.setgid(app.pw_gid)
        os.setuid(app.pw_uid)

    # exec preserves PID 1 and delivers SIGTERM directly to Uvicorn's lifespan shutdown.
    os.execv(
        sys.executable,
        [
            sys.executable,
            "-m",
            "uvicorn",
            "awesome_api.app:app",
            "--host",
            "0.0.0.0",
            "--port",
            str(port),
            "--workers",
            "1",
            "--timeout-graceful-shutdown",
            "30",
        ],
    )


if __name__ == "__main__":
    main()
