import { runIngestion } from "../src/lib/ingest/runIngestion";

runIngestion()
  .then((run) => {
    console.log("Ingestion complete:", run);
  })
  .catch((err) => {
    console.error("Ingestion failed:", err);
    process.exit(1);
  });
