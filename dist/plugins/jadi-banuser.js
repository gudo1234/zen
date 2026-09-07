import { db, getBotSettings } from "../lib/db.js";
import { OWNERS } from "../handler.js";
export default {
    name: ["banuser", "unbanuser"],
    help: ["banuser @tag razón", "unbanuser @tag"],
    desc: "Banea o desbanea a un usuario del bot.",
    tags: ["jadibot", "owner"],
    owner: true,
    run: async ({ conn, m, args, prefijo, isOwner, cmd }) => {
        let userId = m.mentionedJid?.[0] || m.quoted?.sender;
        if (!userId && args[0]) {
            const num = args[0].replace(/[^0-9]/g, "");
            userId = `${num}@s.whatsapp.net`;
        }
        if (!userId)
            return m.reply("🤓 Etiqueta al usuario boludito");
        const botJid = conn.user?.id?.replace(/:\d+/, "");
        if (userId === botJid && cmd === "banuser") {
            return m.reply(`🤨 que gil polla no puede banearme a mi mismo jajajaajja`);
        }
        let realId = userId;
        let lid = null;
        try {
            const metadata = await conn.groupMetadata(m.chat);
            const participant = metadata.participants.find(p => {
                const pid = p.id?.replace(/:\d+/, "");
                const uid = userId.replace(/:\d+/, "");
                const phone = p.phoneNumber?.replace(/:\d+/, "");
                return pid === uid || phone === uid;
            });
            if (participant) {
                if (participant.id?.endsWith("@lid")) {
                    lid = participant.id;
                    realId = participant.phoneNumber || userId;
                }
                else {
                    realId = participant.id || userId;
                    lid = participant.lid || null;
                }
            }
        }
        catch (e) {
            console.log("❌ Error obteniendo metadata:", e.message);
        }
        if (userId.endsWith("@lid") && !lid)
            lid = userId;
        if (cmd === "banuser" && (realId === botJid || lid === botJid)) {
            return m.reply(`🤨 que gil polla no puede banearme a mi mismo jajajaajja`);
        }
        if (cmd === "banuser") {
            const targetNumber = (realId || "").replace(/[^0-9]/g, "");
            let botOwners = [];
            try {
                const botId = conn.user?.id?.split(":")[0];
                const settings = await getBotSettings(botId);
                botOwners = settings?.owners || [];
            }
            catch (e) {
                console.log("❌ Error obteniendo owners del bot:", e.message);
            }
            const isGlobalOwner = OWNERS.some(o => {
                const oNum = o.num || '';
                const oLid = o.lid || '';
                return oNum === targetNumber || oLid === lid;
            });
            const isBotOwner = botOwners.some((o) => {
                const oNum = o.num || '';
                const oLid = o.lid || '';
                return oNum === targetNumber || oLid === lid;
            });
            if (isGlobalOwner || isBotOwner) {
                return m.reply(`🤨 No podés banear a otro *owner*, quedate tranquilo.`);
            }
        }
        // === UNBANUSER ===
        if (cmd === "unbanuser") {
            // ✅ CORREGIDO: 1 placeholder, 1 parámetro
            const check = await db.query("SELECT banned, ban_warnings FROM usuarios WHERE id = $1 OR lid = $1", [realId || lid]);
            if (check.rows.length === 0) {
                return m.reply(`ℹ️ *Este usuario no existe en la base de datos.*`);
            }
            if (!check.rows[0].banned) {
                return m.reply(`ℹ️ *Este usuario NO está baneado.*`);
            }
            // ✅ CORREGIDO: 1 placeholder
            await db.query(`
        UPDATE usuarios 
        SET banned = false, 
            banned_reason = NULL,
            ban_warnings = 0
        WHERE lid = $1
      `, [lid || realId]);
            return conn.sendMessage(m.chat, {
                text: `✅ El usuario @${userId.split("@")[0]} ha sido *desbaneado* y puede volver a usar el bot`,
                mentions: [userId],
                contextInfo: {}
            }, { quoted: m });
        }
        // === BANUSER ===
        if (cmd === "banuser") {
            let ban = 'https://api.mitzuki.xyz/cdn/upload/file/6b0839b0dfd49de2e89f';
            const reason = args.slice(1).join(" ") || "spam";
            // ✅ CORREGIDO: 1 placeholder
            const check = await db.query("SELECT banned FROM usuarios WHERE id = $1 OR lid = $1", [realId || lid]);
            if (check.rows.length > 0 && check.rows[0].banned) {
                return m.reply(`ℹ️ *Este usuario YA está baneado.*`);
            }
            await db.query(`
        INSERT INTO usuarios (lid, id, banned, banned_reason, ban_warnings)
        VALUES ($1, $2, true, $3, 0)
        ON CONFLICT (lid) 
        DO UPDATE SET 
          id = EXCLUDED.id,
          banned = true, 
          banned_reason = EXCLUDED.banned_reason,
          ban_warnings = 0
      `, [lid || realId, realId, reason]);
            try {
                await conn.sendMessage(m.chat, {
                    audio: { url: ban },
                    ptt: false,
                    mimetype: 'audio/mpeg',
                    fileName: `error.mp3`
                }, { quoted: m });
                await conn.sendMessage(m.chat, {
                    text: `🚫 El usuario @${userId.split("@")[0]} ha sido *baneado* y no podrá usar el bot.${reason ? `\n\n📌 *Razón:* ${reason}` : ""}`,
                    mentions: [userId],
                    contextInfo: {}
                }, { quoted: m });
            }
            catch (e) {
                conn.sendMessage(m.chat, {
                    text: `🚫 El usuario @${userId.split("@")[0]} ha sido *baneado* y no podrá usar el bot.${reason ? `\n\n📌 *Razón:* ${reason}` : ""}`,
                    mentions: [userId],
                    contextInfo: {}
                }, { quoted: m });
            }
        }
    }
};
