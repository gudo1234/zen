// @ts-nocheck
import { chequearSaludParaRPG, puedeUsarRPG, getWeightEffect } from "../lib/rpg-utils.js";
const COOLDOWN = 10 * 60 * 1000; // 10 minutos
// 🔥 UN SOLO ARRAY CON TEXTO + TIPO
const trabajosExito = [
    // ===== INTELECTUALES =====
    { texto: "🛠️ Eres un maestro alquimista, destilando misteriosas pociones. Obtienes", tipo: "intelectual" },
    { texto: "💻 Te conviertes en un hacker ético, protegiendo sistemas. Obtienes", tipo: "intelectual" },
    { texto: "🔮 Diriges un negocio de transmutación de metales. Obtienes", tipo: "intelectual" },
    { texto: "⏳ Viajas en el tiempo y resuelves problemas históricos. Obtienes", tipo: "intelectual" },
    { texto: "🚀 Desarrollas tecnología futurista. Obtienes", tipo: "intelectual" },
    { texto: "🧪 Eres un científico loco, creando inventos. Obtienes", tipo: "intelectual" },
    { texto: "🔍 Investigas crímenes complejos como detective. Obtienes", tipo: "intelectual" },
    { texto: "💻 Eres un hacker informático. Obtienes", tipo: "intelectual" },
    { texto: "📱 Desarrollas apps mágicas. Obtienes", tipo: "intelectual" },
    { texto: "🔭 Eres un astrónomo y descubres un nuevo planeta. Obtienes", tipo: "intelectual" },
    { texto: "💉 Eres un médico que descubre una cura. Obtienes", tipo: "intelectual" },
    { texto: "🌱 Eres un jardinero botánico. Obtienes", tipo: "intelectual" },
    { texto: "🔮 Eres un psíquico con habilidades sobrenaturales. Obtienes", tipo: "intelectual" },
    { texto: "🏗️ Eres un arquitecto visionario. Obtienes", tipo: "intelectual" },
    { texto: "🌌 Exploras el espacio y haces descubrimientos. Obtienes", tipo: "intelectual" },
    // ===== SOCIALES =====
    { texto: "🍷 Organizas un evento de cata de vinos. Obtienes", tipo: "social" },
    { texto: "🎭 Eres un maestro en el arte de la persuasión. Obtienes", tipo: "social" },
    { texto: "🤝 Eres un diplomático hábil. Obtienes", tipo: "social" },
    { texto: "👗 Eres un diseñador de moda reconocido. Obtienes", tipo: "social" },
    { texto: "🎬 Eres un famoso director de cine. Obtienes", tipo: "social" },
    { texto: "✊ Eres un líder revolucionario. Obtienes", tipo: "social" },
    { texto: "👑 Eres un asesor real, aportando sabiduría. Obtienes", tipo: "social" },
    // ===== CREATIVOS =====
    { texto: "🎵 Eres un músico talentoso. Obtienes", tipo: "creativo" },
    { texto: "👨‍🍳 Eres un chef renombrado. Obtienes", tipo: "creativo" },
    { texto: "🎩 Eres un mago de renombre. Obtienes", tipo: "creativo" },
    { texto: "🧛 Eres un cazador de mitos. Obtienes", tipo: "creativo" },
    { texto: "🏺 Eres un arqueólogo que desentierra una ciudad. Obtienes", tipo: "creativo" },
    { texto: "🌈 Descubres un bosque encantado. Obtienes", tipo: "creativo" },
    { texto: "🐲 Diriges una granja de dragones. Obtienes", tipo: "creativo" },
    // ===== PELIGROSOS =====
    { texto: "👮‍♂️ Ayudas a moderar el grupo como admin honorario. Obtienes", tipo: "peligroso" },
    { texto: "🪖 Trabajas para una empresa militar privada. Obtienes", tipo: "peligroso" },
    { texto: "⚔️ Trabajas como mercenario en una guerra épica. Obtienes", tipo: "peligroso" },
    { texto: "🏴‍☠️ Eres un intrépido cazador de tesoros, explorando ruinas. Obtienes", tipo: "peligroso" },
    { texto: "🥷 Eres un maestro en el arte del sigilo. Obtienes", tipo: "peligroso" },
    { texto: "🕵️ Eres un espía internacional. Obtienes", tipo: "peligroso" },
    { texto: "🥊 Eres un campeón en torneos de lucha. Obtienes", tipo: "peligroso" },
    { texto: "⚔️ Defiendes el reino contra un ejército invasor. Obtienes", tipo: "peligroso" },
    { texto: "👻 Eres un investigador de lo paranormal. Obtienes", tipo: "peligroso" },
    { texto: "⛵ Eres un navegante audaz, explorando mares. Obtienes", tipo: "peligroso" },
    { texto: "🌿 Eres un experto en supervivencia. Obtienes", tipo: "peligroso" },
    { texto: "🐠 Eres un explorador submarino. Obtienes", tipo: "peligroso" },
    { texto: "🐉 Entrenas dragones para carreras. Obtienes", tipo: "peligroso" },
    { texto: "🦁 Eres un domador de bestias feroces. Obtienes", tipo: "peligroso" },
    { texto: "🤖 Piloteas un mecha gigante en batallas épicas. Obtienes", tipo: "peligroso" },
    // ===== FÍSICOS =====
    { texto: "🚗 Limpiás vidrios en semáforo. Obtienes", tipo: "fisico" },
    { texto: "🌭 Vendiste choripanes en la cancha. Obtienes", tipo: "fisico" },
    { texto: "🧱 Hiciste changa de albañil. Obtienes", tipo: "fisico" },
    { texto: "📄 Repartiste flyers todo el día. Obtienes", tipo: "fisico" },
    { texto: "🐕 Cuidaste perros. Obtienes", tipo: "fisico" },
    { texto: "🥐 Vendiste medialunas en el bondi. Obtienes", tipo: "fisico" },
    { texto: "🚲 Llevaste delivery en bici. Obtienes", tipo: "fisico" },
    { texto: "📦 Recolectaste cartón. Obtienes", tipo: "fisico" },
    { texto: "🎪 Hiciste malabares en la calle. Obtienes", tipo: "fisico" },
    { texto: "💧 Vendiste agua en el semáforo. Obtienes", tipo: "fisico" },
    { texto: "🧹 Limpiás parabrisas. Obtienes", tipo: "fisico" },
    { texto: "🎭 Hiciste de murguero en carnaval. Obtienes", tipo: "fisico" },
    { texto: "📦 Cargaste fletes. Obtienes", tipo: "fisico" },
    { texto: "🍿 Vendiste pochoclos en el cine. Obtienes", tipo: "fisico" },
    { texto: "🧃 Recolectaste reciclables. Obtienes", tipo: "fisico" },
    { texto: "🎈 Trabajaste de inflable humano. Obtienes", tipo: "fisico" },
    { texto: "🍫 Vendiste alfajores en el colectivo. Obtienes", tipo: "fisico" },
    { texto: "⚒️ Te conviertes en el mejor herrero de la ciudad. Obtienes", tipo: "fisico" },
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
// 🔥 FRASES POR CATEGORÍA Y TIPO
const FRASES_WORK = {
    muy_flaco: {
        fisico: ["🪶 Tas tan flaco que el viento te tira", "💀 Sos puro hueso, no tenés fuerza"],
        social: ["😬 'Muy flaco, no gracias' te dijeron"],
        peligroso: ["🦎 Sos tan flaco que te escabulliste sin ruido", "⚡ La flacura te dio agilidad extra"],
    },
    flaco: {
        fisico: ["🍃 Te falta un poco de fuerza", "💪 Sos flaquito, te costó"],
        social: ["😐 Los clientes te miraron raro"],
        peligroso: ["🏃 Sos ágil por estar flaco"],
    },
    rellenito: {
        fisico: ["🫃 La panza te estorbó un poco"],
        social: ["😏 Te prefieren rellenito, +10%", "🔥 Estás en el punto perfecto"],
        peligroso: ["🐢 La panza te hizo más lento"],
    },
    gordito: {
        fisico: ["🫃 La panza te estorbó bastante", "😓 Tas gordito, te costó el doble"],
        social: ["🍑 Te prefieren gordito, +20%", "😏 Tu pancita es un plus"],
        peligroso: ["🐘 Hiciste temblar el piso al caminar"],
    },
    gordo: {
        fisico: ["🍔 Te caíste de panza", "🐷 Tas gordo, ni fuerza tenés"],
        social: ["🍑 Pagan más por un gordito, +30%", "😏 Tu cuerpo es un negocio"],
        peligroso: ["🐘 Caminás y tiembla el piso, te escucharon"],
    },
    obeso: {
        fisico: ["🚨 Tas como una casa, no te movés", "💥 Te caíste y no te levantás"],
        social: ["🍑 ¡Los clientes te adoran! +40%", "😏 Tu tamaño es un atractivo exótico"],
        peligroso: ["🐘 Hiciste temblar la cuadra entera"],
    },
};
function pickFraseWork(categoria, tipo) {
    const frases = FRASES_WORK[categoria]?.[tipo] || [];
    if (frases.length === 0)
        return "";
    return frases[Math.floor(Math.random() * frases.length)];
}
export default {
    name: ["work", "trabajar", "w", "chamba", "chambear"],
    help: ["work", "trabajar"],
    desc: "Trabajar para ganar XP",
    tags: ["econ"],
    register: true,
    run: async ({ conn, m }) => {
        const saludInfo = await chequearSaludParaRPG(m.sender, m.lid || "");
        const check = puedeUsarRPG(saludInfo.salud);
        if (!check.ok) {
            return m.reply(null, check.razon);
        }
        const multiplier = saludInfo.multiplier;
        const COOLDOWN_FINAL = COOLDOWN * multiplier;
        const peso = saludInfo.peso;
        try {
            const now = Date.now();
            const res = await m.db.query("SELECT exp, lastwork FROM usuarios WHERE id = $1 OR lid = $2", [m.sender, m.lid || ""]);
            const user = res.rows[0];
            const lastWork = Number(user.lastwork) || 0;
            const restante = lastWork + COOLDOWN_FINAL - now;
            if (restante > 0) {
                const min = Math.floor(restante / 60000);
                const seg = Math.floor((restante % 60000) / 1000);
                const tiempo = min > 0 ? `${min}m ${seg}s` : `${seg}s`;
                let msg = `⏳ *Te faltan ${tiempo} para volver a laburar, descansá vago*`;
                if (multiplier > 1) {
                    msg += `\n\n⚠️ _Cooldown ×${multiplier} por salud baja (${saludInfo.salud}/100)_`;
                }
                return m.reply(null, msg);
            }
            // ===== EVENTOS =====
            const eventType = Math.random();
            let texto = "";
            let xpGanado = 0;
            let esFracaso = false;
            // 🔥 Helper: aplica peso y devuelve multiplicador + extra
            const aplicarPeso = (trabajoObj) => {
                const tipoTrabajo = trabajoObj?.tipo || "fisico";
                const weightEffect = getWeightEffect(peso, tipoTrabajo);
                let extra = "";
                if (weightEffect.categoria !== "normal") {
                    const frase = pickFraseWork(weightEffect.categoria, tipoTrabajo);
                    if (frase)
                        extra += `\n\n${weightEffect.emoji} _${frase}_`;
                    if (weightEffect.multiplier < 1) {
                        const pct = Math.round((1 - weightEffect.multiplier) * 100);
                        extra += `\n📉 *-${pct}% XP por peso (${peso} kg)*`;
                    }
                    else if (weightEffect.multiplier > 1) {
                        const pct = Math.round((weightEffect.multiplier - 1) * 100);
                        extra += `\n📈 *+${pct}% XP por peso (${peso} kg)*`;
                    }
                }
                return { multiplier: weightEffect.multiplier, extra };
            };
            // ===== 1. TRABAJO NORMAL (60%) =====
            if (eventType < 0.60) {
                const trabajo = pickRandom(trabajosExito);
                const { multiplier: wMult, extra } = aplicarPeso(trabajo);
                const xp = Math.floor(Math.random() * 6500) + 500;
                xpGanado = Math.floor(xp * wMult);
                if (Math.random() < 0.15) {
                    const bonusXp = Math.floor((Math.floor(Math.random() * 5000) + 1000) * wMult);
                    xpGanado += bonusXp;
                    texto = `${pickRandom(trabajosBonus)}\n${trabajo.texto} *${xpGanado.toLocaleString("es-AR")} XP*\n\n🎁 *¡BONUS!* +${bonusXp.toLocaleString("es-AR")} XP extra`;
                }
                else {
                    texto = `${trabajo.texto} *${xpGanado.toLocaleString("es-AR")} XP*`;
                }
                texto += extra;
                await m.db.query("UPDATE usuarios SET exp = exp + $1, lastwork = $2 WHERE id = $3 OR lid = $3", [xpGanado, now, m.sender]);
            }
            // ===== 2. FRACASO (20%) =====
            else if (eventType < 0.80) {
                const trabajo = pickRandom(trabajosExito); // usamos el tipo para el peso
                const { multiplier: wMult, extra } = aplicarPeso(trabajo);
                const xp = Math.floor(Math.random() * 500) + 50;
                xpGanado = Math.floor(xp * wMult);
                esFracaso = true;
                texto = `${pickRandom(trabajosFracaso)} *${xpGanado.toLocaleString("es-AR")} XP*` + extra;
                await m.db.query("UPDATE usuarios SET exp = exp + $1, lastwork = $2 WHERE id = $3 OR lid = $3", [xpGanado, now, m.sender]);
            }
            // ===== 3. TRABAJO DE ÉLITE (15%) =====
            else if (eventType < 0.95) {
                const trabajo = pickRandom(trabajosExito);
                const { multiplier: wMult, extra } = aplicarPeso(trabajo);
                const xp = Math.floor(Math.random() * 10000) + 5000;
                xpGanado = Math.floor(xp * wMult);
                texto = `💼 *¡TRABAJO DE ÉLITE!* 💼\n${trabajo.texto} *${xpGanado.toLocaleString("es-AR")} XP*\n\n🌟 *¡Eres un trabajador excepcional!*` + extra;
                await m.db.query("UPDATE usuarios SET exp = exp + $1, lastwork = $2 WHERE id = $3 OR lid = $3", [xpGanado, now, m.sender]);
            }
            // ===== 4. JACKPOT LABORAL (5%) =====
            else {
                const trabajo = pickRandom(trabajosExito);
                const { multiplier: wMult, extra } = aplicarPeso(trabajo);
                const xp = Math.floor(Math.random() * 25000) + 10000;
                xpGanado = Math.floor(xp * wMult);
                texto = `🎰 *¡JACKPOT LABORAL!* 💰💰💰\n${trabajo.texto} *${xpGanado.toLocaleString("es-AR")} XP*\n\n⭐ *¡ERES EL MEJOR EMPLEADO DEL MES!* ⭐` + extra;
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
