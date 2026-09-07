const cooldown = 30_000;
const retos = new Map();
const jugadas = new Map();
const cooldowns = new Map();
const jugadasValidas = ['piedra', 'papel', 'tijera'];
const EMOJIS = { 'piedra': '🗿', 'papel': '📄', 'tijera': '✂️' };
function evaluar(a, b) {
    if (a === b)
        return 'empate';
    if ((a === 'piedra' && b === 'tijera') || (a === 'tijera' && b === 'papel') || (a === 'papel' && b === 'piedra'))
        return 'gana';
    return 'pierde';
}
function formatNumber(n) {
    return n.toLocaleString('en').replace(/,/g, '.');
}
function msToTime(ms) {
    const s = Math.floor(ms / 1000) % 60;
    const m = Math.floor(ms / 60000) % 60;
    return `${m ? `${m}m ` : ''}${s}s`;
} //`
// ========== OBTENER LID DE UN JID ==========
async function getLidFromJid(conn, chatId, jid) {
    try {
        if (!jid)
            return null;
        const meta = await conn.groupMetadata(chatId);
        const participant = meta.participants.find((p) => {
            const ids = [p.id, p.jid, p.lid, p.phoneNumber, p.username].filter(Boolean);
            return ids.some(id => id === jid || id === jid.replace(/:\d+/, ""));
        });
        if (participant?.lid)
            return participant.lid;
        if (participant?.id && participant.id.endsWith('@lid'))
            return participant.id;
        return null;
    }
    catch (e) {
        return null;
    }
}
// ========== OBTENER DISPLAY NAME ==========
async function getDisplayName(conn, chatId, jid) {
    try {
        if (!jid)
            return '???';
        const meta = await conn.groupMetadata(chatId);
        const participant = meta.participants.find((p) => {
            const ids = [p.id, p.jid, p.lid, p.phoneNumber, p.username].filter(Boolean);
            return ids.some(id => id === jid || id === jid.replace(/:\d+/, ""));
        });
        if (participant?.username)
            return participant.username;
        if (participant?.phoneNumber)
            return participant.phoneNumber.split('@')[0];
        if (participant?.id)
            return participant.id.split('@')[0];
        return jid.split('@')[0];
    }
    catch {
        return jid.split('@')[0];
    }
}
const before = async (m, { conn }) => {
    let fkontak = { key: { participants: "0@s.whatsapp.net", remoteJid: "status@broadcast", fromMe: false, id: "Halo" }, message: { contactMessage: { vcard: `BEGIN:VCARD\nVERSION:3.0\nN:Sy;Bot;;;\nFN:y\nitem1.TEL;waid=${m.sender.split('@')[0]}:${m.sender.split('@')[0]}\nitem1.X-ABLabel:Ponsel\nEND:VCARD` } }, participant: "0@s.whatsapp.net" };
    const texto = (m.originalText || m.text || "").trim().toLowerCase();
    if (!texto)
        return;
    if (texto.startsWith("✅ exp_ganada:")) {
        const exp = parseInt(texto.replace("✅ exp_ganada:", "").trim());
        if (exp > 0) {
            await m.db.query(`UPDATE usuarios SET exp = exp + $1 WHERE id = $2`, [exp, m.sender]);
            await m.reply(`🏆 +${exp} EXP ganados!`);
        }
        return;
    }
    // SOLO EN GRUPOS para aceptar/rechazar
    if (m.chat?.endsWith("@g.us")) {
        if (texto.startsWith("/") || texto.startsWith(".") || texto.startsWith("!"))
            return;
        const userId = m.sender;
        const userLid = m.lid || userId;
        // ========== ACEPTAR / RECHAZAR RETO ==========
        if (['aceptar', 'rechazar'].includes(texto)) {
            let reto = null;
            let retoKey = null;
            if (retos.has(userLid)) {
                reto = retos.get(userLid);
                retoKey = userLid;
            }
            if (!reto && retos.has(userId)) {
                reto = retos.get(userId);
                retoKey = userId;
            }
            if (!reto)
                return;
            const { retador, chat, timeout } = reto;
            clearTimeout(timeout);
            retos.delete(retoKey);
            const retadorName = await getDisplayName(conn, chat, retador);
            const userName = await getDisplayName(conn, chat, userId);
            if (texto === 'rechazar') {
                return conn.sendMessage(chat, {
                    text: `⚠️ @${userName} rechazó el reto.`,
                    mentions: [userId, retador]
                }, { quoted: m });
            }
            const botNumber = conn.user?.id?.split(':')[0] || '';
            const botLink = `wa.me/${botNumber}`;
            jugadas.set(chat, {
                jugadores: [retador, userId],
                eleccion: {},
                timeout: setTimeout(() => {
                    jugadas.delete(chat);
                    conn.sendMessage(chat, { text: `⏰ El duelo expiró por inactividad.` });
                }, 60000)
            });
            await conn.sendMessage(chat, {
                text: `✅ Reto aceptado.\n\n📌 @${retadorName} y @${userName} deben escribir su jugada en el *PRIVADO del bot*.\n\n✊ *piedra*  |  🖐 *papel*  |  ✌️ *tijera*\n\n👉 Abre el privado: ${botLink}\n\n> El bot no le vas enviar ningún mensaje al privado,ustedes tiene que ir directo y escribe solo la palabra correspondiente: *papel* o *tijera* o "piedra*`,
                mentions: [retador, userId]
            }, { quoted: m });
            return;
        }
    }
    // ========== DETECTAR JUGADA EN PRIVADO ==========
    if (jugadasValidas.includes(texto) && !m.chat?.endsWith("@g.us")) {
        console.log(`🎮 PPT: ${m.sender} eligió ${texto} en privado`);
        let partidaEncontrada = false;
        for (const [chat, partida] of jugadas) {
            const { jugadores, eleccion, timeout } = partida;
            if (!jugadores.includes(m.sender))
                continue;
            partidaEncontrada = true;
            if (eleccion[m.sender] !== undefined) {
                await conn.sendMessage(m.sender, { react: { text: '⚠️', key: m.key } });
                return;
            }
            eleccion[m.sender] = texto;
            await conn.sendMessage(m.sender, { react: { text: '✅', key: m.key } });
            const elegidos = Object.keys(eleccion).length;
            const total = jugadores.length;
            const name = await getDisplayName(conn, chat, m.sender);
            const otros = jugadores.filter(j => j !== m.sender);
            const otroName = await getDisplayName(conn, chat, otros[0]);
            if (elegidos < total) {
                await conn.sendMessage(chat, {
                    text: `🎮 @${name} ya eligió. Esperando a @${otroName}...`,
                    mentions: [m.sender, ...otros]
                }, { quoted: fkontak || null });
            }
            if (Object.keys(eleccion).length < total)
                return;
            clearTimeout(timeout);
            jugadas.delete(chat);
            const [j1, j2] = jugadores;
            const jugada1 = eleccion[j1];
            const jugada2 = eleccion[j2];
            const resultado = evaluar(jugada1, jugada2);
            const xp = Math.floor(Math.random() * 2000) + 500;
            const name1 = await getDisplayName(conn, chat, j1);
            const name2 = await getDisplayName(conn, chat, j2);
            let mensaje = `✊🖐✌️ *PIEDRA, PAPEL O TIJERA*\n\n@${name1} → *${jugada1}* ${EMOJIS[jugada1]}\n@${name2} → *${jugada2}* ${EMOJIS[jugada2]}\n\n`;
            if (resultado === 'empate') {
                mensaje += '🤝 *EMPATE* - Nadie gana ni pierde XP.';
            }
            else {
                const ganador = resultado === 'gana' ? j1 : j2;
                const perdedor = ganador === j1 ? j2 : j1;
                await m.db.query('UPDATE usuarios SET exp = exp + $1 WHERE id = $2', [xp * 2, ganador]);
                await m.db.query('UPDATE usuarios SET exp = exp - $1 WHERE id = $2', [xp, perdedor]);
                const ganadorName = await getDisplayName(conn, chat, ganador);
                const perdedorName = await getDisplayName(conn, chat, perdedor);
                mensaje += `🎉 @${ganadorName} *GANÓ* +${formatNumber(xp * 2)} XP\n💀 @${perdedorName} perdió ${formatNumber(xp)} XP`;
            }
            return conn.sendMessage(chat, { text: mensaje, mentions: [j1, j2] }, { quoted: fkontak || null });
        }
        if (!partidaEncontrada) {
            await conn.sendMessage(m.sender, { react: { text: '❌', key: m.key } });
        }
    }
};
export default {
    name: ["ppt", "suit", "pvp", "suitpvp"],
    help: ["ppt piedra|papel|tijera", "ppt @usuario"],
    desc: "Jugar Piedra Papel o Tijera",
    tags: ["game"],
    group: true,
    register: true,
    before: before,
    run: async ({ conn, m, args, prefijo, cmd }) => {
        const userId = m.sender;
        const chatId = m.chat;
        const lid = m.lid || "";
        // ✅ COOLDOWN AL PRINCIPIO
        const now = Date.now();
        const cooldownRestante = (cooldowns.get(userId) || 0) + cooldown - now;
        if (cooldownRestante > 0) {
            return conn.fakeReply(m.chat, `*🕓 𝙃𝙚𝙮, 𝙀𝙨𝙥𝙚𝙧𝙖 ${msToTime(cooldownRestante)} 𝙖𝙣𝙩𝙚𝙨 𝙙𝙚 𝙪𝙨𝙖𝙧 𝙤𝙩𝙧𝙤𝙨 𝙘𝙤𝙢𝙖𝙣𝙙𝙤*`, m.sender, `ᴺᵒ ʰᵃᵍᵃⁿ ˢᵖᵃᵐ`, 'status@broadcast');
        }
        const input = args[0]?.toLowerCase();
        // ========== JUGAR CONTRA BOT ==========
        if (jugadasValidas.includes(input)) {
            cooldowns.set(userId, now);
            const botJugada = jugadasValidas[Math.floor(Math.random() * 3)];
            const resultado = evaluar(input, botJugada);
            const xp = Math.floor(Math.random() * 2000) + 500;
            let text = '';
            let result = '';
            if (resultado === 'gana') {
                await m.db.query('UPDATE usuarios SET exp = exp + $1 WHERE id = $2', [xp, userId]);
                text += `✅ *Ganaste* y obtuviste *${formatNumber(xp)} XP*`;
                result = '𝙃𝘼 𝙂𝘼𝙉𝘼𝘿𝙊! 🎉';
            }
            else if (resultado === 'pierde') {
                const user = await m.db.query('SELECT exp FROM usuarios WHERE id = $1 OR lid = $2 LIMIT 1', [userId, lid]);
                const expActual = user.rows[0]?.exp || 0;
                const nuevaXP = Math.max(0, expActual - xp);
                await m.db.query('UPDATE usuarios SET exp = $1 WHERE id = $2', [nuevaXP, userId]);
                text += `❌ *Perdiste*. Te quitaron *${formatNumber(xp)} XP*`;
                result = '𝙃𝘼 𝙋𝙀𝙍𝘿𝙄𝘿𝙊! 🤡';
            }
            else {
                result = '𝙀𝙈𝙋𝘼𝙏𝙀 🤝';
                text += `🤝 *Empate*. No ganaste ni perdiste XP.`;
            }
            return m.reply(`\`「 ${result} 」\``, `👉 El Bot: ${botJugada} ${EMOJIS[botJugada]}\n👉 Tú: ${input} ${EMOJIS[input]}\n\n${text}`);
        }
        // ========== RESOLVER OPPONENT ==========
        let opponent = m.mentionedJid?.[0] ||
            m.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
        if (!opponent) {
            const match = m.originalText?.match(/@([a-zA-Z0-9_]+)/);
            if (match) {
                const username = match[1];
                try {
                    const meta = await conn.groupMetadata(chatId);
                    const participant = meta.participants.find((p) => p.username === username);
                    if (participant?.lid)
                        opponent = participant.lid;
                    else if (participant?.phoneNumber)
                        opponent = participant.phoneNumber;
                    else if (participant?.id)
                        opponent = participant.id;
                }
                catch (e) { }
            }
        }
        if (!opponent) {
            const matchNum = m.originalText?.match(/@([0-9]{5,15})/);
            if (matchNum) {
                opponent = `${matchNum[1]}@s.whatsapp.net`;
            }
        }
        if (!opponent) {
            return m.reply(`𝐏𝐢𝐞𝐝𝐫𝐚 🗿, 𝐏𝐚𝐩𝐞𝐥 📄 𝐨 𝐓𝐢𝐣𝐞𝐫𝐚 ✂️`, `👾 𝙅𝙪𝙜𝙖𝙧 𝙘𝙤𝙣 𝙚𝙡 𝙗𝙤𝙩:\n• ${prefijo + cmd} piedra\n• ${prefijo + cmd} papel\n• ${prefijo + cmd} tijera\n\n🕹 𝙅𝙪𝙜𝙖𝙧 𝙘𝙤𝙣 𝙪𝙣 𝙪𝙨𝙪𝙖𝙧𝙞𝙤:\n${prefijo + cmd} @usuario`);
        }
        // ========== RETAR A USUARIO ==========
        if (opponent === userId) {
            return m.reply(null, '⚠️ No puedes jugar contra ti mismo.');
        }
        cooldowns.set(userId, now);
        // BUSCAR EN DB
        const oppCheck = await m.db.query(`SELECT id, lid, num FROM usuarios WHERE id = $1 OR lid = $1 OR num = $2`, [opponent, opponent.replace(/[^0-9]/g, "")]);
        if (!oppCheck.rows.length) {
            try {
                const meta = await conn.groupMetadata(chatId);
                const participant = meta.participants.find((p) => {
                    return p.username === opponent || p.username?.toLowerCase() === opponent.toLowerCase();
                });
                if (participant?.lid) {
                    const oppCheck2 = await m.db.query(`SELECT id, lid, num FROM usuarios WHERE lid = $1`, [participant.lid]);
                    if (oppCheck2.rows.length) {
                        oppCheck.rows = oppCheck2.rows;
                    }
                }
            }
            catch (e) { }
        }
        if (!oppCheck.rows.length) {
            return m.reply(null, `⚠️ El usuario mencionado no está registrado.`);
        }
        const oppData = oppCheck.rows[0];
        const opponentLid = oppData.lid || oppData.id;
        if (retos.has(opponentLid)) {
            return m.reply(null, '⚠️ Ese usuario ya tiene un reto pendiente.');
        }
        const oppDisplay = await getDisplayName(conn, chatId, opponent);
        const userDisplay = await getDisplayName(conn, chatId, userId);
        const botNumber = conn.user?.id?.split(':')[0] || '';
        const botLink = `wa.me/${botNumber}`;
        retos.set(opponentLid, {
            retador: userId,
            chat: chatId,
            timeout: setTimeout(() => {
                retos.delete(opponentLid);
                conn.sendMessage(chatId, {
                    text: `⏳ 𝙏𝙄𝙀𝙈𝙋𝙊 𝘼𝙂𝙊𝙏𝘼𝘿𝙊, 𝙀𝙇 𝙋𝙑𝙋 𝙎𝙀 𝘾𝘼𝙉𝘾𝙀𝙇𝘼 𝙋𝙊𝙍 𝙁𝘼𝙇𝙏𝘼 𝘿𝙀 𝙍𝙀𝙎𝙋𝙐𝙀𝙎𝙏𝘼 𝘿𝙀 @${oppDisplay}`,
                    mentions: [opponentLid]
                });
            }, 60000)
        });
        return conn.sendMessage(chatId, {
            text: `🎮👾 𝙋𝙑𝙋 - 𝙋𝙄𝙀𝘿𝙍𝘼, 𝙋𝘼𝙋𝙀𝙇 𝙊 𝙏𝙄𝙅𝙀𝙍𝘼 👾🎮\n\n@${userDisplay} 𝘿𝙀𝙎𝘼𝙁𝙄𝘼 𝘼 @${oppDisplay}.\n\n> _*Escribe (aceptar) para aceptar*_\n> _*Escribe (rechazar) para rechazar*_`,
            mentions: [userId, opponentLid]
        }, { quoted: m });
    }
};
