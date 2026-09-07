const pendingTrades = new Map();
export default {
    name: ["trade", "cambiar"],
    help: ["trade @user mi_personaje | su_personaje"],
    desc: "Intercambia personajes con otro usuario",
    tags: ["gacha"],
    register: true,
    run: async ({ conn, m, prefijo, args }) => {
        if (!m.db)
            return;
        try {
            /* ========= USUARIO DESTINO ========= */
            let target = m.mentionedJid?.[0] ||
                m.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
            if (!target) {
                return m.reply(`⚠️ Uso: *${prefijo}trade @user mi_personaje | su_personaje*`);
            }
            // FIX LID
            if (target.endsWith('@lid')) {
                const meta = await conn.groupMetadata(m.chat);
                const p = meta.participants.find(x => x.lid === target || x.id === target);
                target = p?.id || target.replace(/@lid$/, '') + '@s.whatsapp.net';
            }
            if (target === m.sender) {
                return m.reply('❌ No podés tradear contigo mismo.');
            }
            /* ========= PARSE NOMBRES ========= */
            const raw = args.join(' ').replace(/@\S+/, '').trim();
            const [mine, theirs] = raw.split('|').map(t => t?.trim().toLowerCase());
            if (!mine || !theirs) {
                return m.reply(`⚠️ Formato: *${prefijo}trade @user mi_personaje | su_personaje*`);
            }
            /* ========= BUSCAR PERSONAJES ========= */
            const { rows: myChars } = await m.db.query(`SELECT id, name FROM characters 
         WHERE LOWER(name) = $1 AND claimed_by = $2 AND for_sale = false`, [mine, m.sender]);
            if (!myChars.length) {
                return m.reply(`❌ *${mine}* no es tuyo o está en venta.`);
            }
            const { rows: hisChars } = await m.db.query(`SELECT id, name FROM characters 
         WHERE LOWER(name) = $1 AND claimed_by = $2 AND for_sale = false`, [theirs, target]);
            if (!hisChars.length) {
                return m.reply(`❌ El usuario no tiene *${theirs}* o está en venta.`);
            }
            /* ========= GUARDAR TRADE ========= */
            pendingTrades.set(target, {
                from: m.sender,
                to: target,
                myChar: myChars[0],
                hisChar: hisChars[0],
                chat: m.chat,
                time: Date.now()
            });
            return conn.reply(m.chat, `🤝 *Solicitud de intercambio*\n\n` +
                `@${m.sender.split('@')[0]} ofrece *${myChars[0].name}*\n` +
                `a cambio de *${hisChars[0].name}*\n\n` +
                `@${target.split('@')[0]} responde *aceptar* o *rechazar*`, m, { mentions: [m.sender, target] });
        }
        catch (err) {
            console.error("trade error:", err);
            m.reply('⚠️ Error al crear el trade.');
        }
    },
    /* ========= CONFIRMACIÓN ========= */
    before: async (m, { conn }) => {
        if (!m.db)
            return;
        if (!/^(aceptar|rechazar)$/i.test(m.originalText || ''))
            return;
        const trade = pendingTrades.get(m.sender);
        if (!trade)
            return;
        if (m.originalText.toLowerCase() === 'rechazar') {
            pendingTrades.delete(m.sender);
            return m.reply('❌ Intercambio cancelado.');
        }
        try {
            // swap real
            await m.db.query(`UPDATE characters SET claimed_by = $1 WHERE id = $2`, [trade.to, trade.myChar.id]);
            await m.db.query(`UPDATE characters SET claimed_by = $1 WHERE id = $2`, [trade.from, trade.hisChar.id]);
            pendingTrades.delete(m.sender);
            return conn.sendMessage(trade.chat, {
                text: `✅ *Intercambio completado*\n\n` +
                    `@${trade.from.split('@')[0]} ↔ @${trade.to.split('@')[0]}\n` +
                    `*${trade.myChar.name}* ⇄ *${trade.hisChar.name}*`,
                mentions: [trade.from, trade.to]
            }, { quoted: m });
        }
        catch (err) {
            console.error("trade confirm error:", err);
            pendingTrades.delete(m.sender);
            m.reply('⚠️ Error al completar el intercambio.');
        }
    }
};
