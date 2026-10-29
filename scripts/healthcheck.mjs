// Native Node HTTP; no curl/wget, external dependency or upstream request.
import http from "node:http";
const req = http.get("http://127.0.0.1:3000/api/health", (res) => {
  res.resume();
  res.on("end", () => process.exit(res.statusCode === 200 ? 0 : 1));
  res.on("error", () => process.exit(1));
});
req.setTimeout(3000, () => req.destroy(new Error("Health check timed out")));
req.on("error", () => process.exit(1));
