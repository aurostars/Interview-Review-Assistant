#!/usr/bin/env python3
"""Local dev server: static files + CORS proxy + data storage API."""

import http.server
import json
import os
import glob
import requests
from urllib.parse import urlparse, parse_qs

PORT = 8080
STATIC_DIR = "."
CONFIG_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".interview-analyzer-config.json")


def get_storage_path():
    if os.path.exists(CONFIG_FILE):
        with open(CONFIG_FILE, "r", encoding="utf-8") as f:
            config = json.load(f)
            return config.get("storagePath", "")
    return ""


def ensure_storage_dirs(path):
    os.makedirs(os.path.join(path, "interviews"), exist_ok=True)
    os.makedirs(os.path.join(path, "audio"), exist_ok=True)


class ProxyHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=STATIC_DIR, **kwargs)

    def do_OPTIONS(self):
        self.send_response(200)
        self._set_cors_headers()
        self.end_headers()

    def do_GET(self):
        if self.path.startswith("/api/proxy"):
            self._handle_get_proxy()
        elif self.path == "/api/data/config":
            self._handle_get_config()
        elif self.path == "/api/data/interviews":
            self._handle_get_interviews()
        else:
            super().do_GET()

    def do_POST(self):
        if self.path == "/api/proxy":
            self._handle_proxy()
        elif self.path == "/api/data/config":
            self._handle_post_config()
        elif self.path == "/api/data/interviews":
            self._handle_post_interview()
        elif self.path == "/api/data/audio":
            self._handle_post_audio()
        elif self.path == "/api/data/import":
            self._handle_import()
        elif self.path == "/api/data/clear":
            self._handle_clear()
        else:
            self.send_error(404)

    def do_DELETE(self):
        if self.path.startswith("/api/data/interviews"):
            self._handle_delete_interview()
        else:
            self.send_error(404)

    # --- Data Config ---
    def _handle_get_config(self):
        storage_path = get_storage_path()
        self._send_json({"storagePath": storage_path})

    def _handle_post_config(self):
        data = self._read_json_body()
        if not data or "storagePath" not in data:
            self._send_json({"error": "Missing storagePath"}, 400)
            return
        path = data["storagePath"]
        try:
            ensure_storage_dirs(path)
            with open(CONFIG_FILE, "w", encoding="utf-8") as f:
                json.dump({"storagePath": path}, f, ensure_ascii=False)
            self._send_json({"success": True, "storagePath": path})
        except Exception as e:
            self._send_json({"error": str(e)}, 500)

    # --- Interviews CRUD ---
    def _handle_get_interviews(self):
        storage_path = get_storage_path()
        if not storage_path:
            self._send_json([])
            return
        interviews_dir = os.path.join(storage_path, "interviews")
        if not os.path.exists(interviews_dir):
            self._send_json([])
            return
        results = []
        for filepath in glob.glob(os.path.join(interviews_dir, "*.json")):
            try:
                with open(filepath, "r", encoding="utf-8") as f:
                    results.append(json.load(f))
            except Exception:
                pass
        self._send_json(results)

    def _handle_post_interview(self):
        storage_path = get_storage_path()
        if not storage_path:
            self._send_json({"error": "Storage path not configured"}, 400)
            return
        data = self._read_json_body()
        if not data or "id" not in data:
            self._send_json({"error": "Missing interview data or id"}, 400)
            return
        interviews_dir = os.path.join(storage_path, "interviews")
        os.makedirs(interviews_dir, exist_ok=True)
        filepath = os.path.join(interviews_dir, f"{data['id']}.json")
        with open(filepath, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        self._send_json({"success": True})

    def _handle_delete_interview(self):
        parsed = urlparse(self.path)
        params = parse_qs(parsed.query)
        interview_id = params.get("id", [""])[0]
        if not interview_id:
            self._send_json({"error": "Missing id param"}, 400)
            return
        storage_path = get_storage_path()
        if not storage_path:
            self._send_json({"error": "Storage path not configured"}, 400)
            return
        filepath = os.path.join(storage_path, "interviews", f"{interview_id}.json")
        audio_pattern = os.path.join(storage_path, "audio", f"{interview_id}.*")
        if os.path.exists(filepath):
            os.remove(filepath)
        for audio_file in glob.glob(audio_pattern):
            os.remove(audio_file)
        self._send_json({"success": True})

    # --- Audio ---
    def _handle_post_audio(self):
        storage_path = get_storage_path()
        if not storage_path:
            self._send_json({"error": "Storage path not configured"}, 400)
            return
        content_type = self.headers.get("Content-Type", "")
        audio_id = self.headers.get("X-Audio-ID", "")
        audio_ext = self.headers.get("X-Audio-Ext", "bin")
        if not audio_id:
            self._send_json({"error": "Missing X-Audio-ID header"}, 400)
            return
        content_length = int(self.headers.get("Content-Length", 0))
        body = self.rfile.read(content_length)
        audio_dir = os.path.join(storage_path, "audio")
        os.makedirs(audio_dir, exist_ok=True)
        filepath = os.path.join(audio_dir, f"{audio_id}.{audio_ext}")
        with open(filepath, "wb") as f:
            f.write(body)
        self._send_json({"success": True})

    # --- Import/Clear ---
    def _handle_import(self):
        storage_path = get_storage_path()
        if not storage_path:
            self._send_json({"error": "Storage path not configured"}, 400)
            return
        data = self._read_json_body()
        if not data or not isinstance(data, list):
            self._send_json({"error": "Expected JSON array"}, 400)
            return
        interviews_dir = os.path.join(storage_path, "interviews")
        os.makedirs(interviews_dir, exist_ok=True)
        for item in data:
            if "id" in item:
                filepath = os.path.join(interviews_dir, f"{item['id']}.json")
                with open(filepath, "w", encoding="utf-8") as f:
                    json.dump(item, f, ensure_ascii=False, indent=2)
        self._send_json({"success": True, "count": len(data)})

    def _handle_clear(self):
        storage_path = get_storage_path()
        if not storage_path:
            self._send_json({"error": "Storage path not configured"}, 400)
            return
        interviews_dir = os.path.join(storage_path, "interviews")
        audio_dir = os.path.join(storage_path, "audio")
        for filepath in glob.glob(os.path.join(interviews_dir, "*.json")):
            os.remove(filepath)
        for filepath in glob.glob(os.path.join(audio_dir, "*")):
            os.remove(filepath)
        self._send_json({"success": True})

    # --- Proxy ---
    def _handle_get_proxy(self):
        parsed = urlparse(self.path)
        params = parse_qs(parsed.query)
        target_url = params.get("url", [""])[0]
        if not target_url:
            self._send_json({"error": "Missing url param"}, 400)
            return
        try:
            resp = requests.get(target_url, timeout=300, verify=False)
            self.send_response(resp.status_code)
            self._set_cors_headers()
            self.send_header("Content-Type", resp.headers.get("Content-Type", "application/json"))
            self.end_headers()
            self.wfile.write(resp.content)
        except requests.exceptions.RequestException as e:
            self.send_response(502)
            self._set_cors_headers()
            self.end_headers()
            self.wfile.write(json.dumps({"error": str(e)}).encode())

    def _handle_proxy(self):
        content_length = int(self.headers.get("Content-Length", 0))
        body = self.rfile.read(content_length)
        target_url = self.headers.get("X-Target-URL", "")
        content_type = self.headers.get("Content-Type", "application/json")
        auth_header = self.headers.get("Authorization", "")
        if not target_url:
            self._send_json({"error": "Missing X-Target-URL header"}, 400)
            return
        headers = {"Content-Type": content_type}
        if auth_header:
            headers["Authorization"] = auth_header
            # MiMo API uses "api-key" header instead of Authorization
            key = auth_header.replace("Bearer ", "").strip()
            headers["api-key"] = key
        try:
            resp = requests.post(target_url, data=body, headers=headers, timeout=300, verify=False)
            self.send_response(resp.status_code)
            self._set_cors_headers()
            self.send_header("Content-Type", resp.headers.get("Content-Type", "application/json"))
            self.end_headers()
            self.wfile.write(resp.content)
        except requests.exceptions.RequestException as e:
            self.send_response(502)
            self._set_cors_headers()
            self.end_headers()
            self.wfile.write(json.dumps({"error": str(e)}).encode())

    # --- Helpers ---
    def _read_json_body(self):
        try:
            content_length = int(self.headers.get("Content-Length", 0))
            body = self.rfile.read(content_length)
            return json.loads(body.decode("utf-8"))
        except Exception:
            return None

    def _send_json(self, data, status=200):
        self.send_response(status)
        self._set_cors_headers()
        self.send_header("Content-Type", "application/json")
        self.end_headers()
        self.wfile.write(json.dumps(data, ensure_ascii=False).encode("utf-8"))

    def _set_cors_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Target-URL, X-Audio-ID, X-Audio-Ext")

    def log_message(self, format, *args):
        print(f"[{self.log_date_time_string()}] {format % args}")


if __name__ == "__main__":
    with http.server.HTTPServer(("", PORT), ProxyHandler) as httpd:
        print(f"Server running at http://localhost:{PORT}")
        print("Press Ctrl+C to stop")
        httpd.serve_forever()
