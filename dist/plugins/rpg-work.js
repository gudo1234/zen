const COOLDOWN = 10 * 60 * 1000; // 10 minutos
const trabajosExito = [
    "🛠️ Eres un maestro alquimista, destilando misteriosas pociones. Obtienes",
    "💻 Te conviertes en un hacker ético, protegiendo sistemas. Obtienes",
    "🏴‍☠️ Eres un intrépido cazador de tesoros, explorando ruinas. Obtienes",
    "👮‍♂️ Ayudas a moderar el grupo como admin honorario. Obtienes",
    "🪖 Trabajas para una empresa militar privada. Obtienes",
    "🍷 Organizas un evento de cata de vinos. Obtienes",
    "🔮 Diriges un negocio de transmutación de metales. Obtienes",
    "🏛️ Exploras antiguas ruinas y encuentras una reliquia. Obtienes",
    "⚔️ Trabajas como mercenario en una guerra épica. Obtienes",
    "👻 Eres un investigador de lo paranormal. Obtienes",
    "🐉 Entrenas dragones para carreras. Obtienes",
    "⚒️ Te conviertes en el mejor herrero de la ciudad. Obtienes",
    "🌳 Descubres un bosque encantado. Obtienes",
    "🦁 Eres un domador de bestias feroces. Obtienes",
    "⏳ Viajas en el tiempo y resuelves problemas históricos. Obtienes",
    "👑 Eres un asesor real, aportando sabiduría. Obtienes",
    "🚀 Desarrollas tecnología futurista. Obtienes",
    "🎭 Eres un maestro en el arte de la persuasión. Obtienes",
    "🤖 Piloteas un mecha gigante en batallas épicas. Obtienes",
    "🐲 Diriges una granja de dragones. Obtienes",
    "🕵️ Eres un espía internacional. Obtienes",
    "🌌 Exploras el espacio y haces descubrimientos. Obtienes",
    "🎩 Eres un mago de renombre. Obtienes",
    "🧪 Eres un científico loco, creando inventos. Obtienes",
    "⚔️ Defiendes el reino contra un ejército invasor. Obtienes",
    "⛵ Eres un navegante audaz, explorando mares. Obtienes",
    "🥷 Eres un maestro en el arte del sigilo. Obtienes",
    "👨‍🍳 Eres un chef renombrado. Obtienes",
    "🔍 Investigas crímenes complejos como detective. Obtienes",
    "🤝 Eres un diplomático hábil. Obtienes",
    "🧙 Eres un chamán poderoso. Obtienes",
    "📱 Desarrollas apps mágicas. Obtienes",
    "🥊 Eres un campeón en torneos de lucha. Obtienes",
    "🏗️ Eres un arquitecto visionario. Obtienes",
    "🔮 Eres un psíquico con habilidades sobrenaturales. Obtienes",
    "🎬 Eres un famoso director de cine. Obtienes",
    "🔭 Eres un astrónomo y descubres un nuevo planeta. Obtienes",
    "🌿 Eres un experto en supervivencia. Obtienes",
    "🎵 Eres un músico talentoso. Obtienes",
    "🐠 Eres un explorador submarino. Obtienes",
    "👗 Eres un diseñador de moda reconocido. Obtienes",
    "✊ Eres un líder revolucionario. Obtienes",
    "💉 Eres un médico que descubre una cura. Obtienes",
    "💻 Eres un hacker informático. Obtienes",
    "🌱 Eres un jardinero botánico. Obtienes",
    "🧛 Eres un cazador de mitos. Obtienes",
    "🏺 Eres un arqueólogo que desentierra una ciudad. Obtienes",
    "🚗 Limpiás vidrios en semáforo. Obtienes",
    "🌭 Vendiste choripanes en la cancha. Obtienes",
    "🧱 Hiciste changa de albañil. Obtienes",
    "📄 Repartiste flyers todo el día. Obtienes",
    "🐕 Cuidaste perros. Obtienes",
    "🥐 Vendiste medialunas en el bondi. Obtienes",
    "🚲 Llevaste delivery en bici. Obtienes",
    "📦 Recolectaste cartón. Obtienes",
    "🎪 Hiciste malabares en la calle. Obtienes",
    "💧 Vendiste agua en el semáforo. Obtienes",
    "🧹 Limpiás parabrisas. Obtienes",
    "🎭 Hiciste de murguero en carnaval. Obtienes",
    "📦 Cargaste fletes. Obtienes",
    "🍿 Vendiste pochoclos en el cine. Obtienes",
    "🧃 Recolectaste reciclables. Obtienes",
    "🎈 Trabajaste de inflable humano. Obtienes",
    "🍫 Vendiste alfajores en el colectivo. Obtienes",
];
const trabajosFracaso = [
    "😤 *¡Te despidieron!* Solo ganaste",
    "💀 *¡El jefe te explotó!* Ganaste",
    "😅 *¡No fue tu mejor día!* Solo ganaste",
    "🤡 *¡Te pagaron con monedas!* Ganaste",
    "😢 *¡El negocio quebró!* Ganaste",
    "🥴 *¡Te dormiste en el trabajo!* Ganaste",
];
const trabajosBonus = [
    "🎰 *¡TRABAJO DE ÉLITE!*",
    "👑 *¡MISIÓN ESPECIAL!*",
    "⭐ *¡TRABAJO DE ALTO RENDIMIENTO!*",
    "💎 *¡PROYECTO SECRETO!*",
    "🔥 *¡MISIÓN PELIGROSA!*",
];
export default {
    name: ["work", "trabajar", "w", "chamba", "chambear"],
    help: ["work", "trabajar"],
    desc: "Trabajar para ganar XP",
    tags: ["econ"],
    register: true,
    run: async ({ conn, m }) => {
        try {
            const now = Date.now();
            const res = await m.db.query("SELECT exp, lastwork FROM usuarios WHERE id = $1 OR lid = $2", [m.sender, m.lid || ""]);
            const user = res.rows[0];
            const lastWork = Number(user.lastwork) || 0;
            const restante = lastWork + COOLDOWN - now;
            if (restante > 0) {
                const min = Math.floor(restante / 60000);
                const seg = Math.floor((restante % 60000) / 1000);
                const tiempo = min > 0 ? `${min}m ${seg}s` : `${seg}s`;
                return m.reply(null, `⏳ *Te faltan ${tiempo} para volver a laburar, descansá vago*`);
            }
            // ===== EVENTOS =====
            const eventType = Math.random();
            let texto = "";
            let xpGanado = 0;
            let esFracaso = false;
            // ===== 1. TRABAJO NORMAL (60%) =====
            if (eventType < 0.60) {
                const xp = Math.floor(Math.random() * 6500) + 500; // 500-7000 XP
                xpGanado = xp;
                // 15% de chance de trabajo de élite
                if (Math.random() < 0.15) {
                    const bonusXp = Math.floor(Math.random() * 5000) + 1000;
                    xpGanado += bonusXp;
                    texto = `${pickRandom(trabajosBonus)}\n${pickRandom(trabajosExito)} *${xpGanado.toLocaleString("es-AR")} XP*\n\n🎁 *¡BONUS!* +${bonusXp.toLocaleString("es-AR")} XP extra`;
                }
                else {
                    texto = `${pickRandom(trabajosExito)} *${xpGanado.toLocaleString("es-AR")} XP*`;
                }
                await m.db.query("UPDATE usuarios SET exp = exp + $1, lastwork = $2 WHERE id = $3 OR lid = $3", [xpGanado, now, m.sender]);
            }
            // ===== 2. FRACASO (20%) =====
            else if (eventType < 0.80) {
                const xp = Math.floor(Math.random() * 500) + 50; // 50-500 XP
                xpGanado = xp;
                esFracaso = true;
                texto = `${pickRandom(trabajosFracaso)} *${xpGanado.toLocaleString("es-AR")} XP*`;
                await m.db.query("UPDATE usuarios SET exp = exp + $1, lastwork = $2 WHERE id = $3 OR lid = $3", [xpGanado, now, m.sender]);
            }
            // ===== 3. TRABAJO DE ÉLITE (15%) =====
            else if (eventType < 0.95) {
                const xp = Math.floor(Math.random() * 10000) + 5000; // 5000-15000 XP
                xpGanado = xp;
                texto = `💼 *¡TRABAJO DE ÉLITE!* 💼\n${pickRandom(trabajosExito)} *${xpGanado.toLocaleString("es-AR")} XP*\n\n🌟 *¡Eres un trabajador excepcional!*`;
                await m.db.query("UPDATE usuarios SET exp = exp + $1, lastwork = $2 WHERE id = $3 OR lid = $3", [xpGanado, now, m.sender]);
            }
            // ===== 4. JACKPOT LABORAL (5%) =====
            else {
                const xp = Math.floor(Math.random() * 25000) + 10000; // 10000-35000 XP
                xpGanado = xp;
                texto = `🎰 *¡JACKPOT LABORAL!* 💰💰💰\n${pickRandom(trabajosExito)} *${xpGanado.toLocaleString("es-AR")} XP*\n\n⭐ *¡ERES EL MEJOR EMPLEADO DEL MES!* ⭐`;
                await m.db.query("UPDATE usuarios SET exp = exp + $1, lastwork = $2 WHERE id = $3 OR lid = $3", [xpGanado, now, m.sender]);
            }
            await m.reply(null, texto);
            // ===== REACCIONES =====
            if (xpGanado > 15000) {
                await m.react("🎰");
            }
            else if (xpGanado > 5000) {
                await m.react("💼");
            }
            else if (xpGanado > 1000) {
                await m.react("🛠️");
            }
            else if (esFracaso) {
                await m.react("😅");
            }
            else {
                await m.react("✅");
            }
        }
        catch (err) {
            console.error("work error:", err);
            m.reply("❌ Ocurrió un error al trabajar.");
            await m.react("🚨");
        }
    }
};
/* ========= UTILS ========= */
function pickRandom(list) {
    return list[Math.floor(Math.random() * list.length)];
}
