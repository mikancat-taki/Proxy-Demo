// public/app.js
document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("goForm");
  const input = document.getElementById("urlInput");
  const viewer = document.getElementById("viewer");

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    let val = input.value.trim();
    if (!val) return;
    if (!/^https?:\/\//i.test(val) && !/^http:\/\//i.test(val)) val = "https://" + val;
    viewer.src = `/proxy?url=${encodeURIComponent(val)}`;
  });
});
