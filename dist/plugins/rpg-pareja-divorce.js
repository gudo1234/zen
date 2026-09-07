export default {
    name: ["divorce", "divorcio"],
    help: ["divorce @tag"],
    desc: "divorciarte de tu pareja actual",
    tags: ["rpg"],
    register: true,
    run: async ({ conn, m, mentionedJid }) => {
        // detectar pareja
        let who = mentionedJid?.[0] ||
            m.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0] ||
            m.quoted?.sender;
        if (who && who.endsWith('@lid')) {
            const meta = await conn.groupMetadata(m.chat);
            const participant = meta.participants.find(p => p.lid === who || p.id === who);
            if (participant && participant.id) {
                who = participant.id;
            }
            else {
                const number = who.replace(/@lid$/, '');
                who = number + '@s.whatsapp.net';
            }
        }
        ;
        if (!who)
            return m.reply("⚠️ Etiquetá a la persona con la que querés divorciarte");
        // usuario
        const { rows: [user] } = await m.db.query("SELECT marry FROM usuarios WHERE id = $1", [m.sender]);
        if (!user || !user.marry)
            return m.reply("⚠️ No estás casado con nadie");
        if (user.marry !== who)
            return m.reply("⚠️ No estás casado con esa persona");
        // divorcio
        await m.db.query("UPDATE usuarios SET marry = NULL WHERE id IN ($1, $2)", [m.sender, who]);
        m.reply(`💔 *DIVORCIO CONFIRMADO*\n\n@${m.sender.split("@")[0]} y @${who.split("@")[0]} ahora están separados`, { mentions: [m.sender, who] });
    }
};
