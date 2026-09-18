// @ts-nocheck
import { chequearSaludParaRPG, puedeUsarRPG, getWeightEffect } from "../lib/rpg-utils.js";
const COOLDOWN = 60 * 60 * 1000; // 1 hora
// ===== MENSAJES DE ÉXITO =====
const robar = [
    "🦹‍♂️ Robaste un banco y obtuviste",
    "💰 Negociaste con el jefe de la mafia y obtuviste",
    "🏃‍♂️ Casi te atrapa la policía, pero lograste escapar con",
    "🤝 Los mafiosos te pagaron",
    "⭐ Le robaste a un famoso y conseguiste",
    "🎨 Entraste a un museo y robaste",
    "💎 Infiltraste una joyería y te llevaste",
    "🚚 Asaltaste un camión blindado y conseguiste",
    "🔫 Secuestraste a un empresario y recibiste",
    "📄 Amenazaste a un político y obtuviste",
    "🃏 Ganaste en una partida de póker ilegal y ganaste",
    "🏦 Hackeaste un banco y transferiste",
    "🚢 Robaste un cargamento en el puerto y conseguiste",
    "✈️ Asaltaste un avión y te llevaste",
];
// ===== MENSAJES DE FRACASO =====
const robmal = [
    "👮‍♂️ La policía te atrapó y perdiste",
    "🔪 Tu cómplice te traicionó y perdiste",
    "🛑 Fallaste el escape y perdiste",
    "🚨 La alarma se activó y perdiste",
    "🔍 Te descubrieron y perdiste",
    "💥 El plan salió mal y perdiste",
    "🐕 Los perros policía te olfatearon y perdiste",
    "📹 Las cámaras te grabaron y perdiste",
    "🔒 Te encerraron y perdiste",
    "💀 Casi mueres y perdiste",
];
// ===== MENSAJES DE ROBO A USUARIO =====
const roboUsuario = [
    "🥷 Le robaste *{amount} XP* a @{target} sin que se diera cuenta",
    "🦹‍♂️ Asaltaste a {target} y conseguiste *{amount} XP*",
    "💀 {target} ni se enteró que le robaste *{amount} XP*",
    "🔥 Le sacaste *{amount} XP* a @{target} como un profesional",
    "😈 {target} estaba distraído y le robaste *{amount} XP*",
];
// ===== MENSAJES DE CONTRAATAQUE =====
const contraataque = [
    "⚔️ {target} te contraatacó! Perdiste *{amount} XP*",
    "💥 {target} se defendió! Te quitó *{amount} XP*",
    "🤜 {target} te partió la cara! Perdiste *{amount} XP*",
    "🛡️ {target} tenía un arma y te quitó *{amount} XP*",
    "💪 {target} es más fuerte que vos! Perdiste *{amount} XP*",
];
// ===== MENSAJES DE POLICÍA =====
const policia = [
    "👮‍♂️ *¡La policía te atrapó!* Pagaste *{fine} XP* de multa",
    "🚓 *Te detuvieron!* Multa de *{fine} XP* por crimen",
    "🔫 *La policía te vio!* Te quitaron *{fine} XP* de multa",
    "📋 *Te llevaron a la comisaría!* Pagaste *{fine} XP* de fianza",
    "⚖️ *El juez te condenó!* Multa de *{fine} XP*",
];
// ===== MENSAJES DE MALA SUERTE =====
const malaSuerte = [
    "😤 *¡Qué mala suerte!* Perdiste *{amount} XP* por accidente",
    "💀 *¡Desastre!* Te robaron *{amount} XP*",
    "🔥 *Tu casa se quemó!* Perdiste *{amount} XP*",
    "🌊 *Te robó un tsunami!* Perdiste *{amount} XP*",
    "👻 *Un fantasma te asustó!* Perdiste *{amount} XP*",
];
// ===== DAÑOS POR FRACASO =====
const dañosFracaso = [
    { msg: "🔪 Tu cómplice te apuñaló", hp: 8 },
    { msg: "🚨 La policía te golpeó al arrestarte", hp: 12 },
    { msg: "🐕 El perro policía te mordió", hp: 10 },
    { msg: "💥 Te tiraron del vehículo en movimiento", hp: 15 },
];
// ===== DAÑOS POR POLICÍA =====
const dañosPolicia = [
    { msg: "👮‍♂️ Te esposaron bruscamente", hp: 5 },
    { msg: "🚓 Te golpearon contra el capó", hp: 8 },
    { msg: "🩸 Te redujeron con violencia", hp: 10 },
    { msg: "⚡ Usaron taser contra vos", hp: 12 },
];
// ===== DAÑOS POR CONTRAATAQUE =====
const dañosContra = [
    { msg: "🥊 Te dio una piña", hp: 5 },
    { msg: "🦵 Te pateó fuerte", hp: 8 },
    { msg: "🔪 Te sacó un cuchillo", hp: 10 },
];
// ===== DAÑOS POR MALA SUERTE =====
const dañosMalaSuerte = [
    { msg: "🤕 Te caíste escapando", hp: 3 },
    { msg: "🚗 Casi te atropellan", hp: 5 },
    { msg: "🩹 Te cortaste con algo", hp: 8 },
];
// 🔥 DAÑOS LEVES POR ÉXITO
const dañosEscape = [
    { msg: "🩹 Te raspaste escapando", hp: 3 },
    { msg: "🤕 Te caíste en la huida", hp: 5 },
    { msg: "🩸 Te cortaste con una reja", hp: 6 },
    { msg: "💥 Tropezaste con una piedra", hp: 8 },
];
// 🔥 FRASES DE PESO (tipo mixto)
const FRASES_PESO = {
    muy_flaco: [
        "🪶 Tas muy flaco para la vida criminal",
        "💀 El viento te tira, no servís para esto",
        "😬 Sos puro hueso, ni fuerza tenés para el crimen",
    ],
    flaco: [
        "🍃 Te falta cuerpo para el crimen",
        "💪 Sos flaquito, te costó el crimen",
    ],
    rellenito: [
        "🤷 Un poco de panza, ni ayuda ni molesta",
    ],
    gordito: [
        "🐷 Tas gordito, se te complica el crimen",
        "😓 La panza te estorbó un poco",
    ],
    gordo: [
        "🐘 Tas gordo, no sos sigiloso para el crimen",
        "😬 Casi te atrapan por tu peso",
        "🍔 La panza te delató",
    ],
    obeso: [
        "🚨 Tas enorme, no podés ni esconderte",
        "💥 El piso crujió cuando caminaste",
        "😭 Ni escaparte podés, gordito",
    ],
};
function pickFrasePeso(categoria) {
    const frases = FRASES_PESO[categoria] || [];
    if (frases.length === 0)
        return "";
    return frases[Math.floor(Math.random() * frases.length)];
}
export default {
    name: ["crime", "crimen"],
    help: ["crime"],
    desc: "Comete un crimen",
    tags: ["econ"],
    register: true,
    group: true,
    run: async ({ conn, m }) => {
        if (!m.db)
            return;
        // 🔥 CHEQUEAR SALUD PRIMERO
        const saludInfo = await chequearSaludParaRPG(m.sender, m.lid || "");
        const check = puedeUsarRPG(saludInfo.salud);
        if (!check.ok)
            return m.reply(null, check.razon);
        const multiplier = saludInfo.multiplier;
        const COOLDOWN_FINAL = COOLDOWN * multiplier;
        const peso = saludInfo.peso;
        // 🔥 EFECTO DEL PESO (tipo: mixto)
        const weightEffect = getWeightEffect(peso, "mixto");
        try {
            const now = Date.now();
            const { rows: [user] } = await m.db.query("SELECT exp, crime, salud, salud_max FROM usuarios WHERE id = $1", [m.sender]);
            // ===== NORMALIZAR TIEMPO =====
            let lastCrime = Number(user.crime) || 0;
            if (lastCrime > 0 && lastCrime < 1e12) {
                lastCrime = lastCrime * 1000;
            }
            if (lastCrime > now) {
                lastCrime = 0;
                await m.db.query("UPDATE usuarios SET crime = 0 WHERE id = $1", [m.sender]);
            }
            let timeLeft = lastCrime + COOLDOWN_FINAL - now;
            if (timeLeft > 0 && timeLeft <= COOLDOWN_FINAL) {
                const timeStr = msToTime(timeLeft);
                let msg = `🚓 *Te tienen fichado.*\n⏳ Volvé en *${timeStr}*`;
                if (multiplier > 1) {
                    msg += `\n\n⚠️ _Cooldown ×${multiplier} por salud baja (${saludInfo.salud}/100)_`;
                }
                return m.reply(null, msg);
            }
            // ===== SALUD INICIAL =====
            const saludActual = Number(user.salud) || 100;
            const saludMax = Number(user.salud_max) || 100;
            // ===== OBTENER PARTICIPANTES =====
            let participants = [];
            try {
                const meta = await conn.groupMetadata(m.chat);
                participants = meta.participants
                    .map(p => p.id)
                    .filter(id => id !== m.sender);
            }
            catch {
                participants = [];
            }
            const randomTarget = participants.length > 0
                ? participants[Math.floor(Math.random() * participants.length)]
                : null;
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
            // ===== EVENTOS =====
            const eventType = Math.random();
            let text = "";
            let mentions = [m.sender];
            let expGanado = 0;
            let dañoHP = 0;
            let nuevaSalud = saludActual;
            // ===== 1. ROBO CON ÉXITO (35%) =====
            if (eventType < 0.35) {
                const exp = Math.floor(Math.random() * 7000) + 500;
                expGanado = Math.floor(exp * weightEffect.multiplier);
                let reply = "";
                if (Math.random() < 0.20) {
                    const daño = pickRandom(dañosEscape);
                    dañoHP = Math.min(daño.hp, saludActual);
                    nuevaSalud = Math.max(0, saludActual - dañoHP);
                    reply = `\n\n${daño.msg} *-${dañoHP} HP*`;
                    if (nuevaSalud === 0) {
                        reply += `\n\n💀 *¡QUEDASTE NOQUEADO!*\n> Usá *comer* o *use* para curarte.`;
                    }
                }
                text = `${pickRandom(robar)} *${expGanado.toLocaleString()} XP*${reply}`;
                text += aplicarPeso();
                await m.db.query("UPDATE usuarios SET exp = exp + $1, crime = $2, salud = $3 WHERE id = $4", [expGanado, now, nuevaSalud, m.sender]);
            }
            // ===== 2. FRACASO (25%) =====
            else if (eventType < 0.60) {
                const exp = Math.floor(Math.random() * 3000) + 200;
                const expPerdida = Math.floor(exp * weightEffect.multiplier);
                expGanado = -expPerdida;
                const daño = pickRandom(dañosFracaso);
                dañoHP = Math.min(daño.hp, saludActual);
                nuevaSalud = Math.max(0, saludActual - dañoHP);
                text = `${pickRandom(robmal)} *${expPerdida.toLocaleString()} XP*\n\n${daño.msg} *-${dañoHP} HP*`;
                if (nuevaSalud === 0) {
                    text += `\n\n💀 *¡QUEDASTE NOQUEADO!*\n> Usá *comer* o *use* para curarte.`;
                }
                text += aplicarPeso();
                await m.db.query("UPDATE usuarios SET exp = GREATEST(exp - $1, 0), crime = $2, salud = $3 WHERE id = $4", [expPerdida, now, nuevaSalud, m.sender]);
            }
            // ===== 3. POLICÍA (15%) =====
            else if (eventType < 0.75) {
                const fine = Math.floor(Math.random() * 5000) + 1000;
                expGanado = -fine;
                const daño = pickRandom(dañosPolicia);
                dañoHP = Math.min(daño.hp, saludActual);
                nuevaSalud = Math.max(0, saludActual - dañoHP);
                text = pickRandom(policia).replace(/{fine}/g, fine.toLocaleString());
                text += `\n\n${daño.msg} *-${dañoHP} HP*`;
                if (nuevaSalud === 0) {
                    text += `\n\n💀 *¡QUEDASTE NOQUEADO!*\n> Usá *comer* o *use* para curarte.`;
                }
                text += aplicarPeso();
                await m.db.query("UPDATE usuarios SET exp = GREATEST(exp - $1, 0), crime = $2, salud = $3 WHERE id = $4", [fine, now, nuevaSalud, m.sender]);
            }
            // ===== 4. ROBO A USUARIO (15%) =====
            else if (eventType < 0.90) {
                if (!randomTarget) {
                    const exp = Math.floor(Math.random() * 5000) + 1000;
                    expGanado = Math.floor(exp * weightEffect.multiplier);
                    text = `🦹‍♂️ No había a quien robar, pero encontraste un botín de *${expGanado.toLocaleString()} XP*`;
                    text += aplicarPeso();
                    await m.db.query("UPDATE usuarios SET exp = exp + $1, crime = $2 WHERE id = $3", [expGanado, now, m.sender]);
                }
                else {
                    const exp = Math.floor(Math.random() * 3000) + 500;
                    const targetNum = randomTarget.split("@")[0];
                    expGanado = Math.floor(exp * weightEffect.multiplier);
                    if (Math.random() < 0.3) {
                        const counterExp = Math.floor(Math.random() * 1500) + 200;
                        const daño = pickRandom(dañosContra);
                        dañoHP = Math.min(daño.hp, saludActual);
                        nuevaSalud = Math.max(0, saludActual - dañoHP);
                        text = pickRandom(contraataque)
                            .replace(/{amount}/g, counterExp.toLocaleString())
                            .replace(/{target}/g, `@${targetNum}`);
                        text += `\n\n${daño.msg} *-${dañoHP} HP*`;
                        mentions.push(randomTarget);
                        expGanado = -counterExp;
                        if (nuevaSalud === 0) {
                            text += `\n\n💀 *¡QUEDASTE NOQUEADO!*`;
                        }
                        text += aplicarPeso();
                        await m.db.query("UPDATE usuarios SET exp = GREATEST(exp - $1, 0), crime = $2, salud = $3 WHERE id = $4", [counterExp, now, nuevaSalud, m.sender]);
                        await m.db.query("UPDATE usuarios SET exp = exp + $1 WHERE id = $2", [counterExp, randomTarget]);
                    }
                    else {
                        let reply = "";
                        if (Math.random() < 0.20) {
                            const daño = pickRandom(dañosEscape);
                            dañoHP = Math.min(daño.hp, saludActual);
                            nuevaSalud = Math.max(0, saludActual - dañoHP);
                            reply = `\n\n${daño.msg} *-${dañoHP} HP*`;
                            if (nuevaSalud === 0)
                                reply += `\n\n💀 *¡QUEDASTE NOQUEADO!*`;
                        }
                        text = pickRandom(roboUsuario)
                            .replace(/{amount}/g, expGanado.toLocaleString())
                            .replace(/{target}/g, `@${targetNum}`) + reply;
                        mentions.push(randomTarget);
                        text += aplicarPeso();
                        await m.db.query("UPDATE usuarios SET exp = exp + $1, crime = $2, salud = $3 WHERE id = $4", [expGanado, now, nuevaSalud, m.sender]);
                        await m.db.query("UPDATE usuarios SET exp = GREATEST(exp - $1, 0) WHERE id = $2", [Math.min(expGanado, 5000), randomTarget]);
                    }
                }
            }
            // ===== 5. MALA SUERTE (10%) =====
            else {
                const exp = Math.floor(Math.random() * 2000) + 500;
                const expPerdida = Math.floor(exp * weightEffect.multiplier);
                expGanado = -expPerdida;
                const daño = pickRandom(dañosMalaSuerte);
                dañoHP = Math.min(daño.hp, saludActual);
                nuevaSalud = Math.max(0, saludActual - dañoHP);
                text = pickRandom(malaSuerte).replace(/{amount}/g, expPerdida.toLocaleString());
                text += `\n\n${daño.msg} *-${dañoHP} HP*`;
                if (nuevaSalud === 0) {
                    text += `\n\n💀 *¡QUEDASTE NOQUEADO!*`;
                }
                text += aplicarPeso();
                await m.db.query("UPDATE usuarios SET exp = GREATEST(exp - $1, 0), crime = $2, salud = $3 WHERE id = $4", [expPerdida, now, nuevaSalud, m.sender]);
            }
            // ===== ENVIAR MENSAJE =====
            await conn.sendMessage(m.chat, { text, mentions }, { quoted: m });
            // ===== REACCIONES =====
            if (dañoHP > 0) {
                await m.react("🤕");
            }
            else if (expGanado > 5000) {
                await m.react("🤑");
            }
            else if (expGanado > 2000) {
                await m.react("😈");
            }
            else if (expGanado > 0) {
                await m.react("😏");
            }
            else if (expGanado < -3000) {
                await m.react("💀");
            }
            else if (expGanado < 0) {
                await m.react("😢");
            }
        }
        catch (err) {
            console.error("crime error:", err);
            m.reply("❌ Ocurrió un error al ejecutar el crimen.");
            await m.react("🚓");
        }
    }
};
/* ========= UTILS ========= */
function pickRandom(list) {
    return list[Math.floor(Math.random() * list.length)];
}
function msToTime(ms) {
    if (!ms || ms <= 0)
        return "0s";
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60);
    const h = Math.floor(m / 60);
    const sec = s % 60;
    const min = m % 60;
    if (h > 0)
        return `${h}h ${min}m ${sec}s`;
    if (min > 0)
        return `${min}m ${sec}s`;
    return `${sec}s`;
}
