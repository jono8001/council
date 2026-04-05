import { db } from "../src/lib/db";
import { buildCompositeWatch } from "../src/lib/ingest/buildCompositeWatch";

async function main() {
  await buildCompositeWatch();
  console.log("Composite watch snapshots built.");
}

main()
  .catch((error) => {
    console.error("Composite watch build failed", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
