export default {
    name: ["bal", "balance"],
    help: ["bal"],
    desc: "ver tu balance actual de XP",
    tags: ["econ"],
    register: true,
    run: async ({ conn, m, prefijo }) => {
        const who = m.quoted?.sender ||
            m.mentionedJid?.[0] ||
            m.sender;
        const res = await m.db.query(`SELECT limite, money, exp, banco
       FROM usuarios 
       WHERE id = $1 OR lid = $1`, [who]);
        if (res.rowCount === 0) {
            return m.reply(`✳️ Ese usuario no está registrado.`);
        }
        const user = res.rows[0];
        const bank = Number(user.banco || 0);
        // ✅ OBTENER DISPLAY NAME PARA EL @tag
        let displayName = who.split('@')[0];
        let mentionJid = who;
        // Si es grupo, intentar obtener username de metadata
        if (m.isGroup) {
            try {
                const metadata = await conn.groupMetadata(m.chat);
                const participant = metadata.participants.find((p) => {
                    const ids = [p.id, p.phoneNumber, p.lid].filter(Boolean);
                    return ids.some(id => id === who || id === who.split('@')[0]);
                });
                if (participant) {
                    if (participant.username) {
                        displayName = participant.username;
                        mentionJid = participant.id || who;
                    }
                    else if (participant.phoneNumber) {
                        displayName = participant.phoneNumber.split('@')[0];
                        mentionJid = participant.phoneNumber;
                    }
                    else if (participant.id) {
                        displayName = participant.id.split('@')[0];
                        mentionJid = participant.id;
                    }
                }
            }
            catch (e) {
                console.log("⚠️ Error obteniendo metadata para bal:", e.message);
            }
        }
        const txt = `
▢ *${m.e.currency_emoji} ${m.e.currency_name}:* ${user.limite}
▢ *⬆️ Exp:*  ${user.exp.toLocaleString()}
> Afuera del Banco 

•───── 《 BANCO 》 ─────•

▢ *🏦 Dinero:* ${bank.toLocaleString()} ${m.e.currency_emoji}
> Adentro del Banco 🏦 

•───────────────•

*𝐍𝐎𝐓𝐀:* puedes comprar ${m.e.currency_emoji} ${m.e.currency_name} usando los comandos
• ${prefijo}buy <cantidad>
• ${prefijo}buyall

*Guardar tus ${m.e.currency_name} en el banco:*
${prefijo}dep <cantidad>

*Retirar tus ${m.e.currency_name} del banco:*
${prefijo}retirar <cantidad>`;
        await m.reply(`*•───⧼⧼⧼ 𝙱𝙰𝙻𝙰𝙽𝙲𝙴 ⧽⧽⧽───•*\n\n@${displayName} Tiene:`, txt);
    }
};
