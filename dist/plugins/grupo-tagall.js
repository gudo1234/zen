export default {
    name: ["tagall", "todos", "invocar"],
    help: ["tagall <texto opcional>"],
    desc: "Etiqueta a todos los miembros del grupo.",
    tags: ["grupo"],
    group: true,
    admin: true,
    register: true,
    run: async ({ conn, m, text }) => {
        try {
            const metadata = await conn.groupMetadata(m.chat);
            const participants = metadata.participants || [];
            if (!participants.length)
                return;
            const users = participants.map(p => p.phoneNumber || p.jid || p.id);
            const total = users.length;
            await m.react("📣");
            let mensaje = "";
            mensaje += `*⺀ ＡＣＴＩＶＥ ＧＲＵＰＯ 🗣️⺀*\n\n`;
            if (text && text.trim()) {
                mensaje += `❏ *Mensaje:* ${text.trim()}\n`;
            }
            mensaje += `*👥 Miembros del grupo:* ${total}\n`;
            mensaje += `❏ *Etiquetas:*\n`;
            mensaje += users.map(u => `➥ @${u.replace(/@s\.whatsapp\.net|@lid/g, "").replace(/[^0-9]/g, "")}`).join(" \n ");
            await conn.sendMessage(m.chat, { text: mensaje, mentions: users }, { quoted: null });
        }
        catch (e) {
            console.error("❌ Error en /tagall:", e);
        }
    }
};
