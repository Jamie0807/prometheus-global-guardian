#!/usr/bin/env python3
"""Compatibility entry point for local startup and ``uvicorn main:app``."""

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
