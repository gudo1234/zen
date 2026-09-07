import { getPackForSend, getPackStickers } from "../lib/stickerPack.js";
export default {
    name: ["enviarpack"],
    tags: ["sticker"],
    help: ["enviarpack <name>"],
    desc: "Enviar un paquete de stickers completo",
    register: true,
    run: async ({ conn, m, prefijo, text }) => {
        if (!text)
            return m.reply(`❌ Usa: ${prefijo}enviarpack nombre`);
        const pack = await getPackForSend(m.sender, text);
        if (!pack)
            return m.reply("❌ Pack no existe");
        const stickers = await getPackStickers(pack.id);
        if (!stickers.length)
            return m.reply("❌ Pack vacío");
        const publisher = "by: " + pack.owner_name || pack.owner_id.split("@")[0];
        console.log("sticker tipo:", typeof stickers[0]?.sticker, Buffer.isBuffer(stickers[0]?.sticker));
        await conn.sendMessage(m.chat, {
            cover: stickers[0].sticker, // Buffer directo
            stickers: stickers.map(s => ({
                data: s.sticker, // Buffer directo, no anidado
                emojis: s.emojis
            })),
            name: pack.name,
            publisher,
            description: pack.name
        }, { quoted: m });
    }
};
