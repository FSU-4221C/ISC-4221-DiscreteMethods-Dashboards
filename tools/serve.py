#!/usr/bin/env python3
"""Serve the ISC 4221C dashboard locally.

    python3 tools/serve.py            # http://localhost:8731
    python3 tools/serve.py 9000       # a different port

Why this exists
---------------
The dashboard makes no network requests: no CDN, no fonts, no remote images,
no fetch(). Every byte it needs is in this folder. But its JavaScript is
written as ES modules (`<script type="module">`), and Chrome and Firefox
refuse to load a module script from a `file://` address — the origin is
opaque, so the module's CORS check fails before the file is ever read.

So the dashboard is offline, but it is not double-click-from-a-folder. It
needs to be *served*, and this serves it from the standard library with no
install step, no dependencies, and still no internet connection.

What you get without a server
-----------------------------
Opening `index.html` directly is not a blank page. HTML and CSS load normally,
so all the prose, every heading, every static table, and every link work. What
you lose is the search box, the theme switch, and the interactive demos —
each of which shows a note saying so, with its numbers in a static table.

Nothing here talks to the network: `http.server` binds to localhost only.
"""

from __future__ import annotations

import http.server
import os
import socketserver
import sys
from pathlib import Path

DEFAULT_PORT = 8731
ROOT = Path(__file__).resolve().parent.parent  # Dashboard/


class Handler(http.server.SimpleHTTPRequestHandler):
    """Static handler rooted at Dashboard/, with sane types and no caching."""

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def end_headers(self):
        # No caching, so an edit to a CSS or JS file shows up on reload
        # instead of leaving an author debugging a stale copy.
        self.send_header("Cache-Control", "no-store, must-revalidate")
        super().end_headers()

    def log_message(self, fmt, *args):
        # One line per request, without the noisy default timestamp block.
        sys.stderr.write("  %s\n" % (fmt % args))


def main() -> int:
    port = DEFAULT_PORT
    if len(sys.argv) > 1:
        try:
            port = int(sys.argv[1])
        except ValueError:
            print(f"Not a port number: {sys.argv[1]}", file=sys.stderr)
            return 2

    os.chdir(ROOT)
    socketserver.TCPServer.allow_reuse_address = True

    try:
        with socketserver.TCPServer(("127.0.0.1", port), Handler) as httpd:
            print(f"ISC 4221C dashboard  ->  http://localhost:{port}/index.html")
            print(f"serving             {ROOT}")
            print("Ctrl-C to stop.\n")
            httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nStopped.")
    except OSError as error:
        print(f"Could not bind port {port}: {error}", file=sys.stderr)
        print(f"Try another port, e.g.  python3 tools/serve.py {port + 1}", file=sys.stderr)
        return 1

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
