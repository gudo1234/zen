const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
export default {
    name: ["del", "delete"],
    help: "del [reply]",
    desc: "borrar mensajes del bot o de un usuario.",
    tags: ["group"],
    group: true,
    admin: true,
    botAdmin: true,
    run: async ({ conn, m, args }) => {
        try {
            if (m.quoted?.key) {
                await conn.sendMessage(m.chat, { delete: m.quoted.key });
                return;
            }
            let target = "";
            if (m.mentionedJid?.length) {
                target = m.mentionedJid[0];
            }
            else if (args[0]) {
                const num = args[0].replace(/[^0-9]/g, "");
                if (num)
                    target = `${num}@s.whatsapp.net`;
            }
            if (!target) {
                return m.reply("⚠️ Responde a un mensaje o menciona a alguien.");
            }
            const metadata = await conn.groupMetadata(m.chat);
            const botJid = (conn.user?.id || "").replace(/:\d+/, "");
            const participants = metadata.participants || [];
            const senderIds = new Set(participants
                .map(p => (p.id || p.jid || "").replace(/:\d+/, ""))
                .filter(Boolean));
            if (!senderIds.has(target) && target !== botJid) {
                return m.reply("⚠️ Usuario inválido o no está en el grupo.");
            }
            const store = conn.chats?.[m.chat]?.messages ||
                conn.messages?.[m.chat] ||
                {};
            const messages = Object.values(store || {});
            const toDelete = messages.filter((msg) => {
                const key = msg?.key || {};
                const participant = (key.participant || "").replace(/:\d+/, "");
                const remoteJid = (key.remoteJid || "").replace(/:\d+/, "");
                const fromMe = !!key.fromMe;
                if (participant === target)
                    return true;
                if (!participant && remoteJid === target)
                    return true;
                if (fromMe && target === botJid)
                    return true;
                return false;
            });
            if (!toDelete.length) {
                return m.reply("⚠️ No encontré mensajes recientes de ese usuario en memoria.");
            }
            let deleted = 0;
            const total = Math.min(toDelete.length, 200);
            for (let i = 0; i < total; i++) {
                try {
                    const key = toDelete[i]?.key;
                    if (!key)
                        continue;
                    await conn.sendMessage(m.chat, { delete: key });
                    deleted++;
                    await delay(120);
                }
                catch (e) {
                    console.log("❌ Error borrando mensaje:", e?.message || e);
                }
            }
            return conn.sendMessage(m.chat, {
                text: `✅ Eliminados ${deleted} mensajes de @${target.split("@")[0]}`,
                mentions: [target]
            }, { quoted: m });
        }
        catch (err) {
            console.error(err);
            return m.reply(`❌ Error eliminando mensajes.\n${err?.message || err}`);
        }
    }
};
