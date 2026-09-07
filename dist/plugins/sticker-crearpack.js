import { createPack } from "../lib/stickerPack.js";
export default {
    name: ["crearpack"],
    tags: ["sticker"],
    help: ["crearpack <name>"],
    desc: "Crear un paquete de stickers",
    register: true,
    run: async ({ m, prefijo, text }) => {
        if (!text)
            return m.reply(`❌ Usa: ${prefijo}crearpack nombre`);
        try {
            const ownerName = m.pushName || m.sender.split("@")[0];
            await createPack(m.sender, text, ownerName);
            m.reply(`✅ Pack *${text}* creado\n` +
                `👤 Dueño: *${ownerName}*\n\n` +
                `ℹ️ El pack es público.\n` +
                `🔒 Para hacerlo privado usa: ${prefijo}setpack off`);
        }
        catch (e) {
            m.reply("❌ Ya tienes un pack con ese nombre");
        }
    }
};
