export default {
    name: ["perfil", "profile"],
    help: ["perfil <@tag>"],
    desc: "mostrar tu perfil o el un usuarios",
    tags: ["rpg"],
    register: true,
    run: async ({ conn, m, mentionedJid }) => {
        let who = mentionedJid?.[0] || m.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0] || m.quoted?.sender || m.sender;
        if (who && who.endsWith('@lid')) {
            try {
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
            catch (e) {
                const number = who.replace(/@lid$/, '');
                who = number + '@s.whatsapp.net';
            }
        }
        let displayName = who.split('@')[0];
        let mentionJid = who;
        if (m.isGroup) {
            try {
                const metadata = await conn.groupMetadata(m.chat);
                const participant = metadata.participants.find((p) => {
                    const ids = [p.id, p.phoneNumber, p.lid].filter(Boolean);
                    return ids.some(id => id === who || id === who.split('@')[0]);
                });
                if (participant) {
                    if (participant.username) {
                        displayName = participant.username;
                        mentionJid = participant.id || who;
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
                console.log("⚠️ Error obteniendo metadata para perfil:", e.message);
            }
        }
        const { rows: [u] } = await m.db.query(`SELECT nombre, edad, gender, birthday, limite, exp, 
             registered, reg_time, marry, level, role, warn_status, num
      FROM usuarios WHERE id = $1 OR lid = $1 OR num = $2`, [who, displayName]);
        let pais = null;
        let paisEmoji = '';
        let numReal = u?.num || displayName;
        if (numReal && numReal.length >= 10) {
            try {
                const res = await fetch(`https://api.mitzuki.xyz/tools/country?number=${numReal}&apikey=${process.env.API_KEY}`);
                const json = await res.json();
                if (json.status && json.data?.pais) {
                    pais = json.data.pais;
                    paisEmoji = json.data.emoji || '';
                }
            }
            catch (e) {
                console.log("⚠️ Error obteniendo país:", e.message);
            }
        }
        const paisStr = pais ? `\n▢ *País:* ${pais} ${paisEmoji}` : '';
        const nombre = u.nombre || "-";
        const edad = u.edad ? `\n▢ *Edad:* ${u.edad} años` : "";
        const genero = u.gender ? "\n▢ *Género:* " + u.gender.charAt(0).toUpperCase() + u.gender.slice(1) : "";
        const cumple = u.birthday ? "\n▢ *Cumpleaños:* " + new Date(u.birthday).toLocaleDateString('es-AR') : "";
        const regDate = u.reg_time ? new Date(u.reg_time).toLocaleString('es-AR') : "";
        let relacion = '❌ *No estás en ninguna relación, solter@ 🤑.*';
        if (u.marry) {
            const parejaRes = await m.db.query('SELECT nombre, num FROM usuarios WHERE id = $1 OR lid = $1', [u.marry]);
            const nombrePareja = parejaRes.rows[0]?.nombre || 'Desconocido';
            relacion = `💍 *Está en una relación con:* ${nombrePareja}`;
        }
        const txt = `*Perfil de @${displayName}*

▢ *Nombre:* ${nombre} ${edad} ${genero} ${cumple} ${paisStr}
▢ *Nivel:* ${u.level || 0} (${u.role || "Novato"})
▢ *Advertencias:* ${u.warn_status || 0}

▢ *${m.e.currency_emoji + m.e.currency_name}:* ${u.limite || 0}
▢ *⬆️ Experiencia:* ${u.exp?.toLocaleString("es-AR") || 0}

▢ *Relación:* ${relacion}
▢ *Registrado:* ${u.registered ? "No ❌" : "Si ✅"} (${regDate})
`.trim();
        let pp = 'https://telegra.ph/file/9d38415096b6c46bf03f8.jpg';
        try {
            pp = await conn.profilePictureUrl(who, 'image');
        }
        catch {
            // Si falla, usar imagen por defecto
            pp = 'https://telegra.ph/file/9d38415096b6c46bf03f8.jpg';
        }
        await conn.sendMessage(m.chat, {
            image: { url: pp },
            caption: txt,
            mentions: [mentionJid]
        }, { quoted: m });
    }
};
