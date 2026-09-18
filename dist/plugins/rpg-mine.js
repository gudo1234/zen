// @ts-nocheck
import { chequearSaludParaRPG, puedeUsarRPG, getWeightEffect } from "../lib/rpg-utils.js";
const COOLDOWN = 10 * 60 * 1000;
// ===== PICOS =====
const PICOS = {
    pico_piedra: { name: "🪨 Pico de piedra", bonus_xp: 0.05, reduce_daño: 0, durabilidad: 20 },
    pico_hierro: { name: "⛏️ Pico de hierro", bonus_xp: 0.25, reduce_daño: 0.20, durabilidad: 50 },
    pico_diamante: { name: "💎 Pico de diamante", bonus_xp: 0.50, reduce_daño: 0.40, durabilidad: 100 },
    pico_infernal: { name: "🔥 Pico infernal", bonus_xp: 1.00, reduce_daño: 0.60, durabilidad: 200 },
    pico_celestial: { name: "⚡ Pico celestial", bonus_xp: 2.00, reduce_daño: 0.80, durabilidad: -1 },
};
// 🔥 Recompensa SIN pico (cap)
const SIN_PICO_MIN = 100;
const SIN_PICO_MAX = 300;
const frasesExito = [
    "⛏️ *¡Excelente mina!* Has minado",
    "💎 *¡Encontraste una veta de diamantes!* Obtienes",
    "🌟 *¡Minero profesional!* Has extraído",
    "🪨 *¡La roca se rompió!* Has sacado",
    "🔥 *¡Minando a lo grande!* Consigues",
    "💰 *¡La fortuna te sonríe!* Has minado",
    "🎯 *¡Tiro perfecto al mineral!* Has ganado",
    "🏆 *¡Récord de minería!* Has obtenido",
    "⚡ *¡La mina está activa!* Conseguiste",
    "💪 *¡Esfuerzo recompensado!* Has minado",
    "✨ *¡Los duendes de la mina te bendicen!* Obtienes",
    "🎲 *¡Suerte de principiante!* Has extraído",
    "🔨 *¡Martillazo maestro!* Has sacado",
    "🌈 *¡Arcoíris mineral!* Has minado",
    "🎊 *¡Jackpot de la mina!* Obtienes",
    "🏅 *¡Minero del mes!* Has extraído",
    "⭐ *¡Estrella de la minería!* Consigues",
    "🚀 *¡A toda máquina!* Has minado",
    "🎵 *¡La canción de los mineros!* Obtienes",
    "🍀 *¡Trébol de cuatro hojas mineral!* Has minado",
];
const frasesFracaso = [
    "😤 *¡La mina se derrumbó!* Solo sacaste",
    "💀 *¡Los minerales se escondieron!* Obtienes",
    "😅 *¡Vaya, no fue tu mejor día!* Solo minaste",
    "🤡 *¡El pico se rompió!* Conseguiste",
    "😢 *¡Mala suerte en la mina!* Obtienes",
    "🥴 *¡Te diste un golpe con el pico!* Has minado",
    "🩸 *¡Una roca te cayó en el pie!* Solo sacaste",
    "🤕 *¡Te lastimaste con el pico!* Apenas obtienes",
];
const dañosFracaso = [
    { msg: "🩹 Te raspaste un poco", hp: 5 },
    { msg: "🤕 Te golpeaste fuerte", hp: 8 },
    { msg: "🩸 Te cortaste con una roca", hp: 10 },
    { msg: "💥 ¡Te cayó una piedra encima!", hp: 15 },
    { msg: "🚑 ¡La mina se derrumbó sobre vos!", hp: 20 },
];
// 🔥 FRASES DE PESO (tipo fisico)
const FRASES_PESO = {
    muy_flaco: [
        "🪶 Tas tan flaco que el pico pesa más que vos",
        "💀 El viento casi te tira, no pudiste hacer fuerza",
        "😬 Sos puro hueso, te falta proteína",
        "🦴 Tus huesos hacen ruido al moverte",
    ],
    flaco: [
        "🍃 Te falta un poco de fuerza",
        "💪 Sos flaquito, te costó minar",
        "⛏️ El pico te pesó más de lo normal",
    ],
    rellenito: [
        "🫃 La panza te estorbó un poco",
        "😅 Tas rellenito, te costó más minar",
    ],
    gordito: [
        "🫃 La panza te estorbó bastante",
        "😓 Tas gordito, te costó el doble",
        "🥵 El esfuerzo te dejó sin aire",
    ],
    gordo: [
        "🍔 Te caíste de panza sobre la roca",
        "🐷 Tas gordo, ni fuerza tenés",
        "😭 El esfuerzo te dejó sin aire",
    ],
    obeso: [
        "🚨 Tas como una casa, no podés ni moverte",
        "💥 Te caíste de panza y no te podés levantar",
        "😭 Ni el pico te salva, gordito",
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
function pickRandom(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}
export default {
    name: ["minar", "miming", "mine"],
    help: ["minar"],
    desc: "Minar XP y ganar recompensas",
    tags: ["econ"],
    register: true,
    run: async ({ conn, m, prefijo }) => {
        const saludInfo = await chequearSaludParaRPG(m.sender, m.lid || "");
        const check = puedeUsarRPG(saludInfo.salud);
        if (!check.ok)
            return m.reply(null, check.razon);
        const multiplier = saludInfo.multiplier;
        const COOLDOWN_FINAL = COOLDOWN * multiplier;
        const peso = saludInfo.peso;
        // 🔥 EFECTO DEL PESO (tipo: fisico)
        const weightEffect = getWeightEffect(peso, "fisico");
        try {
            const now = Date.now();
            const { rows: [user] } = await m.db.query("SELECT exp, lastmiming, salud, salud_max, pico_equipado, pico_usos FROM usuarios WHERE id = $1 OR lid = $2", [m.sender, m.lid || ""]);
            const last = Number(user.lastmiming) || 0;
            const cd = last + COOLDOWN_FINAL - now;
            if (cd > 0) {
                const min = Math.floor(cd / 60000);
                const seg = Math.floor((cd % 60000) / 1000);
                const tiempo = min > 0 ? `${min}m ${seg}s` : `${seg}s`;
                let msg = `⏳ *Esperá ${tiempo} para volver a minar, vago* ⛏️`;
                if (multiplier > 1) {
                    msg += `\n\n⚠️ _Cooldown ×${multiplier} por salud baja (${saludInfo.salud}/100)_`;
                }
                return m.reply(null, msg);
            }
            // ===== DATOS DEL PICO =====
            const picoKey = user.pico_equipado;
            const pico = picoKey ? PICOS[picoKey] : null;
            const usosActuales = Number(user.pico_usos) || 0;
            let picoRoto = false;
            if (pico && pico.durabilidad !== -1 && usosActuales <= 0) {
                picoRoto = true;
            }
            const tienePicoActivo = pico && !picoRoto;
            const bonusXP = tienePicoActivo ? pico.bonus_xp : 0;
            const reduceDaño = tienePicoActivo ? pico.reduce_daño : 0;
            // ===== EVENTOS =====
            const eventType = Math.random();
            let xp = 0;
            let texto = "";
            let esFracaso = false;
            let dañoHP = 0;
            const saludActual = Number(user.salud) || 100;
            const saludMax = Number(user.salud_max) || 100;
            // 🔥 Helper: aplicar peso
            const aplicarPeso = () => {
                let extra = "";
                if (weightEffect.categoria !== "normal") {
                    const frase = pickFrasePeso(weightEffect.categoria);
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
                return extra;
            };
            // ===== 1. MINA NORMAL (60%) =====
            if (eventType < 0.60) {
                if (tienePicoActivo) {
                    xp = getRandomInt(500, 5000);
                    xp = Math.floor(xp * (1 + bonusXP) * weightEffect.multiplier);
                    texto = `${pickRandom(frasesExito)} *${xp.toLocaleString("es-AR")}* XP`;
                    if (Math.random() < 0.15) {
                        const bonus = getRandomInt(100, 5000);
                        const bonusFinal = Math.floor(bonus * (1 + bonusXP) * weightEffect.multiplier);
                        xp += bonusFinal;
                        texto = `💎 *¡MINA RICA!* ${pickRandom(frasesExito)} *${xp.toLocaleString("es-AR")}* XP\n\n🎁 *¡Bonus!* +${bonusFinal.toLocaleString("es-AR")} XP extra`;
                    }
                }
                else {
                    xp = getRandomInt(SIN_PICO_MIN, SIN_PICO_MAX);
                    xp = Math.floor(xp * weightEffect.multiplier);
                    texto = `${pickRandom(frasesExito)} *${xp.toLocaleString("es-AR")}* XP\n\n💡 _Sin pico, no puede minar muchos recursos. Comprá uno con *${prefijo}buy pico_piedra*_`;
                }
                texto += aplicarPeso();
                await m.db.query("UPDATE usuarios SET exp = exp + $1, lastmiming = $2 WHERE id = $3 OR lid = $3", [xp, now, m.sender]);
            }
            // ===== 2. FRACASO (20%) — CON DAÑO =====
            else if (eventType < 0.80) {
                esFracaso = true;
                if (tienePicoActivo) {
                    xp = getRandomInt(50, 500);
                    xp = Math.floor(xp * (1 + bonusXP) * weightEffect.multiplier);
                }
                else {
                    xp = getRandomInt(20, 100);
                    xp = Math.floor(xp * weightEffect.multiplier);
                }
                const daño = pickRandom(dañosFracaso);
                dañoHP = Math.floor(daño.hp * (1 - reduceDaño));
                dañoHP = Math.min(dañoHP, saludActual);
                const nuevaSalud = Math.max(0, saludActual - dañoHP);
                texto = `${pickRandom(frasesFracaso)} *${xp.toLocaleString("es-AR")}* XP\n\n${daño.msg} *-${dañoHP} HP*`;
                if (reduceDaño > 0) {
                    texto += ` _(reducido por pico)_`;
                }
                texto += aplicarPeso();
                if (nuevaSalud === 0) {
                    texto += `\n\n💀 *¡QUEDASTE NOQUEADO!*\n> Usá *${prefijo}comer* o *${prefijo}use* para curarte.`;
                }
                await m.db.query("UPDATE usuarios SET exp = exp + $1, lastmiming = $2, salud = $3 WHERE id = $4 OR lid = $4", [xp, now, nuevaSalud, m.sender]);
            }
            // ===== 3. MINA SECRETA (15%) — SOLO CON PICO =====
            else if (eventType < 0.95 && tienePicoActivo) {
                xp = getRandomInt(8000, 20000);
                xp = Math.floor(xp * (1 + bonusXP) * weightEffect.multiplier);
                texto = `🕵️‍♂️ *¡ENCONTRASTE UNA MINA SECRETA!* 🤯\n${pickRandom(frasesExito)} *${xp.toLocaleString("es-AR")}* XP`;
                texto += aplicarPeso();
                await m.db.query("UPDATE usuarios SET exp = exp + $1, lastmiming = $2 WHERE id = $3 OR lid = $3", [xp, now, m.sender]);
            }
            // ===== 4. JACKPOT (5%) — SOLO CON PICO =====
            else if (eventType < 0.95 && !tienePicoActivo) {
                xp = getRandomInt(SIN_PICO_MIN, SIN_PICO_MAX);
                xp = Math.floor(xp * weightEffect.multiplier);
                texto = `${pickRandom(frasesExito)} *${xp.toLocaleString("es-AR")}* XP\n\n💡 _Sin pico, no encontrás tesoros raros_`;
                texto += aplicarPeso();
                await m.db.query("UPDATE usuarios SET exp = exp + $1, lastmiming = $2 WHERE id = $3 OR lid = $3", [xp, now, m.sender]);
            }
            else {
                xp = getRandomInt(25000, 50000);
                xp = Math.floor(xp * (1 + bonusXP) * weightEffect.multiplier);
                texto = `🎰 *¡JACKPOT MINERO!* 💰💰💰\n${pickRandom(frasesExito)} *${xp.toLocaleString("es-AR")}* XP\n\n⭐ *¡ERES UN MINERO LEGENDARIO!* ⭐`;
                texto += aplicarPeso();
                await m.db.query("UPDATE usuarios SET exp = exp + $1, lastmiming = $2 WHERE id = $3 OR lid = $3", [xp, now, m.sender]);
            }
            // ===== CONSUMIR USO DEL PICO =====
            let avisoPico = "";
            if (tienePicoActivo) {
                if (pico.durabilidad === -1) {
                    // Pico infinito
                }
                else {
                    const nuevosUsos = usosActuales - 1;
                    if (nuevosUsos <= 0) {
                        await m.db.query("UPDATE usuarios SET pico_equipado = NULL, pico_usos = 0 WHERE id = $1 OR lid = $1", [m.sender]);
                        avisoPico = `\n\n💔 *¡Tu ${pico.name} se rompió!* Comprá otro con *buy ${picoKey}*`;
                    }
                    else {
                        await m.db.query("UPDATE usuarios SET pico_usos = $1 WHERE id = $2 OR lid = $2", [nuevosUsos, m.sender]);
                        if (nuevosUsos <= 5) {
                            avisoPico = `\n\n⚠️ *¡Pico casi roto!* (${nuevosUsos} usos restantes)`;
                        }
                    }
                }
            }
            else if (picoRoto) {
                avisoPico = `\n\n💔 *Tu ${pico.name} está roto.* Comprá otro con *buy ${picoKey}*`;
            }
            if (bonusXP > 0) {
                texto += `\n\n✨ *Bonus del pico: +${Math.round(bonusXP * 100)}% XP*`;
            }
            texto += avisoPico;
            await m.reply(null, texto);
            // ===== REACCIONES =====
            if (dañoHP > 0) {
                await m.react("🤕");
            }
            else if (xp >= 25000) {
                await m.react("🎰");
            }
            else if (xp >= 8000) {
                await m.react("🕵️");
            }
            else if (xp >= 5000) {
                await m.react("💎");
            }
            else if (xp >= 1000) {
                await m.react("⛏️");
            }
            else if (esFracaso) {
                await m.react("😅");
            }
            else {
                await m.react("✅");
            }
        }
        catch (err) {
            console.error("minar error:", err);
            m.reply("❌ Ocurrió un error al minar.");
            await m.react("🚨");
        }
    }
};
