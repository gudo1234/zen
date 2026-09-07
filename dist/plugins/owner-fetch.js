import fetch from "node-fetch";
import { format } from "util";
export default {
    name: ["get", "fetch"],
    help: ["get <url>"],
    desc: "Obtiene contenido o archivos desde una URL.",
    tags: ["owner", "dev"],
    // owner: true,
    run: async ({ conn, m, text }) => {
        if (!text || !/^https?:\/\//.test(text))
            return m.reply(`✳️ Ejemplo:\n/get https://skyultraplus.com`);
        await m.react("💻");
        try {
            const res = await fetch(text);
            const contentType = res.headers.get("content-type") || "";
            const contentLength = parseInt(res.headers.get("content-length") || "0");
            if (contentLength > 100 * 1024 * 1024)
                return m.reply(`⚠️ Archivo demasiado grande (${(contentLength / (1024 * 1024)).toFixed(1)} MB)`);
            if (!/text|json/.test(contentType))
                return await conn.sendFile(m.chat, text, "file", text, m);
            let txt = await res.text();
            try {
                txt = format(JSON.parse(txt));
            }
            catch {
                // no-op
            }
            await m.reply(txt.slice(0, 65536));
        }
        catch (err) {
            console.error("❌ Error en /get:", err);
            await m.reply("⚠️ Error al obtener la URL:\n```\n" + (err.message || String(err)) + "\n```");
            await m.react("❌");
        }
    },
};
