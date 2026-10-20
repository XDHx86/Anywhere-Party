#!/usr/bin/env node
const { spawn } = require("node:child_process");

const args = process.argv.slice(2);
if (!args.length) process.exit(1);

const [cmd, ...cArgs] = args;
const start = process.hrtime.bigint();

// Check if we are running in a real terminal or outputting to a file
const isTerminal = process.stdout.isTTY;

const child = spawn(cmd, cArgs, {
  stdio: ["inherit", "pipe", "pipe"],
  shell: process.platform === "win32",
  env: { 
    ...process.env, 
    // Dynamically enable/disable colors based on where the output goes
    FORCE_COLOR: isTerminal ? "1" : "0",
    NO_COLOR: isTerminal ? undefined : "1"
  }
});

let out = "";

child.stdout.on("data", (d) => { 
  const str = d.toString();
  out += str; 
  process.stdout.write(isTerminal ? str : stripAnsi(str)); 
});

child.stderr.on("data", (d) => { 
  const str = d.toString();
  out += str; 
  process.stderr.write(isTerminal ? str : stripAnsi(str)); 
});

child.on("close", (code) => {
  const sec = (Number(process.hrtime.bigint() - start) / 1e9).toFixed(2);
  console.log(`\n========================================\nSummary\n========================================\nTool      : ${cmd}\nExit Code : ${code ?? 1}\nDuration  : ${sec}s\n`);
  
  const res = parseOutput(cmd, out);
  if (res) console.log(res + "\n");
  
  console.log("========================================");
  process.exit(code ?? 1);
});

// Removes ANSI color/formatting codes to make regex matching predictable
function stripAnsi(str) {
  return str.replace(/[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g, '');
}

function parseOutput(tool, txt) {
  const cleanTxt = stripAnsi(txt); // Clean text before routing
  
  if (/npm/.test(tool) || /webpack/.test(tool)) return pNpm(cleanTxt);
  if (/tsc/.test(tool)) return pTsc(cleanTxt);
  if (/eslint/.test(tool)) return pEs(cleanTxt);
  if (/vitest/.test(tool)) return pVi(cleanTxt);
  if (/stryker/.test(tool)) return pStr(cleanTxt);
  return "";
}

function pNpm(t) {
  const warnings = (t.match(/WARNING in/g) || []).length;
  const errors = (t.match(/ERROR in/g) || []).length;

  if (!warnings && !errors) return "";

  const assets = new Set();
  const entrypoints = new Set();

  let state = 0; // 0: normal, 1: parsing assets, 2: parsing entrypoints
  for (const line of t.split("\n")) {
    const trimmed = line.trim();
    
    // Reset state on empty lines, new warnings, or new commands
    if (!trimmed || trimmed.startsWith("WARNING in") || trimmed.startsWith(">")) {
      state = 0;
      continue;
    }

    if (trimmed.startsWith("Assets:")) {
      state = 1;
      continue;
    } else if (trimmed.startsWith("Entrypoints:")) {
      state = 2;
      continue;
    }

    if (state === 1) {
      assets.add(trimmed);
    } else if (state === 2) {
      // Entrypoints usually have their size listed on the same line.
      // Nested chunks/files underneath do not, so we filter by size identifiers.
      if (/\((?:bytes|KiB|MiB|GiB)\)/.test(trimmed)) {
        entrypoints.add(trimmed);
      }
    }
  }

  let s = `Errors   : ${errors}\nWarnings : ${warnings}`;
  
  if (assets.size) {
    s += `\n\nOversized Assets:\n` + [...assets].map((a) => `  ${a}`).join("\n");
  }
  
  if (entrypoints.size) {
    s += `\n\nOversized Entrypoints:\n` + [...entrypoints].map((e) => `  ${e}`).join("\n");
  }
  
  return s;
}

function pTsc(t) {
  const c = {};
  let n = 0;
  for (const [, m] of t.matchAll(/error\s+(TS\d+)/g)) {
    c[m] = (c[m] || 0) + 1;
    n++;
  }
  if (!n) return "";
  return "Error Codes:\n" + Object.entries(c).sort((a, b) => b[1] - a[1]).map(([k, v]) => `  ${k}: ${v}`).join("\n") + `\n\nTotal Errors: ${n}`;
}

function pEs(t) {
  const c = {};
  for (const [, m] of t.matchAll(/\s+(?:error|warning)\s+.*?\s+([a-z0-9@/-]+)$/gm)) c[m] = (c[m] || 0) + 1;
  let e = 0, w = 0;
  const sm = t.match(/(\d+)\s+errors?.*?(\d+)\s+warnings?/i);
  if (sm) { e = sm[1]; w = sm[2]; }
  const rules = Object.keys(c).length ? "Rules:\n" + Object.entries(c).sort((a, b) => b[1] - a[1]).map(([k, v]) => `  ${k}: ${v}`).join("\n") + "\n\n" : "";
  return rules + `Errors: ${e}\nWarnings: ${w}`;
}

function pVi(t) {
  const testSummaryMatch = t.match(/Tests\s+(.+?)\n/i);
  if (!testSummaryMatch) return "";
  
  const summaryLine = testSummaryMatch[1];
  
  const gl = (re) => { const m = summaryLine.match(re); return m ? m[1] : 0; };
  
  const p = gl(/(\d+)\s+passed/i);
  const f = gl(/(\d+)\s+failed/i);
  const s = gl(/(\d+)\s+skipped/i);
  const to = gl(/(\d+)\s+todo/i);
  
  if (!p && !f && !s && !to) return "";
  
  return `Passed  : ${p}\nFailed  : ${f}\nSkipped : ${s}\nTodo    : ${to}`;
}

function pStr(t) {
  const g = (k) => { const m = t.match(new RegExp(`${k}\\s*:\\s*(\\d+(?:\\.\\d+)?%?)`, "i")); return m ? `${k.padEnd(12)}: ${m[1]}\n` : ""; };
  let s = g("Killed") + g("Survived") + g("Timeout") + g("NoCoverage") + g("CompileError") + g("RuntimeError") + g("Ignored") + g("Pending");
  const ms = t.match(/Mutation score\s*:\s*([\d.]+)/i);
  if (ms) s += `\nMutation Score: ${ms[1]}`;
  return s.trim();
}