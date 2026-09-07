import fetch from "node-fetch";
const userRequests = {};
export default {
    name: ["xdl", "twitterdl", "xdld", "xdown"],
    help: ["xdl <url>"],
    desc: "Descarga videos de X (Twitter).",
    tags: ["downloader"],
    register: true,
    limitPrem: true,
    limit: 1,
    run: async ({ conn, m, args, prefijo, cmd }) => {
        if (!args[0])
            return m.reply(`${m.e.warn} *Debes ingresar el link del tweet.*\n\n📌 Ejemplo:\n${prefijo + cmd} https://x.com/godmitzu/status/1818617471579934928`);
        if (userRequests[m.sender])
            return conn.reply(m.chat, `⏳ Hey @${m.sender.split("@")[0]}, ya hay una descarga en proceso. Espera a que termine antes de iniciar otra.`, userRequests[m.sender].message || m);
        const { key } = await conn.sendMessage(m.chat, { text: `⌛ *Preparando descarga...*\n▰▱▱▱▱▱▱▱▱` }, { quoted: m });
        userRequests[m.sender] = { active: true, message: { key, chat: m.chat, fromMe: true } };
        const delay = (t) => new Promise(res => setTimeout(res, t));
        await delay(900);
        await conn.sendMessage(m.chat, { text: `⌛ *Obteniendo datos del tweet...*\n▰▰▰▱▱▱▱▱▱`, edit: key });
        await delay(900);
        await conn.sendMessage(m.chat, { text: `⌛ *Procesando video...*\n▰▰▰▰▰▰▱▱▱`, edit: key });
        await m.react("⌛");
        try {
            const res = await fetch(`https://api.delirius.store/download/twitterv2?url=${encodeURIComponent(args[0])}`);
            const data = await res.json();
            if (!data?.status || !data.data)
                throw new Error("No se encontró información del tweet.");
            const info = data.data;
            const media = info.media?.[0];
            if (!media || media.type !== "video" || !media.videos?.length)
                throw new Error("Este tweet no contiene videos descargables.");
            const best = media.videos.sort((a, b) => b.bitrate - a.bitrate)[0];
            const caption = `🐦 *Descargador de X (Twitter)*

🧍‍♂️ *Usuario:* @${info.author?.username}
${info.author?.verified ? "✅ Verificado" : ""}
📅 *Fecha:* ${info.createdAt}
👁️‍🗨️ *Vistas:* ${info.view || "Desconocido"}
❤️ *Likes:* ${info.favorite || "0"}

💬 *Descripción:*
${info.description || "Sin descripción"}

🎞️ *Calidad:* ${best.quality}
🔗 *Enlace original:* ${args[0]}
`.trim();
            //await conn.sendFile(m.chat, media.cover || info.author?.profile_banner || "", "xcover.jpg", caption, m)
            await conn.sendMessage(m.chat, { video: { url: best.url }, caption: caption }, { quoted: m });
            await conn.sendMessage(m.chat, { text: `✅ *Descarga finalizada con éxito.*\n▰▰▰▰▰▰▰▰▰`, edit: key });
            await m.react("✅");
            m.success = true;
        }
        catch (err) {
            console.error("❌ Error en Twitter Downloader:", err);
            await m.react("❌");
            await conn.sendMessage(m.chat, { text: `${m.e.error + m.msg.error}\n\n >>> ${err} <<<< ` }, { edit: key });
        }
        finally {
            delete userRequests[m.sender];
        }
    }
};
