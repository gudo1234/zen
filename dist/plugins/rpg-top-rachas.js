import { db } from "../lib/db.js";
const DAY = 24 * 60 * 60 * 1000;
const PAGE_SIZE = 10;
const titulos = [
    { min: 365, emoji: '👑', title: 'LEGENDARIO' },
    { min: 180, emoji: '💎', title: 'MASTER' },
    { min: 90, emoji: '🌟', title: 'EXPERTO' },
    { min: 30, emoji: '⭐', title: 'DEDICADO' },
    { min: 14, emoji: '🔥', title: 'ACTIVO' },
    { min: 7, emoji: '💪', title: 'CONSTANTE' },
];
function getTitulo(streak) {
    for (const t of titulos) {
        if (streak >= t.min)
            return `${t.emoji} ${t.title}`;
    }
    return '🆕 NUEVO';
}
function getEmojiRacha(streak) {
    if (streak >= 100)
        return '🏆';
    if (streak >= 50)
        return '🥇';
    if (streak >= 30)
        return '🏅';
    if (streak >= 14)
        return '⭐';
    if (streak >= 7)
        return '🔥';
    return '💪';
}
function getProgreso(streak) {
    const niveles = [7, 14, 30, 50, 100, 180, 365];
    let siguiente = niveles.find(n => n > streak);
    if (!siguiente)
        return '🏆 ¡Máximo nivel!';
    const progress = Math.round((streak / siguiente) * 100);
    const barras = '█'.repeat(Math.min(Math.floor(progress / 10), 10));
    const vacias = '░'.repeat(10 - barras.length);
    return `🎯 ${siguiente} días (${barras}${vacias}) ${progress}%`;
}
// ===== OBTENER DISPLAY NAME (PRIORIDAD: num > nombre > name > id) =====
function getDisplayName(user) {
    // 1. Si tiene número (num)
    if (user?.num) {
        return { tag: `@${user.num}`, mention: `${user.num}@s.whatsapp.net` };
    }
    // 2. Si tiene nombre
    if (user?.nombre) {
        return { tag: user.nombre, mention: null };
    }
    // 3. Si tiene name
    if (user?.name) {
        return { tag: user.name, mention: null };
    }
    // 4. Si tiene id (JID) intentar extraer número
    if (user?.id) {
        const num = user.id.replace(/@.+/, '');
        if (num && num.length >= 6) {
            return { tag: `@${num}`, mention: `${num}@s.whatsapp.net` };
        }
    }
    // 5. Último recurso
    return { tag: 'Usuario', mention: null };
}
export default {
    name: ["topstreak", "streaktop", "streak", "rachas", "topracha"],
    help: ["topstreak", "topracha"],
    desc: "Ranking de rachas diarias activas",
    tags: ["econ"],
    register: true,
    run: async ({ conn, m, args }) => {
        try {
            const now = Date.now();
            const page = Math.max(1, parseInt(args[0]) || 1);
            const offset = (page - 1) * PAGE_SIZE;
            const res = await db.query(`
        SELECT id, nombre, name, num, dailystreak, lastclaim, level, limite, premium
        FROM usuarios
        WHERE dailystreak > 0
        ORDER BY dailystreak DESC
      `);
            if (!res.rowCount) {
                return m.reply(`⚠️ *No hay usuarios activos en racha.*\n\n📌 ¡Reclama tu recompensa diaria usando *${m.prefijo || '/'}claim* para aparecer aquí!`);
            }
            const activos = res.rows.filter(u => u.lastclaim && now - Number(u.lastclaim) < DAY * 2);
            if (!activos.length) {
                return m.reply(`⚠️ *No hay usuarios activos en racha.*\n\n📌 ¡Reclama tu recompensa diaria usando *${m.prefijo || '/'}claim* para aparecer aquí!`);
            }
            const total = activos.length;
            const paginated = activos.slice(offset, offset + PAGE_SIZE);
            if (!paginated.length) {
                return m.reply(`⚠️ *Página ${page} no encontrada.*\n\n📌 Total de páginas: ${Math.ceil(total / PAGE_SIZE)}`);
            }
            const rachaMaxima = activos.reduce((max, u) => Math.max(max, Number(u.dailystreak)), 0);
            const promedioRacha = Math.round(activos.reduce((sum, u) => sum + Number(u.dailystreak), 0) / total);
            let text = `🏆 *TOP RACHAS DIARIAS*\n`;
            text += `━━━━━━━━━━━━━━━━━━━━━\n`;
            text += `📊 *Usuarios en racha:* ${total}\n`;
            text += `📄 *Página ${page}/${Math.ceil(total / PAGE_SIZE)}*\n`;
            text += `━━━━━━━━━━━━━━━━━━━━━\n\n`;
            const mentions = [];
            for (let i = 0; i < paginated.length; i++) {
                const u = paginated[i];
                const puesto = offset + i + 1;
                const streak = Number(u.dailystreak);
                const level = Number(u.level) || 0;
                const premium = u.premium || false;
                const { tag, mention } = getDisplayName(u);
                if (mention)
                    mentions.push(mention);
                const emoji = getEmojiRacha(streak);
                const titulo = getTitulo(streak);
                const progreso = getProgreso(streak);
                const corona = puesto === 1 ? '👑' : puesto === 2 ? '🥈' : puesto === 3 ? '🥉' : `${puesto}.`;
                const badgePremium = premium ? ' 💎' : '';
                text += `${corona} *${tag}*${badgePremium}\n`;
                text += `   🔥 Racha: *${streak} día(s)* ${emoji}\n\n`;
            }
            text += `━━━━━━━━━━━━━━━━━━━━━\n`;
            text += `> ✨ *Consejo:* Reclama tu recompensa diaria con *${m.prefijo || '/'}claim* para mantener tu racha y subir en el ranking.\n`;
            text += `> 📌 *Página siguiente:* ${m.prefijo || '/'}topstreak ${page - 1}`;
            await conn.sendMessage(m.chat, {
                text: text,
                mentions: mentions.length > 0 ? mentions : undefined
            }, { quoted: m });
            await m.react("🏆");
        }
        catch (err) {
            console.error("❌ Error en topstreak:", err);
            m.reply(`❌ Error al obtener el ranking.\n\n${err.message || err}`);
            await m.react("❌");
        }
    }
};
