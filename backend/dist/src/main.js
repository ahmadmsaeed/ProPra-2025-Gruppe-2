"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const bootstrap_1 = require("./bootstrap");
(0, bootstrap_1.bootstrap)().catch((err) => {
    console.error('Failed to bootstrap application:', err);
    process.exit(1);
});
//# sourceMappingURL=main.js.map