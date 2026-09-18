export default {
    name: ["einfo"],
    help: ["einfo"],
    desc: "Muestra los cooldowns activos del usuario",
    tags: ["rpg"],
    register: true,
    run: async ({ conn, m }) => {
        if (!m.db)
            return;
        try {
            const { rows: [u] } = await m.db.query(`SELECT
          lastwork,
          lastclaim,
          lastrob,
          lastslut,
          lastmiming,
          crime,
          ry_time,
          timevot,
          lastrobanc,
          lasttraficar,
          lastcazar
        FROM usuarios
        WHERE id = $1 OR lid = $1`, [m.sender]);
            if (!u)
                return m.reply('⚠️ No tienes datos de usuario.');
            const now = Date.now();
            // DEFINICIÓN DE COOLDOWNS (ms)
            const cooldowns = [
                { label: 'Crime', last: u.crime, cd: 60 * 60 * 1000 },
                { label: 'Daily', last: u.lastclaim, cd: 24 * 60 * 60 * 1000 },
                { label: 'Work', last: u.lastwork, cd: 60 * 60 * 1000 },
                { label: 'Minar', last: u.lastmiming, cd: 10 * 60 * 1000 },
                { label: 'Rob', last: u.lastrob, cd: 30 * 60 * 1000 },
                { label: 'Robanco', last: u.lastrobanc, cd: 60 * 60 * 1000 },
                { label: 'Slut', last: u.lastslut, cd: 30 * 60 * 1000 },
                { label: 'rw (Roll waifu)', last: u.ry_time, cd: 10 * 60 * 1000 },
                { label: 'Vote', last: u.timevot, cd: 30 * 60 * 1000 },
                { label: 'Cazar', last: u.lastcazar, cd: 30 * 60 * 1000 },
               { label: 'Traficar', last: u.lasttraficar, cd: 30 * 60 * 1000 },
            ];
            let text = `\n\n`;
            for (const c of cooldowns) {
                const remaining = c.cd - (now - (c.last || 0));
                text += remaining > 0
                    ? `*• ${c.label}*: \`${msToTime(remaining)}\`\n`
                    : `*• ${c.label}*: ahora ✅\n`;
            }
            text += `\n> ⏱️ Refresca para ver el tiempo actualizado`;
            // ✅ OBTENER DISPLAY NAME PARA EL @tag
            let displayName = m.sender.split('@')[0];
            let mentionJid = m.sender;
            // Si es grupo, intentar obtener username de metadata
            if (m.isGroup) {
                try {
                    const metadata = await conn.groupMetadata(m.chat);
                    const participant = metadata.participants.find((p) => {
                        const ids = [p.id, p.phoneNumber, p.lid].filter(Boolean);
                        return ids.some(id => id === m.sender || id === m.sender.split('@')[0]);
                    });
                    if (participant) {
                        if (participant.username) {
                            displayName = participant.username;
                            mentionJid = participant.id || m.sender;
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
                    console.log("⚠️ Error obteniendo metadata para einfo:", e.message);
                }
            }
            return m.reply(`*[⏳] Cooldowns:* @${displayName}`, text.trim(), { mentions: [mentionJid] });
        }
        catch (err) {
            console.error("einfo error:", err);
            m.reply('⚠️ Error al obtener los cooldowns.');
        }
    }
};
/* ========= UTILS ========= */
function msToTime(ms) {
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60);
    const h = Math.floor(m / 60);
    const sec = s % 60;
    const min = m % 60;
    if (h > 0)
        return `${h}h ${min}m ${sec}s`;
    if (min > 0)
        return `${min}m ${sec}s`;
    return `${sec}s`;
}
