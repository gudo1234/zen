import { db } from "../lib/db.js";
export default {
    name: [
        "listablock",
        "listaban",
        "listaadv",
        "chatsbaneados",
        "listaparejas"
    ],
    help: [
        "listablock",
        "listaban",
        "listaadv",
        "chatsbaneados",
        "listaparejas"
    ],
    desc: "mostrar listas administrativas del bot",
    tags: ["owner"],
    register: true,
    run: async ({ conn, m, cmd }) => {
        let txt = "";
        /* ================= BLOQUEADOS ================= */
        if (cmd === "listablock") {
            try {
                const blocklist = await conn.fetchBlocklist() || [];
                txt += `📛 *LISTA DE BLOQUEADOS*\n\n`;
                txt += `*• Total:* ${blocklist.length}\n\n`;
                if (blocklist.length) {
                    for (const jid of blocklist) {
                        txt += `🚫 @${jid.split("@")[0]}\n`;
                    }
                }
                else {
                    txt += "✅ No hay usuarios bloqueados actualmente.\n";
                }
            }
            catch {
                txt = "❌ Error al obtener la lista de bloqueados.";
            }
            return conn.sendMessage(m.chat, { text: txt, mentions: [txt], contextInfo: {} }, { quoted: m });
        }
        /* ================= CHATS BANEADOS ================= */
        if (cmd === "chatsbaneados") {
            try {
                const res = await db.query("SELECT group_id FROM chats WHERE banned = true");
                txt += `💬 *CHATS BANEADOS*\n\n`;
                txt += `*• Total:* ${res.rowCount}\n\n`;
                if (res.rows.length) {
                    for (const chat of res.rows) {
                        txt += `🚫 ${chat.group_id}\n`;
                    }
                }
                else {
                    txt += "✅ No hay chats baneados actualmente.\n";
                }
            }
            catch {
                txt = "❌ Error al obtener la lista de chats baneados.";
            }
            return conn.sendMessage(m.chat, { text: txt, mentions: await conn.parseMention(txt), contextInfo: {} }, { quoted: m });
        }
        /* ================= USUARIOS BANEADOS ================= */
        if (cmd === "listaban") {
            try {
                const res = await db.query("SELECT id, banned_reason, ban_warnings FROM usuarios WHERE banned = true");
                txt += `👥 *USUARIOS BANEADOS*\n\n`;
                txt += `*• Total:* ${res.rowCount}\n\n`;
                if (res.rows.length) {
                    for (const u of res.rows) {
                        txt += `🚫 @${u.id.split("@")[0]}`;
                        if (u.banned_reason)
                            txt += `\n📌 Razón: ${u.banned_reason}`;
                        if (u.ban_warnings)
                            txt += ` | Avisos: ${u.ban_warnings}/3`;
                        txt += `\n\n`;
                    }
                }
                else {
                    txt += "✅ No hay usuarios baneados actualmente.\n";
                }
            }
            catch {
                txt = "❌ Error al obtener la lista de baneados.";
            }
            return conn.sendMessage(m.chat, { text: txt, mentions: await conn.parseMention(txt), contextInfo: {} }, { quoted: m });
        }
        /* ================= PAREJAS ================= */
        if (cmd === "listaparejas") {
            try {
                const res = await db.query(`
  SELECT id, marry
  FROM usuarios
  WHERE marry IS NOT NULL
    AND id < marry
`);
                txt += `💞 *LISTA DE PAREJAS*\n\n`;
                txt += `*• Total:* ${res.rowCount}\n\n`;
                let i = 1;
                for (const u of res.rows) {
                    if (!u.marry)
                        continue;
                    txt += `${i}. @${u.id.split("@")[0]} 💞 @${u.marry.split("@")[0]}\n`;
                    i++;
                }
                if (i === 1)
                    txt += "✅ No hay parejas registradas.\n";
            }
            catch {
                txt = "❌ Error al obtener la lista de parejas.";
            }
            return conn.sendMessage(m.chat, { text: txt, mentions: [txt], contextInfo: {} }, { quoted: m });
        }
        /* ================= ADVERTENCIAS ================= */
        if (cmd === "listaadv") {
            try {
                const res = await db.query("SELECT id, warn FROM usuarios WHERE warn > 0");
                txt += `⚠️ *USUARIOS ADVERTIDOS*\n\n`;
                txt += `*• Total:* ${res.rowCount}\n\n`;
                let i = 1;
                for (const u of res.rows) {
                    txt += `${i}. @${u.id.split("@")[0]} (Warn: ${u.warn}/4)\n`;
                    i++;
                }
                if (i === 1)
                    txt += "✅ No hay usuarios advertidos.\n";
            }
            catch {
                txt = "❌ Error al obtener la lista de advertencias.";
            }
            return conn.sendMessage(m.chat, { text: txt, mentions: [txt], contextInfo: {} }, { quoted: m });
        }
    }
};
