const globals = require("globals");
const pluginJs = require("@eslint/js");
const pluginReact = require("eslint-plugin-react");

module.exports = [
    { files: ["**/*.{js,mjs,cjs,jsx}"] },
    { languageOptions: { globals: { ...globals.browser, iina: "readonly", require: "readonly", process: "readonly" } } },
    pluginJs.configs.recommended,
    pluginReact.configs.flat.recommended,
    {
        rules: {
            "react/prop-types": "off",
            "no-undef": "error"
        }
    }
];
