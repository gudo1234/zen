import { db } from "../lib/db.js";
export default {
    name: ["packinfo", "mispacks"],
    tags: ["sticker"],
    help: ["packinfo"],
    desc: "Muestra todos tus packs de stickers",
    register: true,
    run: async ({ m }) => {
        const res = await db.query(`
      SELECT 
        p.name,
        p.public,
        p.created_at,
        COUNT(i.id)::int AS total
      FROM sticker_packs p
      LEFT JOIN sticker_pack_items i ON i.pack_id = p.id
      WHERE p.owner_id = $1
      GROUP BY p.id
      ORDER BY p.created_at DESC
      `, [m.sender]);
        if (res.rowCount === 0) {
            return m.reply("📭 No tienes packs creados aún.");
        }
        const txt = res.rows.map((p, i) => {
            const estado = p.public ? "🌍 Público" : "🔒 Privado";
            const fecha = new Date(p.created_at).toLocaleDateString();
            return (`*${i + 1}.* 📦 *${p.name}*\n` +
                `🧩 ${p.total} stickers\n` +
                `🔐 ${estado}\n` +
                `📅 ${fecha}`);
        }).join("\n\n");
        m.reply(`📦 *Tus packs*\n\n${txt}`);
    }
};
