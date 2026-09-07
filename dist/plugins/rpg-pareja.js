const REQUEST_TIME = 60_000; // 60s
const requests = {};
export default {
    name: ["marry", "pareja"],
    help: ["marry @tag"],
    desc: "proponer matrimonio a otro usuario",
    tags: ["rpg"],
    register: true,
    run: async ({ conn, m, mentionedJid }) => {
        // user actual
        const { rows: [user] } = await m.db.query("SELECT marry FROM usuarios WHERE id = $1 OR lid = $1", [m.sender]);
        if (user.marry) {
            return m.reply(`⚠️ Ya estás casado con @${user.marry.split("@")[0]}`, {
                mentions: [user.marry]
            });
        }
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
            return m.reply("⚠️ Etiquetá a la persona con la que te querés casar");
        if (who === m.sender)
            return m.reply("⚠️ No podés casarte con vos mismo");
        const { rows: [target] } = await m.db.query("SELECT marry FROM usuarios WHERE id = $1", [who]);
        if (!target)
            return m.reply("⚠️ Ese usuario no está registrado");
        if (target.marry)
            return m.reply("⚠️ Ese usuario ya está casado");
        // guardar solicitud
        await m.db.query("UPDATE usuarios SET marry_request = $1 WHERE id = $2", [m.sender, who]);
        await m.reply(`💍 *@${m.sender.split("@")[0]}* te pidió matrimonio 😳\n\n` +
            `❤️ Escribí *aceptar*\n💔 Escribí *rechazar*\n\n⏳ Tenés 60 segundos`, { mentions: [m.sender, who] });
        // timeout
        requests[who] = setTimeout(async () => {
            await m.db.query("UPDATE usuarios SET marry_request = NULL WHERE id = $1", [who]);
            delete requests[who];
            conn.sendMessage(m.chat, { text: "⏰ La solicitud de matrimonio expiró" });
        }, REQUEST_TIME);
    },
    before: async (m) => {
        const { rows: [row] } = await m.db.query("SELECT marry_request FROM usuarios WHERE id = $1", [m.sender]);
        const req = row?.marry_request;
        if (!req)
            return;
        const text = (m.text || "").toLowerCase();
        if (text === "rechazar") {
            clearTimeout(requests[m.sender]);
            delete requests[m.sender];
            await m.db.query("UPDATE usuarios SET marry_request = NULL WHERE id = $1", [m.sender]);
            return m.reply(`💔 Rechazaste la propuesta de @${req.split("@")[0]}`, {
                mentions: [req]
            });
        }
        if (text === "aceptar") {
            clearTimeout(requests[m.sender]);
            delete requests[m.sender];
            await m.db.query("UPDATE usuarios SET marry = $1, marry_request = NULL WHERE id = $2", [req, m.sender]);
            await m.db.query("UPDATE usuarios SET marry = $1 WHERE id = $2", [m.sender, req]);
            return m.reply(`🎉 FELICIDADES 🎉\n@${req.split("@")[0]} y @${m.sender.split("@")[0]} ahora están casados 💍`, { mentions: [req, m.sender] });
        }
    }
};
