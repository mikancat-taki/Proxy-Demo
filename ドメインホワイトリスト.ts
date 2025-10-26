const allowedHosts = (process.env.ALLOWED_HOSTS || "example.com,cdn.example.com").split(",");
function isAllowedTarget(u: URL) {
  return allowedHosts.includes(u.hostname);
}
// in getTargetUrl() after parse: if (!isAllowedTarget(url)) return null;
