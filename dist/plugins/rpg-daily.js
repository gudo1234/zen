// @ts-nocheck
import { db } from "../lib/db.js";
const BASE_EXP = 3000;
const EXP_INCREASE = 1000;
const DAY = 24 * 60 * 60 * 1000;
export default {
    name: ["daily", "claim"],
    help: ["claim"],
    desc: "Reclama tu recompensa diaria",
    tags: ["econ"],
    register: true,
    run: async ({ m, conn }) => {
        const id = m.sender;
        const now = Date.now();
        const res = await db.query(`SELECT exp, lastclaim, dailystreak
       FROM usuarios WHERE id = $1 OR lid = $1`, [id]);
        const user = res.rows[0];
        const lastClaim = Number(user.lastclaim) || 0;
        if (lastClaim > 0) {
            if (lastClaim > now) {
                await db.query(`UPDATE usuarios SET lastclaim = 0, dailystreak = 0 WHERE id = $1 OR lid = $1`, [id]);
            }
            else {
                const tiempoPasado = now - lastClaim;
                const restante = DAY - tiempoPasado;
                if (restante > 0) {
                    return m.reply(`⏳ *Ya reclamaste tu recompensa diaria.*`, `Vuelve en *${msToTime(restante)}* 🎁`);
                }
            }
        }
        const newStreak = lastClaim > 0 && (now - lastClaim) < DAY * 2
            ? Number(user.dailystreak || 0) + 1
            : 1;
        const exp = BASE_EXP + (newStreak - 1) * EXP_INCREASE;
        const nextExp = exp + EXP_INCREASE;
        await db.query(`UPDATE usuarios
       SET exp = exp + $1,
           lastclaim = $2,
           dailystreak = $3
       WHERE id = $4 OR lid = $4`, [exp, now, newStreak, id]);
        await conn.fakeReply(m.chat, `🎁 *RECOMPENSA DIARIA RECLAMADA*\n\n✨ Ganaste: *${formatNumber(exp)} XP*\n🔥 Racha actual: *${newStreak} día(s)*\n\n> _*Mañana no te olvides de seguir reclamando tu recompensa ganarás: ${formatK(nextExp)} (${formatNumber(nextExp)}) XP*_`, "13135550002@s.whatsapp.net", "🗳️ Daily · Mitzuki", "status@broadcast");
    }
};
function msToTime(ms) {
    // Asegurar que el valor no sea negativo
    if (ms < 0)
        ms = 0;
    const h = Math.floor(ms / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    return `${h}h ${m}min`;
}
function formatNumber(n) {
    return n.toLocaleString("en").replace(/,/g, ".");
}
function formatK(num) {
    return (num / 1000).toFixed(1) + 'k';
}
