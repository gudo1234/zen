// Código elaborado por: https://github.com/elrebelde21
export default {
    name: ["plist", "personajes"],
    help: ["plist [página]"],
    desc: "Muestra la lista de todos los personajes",
    tags: ["gacha"],
    register: true,
    run: async ({ conn, m, args }) => {
        if (!m.db)
            return;
        try {
            const pageArg = args.find(a => /^\d+$/.test(a));
            let page = pageArg ? parseInt(pageArg) : 1;
            const { rows } = await m.db.query(`SELECT 
           c.name,
           c.rareza,
           c.claimed_by,
           c.for_sale,
           c.price,
           u.nombre AS owner_name
         FROM characters c
         LEFT JOIN usuarios u ON u.id = c.claimed_by
         ORDER BY c.name ASC`);
            if (!rows.length)
                return m.reply("⚠️ No hay personajes registrados.");
            const perPage = 8;
            const totalPages = Math.ceil(rows.length / perPage);
            if (page < 1 || page > totalPages)
                page = 1;
            const start = (page - 1) * perPage;
            const list = rows.slice(start, start + perPage);
            let text = `📜 *\`Lista de Personajes\`*\n\n`;
            text += `📄 Página ${page}/${totalPages}\n`;
            text += `👥 Total: ${rows.length}\n\n`;
            list.forEach((c, i) => {
                let estado = "🆓 Libre";
                let dueño = "";
                if (c.claimed_by) {
                    estado = c.for_sale ? "💸 En venta" : "🔒 Reclamado";
                    dueño = c.owner_name
                        ? ` — ${c.owner_name}`
                        : " — anónimo";
                }
                text +=
                    `${start + i + 1}. *${c.name}*\n` +
                        `⭐ Tipo: ${c.rareza}\n` +
                        `${estado}${dueño}\n` +
                        `💰 Precios: ${c.price.toLocaleString()} exp\n\n`;
            });
            return conn.reply(m.chat, text.trim(), m);
        }
        catch (err) {
            console.error("plist error:", err);
            m.reply("⚠️ Error al mostrar los personajes.");
        }
    }
};
