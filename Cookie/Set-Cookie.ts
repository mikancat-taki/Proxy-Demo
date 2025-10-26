upstream.headers.raw()['set-cookie']?.forEach((cookieStr: string) => {
  // parse cookieStr (domain=...). then adjust domain=yourproxy.example.com, path=/ etc.
  const parts = cookieStr.split(";");
  const newParts = parts.map(p => {
    if (p.trim().toLowerCase().startsWith("domain=")) {
      return `Domain=${req.headers.host}`;
    }
    if (p.trim().toLowerCase().startsWith("path=")) {
      return `Path=/`;
    }
    return p;
  });
  res.append("Set-Cookie", newParts.join(";"));
});
