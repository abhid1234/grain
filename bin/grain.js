#!/usr/bin/env node
import { main } from '../src/cli/grain.js';
main(process.argv.slice(2)).then((code) => process.exit(code));
