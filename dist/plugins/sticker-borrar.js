import { db } from "../lib/db.js";
import { getPack } from "../lib/stickerPack.js";
export default {
    name: ["eliminarpack", "deletepack"],
    help: ["eliminarpack <nombre>"],
    desc: "Elimina un pack completo",
    register: true,
    run: async ({ m, text }) => {
        const packName = text.trim();
        if (!packName) {
            return m.reply("❌ Usa: .eliminarpack nombre");
        }
        const pack = await getPack(m.sender, packName);
        if (!pack)
            return m.reply("❌ Pack no existe");
        await db.query(`DELETE FROM sticker_packs
       WHERE id = $1 AND owner_id = $2`, [pack.id, m.sender]);
        m.reply(`🗑️ Pack *${packName}* eliminado completamente`);
    }
};
