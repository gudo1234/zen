// @ts-nocheck
import { chequearSaludParaRPG, puedeUsarRPG, getWeightEffect } from "../lib/rpg-utils.js";
const COOLDOWN = 10 * 60 * 1000; // 10 minutos
const mensajesExito = [
    "🍞 Un alma caritativa te dio",
    "💰 Alguien se apiadó de ti y te dio",
    "😢 Una señora te vio y te regaló",
    "🎁 Un desconocido generoso te dio",
    "🤲 La gente del grupo se compadeció y te dio",
    "🪙 Encontraste una moneda en el piso, son",
    "🍀 Un niño te dio su merienda, son",
    "💸 Un millonario te tiró",
    "🥺 Tu cara de pobre te consiguió",
    "🎊 Es tu día de suerte, recibiste",
];
const mensajesFracaso = [
    "😤 Te ignoraron, no recibiste nada",
    "🤡 Un policía te corrió, perdiste",
    "😅 La gente se rió de ti, ganaste",
    "👮‍♂️ Te arrestaron por mendigar, multa de",
    "💀 Un perro te persiguió, perdiste",
    "😭 Nadie te dio nada, solo",
    "🤕 Un borracho te empujó, perdiste",
    "🚔 La policía te llevó detenido, perdiste",
];
const mensajesEspeciales = [
    "👑 *¡UN REY TE VIO!* Te dio",
    "⭐ *¡UNA CELEBRIDAD!* Te firmó un autógrafo y te dio",
    "🌈 *¡ARCOÍRIS DE LA SUERTE!* Encontraste",
    "🎰 *¡JACKPOT DE MENDIGO!* Te dieron",
];
// Daños por fracaso (más leves que minar/slut)
const dañosFracaso = [
    { msg: "😤 Te empujaron feo", hp: 3 },
    { msg: "🤕 Te tiraron una piedra", hp: 5 },
    { msg: "🚔 La policía te golpeó al arrestarte", hp: 8 },
    { msg: "🐕 El perro te mordió", hp: 10 },
];
// 🔥 COMIDAS REGALADAS (solo si estás muy flaco)
const COMIDAS_REGALADAS = [
    { nombre: "un sanguchito", emoji: "🥪", peso: 1 },
    { nombre: "un pan", emoji: "🍞", peso: 1 },
    { nombre: "una pizza", emoji: "🍕", peso: 2 },
    { nombre: "una hamburguesa", emoji: "🍔", peso: 2 },
    { nombre: "un asado", emoji: "🥩", peso: 3 },
    { nombre: "una milanesa", emoji: "🍗", peso: 2 },
    { nombre: "unos fideos", emoji: "🍝", peso: 2 },
];
// 🔥 FRASES DE PESO (tipo lastima)
const FRASES_PESO = {
    muy_flaco: [
        "🥺 Tu cara de pobre da TANTA lástima que te dieron más",
        "😢 La gente se compadeció de tu aspecto famélico",
        "🙏 Un alma caritativa te vio flaco y te dio más",
        "💀 Sos tan flaco que la gente te dio de comer directo",
    ],
    flaco: [
        "🥺 Tu aspecto da lástima",
        "😢 La gente se apiadó de vos",
        "🍞 Te falta peso pero la gente te ayudó",
    ],
    rellenito: [
        "🤨 Nadie le da limosna a alguien bien alimentado",
        "😐 La gente te miró y siguió de largo",
    ],
    gordito: [
        "🤨 'Un gordo pidiendo? Andá a trabajar' te dijeron",
        "😤 La gente se rió de tu panza",
    ],
    gordo: [
        "🤨 Nadie le da limosna a un gordo",
        "😤 'Andá a laburar' te dijeron",
        "🍔 Te dijeron 'gordo mantenido' y se fueron",
    ],
    obeso: [
        "🤨 Un obeso mendigando? Nadie te da nada",
        "😤 'Andá al gym' te dijeron",
        "😂 Se cagaron de risa y no te dieron nada",
    ],
};
function pickFrasePeso(categoria) {
    const frases = FRASES_PESO[categoria] || [];
    if (frases.length === 0)
        return "";
    return frases[Math.floor(Math.random() * frases.length)];
}
function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}
export default {
    name: ["beg", "mendigar", "pedir"],
    help: ["beg"],
    desc: "Pide limosna para ganar XP",
    tags: ["econ"],
    register: true,
    run: async ({ conn, m }) => {
        const saludInfo = await chequearSaludParaRPG(m.sender, m.lid || "");
        const check = puedeUsarRPG(saludInfo.salud);
        if (!check.ok)
            return m.reply(null, check.razon);
        const multiplier = saludInfo.multiplier;
        const COOLDOWN_FINAL = COOLDOWN * multiplier;
        const peso = saludInfo.peso;
        const weightEffect = getWeightEffect(peso, "lastima");
        try {
            const now = Date.now();
            const { rows: [user] } = await m.db.query("SELECT exp, lastbeg, salud, salud_max, peso FROM usuarios WHERE id = $1 OR lid = $2", [m.sender, m.lid || ""]);
            // ===== COOLDOWN =====
            const last = Number(user.lastbeg) || 0;
            const cd = last + COOLDOWN_FINAL - now;
            if (cd > 0) {
                const min = Math.floor(cd / 60000);
                const seg = Math.floor((cd % 60000) / 1000);
                const tiempo = min > 0 ? `${min}m ${seg}s` : `${seg}s`;
                let msg = `⏳ *Esperá ${tiempo} para volver a mendigar, vago*`;
                if (multiplier > 1) {
                    msg += `\n\n⚠️ _Cooldown ×${multiplier} por salud baja (${saludInfo.salud}/100)_`;
                }
                return m.reply(null, msg);
            }
            // ===== ESTADO INICIAL =====
            const saludActual = Number(user.salud) || 100;
            const saludMax = Number(user.salud_max) || 100;
            const pesoActual = Number(user.peso) || 40;
            // ===== EVENTOS =====
            const eventType = Math.random();
            let texto = "";
            let xpGanado = 0;
            let esFracaso = false;
            let dañoHP = 0;
            let pesoDelta = 0;
            // 🔥 Helper: aplicar peso + frase
            const aplicarPeso = () => {
                let extra = "";
                if (weightEffect.categoria !== "normal") {
                    const frase = pickFrasePeso(weightEffect.categoria);
                    if (frase)
                        extra += `\n\n${weightEffect.emoji} _${frase}_`;
                    if (weightEffect.multiplier < 1) {
                        const pct = Math.round((1 - weightEffect.multiplier) * 100);
                        extra += `\n📉 *-${pct}% XP por peso (${pesoActual} kg)*`;
                    }
                    else if (weightEffect.multiplier > 1) {
                        const pct = Math.round((weightEffect.multiplier - 1) * 100);
                        extra += `\n📈 *+${pct}% XP por peso (${pesoActual} kg)*`;
                    }
                }
                return extra;
            };
            // ===== 1. ÉXITO (60%) =====
            if (eventType < 0.60) {
                const xp = getRandomInt(100, 3000);
                xpGanado = Math.floor(xp * weightEffect.multiplier);
                if (Math.random() < 0.10) {
                    const bonusXp = Math.floor(getRandomInt(1000, 5000) * weightEffect.multiplier);
                    xpGanado += bonusXp;
                    texto = `${pickRandom(mensajesEspeciales)} *${xpGanado.toLocaleString("es-AR")} XP*\n\n🎁 *¡BONUS!* +${bonusXp.toLocaleString("es-AR")} XP extra`;
                }
                else {
                    texto = `${pickRandom(mensajesExito)} *${xpGanado.toLocaleString("es-AR")} XP*`;
                }
                // 🔥 BONUS: si está muy flaco, puede recibir comida
                if (weightEffect.categoria === "muy_flaco" && Math.random() < 0.30) {
                    const comida = pickRandom(COMIDAS_REGALADAS);
                    pesoDelta = comida.peso;
                    texto += `\n\n${comida.emoji} *¡Te dieron ${comida.nombre}!*`;
                    texto += `\n⚖️ Peso: *${pesoActual}* → *${pesoActual + pesoDelta}* kg (+${pesoDelta})`;
                    texto += `\n_Alguien se apiadó de tu flacura 😢_`;
                }
                texto += aplicarPeso();
                const nuevoPeso = pesoActual + pesoDelta;
                await m.db.query("UPDATE usuarios SET exp = exp + $1, lastbeg = $2, peso = $3 WHERE id = $4 OR lid = $4", [xpGanado, now, nuevoPeso, m.sender]);
            }
            // ===== 2. FRACASO (30%) =====
            else if (eventType < 0.90) {
                const perdida = Math.floor(getRandomInt(50, 500) * weightEffect.multiplier);
                xpGanado = -perdida;
                esFracaso = true;
                const daño = pickRandom(dañosFracaso);
                dañoHP = Math.min(daño.hp, saludActual);
                const nuevaSalud = Math.max(0, saludActual - dañoHP);
                texto = `${pickRandom(mensajesFracaso)} *${perdida.toLocaleString("es-AR")} XP*\n\n${daño.msg} *-${dañoHP} HP*`;
                texto += aplicarPeso();
                if (nuevaSalud === 0) {
                    texto += `\n\n💀 *¡QUEDASTE NOQUEADO!*\n> No podés usar comandos RPG hasta recuperarte.\n> Usá *comer* o *use* para curarte.`;
                }
                await m.db.query("UPDATE usuarios SET exp = GREATEST(exp - $1, 0), lastbeg = $2, salud = $3 WHERE id = $4 OR lid = $4", [perdida, now, nuevaSalud, m.sender]);
            }
            // ===== 3. MENDIGO PROFESIONAL (10%) =====
            else {
                const xp = getRandomInt(2000, 10000);
                xpGanado = Math.floor(xp * weightEffect.multiplier);
                texto = `🎩 *¡MENDIGO PROFESIONAL!* 🎩\nTe dieron *${xpGanado.toLocaleString("es-AR")} XP*\n\n🌟 *¡Eres un artista de la mendicidad!*`;
                texto += aplicarPeso();
                await m.db.query("UPDATE usuarios SET exp = exp + $1, lastbeg = $2 WHERE id = $3 OR lid = $3", [xpGanado, now, m.sender]);
            }
            await m.reply(null, texto);
            // ===== REACCIONES =====
            if (pesoDelta > 0) {
                await m.react("🍔");
            }
            else if (dañoHP > 0) {
                await m.react("🤕");
            }
            else if (xpGanado > 5000) {
                await m.react("🎩");
            }
            else if (xpGanado > 1000) {
                await m.react("🤑");
            }
            else if (xpGanado > 0) {
                await m.react("😊");
            }
            else if (esFracaso) {
                await m.react("😢");
            }
        }
        catch (err) {
            console.error("beg error:", err);
            m.reply("❌ Ocurrió un error al mendigar.");
            await m.react("🚨");
        }
    }
};
/* ========= UTILS ========= */
function pickRandom(list) {
    return list[Math.floor(Math.random() * list.length)];
}
