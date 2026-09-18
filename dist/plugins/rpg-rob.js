// @ts-nocheck
import { db } from "../lib/db.js";
import { chequearSaludParaRPG, puedeUsarRPG, getWeightEffect } from "../lib/rpg-utils.js";
const MAX_ROB = 30000;
const MIN_ROB = 100;
const MAX_ROB_DIAMONDS = 150;
const MIN_ROB_DIAMONDS = 5;
const COOLDOWN = 30 * 60 * 1000; // 30 min
const POLICE_CHANCE = 0.3; // 30% de que aparezca la policía
const MAX_FINE = 50000;
const MIN_FINE = 1000;
function onlyNum(v = '') {
    return String(v || '').replace(/[^0-9]/g, '');
}
function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}
function pickRandom(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}
const robMessages = {
    successExp: [
        "🦹‍♂️ *Robaste {amount} XP* de {target} ¡Bien hecho!",
        "🥷 *Le robaste {amount} XP* a {target} Sin que se diera cuenta",
        "💀 *Te llevaste {amount} XP* de {target} ¡Eres un crack!",
        "🔥 *{amount} XP* menos para {target} ¡Robo perfecto!",
        "🤑 *Robaste {amount} XP* de {target} ¡A la caja!",
    ],
    successDiam: [
        "💰 *Robaste {amount} {currency}* de {target} ¡Qué pillo!",
        "💸 *Le robaste {amount} {currency}* a {target} Sin que se diera cuenta",
        "💰 *Te llevaste {amount} {currency}* de {target} ¡Eres un ladrón!",
        "🤑 *Robaste {amount} {currency}* de {target} ¡A la caja!",
    ],
    fail: [
        "🚨 *Fallaste!* {target} te vio y te escapaste con {amount} XP",
        "😤 *Intentaste robar* pero solo conseguiste {amount} XP de {target}",
        "🤡 *Robo fallido!* {target} te humilló y solo te llevaste {amount} XP",
    ],
    police: [
        "👮‍♂️ *¡La policía te atrapó!* Pagaste {fine} XP de multa",
        "🚓 *Te detuvieron!* Multa de {fine} XP por intento de robo",
        "🔫 *La policía te vio!* Te quitaron {fine} XP de multa",
        "🚔 *¡Redada policial!* Multa de {fine} XP y unos cuantos golpes",
    ],
    counter: [
        "⚔️ *{target} te contraatacó!* Perdiste {amount} XP",
        "💥 *{target} se defendió!* Te quitó {amount} XP",
        "🤜 *{target} te partió la cara!* Perdiste {amount} XP",
        "🥊 *{target} te dio una paliza!* Perdiste {amount} XP",
    ],
    rich: [
        "💰 {target} es millonario! Le robaste {amount} XP pero ni lo notó",
        "💎 {target} tiene tanto XP que ni sintió el robo de {amount} XP",
    ],
    poor: [
        "🍞 {target} es más pobre que vos, no tiene ni 100 XP",
        "🥺 {target} está en la ruina, dejalo en paz",
        "😢 {target} no tiene nada, robale a alguien con plata",
    ],
    noDiamonds: [
        "😅 {target} no tiene {currency}, le robaste {amount} XP en su lugar",
        "🤷 {target} está pobre de {currency}, te llevaste {amount} XP",
    ],
    guardian: [
        "👮 *¡El guardián de {target} te detuvo!* Te sacó a patadas y pagaste {fine} XP de multa",
        "👮 *¡{target} tiene un guardián!* Te agarró del cuello y te cobró {fine} XP",
        "🚨 *¡Alarma del guardián!* {target} estaba protegido y perdiste {fine} XP",
        "👮 *El guardián de {target} te dio una paliza* y te sacó {fine} XP",
    ],
};
// Daños por contraataque
const dañosCounter = [
    { msg: "🥊 Te dieron un puñetazo", hp: 10 },
    { msg: "🦵 Te patearon feo", hp: 15 },
    { msg: "💥 Te tiraron al piso", hp: 18 },
    { msg: "🤜 ¡Te partieron la cara!", hp: 20 },
];
// Daños por policía
const dañosPolice = [
    { msg: "🚓 Te esposaron bruscamente", hp: 5 },
    { msg: "👮‍♂️ Te golpearon al detenerte", hp: 8 },
    { msg: "🩸 Te tiraron contra el patrullero", hp: 12 },
    { msg: "💥 ¡Te redujeron con fuerza!", hp: 15 },
];
// Daños por guardián
const dañosGuardian = [
    { msg: "👮 El guardián te dio una paliza", hp: 8 },
    { msg: "🚨 El guardián te redujo con gas pimienta", hp: 10 },
    { msg: "💥 El guardián te tiró al piso", hp: 12 },
    { msg: "🔒 El guardián te detuvo con fuerza", hp: 15 },
];
// 🔥 FRASES DE PESO (tipo agilidad)
const FRASES_PESO = {
    muy_flaco: [
        "🦎 Sos tan flaco que te metiste por la ventana sin hacer ruido",
        "⚡ La flacura te dio agilidad extra",
        "🥷 Te escabulliste como un ratón",
        "🐱 Sos tan flaco que ni las cámaras te vieron",
    ],
    flaco: [
        "🏃 Sos ágil por estar flaco",
        "🤸 Te movés rápido, no te escucharon",
        "💨 Tu delgadez te ayudó a escapar",
    ],
    rellenito: [
        "🐢 La panza te hizo más lento",
        "👣 Tus pasos sonaron un poco fuerte",
    ],
    gordito: [
        "🐘 Hiciste temblar el piso al caminar",
        "👣 Tus pisadas se escucharon desde lejos",
        "😬 Casi te caés por el peso",
    ],
    gordo: [
        "🐘 Caminás y tiembla el piso, te escucharon",
        "💥 Te caíste y armaste un escándalo",
        "🍔 La panza te delató, no sos sigiloso",
    ],
    obeso: [
        "🐘 Hiciste temblar la cuadra entera",
        "🚨 Se activaron todas las alarmas por tu peso",
        "💥 El piso crujió cuando caminaste",
    ],
};
function pickFrasePeso(categoria) {
    const frases = FRASES_PESO[categoria] || [];
    if (frases.length === 0)
        return "";
    return frases[Math.floor(Math.random() * frases.length)];
}
export default {
    name: ["rob", "robar"],
    help: ["rob @user"],
    desc: "Robar XP a otro usuario",
    tags: ["econ"],
    register: true,
    run: async ({ conn, m, prefijo, mentionedJid }) => {
        // 🔥 CHEQUEAR SALUD PRIMERO
        const saludInfo = await chequearSaludParaRPG(m.sender, m.lid || "");
        const check = puedeUsarRPG(saludInfo.salud);
        if (!check.ok)
            return m.reply(null, check.razon);
        const multiplier = saludInfo.multiplier;
        const COOLDOWN_FINAL = COOLDOWN * multiplier;
        const peso = saludInfo.peso;
        // 🔥 EFECTO DEL PESO (tipo: agilidad)
        const weightEffect = getWeightEffect(peso, "agilidad");
        try {
            const now = Date.now();
            const currencyEmoji = m.e?.currency_emoji || "💎";
            const currencyName = m.e?.currency_name || "Diamante(s)";
            // ===== VERIFICAR COOLDOWN =====
            const { rows: [robber] } = await db.query("SELECT exp, limite, lastrob, money, salud, salud_max FROM usuarios WHERE id = $1 OR lid = $2", [m.sender, m.lid || ""]);
            const robberData = (robber || {});
            const lastRob = Number(robberData.lastrob || 0);
            const timeLeft = lastRob + COOLDOWN_FINAL - now;
            if (timeLeft > 0) {
                const h = Math.floor(timeLeft / 3600000);
                const min = Math.floor((timeLeft % 3600000) / 60000);
                let msg = `🚓 *Policía te tiene en la mira.* Volvé en ${h}h ${min}min`;
                if (multiplier > 1) {
                    msg += `\n\n⚠️ _Cooldown ×${multiplier} por salud baja (${saludInfo.salud}/100)_`;
                }
                return m.reply(null, msg);
            }
            // ===== OBTENER VÍCTIMA =====
            let who = mentionedJid?.[0] ||
                m.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0] ||
                m.quoted?.sender;
            if (!who) {
                return m.reply(null, "Etiquetá a alguien o respondé un mensaje para robarle pelotudo");
            }
            if (who === m.sender) {
                return m.reply(null, "¿Tus padres son primos? como te vas a robar vos mismo virgen");
            }
            // ===== RESOLVER LID =====
            if (who && who.endsWith("@lid")) {
                const meta = await conn.groupMetadata(m.chat);
                const participant = meta.participants.find(p => p.lid === who || p.id === who);
                if (participant?.id) {
                    who = participant.id;
                }
                else {
                    const number = who.replace(/@lid$/, "");
                    who = `${number}@s.whatsapp.net`;
                }
            }
            const whoNum = onlyNum(who);
            // ===== BUSCAR VÍCTIMA EN DB =====
            const resUser = await db.query(`SELECT * FROM usuarios WHERE id = $1 OR lid = $1 OR num = $2`, [who, whoNum]);
            if (resUser.rows.length === 0) {
                const fallback = await db.query(`SELECT * FROM usuarios WHERE num = $1`, [whoNum]);
                if (fallback.rows.length === 0) {
                    return m.reply(null, "¿quien puta es ese?");
                }
                resUser.rows = fallback.rows;
            }
            const victimData = resUser.rows[0];
            // ===== OBTENER NÚMERO REAL =====
            let realNum = '';
            if (victimData.num && typeof victimData.num === 'string') {
                realNum = victimData.num;
            }
            else if (victimData.id && typeof victimData.id === 'string') {
                realNum = onlyNum(victimData.id);
            }
            else {
                realNum = whoNum;
            }
            // ===== OBTENER LID =====
            let victimLid = '';
            if (victimData.lid && typeof victimData.lid === 'string') {
                victimLid = victimData.lid;
            }
            else if (victimData.id && typeof victimData.id === 'string') {
                victimLid = victimData.id;
            }
            else {
                victimLid = String(who);
            }
            // ===== SALUD DEL LADRÓN =====
            const saludRobber = Number(robberData.salud) || 100;
            const saludMaxRobber = Number(robberData.salud_max) || 100;
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
            // ==========================================================
            // 🔥 VERIFICAR GUARDIÁN / SEGURO TOTAL
            // ==========================================================
            const antiRobHasta = Number(victimData.anti_rob) || 0;
            const antiRob2Hasta = Number(victimData.anti_rob2) || 0;
            const tieneGuardian = antiRobHasta > now || antiRob2Hasta > now;
            if (tieneGuardian) {
                const expRobber = Number(robberData.exp) || 0;
                const bancoRobber = Number(robberData.banco) || 0;
                const fine = getRandomInt(MIN_FINE, Math.min(MAX_FINE, Math.max(expRobber, 1000)));
                const daño = pickRandom(dañosGuardian);
                const dañoHP = Math.min(daño.hp, saludRobber);
                const nuevaSalud = Math.max(0, saludRobber - dañoHP);
                if (bancoRobber >= fine) {
                    await db.query("UPDATE usuarios SET banco = banco - $1, lastrob = $2, salud = $3 WHERE id = $4 OR lid = $4", [fine, now, nuevaSalud, m.sender]);
                }
                else if (bancoRobber > 0) {
                    const resto = fine - bancoRobber;
                    await db.query("UPDATE usuarios SET banco = 0, exp = GREATEST(exp - $1, 0), lastrob = $2, salud = $3 WHERE id = $4 OR lid = $4", [resto, now, nuevaSalud, m.sender]);
                }
                else {
                    await db.query("UPDATE usuarios SET exp = GREATEST(exp - $1, 0), lastrob = $2, salud = $3 WHERE id = $4 OR lid = $4", [fine, now, nuevaSalud, m.sender]);
                }
                const msg = pickRandom(robMessages.guardian);
                let reply = msg
                    .replace(/{target}/g, `@${realNum}`)
                    .replace(/{fine}/g, fine.toLocaleString("es-AR"));
                reply += `\n\n${daño.msg} *-${dañoHP} HP*`;
                if (nuevaSalud === 0) {
                    reply += `\n\n💀 *¡QUEDASTE NOQUEADO!*\n> Usá *${prefijo}comer* o *${prefijo}use* para curarte.`;
                }
                await m.react("👮");
                return m.reply(reply);
            }
            // ===== VÍCTIMA CON ALGO =====
            const xpVictim = Number(victimData.exp) || 0;
            const diamVictim = Number(victimData.limite) || 0;
            if (xpVictim < 100 && diamVictim < 5) {
                const msg = pickRandom(robMessages.poor);
                return m.reply(msg.replace(/{target}/g, `@${realNum}`));
            }
            // ===== DECIDIR QUÉ ROBAR =====
            let robarDiamantes = false;
            let robarExp = false;
            if (diamVictim >= 5 && xpVictim >= 100) {
                robarDiamantes = Math.random() < 0.5;
                robarExp = !robarDiamantes;
            }
            else if (diamVictim >= 5) {
                robarDiamantes = true;
            }
            else if (xpVictim >= 100) {
                robarExp = true;
            }
            else {
                const msg = pickRandom(robMessages.poor);
                return m.reply(msg.replace(/{target}/g, `@${realNum}`));
            }
            // ===== EVENTOS ALEATORIOS =====
            const randomEvent = Math.random();
            let robAmount = 0;
            let robDiamAmount = 0;
            // ===== 1. CONTRAATAQUE (15%) — CON DAÑO =====
            if (randomEvent < 0.15) {
                const counterAmount = getRandomInt(100, Math.min(5000, xpVictim));
                const daño = pickRandom(dañosCounter);
                const dañoHP = Math.min(daño.hp, saludRobber);
                const nuevaSalud = Math.max(0, saludRobber - dañoHP);
                await db.query("UPDATE usuarios SET exp = GREATEST(exp - $1, 0), salud = $2, lastrob = $3 WHERE id = $4 OR lid = $4", [counterAmount, nuevaSalud, now, m.sender]);
                await db.query("UPDATE usuarios SET exp = exp + $1 WHERE lid = $2 OR id = $2", [counterAmount, victimLid]);
                const msg = pickRandom(robMessages.counter);
                let reply = msg
                    .replace(/{amount}/g, counterAmount.toLocaleString("es-AR"))
                    .replace(/{target}/g, `@${realNum}`);
                reply += `\n\n${daño.msg} *-${dañoHP} HP*`;
                reply += aplicarPeso();
                if (nuevaSalud === 0) {
                    reply += `\n\n💀 *¡QUEDASTE NOQUEADO!*\n> Usá *${prefijo}comer* o *${prefijo}use* para curarte.`;
                }
                await m.react("🤕");
                return m.reply(reply);
            }
            // ===== 2. POLICÍA (30%) — CON DAÑO =====
            if (randomEvent < 0.45) {
                const fine = getRandomInt(MIN_FINE, Math.min(MAX_FINE, Number(robberData.exp) || 0));
                const daño = pickRandom(dañosPolice);
                const dañoHP = Math.min(daño.hp, saludRobber);
                const nuevaSalud = Math.max(0, saludRobber - dañoHP);
                await db.query("UPDATE usuarios SET exp = GREATEST(exp - $1, 0), salud = $2, lastrob = $3 WHERE id = $4 OR lid = $4", [fine, nuevaSalud, now, m.sender]);
                const msg = pickRandom(robMessages.police);
                let reply = msg.replace(/{fine}/g, fine.toLocaleString("es-AR"));
                reply += `\n\n${daño.msg} *-${dañoHP} HP*`;
                reply += aplicarPeso();
                if (nuevaSalud === 0) {
                    reply += `\n\n💀 *¡QUEDASTE NOQUEADO!*`;
                }
                await m.react("🚓");
                return m.reply(reply);
            }
            // ===== 3. ROBO EXITOSO (55%) =====
            // ===== ROBO DE DIAMANTES =====
            if (robarDiamantes) {
                robDiamAmount = getRandomInt(MIN_ROB_DIAMONDS, Math.min(MAX_ROB_DIAMONDS, diamVictim));
                if (robDiamAmount > diamVictim) {
                    robDiamAmount = Math.max(1, Math.floor(diamVictim * 0.5));
                }
                if (robDiamAmount < 1) {
                    robarDiamantes = false;
                    robarExp = true;
                    robAmount = Math.floor(getRandomInt(MIN_ROB, Math.min(MAX_ROB, xpVictim)) * weightEffect.multiplier);
                    const msg = pickRandom(robMessages.noDiamonds);
                    await db.query("UPDATE usuarios SET exp = exp + $1, lastrob = $2 WHERE id = $3 OR lid = $3", [robAmount, now, m.sender]);
                    await db.query("UPDATE usuarios SET exp = GREATEST(exp - $1, 0) WHERE lid = $2 OR id = $2", [robAmount, victimLid]);
                    await m.react("🤏");
                    return m.reply(msg
                        .replace(/{amount}/g, robAmount.toLocaleString("es-AR"))
                        .replace(/{target}/g, `@${realNum}`)
                        .replace(/{currency}/g, currencyEmoji) + aplicarPeso());
                }
                await db.query("UPDATE usuarios SET limite = limite + $1, lastrob = $2 WHERE id = $3 OR lid = $3", [robDiamAmount, now, m.sender]);
                await db.query("UPDATE usuarios SET limite = GREATEST(limite - $1, 0) WHERE lid = $2 OR id = $2", [robDiamAmount, victimLid]);
                const msg = pickRandom(robMessages.successDiam);
                await m.react("💰");
                return m.reply(msg
                    .replace(/{amount}/g, robDiamAmount.toLocaleString("es-AR"))
                    .replace(/{target}/g, `@${realNum}`)
                    .replace(/{currency}/g, currencyEmoji) + aplicarPeso());
            }
            // ===== ROBO DE EXP =====
            if (robarExp) {
                robAmount = Math.floor(getRandomInt(MIN_ROB, Math.min(MAX_ROB, xpVictim)) * weightEffect.multiplier);
                if (xpVictim > 500000 && Math.random() < 0.3) {
                    const msg = pickRandom(robMessages.rich);
                    await m.reply(msg.replace(/{amount}/g, robAmount.toLocaleString("es-AR")).replace(/{target}/g, `@${realNum}`));
                }
                if (xpVictim < 1000 && Math.random() < 0.2) {
                    robAmount = Math.floor(robAmount * 0.3);
                }
                await db.query("UPDATE usuarios SET exp = exp + $1, lastrob = $2 WHERE id = $3 OR lid = $3", [robAmount, now, m.sender]);
                await db.query("UPDATE usuarios SET exp = GREATEST(exp - $1, 0) WHERE lid = $2 OR id = $2", [robAmount, victimLid]);
                const msg = pickRandom(robMessages.successExp);
                await m.reply(msg
                    .replace(/{amount}/g, robAmount.toLocaleString("es-AR"))
                    .replace(/{target}/g, `@${realNum}`) + aplicarPeso());
                if (robAmount > 20000) {
                    await m.react("🤑");
                }
                else if (robAmount > 10000) {
                    await m.react("😈");
                }
                else {
                    await m.react("🤏");
                }
            }
        }
        catch (e) {
            m.react("🚓");
            console.error("❌ Error en rob:", e);
            await m.reply(`❌ Error al robar: ${e.message || e}`);
        }
    }
};
