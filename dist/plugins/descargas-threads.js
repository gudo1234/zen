import fetch from "node-fetch";
const userRequests = {};
export default {
    name: ["threads", "thread", "threaddl"],
    help: ["threads <texto|link>"],
    desc: "Descarga videos de Threads.",
    tags: ["downloader"],
    register: true,
    limitPrem: true,
    limit: 1,
    run: async ({ conn, m, args, text, prefijo, cmd }) => {
        if (!text)
            return m.reply(`${m.e.warn} *Ingresa un link de Threads.*\n\n📌 Ejemplo:\n${prefijo + cmd} https://www.threads.net/@momojypx/post/C52-OaTL3al`);
        if (userRequests[m.sender])
            return conn.reply(m.chat, `⏳ Hey @${m.sender.split("@")[0]}, ya hay una solicitud en proceso. Espera a que termine antes de hacer otra.`, userRequests[m.sender].message || m);
        const { key } = await conn.sendMessage(m.chat, { text: `⌛ *Conectando al servidor Threads...*\n▰▰▱▱▱▱▱▱▱` }, { quoted: m });
        userRequests[m.sender] = { active: true, message: { key, chat: m.chat, fromMe: true } };
        const delay = (t) => new Promise(res => setTimeout(res, t));
        await delay(600);
        await conn.sendMessage(m.chat, { text: `⌛ *Procesando solicitud...*\n▰▰▰▰▱▱▱▱▱`, edit: key });
        await delay(600);
        await m.react("⌛");
        try {
            if (text.includes("threads.net/")) {
                const res = await fetch(`https://api.delirius.store/download/threads?url=${encodeURIComponent(text)}`);
                const data = await res.json();
                if (!data?.status || !data.data?.length)
                    throw new Error("No se encontró contenido en el enlace proporcionado.");
                const medias = data.data.map((item) => ({
                    type: item.type === "video" ? "video" : "image",
                    data: { url: item.url }
                }));
                const caption = `✅ *Post descargado de Threads*\n🔗 ${text}`;
                if (medias.length > 1) {
                    await conn.sendAlbumMessage(m.chat, medias, caption, m);
                }
                else {
                    const single = medias[0];
                    if (single.type === "video") {
                        await conn.sendMessage(m.chat, { video: { url: single.data.url }, caption }, { quoted: m });
                    }
                    else {
                        await conn.sendMessage(m.chat, { image: { url: single.data.url }, caption }, { quoted: m });
                    }
                }
                await m.react("✅");
                return;
            }
            const searchRes = await fetch(`https://api.delirius.store/search/threads?query=${encodeURIComponent(text)}`);
            const searchData = await searchRes.json();
            if (!searchData?.status || !searchData.data?.length)
                throw new Error(`No se encontraron resultados para "${text}".`);
            const results = searchData.data.slice(0, 8);
            const medias = results.map((post) => ({
                type: post.type === "video" ? "video" : "image",
                data: { url: post.media }
            }));
            const caption = `📸 *Resultados de Threads para:* "${text}"\n📥 Se encontraron ${results.length} publicaciones.`;
            await conn.sendAlbumMessage(m.chat, medias, caption, m);
            await conn.sendMessage(m.chat, { text: `✅ *Búsqueda completada correctamente*`, edit: key });
            await m.react("✅");
            m.success = true;
        }
        catch (err) {
            console.error("❌ Error en Threads:", err);
            await m.react("❌");
            await conn.sendMessage(m.chat, { text: `${m.e.error + m.msg.error}\n\n >>> ${err} <<<< `, edit: key });
        }
        finally {
            delete userRequests[m.sender];
        }
    }
};
