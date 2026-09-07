export default {
    name: ["comprar"],
    help: ["comprar <nombre_del_personaje>"],
    desc: "Compra un personaje del mercado",
    tags: ["gacha"],
    register: true,
    run: async ({ conn, m, prefijo, args }) => {
        if (!m.db)
            return;
        try {
            const name = args.join(" ").trim().toLowerCase();
            if (!name) {
                return m.reply(`⚠️ Usa: *${prefijo}comprar nombre_del_personaje*`);
            }
            const { rows } = await m.db.query(`SELECT id, name, price, claimed_by
         FROM characters
         WHERE LOWER(name) = $1 AND for_sale = true`, [name]);
            const char = rows[0];
            if (!char)
                return m.reply('❌ Ese personaje no está en venta.');
            if (char.claimed_by === m.sender) {
                return m.reply('❌ No podés comprarte tu propio personaje.');
            }
            const { rows: [buyer] } = await m.db.query('SELECT exp FROM usuarios WHERE id = $1', [m.sender]);
            if (!buyer || buyer.exp < char.price) {
                return m.reply(`❌ Te faltan ${char.price - (buyer?.exp || 0)} exp.`);
            }
            const vendedor = char.claimed_by;
            const precio = char.price;
            /* ========= TRANSACCIÓN (SIN COMISIÓN) ========= */
            await m.db.query('UPDATE usuarios SET exp = exp - $1 WHERE id = $2', [precio, m.sender]);
            await m.db.query('UPDATE usuarios SET exp = exp + $1 WHERE id = $2', [precio, vendedor]);
            await m.db.query(`UPDATE characters
         SET claimed_by = $1, for_sale = false, seller = null
         WHERE id = $2`, [m.sender, char.id]);
            await m.reply(`🎉 Compraste *${char.name}* por ${precio} exp`);
            /* ========= AVISO SMART ========= */
            let avisadoEnGrupo = false;
            if (m.isGroup) {
                try {
                    const meta = await conn.groupMetadata(m.chat);
                    const estaEnGrupo = meta.participants.some(p => p.id === vendedor);
                    if (estaEnGrupo) {
                        avisadoEnGrupo = true;
                        await conn.sendMessage(m.chat, { text: `💰 @${vendedor.split('@')[0]} tu personaje *${char.name}* fue comprado por @${m.sender.split('@')[0]} por *${precio} exp*`, mentions: [vendedor, m.sender] }, { quoted: null });
                    }
                }
                catch { }
            }
            // Si no está en el grupo → privado
            if (!avisadoEnGrupo) {
                await conn.sendMessage(vendedor, { text: `💰 Tu personaje *${char.name}* fue comprado por @${m.sender.split('@')[0]}\n> Recibiste: ${precio} exp`, mentions: [m.sender] }, { quoted: m || null });
            }
        }
        catch (err) {
            console.error("comprar error:", err);
            m.reply('⚠️ Error al realizar la compra.');
        }
    }
};
