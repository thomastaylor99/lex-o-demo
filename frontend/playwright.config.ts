import { defineConfig } from "@playwright/test";

/**
 * Browser-side tests, run on the system Chrome (no browser download).
 *
 *   npm test             unit: Node only, no browser and no server (tests/unit)
 *   npm run test:e2e     e2e: Chrome against the production build (tests/e2e), after `npm run build`
 *
 * The e2e server is `next start` on its own port (E2E_PORT, default 3210); a server already
 * answering there is reused. The live audio test runs only with LIVE=1 and the backend on :8000,
 * whose CORS origins must include that port.
 */

const port = Number(process.env.E2E_PORT ?? 3210);

/** `--project=unit` needs neither a browser nor a server, so it starts no server and runs in seconds. */
const unitOnly = process.argv.some(
  (arg, index, argv) => arg === "--project=unit" || (arg === "--project" && argv[index + 1] === "unit"),
);

export default defineConfig({
  projects: [
    { name: "unit", testDir: "tests/unit" },
    {
      name: "e2e",
      testDir: "tests/e2e",
      timeout: 120_000,
      use: {
        baseURL: `http://localhost:${port}`,
        channel: "chrome",
        viewport: { width: 1920, height: 1080 },
        screenshot: "only-on-failure",
        trace: "retain-on-failure",
      },
    },
  ],
  webServer: unitOnly
    ? undefined
    : {
        command: `npx --no-install next start -p ${port}`,
        url: `http://localhost:${port}`,
        reuseExistingServer: true,
        timeout: 60_000,
      },
});
