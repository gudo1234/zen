import { db } from "../lib/db.js";
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
function parseDays(input = "") {
    const txt = String(input || "").toLowerCase().trim();
    const m = txt.match(/^(\d+)\s*d$/);
    if (!m)
        return null;
    const days = parseInt(m[1]);
    if (isNaN(days) || days <= 0)
        return null;
    return days;
}
export default {
    name: ["fantasmas", "kickfantasmas"],
    help: ["fantasmas <dias>", "kickfantasmas"],
    desc: "Ver o eliminar usuarios inactivos del grupo.",
    tags: ["group"],
    group: true,
    admin: true,
    botAdmin: true,
    register: true,
    run: async ({ conn, m, args, cmd }) => {
        try {
            const metadata = await conn.groupMetadata(m.chat);
            const participants = metadata.participants || [];
            const isKick = /^(kickfantasmas)$/i.test(cmd);
            const days = parseDays(args[0]);
            const botJid = (conn.user?.id || "").replace(/:\d+/, "");
            const result = await db.query(`
        SELECT user_id, message_count, last_message_at
        FROM messages
        WHERE group_id = $1
      `, [m.chat]);
            const rows = result.rows || [];
            const now = Date.now();
            // Extrae solo dígitos de un JID para comparación
            const cleanNum = (jid) => (jid || "").split("@")[0].replace(/[^0-9]/g, "");
            const botNum = cleanNum((conn.user?.id || "").replace(/:\d+/, ""));
            const memberData = participants.map(mem => {
                const userId = mem.id || mem.jid || "";
                const phoneNum = cleanNum(mem.phoneNumber || mem.id || mem.jid || "");
                const userData = rows.find(row => cleanNum(row.user_id) === phoneNum);
                const messages = Number(userData?.message_count || 0);
                const lastMessageAt = userData?.last_message_at
                    ? new Date(userData.last_message_at).getTime()
                    : 0;
                const isAdmin = mem.admin === "admin" || mem.admin === "superadmin";
                let isGhost = false;
                // modo viejo: 0 mensajes
                if (!days) {
                    isGhost = messages === 0;
                }
                // modo por días
                else {
                    const limitMs = days * 24 * 60 * 60 * 1000;
                    isGhost = !lastMessageAt || (now - lastMessageAt >= limitMs);
                }
                return {
                    id: userId,
                    phoneNum,
                    messages,
                    lastMessageAt,
                    isGhost,
                    isAdmin
                };
            });
            const ghosts = memberData.filter(mem => mem.id &&
                mem.phoneNum !== botNum && // filtrar bot por número, no por JID
                !mem.isAdmin &&
                mem.isGhost);
            const total = ghosts.length;
            if (total === 0) {
                return m.reply(days ? `✅ No hay usuarios inactivos en los últimos *${days} día(s)*.` : `✅ Este grupo no tiene fantasmas.`);
            }
            if (!isKick) {
                let teks = `⚠️ REVISIÓN DE INACTIVOS ⚠️\n\n`;
                teks += `🏷 Grupo: ${metadata.subject || "Sin nombre"}\n`;
                teks += `👥 Miembros: ${memberData.length - 1}\n`;
                if (days)
                    teks += `📆 Filtro: ${days} día(s)\n`;
                teks += `📉 Inactivos: ${total}\n\n`;
                teks += `[ 👻 LISTA DE FANTASMAS 👻 ]\n`;
                teks += ghosts.map((v, i) => {
                    const lastSeen = v.lastMessageAt ? new Date(v.lastMessageAt).toLocaleDateString("es-AR") : "-";
                    return `➥ @${v.id.split("@")[0]}`;
                }).join("\n");
                teks += "\n\n> *Nota:* Esto puede no ser 100% acertado. El bot inicia el conteo de mensajes desde que se activó en este grupo.";
                return await conn.sendMessage(m.chat, {
                    text: teks,
                    mentions: ghosts.map(v => v.id), contextInfo: {}
                }, { quoted: m });
            }
            let kickTeks = `*⚠️ ELIMINACIÓN DE INACTIVOS ⚠️*\n\n`;
            kickTeks += `🏷 Grupo: ${metadata.subject || "Sin nombre"}\n`;
            kickTeks += `👥 Miembros: ${memberData.length}\n`;
            if (days)
                kickTeks += `📆 Filtro: ${days} día(s)\n`;
            kickTeks += `📉 Miembros inactivos: ${total}\n\n`;
            kickTeks += `[ 👻 FANTASMAS A ELIMINAR 👻 ]\n`;
            kickTeks += ghosts.map((v, i) => `@${v.id.split("@")[0]}`).join("\n");
            kickTeks += `\n\n> *El bot eliminará la lista mencionada, empezando en 20 segundos, con 10 segundos entre cada expulsión.*`;
            await conn.sendMessage(m.chat, {
                text: kickTeks,
                mentions: ghosts.map(v => v.id), contextInfo: {}
            }, { quoted: m });
            const chatRes = await db.query(`SELECT welcome FROM chats WHERE group_id = $1 LIMIT 1`, [m.chat]);
            const originalWelcome = chatRes.rows[0]?.welcome ?? true;
            await db.query(`
        INSERT INTO chats (group_id, welcome)
        VALUES ($1, false)
        ON CONFLICT (group_id)
        DO UPDATE SET welcome = false
      `, [m.chat]);
            await delay(10000);
            try {
                for (const user of ghosts) {
                    if (!user.id || user.id === botJid)
                        continue;
                    await conn.groupParticipantsUpdate(m.chat, [user.id], "remove");
                    await delay(3000);
                }
            }
            finally {
                await db.query(`
          INSERT INTO chats (group_id, welcome)
          VALUES ($1, $2)
          ON CONFLICT (group_id)
          DO UPDATE SET welcome = $2
        `, [m.chat, originalWelcome]);
            }
            return m.reply(days ? `✅ Eliminación completada con filtro de *${days} día(s)*.` : `✅ Eliminación de fantasmas completada.`);
        }
        catch (err) {
            console.error("❌ Error en fantasmas:", err);
            return m.reply("❌ Error ejecutando el comando.");
        }
    }
};
