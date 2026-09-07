import { db } from "../lib/db.js";
const cleanJid = (jid = '') => String(jid || '').replace(/:\d+/, '');
const onlyNum = (v = '') => String(v || '').replace(/[^0-9]/g, '');
export default {
    name: ["addpremium", "darpremium", "premiumadd", "delpremium", "quitarpremium", "removepremium", "delprem"],
    help: ["addprem", "delprem"],
    tags: ["owner", "jadibot"],
    desc: "Da o quita premium a un usuario",
    owner: true,
    register: true,
    run: async ({ conn, m, args, text, cmd, prefijo }) => {
        const isDelete = /delpremium|quitarpremium|removepremium|delprem/i.test(cmd);
        let who = m.isGroup ? m.mentionedJid?.[0] : m.chat;
        if (!who && m.quoted) {
            who = m.quoted.sender || m.quoted.participant;
        }
        if (!who) {
            if (isDelete) {
                return m.reply(`⚠️ Etiqueta a una persona con el @tag, responde a su mensaje o escribe el número.\n\n📌 *Ejemplos:*\n${prefijo + cmd} @user\n${prefijo + cmd} +573012345678\n${prefijo + cmd} (respondiendo a un mensaje)`);
            }
            return m.reply(`⚠️ Etiqueta a una persona con el @tag, responde a su mensaje o escribe el número.\n\n📌 *Ejemplos:*\n${prefijo + cmd} @user 7d\n${prefijo + cmd} +573012345678 30d\n${prefijo + cmd} @user 2h\n${prefijo + cmd} @user (1 día por defecto)`);
        }
        try {
            who = cleanJid(who);
            const num = onlyNum(who);
            let user = null;
            let realJid = null;
            const resUser = await db.query(`SELECT * FROM usuarios WHERE id = $1 OR lid = $1 OR num = $2`, [who, num]);
            if (resUser.rows.length)
                user = resUser.rows[0];
            if (!user)
                return m.reply("❌ Ese usuario no está registrado en la base de datos.");
            if (user?.id && user.id.includes('@s.whatsapp.net')) {
                realJid = user.id;
            }
            else if (user?.num) {
                realJid = `${user.num}@s.whatsapp.net`;
            }
            else if (num) {
                realJid = `${num}@s.whatsapp.net`;
            }
            else if (who.includes('@s.whatsapp.net')) {
                realJid = who;
            }
            else {
                realJid = who;
            }
            const lid = user?.lid || '';
            // ============================================
            // 🔥 DELPREMIUM
            // ============================================
            if (isDelete) {
                if (!user?.premium) {
                    return m.reply(`❌ @${realJid.split('@')[0]} no tiene premium activo.`, { mentions: [realJid] });
                }
                await db.query(`UPDATE usuarios 
           SET premium = false, 
               premium_until = 0
           WHERE lid = $1`, [lid]);
                return m.reply(`*≡ PREMIUM ELIMINADO*\n` +
                    `┌─────────────────\n` +
                    `├ *Usuario:* @${realJid.split('@')[0]}\n` +
                    `├ *Estado:* ❌ Premium eliminado\n` +
                    `└─────────────────`, { mentions: [realJid] });
            }
            // ============================================
            // 🔥 ADDPREMIUM
            // ============================================
            // 🔥 Por defecto: 1 día
            let tiempo = "1d";
            let tiempoEnMs = 86400000;
            // 🔥 Solo buscar patrón de tiempo (ej: 7d, 30d, 2h, etc)
            const timeMatch = text.match(/(\d+)(d|h|m|w|M)/i);
            if (timeMatch) {
                const numTime = parseInt(timeMatch[1]);
                const unit = timeMatch[2].toLowerCase();
                tiempo = timeMatch[0];
                // 🔥 Límite de seguridad
                if (numTime > 365 && unit === 'd') {
                    return m.reply(`❌ No puedes dar más de 365 días de premium.`);
                }
                if (numTime > 8760 && unit === 'h') {
                    return m.reply(`❌ No puedes dar más de 8760 horas de premium.`);
                }
                switch (unit) {
                    case 'm':
                        tiempoEnMs = numTime * 60 * 1000;
                        break;
                    case 'h':
                        tiempoEnMs = numTime * 60 * 60 * 1000;
                        break;
                    case 'd':
                        tiempoEnMs = numTime * 24 * 60 * 60 * 1000;
                        break;
                    case 'w':
                        tiempoEnMs = numTime * 7 * 24 * 60 * 60 * 1000;
                        break;
                    case 'M':
                        tiempoEnMs = numTime * 30 * 24 * 60 * 60 * 1000;
                        break;
                    default: tiempoEnMs = numTime * 24 * 60 * 60 * 1000;
                }
            }
            // 🔥 Si NO hay timeMatch, usar el valor por defecto (1 día)
            // NO usar soloNum porque puede ser el número de teléfono
            const now = Date.now();
            // 🔥 Verificar si expiró y actualizar premium = false
            if (user?.premium === true && user?.premium_until && Number(user.premium_until) <= now) {
                await db.query(`UPDATE usuarios SET premium = false WHERE lid = $1`, [lid]);
                console.log(`🔄 [ADDPREM] Premium expirado, actualizado a false para ${lid}`);
            }
            const until = now + tiempoEnMs; // 🔥 Sin Number() para evitar notación científica
            const isPremium = user?.premium === true && user?.premium_until && Number(user.premium_until) > now;
            console.log(`🔍 [ADDPREM] now: ${now}, tiempoEnMs: ${tiempoEnMs}, until: ${until}`);
            await db.query(`UPDATE usuarios 
         SET premium = true, 
             premium_until = $1::bigint
         WHERE lid = $2`, [until, lid]);
            const formatTime = (ms) => {
                const seconds = Math.floor(ms / 1000);
                const minutes = Math.floor(seconds / 60);
                const hours = Math.floor(minutes / 60);
                const days = Math.floor(hours / 24);
                const weeks = Math.floor(days / 7);
                const months = Math.floor(days / 30);
                if (months > 0)
                    return `${months} mes${months > 1 ? 'es' : ''}`;
                if (weeks > 0)
                    return `${weeks} semana${weeks > 1 ? 's' : ''}`;
                if (days > 0)
                    return `${days} día${days > 1 ? 's' : ''}`;
                if (hours > 0)
                    return `${hours} hora${hours > 1 ? 's' : ''}`;
                if (minutes > 0)
                    return `${minutes} minuto${minutes > 1 ? 's' : ''}`;
                return `${seconds} segundos`;
            };
            const tiempoFormateado = formatTime(tiempoEnMs);
            const fechaExpiracion = new Date(until).toLocaleString('es-ES', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
            return m.reply(`*≡ PREMIUM ACTIVADO*\n` +
                `┌─────────────────\n` +
                `├ *Usuario:* @${realJid.split('@')[0]}\n` +
                `├ *Estado:* ${isPremium ? '✅ Renovado' : '✅ Activado'}\n` +
                `├ *Tiempo:* ${tiempoFormateado}\n` +
                `├ *Expira:* ${fechaExpiracion}\n` +
                `└─────────────────`, { mentions: [realJid] });
        }
        catch (e) {
            console.error(e);
            return m.reply(`❌ Error: ${e.message}`);
        }
    }
};
