const { execSync } = require("child_process");
execSync("npx -y tsx scripts/test-streak-grace.ts", { stdio: "inherit" });
