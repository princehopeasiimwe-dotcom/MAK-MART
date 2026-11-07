import { createClient } from "@xata.io/client";

const XATA_API_KEY = import.meta.env.VITE_XATA_API_KEY;
const XATA_BRANCH = import.meta.env.VITE_XATA_BRANCH || "main";
const XATA_DATABASE_URL = import.meta.env.VITE_XATA_DATABASE_URL;

if (!XATA_API_KEY || !XATA_DATABASE_URL) {
  console.warn(
    "Xata environment variables are missing. Add VITE_XATA_API_KEY and VITE_XATA_DATABASE_URL to your .env file."
  );
}

// Create Xata client
// For browser usage, we use the API key directly
export const xata = createClient({
  apiKey: XATA_API_KEY,
  branch: XATA_BRANCH,
  databaseURL: XATA_DATABASE_URL,
});

// Helper to handle Xata errors consistently
export function handleXataError(error, context = "") {
  console.error(`Xata error${context ? ` (${context})` : ""}:`, error);
  throw error;
}

// Transaction helper for batch operations
export async function xataTransaction(operations) {
  const results = [];
  for (const op of operations) {
    try {
      const result = await op();
      results.push({ success: true, data: result });
    } catch (error) {
      results.push({ success: false, error });
      // Could implement rollback here if needed
    }
  }
  return results;
}

export default xata;