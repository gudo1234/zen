import syntaxerror from "syntax-error";
import { format } from "util";
import { fileURLToPath } from "url";
import { dirname } from "path";
import { createRequire } from "module";
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const require = createRequire(__dirname);
export default {
    name: [">", "=>", "=", "e"],
    help: ["e <code>"],
    desc: "Evalúa código JavaScript.",
    tags: ["owner"],
    customPrefix: /^=?>\s?/,
    run: async ({ conn, m, args, text, cmd, isOwner }) => {
        if (!isOwner)
            return;
        const prefixMatch = (m.originalText || m.text)?.match(/^=?>\s?/);
        if (!prefixMatch)
            return;
        const noPrefix = (m.originalText || m.text).replace(prefixMatch[0], "").trim();
        const _text = prefixMatch[0].startsWith("=") ? "return " + noPrefix : noPrefix;
        const old = m.exp * 1;
        let _return;
        let _syntax = "";
        try {
            let i = 15;
            const f = { exports: {} };
            const AsyncFunction = Object.getPrototypeOf(async function () { }).constructor;
            const exec = new AsyncFunction("print", "m", "require", "conn", "Array", "process", "args", "module", "exports", "argument", _text);
            _return = await exec.call(conn, (...out) => {
                if (--i < 1)
                    return;
                console.log(...out);
                return conn.sendMessage(m.chat, { text: format(...out) }, { quoted: m });
                console.log(format(...out));
            }, m, require, conn, CustomArray, process, args, f, f.exports, [conn, args]);
        }
        catch (e) {
            const err = syntaxerror(_text, "Execution Function", {
                allowReturnOutsideFunction: true,
                allowAwaitOutsideFunction: true,
                sourceType: "module"
            });
            if (err)
                _syntax = "```" + err + "```\n\n";
            _return = e;
        }
        finally {
            await conn.sendMessage(m.chat, { text: _syntax + format(_return) }, { quoted: m });
            console.log(_syntax + format(_return));
            m.exp = old;
        }
    }
};
class CustomArray extends Array {
    constructor(...args) {
        if (typeof args[0] === "number") {
            super(Math.min(args[0], 10000));
        }
        else {
            super(...args);
        }
    }
}
