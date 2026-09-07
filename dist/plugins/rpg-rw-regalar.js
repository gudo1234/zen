export default {
    name: ["give"],
    help: ["give @user nombre_del_personaje"],
    desc: "Regala un personaje a otro usuario",
    tags: ["gacha"],
    register: true,
    run: async ({ conn, m, args }) => {
        if (!m.db)
            return;
        try {
            let recipient = m.mentionedJid?.[0] || m.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
            if (!recipient)
                return m.reply('⚠️ Usa: *give @user nombre_del_personaje*');
            if (recipient.endsWith('@lid')) {
                const meta = await conn.groupMetadata(m.chat);
                const participant = meta.participants.find(p => p.lid === recipient || p.id === recipient);
                if (participant?.id) {
                    recipient = participant.id;
                }
                else {
                    recipient = recipient.replace(/@lid$/, '') + '@s.whatsapp.net';
                }
            }
            if (recipient === m.sender)
                return m.reply('❌ No seas boludo, no podés regalarte un personaje a vos mismo.');
            const name = args.filter(a => !a.startsWith('@')).join(' ').trim().toLowerCase();
            if (!name)
                return m.reply('⚠️ Especificá el nombre del personaje.');
            const { rows } = await m.db.query(`SELECT id, name 
         FROM characters 
         WHERE LOWER(name) = $1 
         AND claimed_by = $2`, [name, m.sender]);
            const character = rows[0];
            if (!character) {
                const { rows: exists } = await m.db.query(`SELECT id FROM characters WHERE LOWER(name) = $1`, [name]);
                if (!exists.length) {
                    return m.reply(`❌ No existe ningún personaje llamado *${name}*.`);
                }
                return m.reply(`❌ Ese personaje no es tuyo.`);
            }
            await m.db.query(`UPDATE characters 
         SET claimed_by = $1, for_sale = false, seller = NULL 
         WHERE id = $2`, [recipient, character.id]);
            return conn.reply(m.chat, `🎁 Regalaste *${character.name}* a @${recipient.split('@')[0]}`, m, { mentions: [recipient] });
        }
        catch (err) {
            console.error("give error:", err);
            return m.reply('⚠️ Error al regalar el personaje.');
        }
    }
};
