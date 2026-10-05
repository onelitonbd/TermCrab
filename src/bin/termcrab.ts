#!/usr/bin/env node
// TermCrab entrypoint - runs directly under Node >= 20.10 (no bundler needed).
// The bionic guard MUST load first: it neutralizes Android-specific crashes
// (os.networkInterfaces / Error 13) before anything else touches the network stack.
import '../mobile/bionic.js';
import { main } from '../cli.js';
import { friendlyError } from '../core/friendly.js';
import { ANSI, paint } from '../core/color.js';

main(process.argv.slice(2)).catch((err) => {
  const f = friendlyError(err);
  console.error(paint(ANSI.red, `[termcrab] ${f.headline}`, { stream: process.stderr }));
  console.error(`  \u2192 ${f.fix}`);
  if (process.env.TCRAB_DEBUG && err instanceof Error && err.stack) {
    console.error(err.stack);
  } else if (err instanceof Error && err.stack) {
    console.error(`  (details hidden - set TCRAB_DEBUG=1 to see them)`);
  }
  process.exitCode = 1;
});
