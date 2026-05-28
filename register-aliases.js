// Runtime module alias resolver for compiled CommonJS worker output.
// Maps the TypeScript path alias "@/*" → "./dist/*" at runtime.
// Used via: node -r ./register-aliases.js dist/server/queue/workers/entry.js

const Module = require("module");
const path = require("path");

const originalResolve = Module._resolveFilename;

Module._resolveFilename = function (request, parent, ...rest) {
  if (request.startsWith("@/")) {
    const relative = request.slice(2); // strip "@/"
    const resolved = path.resolve(__dirname, "dist", relative);
    return originalResolve.call(this, resolved, parent, ...rest);
  }
  return originalResolve.call(this, request, parent, ...rest);
};
