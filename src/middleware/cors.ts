import { CorsOptions } from "cors";

export const corsOptions: CorsOptions = {
  origin: ["https://your-allowed-origin.com"],
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"]
};
