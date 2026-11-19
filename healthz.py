import json
import os
import sys
import urllib.request

URL = os.environ.get("HEALTH_URL", "http://localhost:8000/health")


def main() -> int:
    try:
        with urllib.request.urlopen(URL, timeout=5) as response:
            body = json.loads(response.read() or b"{}")
            healthy = response.status == 200 and body.get("status") == "ok"
    except Exception as exc:
        print(f"unhealthy: {type(exc).__name__}")
        return 1
    print("healthy" if healthy else "unhealthy")
    return 0 if healthy else 1


if __name__ == "__main__":
    sys.exit(main())
