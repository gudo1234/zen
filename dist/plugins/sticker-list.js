import { db } from "../lib/db.js";
const PAGE_SIZE = 10;
export default {
    name: ["listpacks"],
    tags: ["sticker"],
    help: ["listpacks <number>"],
    desc: "Lista los packs públicos con paginación",
    register: true,
    run: async ({ m, prefijo, text }) => {
        const page = Math.max(parseInt(text) || 1, 1);
        const offset = (page - 1) * PAGE_SIZE;
        // total de packs públicos
        const totalRes = await db.query(`
      SELECT COUNT(*)::int AS total
      FROM sticker_packs
      WHERE public = true
    `);
        const total = totalRes.rows[0].total;
        if (total === 0) {
            return m.reply("📭 No hay packs públicos aún.");
        }
        const totalPages = Math.ceil(total / PAGE_SIZE);
        if (page > totalPages) {
            return m.reply(`❌ Página inválida. Máx: ${totalPages}`);
        }
        const res = await db.query(`
      SELECT 
        p.name,
        p.owner_name,
        p.created_at,
        COUNT(i.id)::int AS total
      FROM sticker_packs p
      LEFT JOIN sticker_pack_items i ON i.pack_id = p.id
      WHERE p.public = true
      GROUP BY p.id
      ORDER BY p.created_at DESC
      LIMIT $1 OFFSET $2
      `, [PAGE_SIZE, offset]);
        const txt = res.rows.map((p, i) => {
            const fecha = new Date(p.created_at).toLocaleDateString("es-AR", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric"
            });
            return (`*${offset + i + 1}.* 📦 *${p.name}*\n` +
                `👤 ${p.owner_name}\n` +
                `🧩 ${p.total} stickers\n` +
                `📅 ${fecha}`);
        }).join("\n\n");
        m.reply(`🌍 *Packs públicos*\n` +
            `📄 Página ${page}/${totalPages}\n\n` +
            `${txt}\n\n` +
            `ℹ️ Usa *${prefijo}enviarpack nombre pack* para recibirlo\n` +
            `➡️ Usa *${prefijo}listpacks ${page + 1}* para la siguiente página`);
    }
};
