import { spawn } from "node:child_process";

const child = spawn(
  process.execPath,
  ["node_modules/next/dist/bin/next", "dev", "--hostname", "localhost", "--port", "3031"],
  {
    stdio: "inherit",
    env: {
      ...process.env,
      NODE_ENV: "development",
      REDMINE_BASE_URL: "http://127.0.0.1:3030",
      IRON_SESSION_PASSWORD: "local-redmine-app-test-only-secret-at-least-32-characters",
      NEXT_TEST_DIST_DIR: ".next-redmine-test",
    },
  },
);
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => child.kill(signal));
child.on("error", (error) => {
  console.error(error.message);
  process.exitCode = 1;
});
child.on("exit", (code, signal) => {
  process.exitCode = code ?? (signal ? 1 : 0);
});
