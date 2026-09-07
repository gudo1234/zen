import { db } from "../lib/db.js";
export default {
    name: ["contador", "msgcount"],
    help: "contador",
    desc: "Mostrar la actividad de todos los usuarios del grupo. Usa 'contador reset' para reiniciar el contador.",
    tags: ["group"],
    group: true,
    admin: true,
    run: async ({ conn, m, prefijo, args }) => {
        try {
            // 🔥 Verificar si es comando de reset
            const isReset = args[0]?.toLowerCase() === 'reset';
            if (isReset) {
                // ⚠️ Confirmar reset
                await db.query(`DELETE FROM messages WHERE group_id = $1`, [m.chat]);
                await m.reply(`✅ *Contador reiniciado*\n\nTodos los mensajes del grupo han sido reseteados.\nLos nuevos mensajes comenzarán a contarse desde ahora.`);
                return;
            }
            const metadata = await conn.groupMetadata(m.chat);
            const participants = metadata.participants || [];
            const res = await db.query(`
        SELECT user_id, message_count
        FROM messages
        WHERE group_id = $1
      `, [m.chat]);
            const rows = res.rows || [];
            const cleanNum = (jid) => (jid || "").split("@")[0].replace(/[^0-9]/g, "");
            const botNum = cleanNum((conn.user?.id || "").replace(/:\d+/, ""));
            const list = participants.map(p => {
                const id = p.id || p.jid || "";
                const phoneNum = cleanNum(p.phoneNumber || p.id || p.jid || "");
                const row = rows.find(r => cleanNum(r.user_id) === phoneNum);
                return {
                    id,
                    phoneNum,
                    count: Number(row?.message_count || 0),
                    isAdmin: p.admin === "admin" || p.admin === "superadmin"
                };
            }).filter(x => x.id && x.phoneNum !== botNum);
            list.sort((a, b) => b.count - a.count);
            const activeCount = list.filter(x => x.count > 0).length;
            const inactiveCount = list.filter(x => x.count === 0).length;
            let teks = `*📊 Actividad del grupo 📊*\n\n`;
            teks += `□ Grupo: ${metadata.subject || 'Sin nombre'}\n`;
            teks += `□ Total de miembros: ${participants.length}\n`;
            teks += `□ Miembros activos: ${activeCount}\n`;
            teks += `□ Miembros inactivos: ${inactiveCount}\n\n`;
            teks += `*□ Lista de miembros:*\n`;
            const mentions = [];
            // 🔥 MOSTRAR TODOS LOS MIEMBROS (sin límite)
            list.forEach((user) => {
                mentions.push(user.id);
                const badge = user.isAdmin ? " 👑" : "";
                teks += `➥ @${user.id.split("@")[0]}${badge} - Mensajes: ${user.count}\n`;
            });
            teks += `\n\n> Usa *${prefijo}${args[0] ? '' : 'contador'} reset* para reiniciar el contador.`;
            await conn.sendMessage(m.chat, { text: teks, mentions, contextInfo: {} }, { quoted: m });
        }
        catch (e) {
            console.error(e);
            m.reply("❌ Error mostrando el contador.");
        }
    }
};
