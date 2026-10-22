import { app } from "./app.js";
import { connectDB } from "./db.js";

const port = Number(process.env.PORT || 4000);

async function start() {
  await connectDB();
  app.listen(port, () => console.log(`RuralCare API listening on http://localhost:${port}`));
}

start().catch((err) => {
  console.error("Startup failed:", err instanceof Error ? err.message : "unknown error");
  process.exit(1);
});
