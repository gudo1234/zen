export default {
    name: ["market"],
    help: ["market [página]"],
    desc: "Muestra los personajes en venta por otros usuarios",
    tags: ["gacha"],
    register: true,
    run: async ({ conn, m, args }) => {
        if (!m.db)
            return;
        try {
            const pageArg = args.find(a => /^\d+$/.test(a));
            let page = pageArg ? parseInt(pageArg) : 1;
            const { rows } = await m.db.query(`SELECT name, price, rareza, claimed_by
         FROM characters
         WHERE for_sale = true
         ORDER BY price DESC`);
            if (!rows.length) {
                return m.reply('🛒 No hay personajes en venta.');
            }
            const perPage = 6;
            const totalPages = Math.ceil(rows.length / perPage);
            if (page < 1 || page > totalPages)
                page = 1;
            const start = (page - 1) * perPage;
            const list = rows.slice(start, start + perPage);
            let text = `🛒 *Mercado de Personajes*\n\n`;
            text += `📄 Página ${page}/${totalPages}\n\n`;
            list.forEach((c, i) => {
                text +=
                    `${start + i + 1}. *${c.name}*\n` +
                        `⭐ ${c.rareza}\n` +
                        `💰 ${c.price.toLocaleString()} exp\n` +
                        `👤 @${c.claimed_by.split('@')[0]}\n\n`;
            });
            text += `Usa: *.comprar nombre_del_personaje*`;
            return conn.reply(m.chat, text, m, { mentions: list.map(c => c.claimed_by) });
        }
        catch (err) {
            console.error("market error:", err);
            m.reply('⚠️ Error al mostrar el mercado.');
        }
    }
};
