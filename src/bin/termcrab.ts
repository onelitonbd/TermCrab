#!/usr/bin/env node
// TermCrab entrypoint - runs directly under Node >= 20.10 (no bundler needed).
// The bionic guard MUST load first: it neutralizes Android-specific crashes
// (os.networkInterfaces / Error 13) before anything else touches the network stack.
import '../mobile/bionic.js';
import { main } from '../cli.js';

main(process.argv.slice(2)).catch((err) => {
  const msg = err instanceof Error ? (err.stack || err.message) : String(err);
  console.error(`\x1b[31m[termcrab] fatal:\x1b[0m ${msg}`);
  process.exitCode = 1;
});
