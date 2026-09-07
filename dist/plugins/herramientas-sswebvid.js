import fetch from "node-fetch";
export default {
    name: ["sswebvid"],
    help: ["sswebvid <url>"],
    desc: "Graba pantalla de una página web",
    tags: ["tools"],
    register: true,
    run: async ({ conn, m, args, prefijo, cmd }) => {
        const rawUrl = String(args?.[0] || "").trim();
        if (!rawUrl) {
            return m.reply(`${m.e?.warn || "⚠️"} *Ingresa un link para grabar pantalla*\n\n` +
                `Ejemplo:\n${prefijo + cmd} https://skyultraplus.com`);
        }
        let targetUrl = rawUrl;
        if (!/^https?:\/\//i.test(targetUrl)) {
            targetUrl = "https://" + targetUrl;
        }
        try {
            new URL(targetUrl);
        }
        catch {
            return m.reply("❌ URL inválida.");
        }
        await m.react?.("⌛");
        try {
            const apiKey = process.env.API_KEY || "";
            if (!apiKey) {
                throw new Error("Falta process.env.API_KEY");
            }
            const api = `https://api.mitzuki.xyz/tools/sswebvid?url=${encodeURIComponent(targetUrl)}` +
                `&mobile=0&scroll=1&duration=10` +
                `&apikey=${encodeURIComponent(apiKey)}`;
            const res = await fetch(api);
            const json = await res
                .json()
                .catch(() => null);
            if (!res.ok ||
                !json?.status ||
                !json?.data?.video_url) {
                throw new Error(json?.error ||
                    json?.message ||
                    "No se pudo obtener el video.");
            }
            const videoUrl = json.data.video_url;
            const videoRes = await fetch(videoUrl);
            if (!videoRes.ok) {
                throw new Error("No se pudo descargar el video generado.");
            }
            const buffer = Buffer.from(await videoRes.arrayBuffer());
            await conn.sendMessage(m.chat, {
                video: buffer,
                mimetype: "video/mp4",
                fileName: "sswebvid.mp4",
                caption: "> by: api.mitzuki.xyz"
            }, {
                quoted: m
            });
            await m.react?.("✅");
        }
        catch (e) {
            console.error("❌ Error en sswebvid:", e);
            await m.react?.("❌");
            await m.reply(`${m.e?.error || "❌"} Error al generar la grabación.\n\n` +
                `> ${e?.message || e}`);
        }
    }
};
