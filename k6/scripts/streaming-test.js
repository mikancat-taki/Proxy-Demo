import http from "k6/http";
import { check, sleep } from "k6";
export let options = {
  vus: 20,
  duration: "1m",
};

export default function() {
  const url = "http://localhost:8080/proxy?url=" + encodeURIComponent("https://testfiles.example.com/large-video.mp4");
  // request a small Range chunk to emulate player's segment request
  const params = { headers: { Range: "bytes=0-1048575" } }; // first 1MB
  const res = http.get(url, params);
  check(res, { "status is 206 or 200": (r) => r.status === 206 || r.status === 200 });
  sleep(0.5);
}
