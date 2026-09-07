const COOLDOWN = 3 * 60 * 1000; // 3 minutos por chat
const cooldowns = new Map();
export default {
    name: ["lb", "leaderboard"],
    help: ["lb"],
    tags: ["econ"],
    register: true,
    run: async ({ conn, m, args }) => {
        const chatId = m.chat;
        const now = Date.now();
        const chatData = cooldowns.get(chatId) || { lastUsed: 0, rankingMessage: null };
        const timeLeft = COOLDOWN - (now - chatData.lastUsed);
        if (timeLeft > 0) {
            const seg = Math.ceil(timeLeft / 1000);
            const min = Math.floor(seg / 60);
            const s = seg % 60;
            return conn.reply(m.chat, `⚠️ Hey @${m.sender.split('@')[0]} Ya se mostró el ranking pendejo 🙄, Solo se muestra cada 3 minutos para evitar spam, Desplázate hacia arriba para verlo completo.👆`, chatData.rankingMessage || m);
        }
        const res = await m.db.query("SELECT id, lid, num, nombre, exp, limite, banco FROM usuarios");
        const users = res.rows;
        const topExp = [...users].sort((a, b) => b.exp - a.exp);
        const topDiam = [...users].sort((a, b) => b.limite - a.limite);
        const topBank = [...users].sort((a, b) => b.banco - a.banco);
        const len = args[0] ? Math.min(50, Math.max(parseInt(args[0]), 5)) : 10;
        // 🔥 Función para obtener ID válido para mención
        const getMentionId = (user) => {
            if (user.id && user.id.includes('@s.whatsapp.net'))
                return user.id;
            if (user.num)
                return `${user.num}@s.whatsapp.net`;
            if (user.lid)
                return user.lid;
            if (user.id)
                return user.id;
            return '0@s.whatsapp.net'; // fallback
        };
        // 🔥 Función para obtener nombre de usuario
        const getUserName = (user) => {
            if (user.nombre)
                return user.nombre;
            const id = getMentionId(user);
            return id.split('@')[0] || '???';
        };
        const fmt = (list, key, icon) => list.slice(0, len).map((u, i) => {
            const id = getMentionId(u);
            const name = getUserName(u);
            const value = u[key]?.toLocaleString("es-AR") || 0;
            return `${i + 1}. @${id.split('@')[0]} • ${value} ${icon}`;
        }).join("\n");
        // 🔥 Posición del usuario
        const getPos = (list, key) => {
            // Buscar por id, lid o num
            const idx = list.findIndex(u => {
                const userId = m.sender;
                return u.id === userId ||
                    u.lid === userId ||
                    (u.num && `${u.num}@s.whatsapp.net` === userId) ||
                    u.id === m.sender ||
                    u.lid === m.lid;
            });
            return idx + 1 || "No estás";
        };
        const tuPosExp = getPos(topExp, 'exp');
        const tuPosDiam = getPos(topDiam, 'limite');
        const tuPosBank = getPos(topBank, 'banco');
        const mentions = [];
        const txtLines = [];
        txtLines.push(`\`🏆 𝚃𝙰𝙱𝙻𝙰 𝙳𝙴 𝙲𝙻𝙰𝚂𝙸𝙲𝙰𝙲𝙸𝙾𝙽\``);
        txtLines.push(``);
        txtLines.push(`💠 *TOP ${len} XP 🎯*`);
        txtLines.push(`Tu posición: *${tuPosExp}* de ${topExp.length}`);
        const expLines = topExp.slice(0, len).map((u, i) => {
            const id = getMentionId(u);
            const name = getUserName(u);
            const value = u.exp?.toLocaleString("es-AR") || 0;
            if (id !== '0@s.whatsapp.net')
                mentions.push(id);
            return `${i + 1}. @${id.split('@')[0]} • ${value} ⚡`;
        });
        txtLines.push(expLines.join("\n"));
        txtLines.push(``);
        txtLines.push(`┈┈┈┈┈┈┈┈┈┈┈`);
        txtLines.push(``);
        txtLines.push(`💠 *TOP ${len} ${m.e.currency_name || 'Diamante(s)'}* ${m.e.currency_emoji || '💎'}`);
        txtLines.push(`Tu posición: *${tuPosDiam}* de ${topDiam.length}`);
        const diamLines = topDiam.slice(0, len).map((u, i) => {
            const id = getMentionId(u);
            const name = getUserName(u);
            const value = u.limite?.toLocaleString("es-AR") || 0;
            if (id !== '0@s.whatsapp.net')
                mentions.push(id);
            return `${i + 1}. @${id.split('@')[0]} • ${value} ${m.e.currency_emoji || '💎'}`;
        });
        txtLines.push(diamLines.join("\n"));
        txtLines.push(``);
        txtLines.push(`┈┈┈┈┈┈┈┈┈┈┈`);
        txtLines.push(``);
        txtLines.push(`💠 *TOP ${len} MILLONARIO(S) 💵* _(Usuarios con mas dinero en el banco)_`);
        txtLines.push(`Tu posición: *${tuPosBank}* de ${topBank.length}`);
        const bankLines = topBank.slice(0, len).map((u, i) => {
            const id = getMentionId(u);
            const name = getUserName(u);
            const value = u.banco?.toLocaleString("es-AR") || 0;
            if (id !== '0@s.whatsapp.net')
                mentions.push(id);
            return `${i + 1}. @${id.split('@')[0]} • ${value} 💵`;
        });
        txtLines.push(bankLines.join("\n"));
        const txt = txtLines.join("\n");
        const rankingMessage = await conn.sendMessage(chatId, {
            text: txt,
            mentions: mentions.filter(Boolean)
        }, { quoted: m });
        cooldowns.set(chatId, { lastUsed: now, rankingMessage });
        //cooldowns.set(chatId, { last: now, msg: sent });
    }
};
