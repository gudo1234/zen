import { db } from "../lib/db.js";
import { getPack } from "../lib/stickerPack.js";
export default {
    name: ["editpack", "renombrarpack"],
    help: ["editpack <nombre_actual> | <nombre_nuevo>"],
    desc: "Cambia el nombre de un pack",
    register: true,
    run: async ({ m, text, prefijo }) => {
        if (!text.includes("|")) {
            return m.reply(`❌ Usa: ${prefijo}editpack nombre_actual | nombre_nuevo`);
        }
        const [oldName, newName] = text
            .split("|")
            .map(t => t.trim())
            .filter(Boolean);
        if (!oldName || !newName) {
            return m.reply("❌ Nombres inválidos");
        }
        const pack = await getPack(m.sender, oldName);
        if (!pack)
            return m.reply("❌ Pack no existe");
        try {
            await db.query(`UPDATE sticker_packs
         SET name = $3
         WHERE owner_id = $1 AND name = $2`, [m.sender, oldName, newName]);
            m.reply(`✏️ Pack renombrado:\n*${oldName}* → *${newName}*`);
        }
        catch (e) {
            m.reply("❌ Ya tienes un pack con ese nombre");
        }
    }
};
