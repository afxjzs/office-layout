"""Serve the office layout planner on http://localhost:8765 with caching turned off,
so a reload always shows the latest index.html."""
import functools
import http.server
import os

PORT = 8765


class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()


if __name__ == "__main__":
    here = os.path.dirname(os.path.abspath(__file__))
    handler = functools.partial(NoCacheHandler, directory=here)
    with http.server.ThreadingHTTPServer(("127.0.0.1", PORT), handler) as httpd:
        print(f"Serving {here} at http://localhost:{PORT}/index.html (no-cache)", flush=True)
        httpd.serve_forever()
