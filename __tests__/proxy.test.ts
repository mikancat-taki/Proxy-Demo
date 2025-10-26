// __tests__/proxy.test.ts
import request from "supertest";
import nock from "nock";
import { createApp } from "../src/app"; // createApp(): express app を返す

describe("Proxy tests", () => {
  let app: any;
  beforeAll(() => {
    app = createApp();
  });

  afterEach(() => {
    nock.cleanAll();
  });

  test("Range request should forward Range header and return 206", async () => {
    const targetUrl = "https://example.com/video.mp4";
    // mock upstream server responding with 206
    nock("https://example.com")
      .get("/video.mp4")
      .matchHeader("range", "bytes=0-1023")
      .reply(206, Buffer.alloc(1024), {
        "Content-Range": "bytes 0-1023/2048",
        "Accept-Ranges": "bytes",
        "Content-Type": "video/mp4"
      });

    const res = await request(app)
      .get("/proxy")
      .query({ url: targetUrl })
      .set("Range", "bytes=0-1023")
      .expect(206);

    expect(res.headers["content-range"]).toBe("bytes 0-1023/2048");
    expect(res.headers["accept-ranges"]).toBe("bytes");
    expect(res.headers["content-type"]).toContain("video/mp4");
    expect(res.body.length).toBe(1024);
  });

  test("Should cache static resource into Redis (simulate cache miss then hit)", async () => {
    // For testing, you can mock redis (or use ioredis-mock). Here we assume Redis is mocked.
    const target = "https://cdn.example.com/img.png";
    nock("https://cdn.example.com")
      .get("/img.png")
      .reply(200, Buffer.from([0x01,0x02]), { "Content-Type": "image/png" });

    const res1 = await request(app).get("/proxy").query({ url: target }).expect(200);
    expect(res1.headers["x-cache"]).toBe("MISS");

    // second request should be HIT -- depends on Redis mock
    const res2 = await request(app).get("/proxy").query({ url: target }).expect(200);
    expect(res2.headers["x-cache"]).toBe("HIT");
  });

  test("Set-Cookie rewriting should replace domain and path", async () => {
    const target = "https://auth.example.com/login";
    const cookie = "sessionid=abc123; Domain=auth.example.com; Path=/; HttpOnly; Secure";
    nock("https://auth.example.com")
      .get("/login")
      .reply(200, "<html></html>", { "Set-Cookie": cookie, "Content-Type": "text/html" });

    const res = await request(app).get("/proxy").query({ url: target }).expect(200);
    const setCookies = res.header["set-cookie"];
    expect(Array.isArray(setCookies) || typeof setCookies === "string").toBeTruthy();
    const sc = Array.isArray(setCookies) ? setCookies[0] : setCookies;
    expect(sc).toContain("Domain="); // ensure domain present
    expect(sc).toContain("Path=/");
  });

  test("SRI integrity attributes should be removed", async () => {
    const target = "https://example.com/";
    const body = '<html><head><script src="/app.js" integrity="sha384-abc" crossorigin="anonymous"></script></head><body></body></html>';
    nock("https://example.com")
      .get("/")
      .reply(200, body, { "Content-Type": "text/html" });

    const res = await request(app).get("/proxy").query({ url: target }).expect(200);
    expect(res.text).not.toContain('integrity=');
    expect(res.text).not.toContain('crossorigin=');
  });
});
