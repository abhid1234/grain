#!/usr/bin/env node
import { main } from '../src/cli/grain.js';
process.exit(main(process.argv.slice(2)));
