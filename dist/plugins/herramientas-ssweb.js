import fetch from "node-fetch";
export default {
    name: ["ss", "ssweb"],
    help: ["ssweb <url>"],
    desc: "Toma una captura de pantalla de una página web",
    tags: ["tools"],
    register: true,
    run: async ({ conn, m, args, prefijo, cmd }) => {
        const targetUrl = String(args?.[0] || "").trim();
        if (!targetUrl) {
            return m.reply(`${m.e?.warn || "⚠️"} *Ingresa un link para sacar captura,*\n` +
                `Ejemplo: ${prefijo + cmd} https://skyultraplus.com`);
        }
        if (!/^https?:\/\//i.test(targetUrl)) {
            return m.reply("❌ URL inválida. Debe empezar con http:// o https://");
        }
        await m.react?.("⌛");
        try {
            const apiKey = process.env.API_KEY || "";
            if (!apiKey) {
                throw new Error("Falta process.env.API_KEY");
            }
            const res = await fetch(`https://api.mitzuki.xyz/tools/ssweb?url=${encodeURIComponent(targetUrl)}` +
                `&full=1&mobile=0&apikey=${encodeURIComponent(apiKey)}`);
            const json = await res.json().catch(() => null);
            if (!res.ok || !json?.status || !json?.data?.url) {
                throw new Error(json?.error || json?.message || "No se pudo obtener la captura.");
            }
            const imgRes = await fetch(json.data.url);
            if (!imgRes.ok) {
                throw new Error("No se pudo descargar la imagen generada.");
            }
            const buffer = Buffer.from(await imgRes.arrayBuffer());
            await conn.sendMessage(m.chat, {
                image: buffer,
                caption: "✅ *Aquí tienes tu captura*"
            }, {
                quoted: m
            });
            await m.react?.("✅");
        }
        catch (err1) {
            console.warn("⚠️ Mitzuki ssweb falló, usando Dorratz:", err1?.message || err1);
            try {
                const res = await fetch(`https://api.dorratz.com/ssweb?url=${encodeURIComponent(targetUrl)}`);
                if (!res.ok) {
                    throw new Error(`No se pudo obtener la captura. HTTP ${res.status}`);
                }
                const buffer = Buffer.from(await res.arrayBuffer());
                await conn.sendMessage(m.chat, {
                    image: buffer,
                    caption: "✅ *Aquí tienes tu captura*"
                }, {
                    quoted: m
                });
                await m.react?.("✅");
            }
            catch (e) {
                console.error("❌ Error en ssweb:", e);
                await m.react?.("❌");
                await m.reply(`${m.e?.error || "❌"} ${m.msg?.error || "Error"}\n\n` +
                    `>>> ${e?.message || e} <<<`);
            }
        }
    }
};
