import "dotenv/config";
import express from "express";
import cors from "cors";
import compression from "compression";
import authRoutes from "./routes/auth.routes";
import taskRoutes from "./routes/task.routes";
import userRoutes from "./routes/user.routes";
import notificationRoutes from "./routes/notification.routes";
import hireRoutes from "./routes/hire.routes";
import compensationRangeRoutes from "./routes/compensationRange.routes";

const app = express();

app.use(compression());
app.use(cors({ origin: process.env.CORS_ORIGIN || "http://localhost:5173" }));
app.use(express.json());

app.get("/api/health", (_req, res) => res.json({ ok: true }));

app.use("/api/auth", authRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/users", userRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/hires", hireRoutes);
app.use("/api/compensation-ranges", compensationRangeRoutes);

// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});

const PORT = process.env.PORT ? Number(process.env.PORT) : 4000;
app.listen(PORT, () => {
  console.log(`TaskFlow API running on http://localhost:${PORT}`);
});
