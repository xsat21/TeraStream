// Offline only. No network imports, tokens, endpoint overrides or media output.
import { probeReadiness } from "../src/lib/probe/readiness.ts";

const report = probeReadiness(process.env);
process.stdout.write(JSON.stringify(report, null, 2) + "\n");
// Exit 2 is an expected blocked prerequisite result, never a successful probe.
process.exitCode = 2;
