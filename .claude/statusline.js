#!/usr/bin/env node
const os = require('os');

let data = '';
try {
    data = require('fs').readFileSync(0, 'utf-8');
    data = JSON.parse(data);
} catch {
    console.log("[?] | [?] | [?%]");
    process.exit(0);
}

let cwd = data?.workspace?.current_dir || '';
if (cwd) {
    const home = os.homedir();
    if (cwd.startsWith(home)) {
        cwd = "~" + cwd.slice(home.length);
    }
    cwd = cwd.replace(/\\/g, "/").replace(/c:/gi, "").replace(/^\/+/, "");
    if (cwd.length > 30) {
        const parts = cwd.split("/");
        if (parts.length > 3) {
            cwd = parts.slice(0, 2).join("/") + "/.../" + parts.slice(-1).join("/");
        }
    }
} else {
    cwd = "?";
}

let model = data?.model?.id || data?.model?.display_name || "?";

const used = data?.context_window?.used_percentage;
const pct = used !== undefined ? Math.floor(used) : "?";

console.log(`[${cwd}] | [${model}] | ${pct}% context`);
