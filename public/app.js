// public/app.js
document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("goForm");
  const input = document.getElementById("urlInput");
  const viewer = document.getElementById("viewer");

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    let val = input.value.trim();
    if (!val) return;
    // if protocol missing, add https
    if (!/^https?:\/\//i.test(val)) val = "https://" + val;
    const proxyUrl = `/proxy?url=${encodeURIComponent(val)}`;
    viewer.src = proxyUrl;
  });

  // convenience: enter example
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") form.dispatchEvent(new Event("submit"));
  });
});
