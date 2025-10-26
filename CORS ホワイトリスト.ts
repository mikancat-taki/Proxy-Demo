import cors from "cors";
const allowed = (process.env.ALLOWED_ORIGINS || "").split(",");
app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true);
    if (allowed.includes(origin)) return cb(null, true);
    cb(new Error("Not allowed by CORS"));
  },
  credentials: true
}));
