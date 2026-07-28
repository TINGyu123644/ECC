#!/usr/bin/env node
// Segment 1 verification: validate current .ai/loop/state.json against state.schema.json
// Run: node loop-orchestrator/scripts/validate-state-schema.js

const Ajv = require('ajv/dist/2020');
const addFormats = require('ajv-formats');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const SCHEMA = path.join(__dirname, '..', 'state.schema.json');
const STATE = path.join(ROOT, '.ai', 'loop', 'state.json');

const schema = JSON.parse(fs.readFileSync(SCHEMA, 'utf8'));
const data = JSON.parse(fs.readFileSync(STATE, 'utf8'));

const ajv = new Ajv({ allErrors: true, strict: false });
if (typeof addFormats === 'function') addFormats(ajv);
else if (addFormats && typeof addFormats.default === 'function') addFormats.default(ajv);

const valid = ajv.validate(schema, data);
if (valid) {
  console.log('PASS: .ai/loop/state.json conforms to state.schema.json');
  console.log(`phase=${data.phase} round=${data.round} decisions=${data.decisions.length} issues=${data.issues.length}`);
  process.exit(0);
}

console.error('FAIL: validation errors:');
for (const err of ajv.errors) {
  console.error(`  - ${err.instancePath || '<root>'}: ${err.message}`);
}
process.exit(1);
