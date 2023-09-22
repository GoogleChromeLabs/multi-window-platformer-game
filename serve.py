#!/usr/bin/env python3

"""
 Copyright 2023 Google LLC

 Licensed under the Apache License, Version 2.0 (the "License");
 you may not use this file except in compliance with the License.
 You may obtain a copy of the License at

      https://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing, software
 distributed under the License is distributed on an "AS IS" BASIS,
 WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 See the License for the specific language governing permissions and
 limitations under the License.
 """

import http.server
import socketserver
import threading
class HttpRequestHandler(http.server.SimpleHTTPRequestHandler):
  def end_headers(self):
    self.send_headers()
    http.server.SimpleHTTPRequestHandler.end_headers(self)
  def send_headers(self):
    self.send_header("Cross-Origin-Opener-Policy", "same-origin")
    self.send_header("Cross-Origin-Embedder-Policy", "require-corp")
    self.send_header("Cross-Origin-Resource-Policy", "same-origin")
    self.send_header("Content-Security-Policy", "frame-ancestors 'self'")
    self.send_header("Service-Worker-Allowed", "/")
    self.send_header("Cache-Control", "must-revalidate")
handler = HttpRequestHandler
HOST = ""
PORT = 8000
server = socketserver.ThreadingTCPServer((HOST, PORT), handler)
print("Hosting a server at " + HOST + ":" + str(PORT))
with server:
    server_thread = threading.Thread(target=server.serve_forever())
    server_thread.daemon = True
    server_thread.start()
def main():
  print('hello')
  pass
if __name__ == '__main__':
  main()
