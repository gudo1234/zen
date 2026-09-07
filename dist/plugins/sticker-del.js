import crypto from "crypto";
import { db } from "../lib/db.js";
import { getPack } from "../lib/stickerPack.js";
export default {
    name: ["delsticker"],
    tags: ["sticker"],
    help: ["delsticker <pack(opcional)>"],
    desc: "Elimina un sticker de un pack (respondiendo al sticker)",
    register: true,
    run: async ({ conn, m, text }) => {
        const quoted = m.quoted;
        if (!quoted?.message?.stickerMessage) {
            return m.reply("❌ Responde al sticker que quieres borrar.\nEj: .delsticker pack");
        }
        const buf = await quoted.download();
        if (!buf)
            return m.reply("❌ No pude descargar el sticker");
        const sha = crypto.createHash("sha256").update(buf).digest();
        const packName = (text || "").trim();
        // ✅ si te dieron pack, borramos solo ahí
        if (packName) {
            const pack = await getPack(m.sender, packName);
            if (!pack)
                return m.reply("❌ Pack no existe");
            const del = await db.query(`DELETE FROM sticker_pack_items
         WHERE pack_id = $1 AND sticker_sha256 = $2
         RETURNING id`, [pack.id, sha]);
            if (del.rowCount === 0)
                return m.reply("❌ Ese sticker no está en ese pack.");
            return m.reply(`🗑️ Sticker eliminado de *${packName}*`);
        }
        // ✅ si NO te dieron pack, buscamos en todos los packs del user
        const del = await db.query(`WITH target AS (
         SELECT i.id
         FROM sticker_pack_items i
         JOIN sticker_packs p ON p.id = i.pack_id
         WHERE p.owner_id = $1 AND i.sticker_sha256 = $2
         LIMIT 1
       )
       DELETE FROM sticker_pack_items
       WHERE id IN (SELECT id FROM target)
       RETURNING id`, [m.sender, sha]);
        if (del.rowCount === 0)
            return m.reply("❌ No encontré ese sticker en tus packs.");
        return m.reply("🗑️ Sticker eliminado");
    }
};
