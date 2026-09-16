#!/usr/bin/env python3
"""为本地启动和 ``uvicorn main:app`` 提供兼容入口。"""

from app.main import create_app


app = create_app()


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8001,
        reload=True,
        log_level="info",
    )
