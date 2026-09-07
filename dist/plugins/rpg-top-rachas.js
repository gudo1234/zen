import { db } from "../lib/db.js";
const DAY = 24 * 60 * 60 * 1000;
const PAGE_SIZE = 10;
export default {
    name: ["topstreak", "streaktop", "streak"],
    help: ["topstreak"],
    desc: "Ranking de rachas diarias activas",
    tags: ["econ"],
    run: async ({ m }) => {
        const now = Date.now();
        const page = Math.max(1, parseInt(m.text) || 1);
        const offset = (page - 1) * PAGE_SIZE;
        const res = await db.query(`
      SELECT id, nombre, dailystreak, lastclaim
      FROM usuarios
      WHERE dailystreak > 0
      ORDER BY dailystreak DESC
    `);
        if (!res.rowCount)
            return m.reply(`⚠️ No hay usuarios activos en racha.\n\n¡Recuerda reclamar tu recompensa diaria usando /claim para aparecer aquí!`);
        // ───── RACHA VIVA (MISMA REGLA QUE .daily) ─────
        const activos = res.rows.filter(u => u.lastclaim && now - Number(u.lastclaim) < DAY * 2);
        if (!activos.length)
            return m.reply(`⚠️ No hay usuarios activos en racha.\n\n¡Recuerda reclamar tu recompensa diaria usando /claim para aparecer aquí!`);
        const total = activos.length;
        const paginated = activos.slice(offset, offset + PAGE_SIZE);
        if (!paginated.length)
            return m.reply("⚠️ No hay usuarios en esta página.");
        let text = `🏆 *TOP RACHAS DIARIAS* (Página ${page})\n📊 Usuario(s) activo(s) en racha: *${total}*\n\n. 🏆 *TOP RACHAS DIARIAS*\n\n`;
        for (let i = 0; i < paginated.length; i++) {
            const u = paginated[i];
            const puesto = offset + i + 1;
            const numero = u.id.replace(/@.+/, "");
            const nombre = u.nombre || `+${numero}`;
            const streak = Number(u.dailystreak);
            let premio = "";
            if (streak >= 100)
                premio = "🏆";
            else if (streak >= 50)
                premio = "🥇";
            else if (streak >= 30)
                premio = "🏅";
            else if (streak % 7 === 0)
                premio = "⭐";
            const corona = puesto === 1 ? " (👑)" : "";
            text += `${puesto}. *${nombre}*${corona}
🔥 Racha: *${streak} día(s)* ${premio}\n\n`;
        }
        text += `\n✨ _Sigue reclamando tu recompensa diaria usando /claim para aparecer en el ranking y ganar bonos épicos._ ✨`;
        m.reply(text.trim());
    }
};
