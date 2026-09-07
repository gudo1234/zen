import axios from "axios";
const userRequests = {};
export default {
    name: ["tiktoksearch", "ttsearch"],
    help: ["tiktoksearch <texto>"],
    desc: "Busca y descargas videos relacionados en TikTok.",
    tags: ["downloader"],
    register: true,
    limitPrem: true,
    limit: 2,
    run: async ({ conn, m, text, prefijo }) => {
        if (!text)
            return m.reply(`${m.e.warn} *Ingresa el nombre del video que buscas.*\n📌 Ejemplo: ${prefijo}tiktoksearch emilia_mernes`);
        if (userRequests[m.sender])
            return m.reply("⏳ *Espera...* Ya hay una búsqueda en proceso. Por favor espera a que termine.");
        userRequests[m.sender] = true;
        await m.react("⌛");
        try {
            const { data: response } = await axios.get(`https://api.mitzuki.xyz/search/tiktok?q=${encodeURIComponent(text)}&apikey=${process.env.API_KEY}`);
            if (!response || !response.data || !response.data.items || response.data.items.length === 0) {
                // Si falla Mitzuki, intentar con Delirius
                try {
                    const { data: response2 } = await axios.get(`https://api.evogb.org/search/tiktok?query=${encodeURIComponent(text)}&key=gata-2026-ofc`);
                    if (!response2 || !Array.isArray(response2.data) || response2.data.length === 0) {
                        return m.reply(`❌ No se encontraron resultados para *${text}*.`);
                    }
                    const searchResults = shuffleArray(response2.data).slice(0, 5);
                    const medias = searchResults.map((r) => ({ type: "video", data: { url: r.dl } }));
                    const caption = `✅ *Resultados para:* ${text}`;
                    await conn.sendAlbumMessage(m.chat, medias, caption, m);
                    await m.react("✅");
                    m.success = true;
                }
                catch (err2) {
                    console.warn("⚠️ Delirius falló:", err2?.message || err2);
                    return m.reply(`❌ No se encontraron resultados para *${text}*.`);
                }
            }
            else {
                const searchResults = response.data.items.slice(0, 5);
                const medias = searchResults.map((r) => ({
                    type: "video",
                    data: { url: r.url || r.hd }
                }));
                const caption = `✅ *Resultados para:* ${text}`;
                await conn.sendAlbumMessage(m.chat, medias, caption, m);
                await m.react("✅");
                m.success = true;
            }
        }
        catch (err1) {
            console.error("❌ Error en TikTokSearch:", err1);
            await m.react("❌");
            await m.reply(`${m.e.error + m.msg.error}\n\n${err1}`);
        }
        finally {
            delete userRequests[m.sender];
        }
    }
};
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}
