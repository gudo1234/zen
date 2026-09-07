import { db } from "../lib/db.js";
export default {
    name: ["warn", "advertir"],
    help: "warn",
    desc: "agregar una advertencia a un usuario.",
    tags: ["group"],
    group: true,
    admin: true,
    botAdmin: true,
    run: async ({ conn, m, args, text }) => {
        let user = m.mentionedJid?.[0] || m.quoted?.sender;
        if (!user && args[0]) {
            const num = args[0].replace(/[^0-9]/g, "");
            user = `${num}@s.whatsapp.net`;
        }
        if (!user)
            return m.reply("⚠️ Etiqueta o responde al usuario.");
        // motivo opcional
        let reason = "";
        if (m.mentionedJid?.length) {
            reason = text.replace(/@\d+/g, "").trim();
        }
        else {
            reason = args.slice(1).join(" ").trim();
        }
        if (!reason)
            reason = "Sin motivo";
        const group = m.chat;
        const adminName = m.pushName || "Admin";
        // asegurar registro
        await db.query(`
INSERT INTO warn_status (user_id, group_id, warns)
VALUES ($1, $2, 0)
ON CONFLICT (user_id, group_id) DO NOTHING
`, [user, group]);
        // sumar warn
        const res = await db.query(`
UPDATE warn_status
SET warns = warns + 1
WHERE user_id = $1 AND group_id = $2
RETURNING warns
`, [user, group]);
        const warns = res.rows[0].warns;
        // limite
        const limitRes = await db.query(`
SELECT warn_limit
FROM chats
WHERE group_id = $1
LIMIT 1
`, [group]);
        const limit = limitRes.rows[0]?.warn_limit || 3;
        // expulsión
        if (warns >= limit) {
            await conn.sendMessage(group, { text: `⚠️ *LÍMITE DE ADVERTENCIAS ALCANZADO*

👤 Usuario: @${user.split("@")[0]}
👮 Admin: ${adminName}
📄 Razón: ${reason}
⚠️ Advertencias: ${warns}/${limit}

🚫 Será eliminado del grupo...`, mentions: [user], contextInfo: {} }, { quoted: m });
            await new Promise(resolve => setTimeout(resolve, 2000));
            await conn.groupParticipantsUpdate(group, [user], "remove");
            await db.query(`
  DELETE FROM warn_status
  WHERE user_id = $1 AND group_id = $2
  `, [user, group]);
            return;
        }
        await conn.sendMessage(group, { text: `*⚠️ ADVERTENCIA ⚠️*

@${user.split("@")[0]} fuiste advertido por el admin: ${adminName}
*• Razón:* ${reason}
*• Tiene:* ${warns}/${limit} advertencias`, mentions: [user], contextInfo: {} }, { quoted: m });
    }
};
