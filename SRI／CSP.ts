// Remove or override CSP header to allow proxy usage
res.removeHeader("Content-Security-Policy");
res.setHeader("Content-Security-Policy", "default-src * 'unsafe-inline' 'unsafe-eval' data: blob:;");

// In HTML rewrite: remove integrity attributes
document.querySelectorAll("script[integrity], link[integrity]").forEach(el => {
  el.removeAttribute("integrity");
  el.removeAttribute("crossorigin");
});
