export default {
    name: ["harem"],
    help: ["harem"],
    desc: "Muestra los personajes comprados de un usuario",
    tags: ["gacha"],
    register: true,
    run: async ({ conn, m, args }) => {
        if (!m.db)
            return;
        try {
            let who = m.mentionedJid?.[0] || m.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0] || m.quoted?.sender || m.sender;
            if (who && who.endsWith('@lid')) {
                const meta = await conn.groupMetadata(m.chat);
                const participant = meta.participants.find(p => p.lid === who || p.id === who);
                if (participant?.id) {
                    who = participant.id;
                }
                else {
                    who = who.replace(/@lid$/, '') + '@s.whatsapp.net';
                }
            }
            const pageArg = args.find(a => /^\d+$/.test(a));
            let page = pageArg ? parseInt(pageArg) : 1;
            const { rows } = await m.db.query(`SELECT name, price 
         FROM characters 
         WHERE claimed_by = $1 
         ORDER BY name ASC`, [who]);
            if (!rows.length) {
                const msg = who === m.sender ? 'Tú no tienes personajes en tu harem.' : `@${who.split('@')[0]} no tiene personajes en su harem.`;
                return conn.reply(m.chat, msg, m, { mentions: [who] });
            }
            const perPage = 10;
            const totalPages = Math.ceil(rows.length / perPage);
            if (page < 1 || page > totalPages)
                page = 1;
            const start = (page - 1) * perPage;
            const list = rows.slice(start, start + perPage);
            let text = `*\`🛍 Inventario de Compras\`*\n\n`;
            text += `*• Usuario:* @${who.split('@')[0]}\n`;
            text += `*• Personajes:* ${rows.length}\n\n`;
            text += `*\`○ Lista de Personajes:\`*\n`;
            list.forEach((c, i) => {
                text += `${start + i + 1}. *${c.name}* (${c.price?.toLocaleString() || 0})\n`;
            });
            text += `\n> *Página:* ${page}/${totalPages}`;
            return conn.reply(m.chat, text, m, { mentions: [who] });
        }
        catch (err) {
            console.error("harem error:", err);
            return m.reply('⚠️ Error al mostrar el inventario.');
        }
    }
};
