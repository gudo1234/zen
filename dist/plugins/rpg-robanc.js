// @ts-nocheck
import { db } from "../lib/db.js";
import { chequearSaludParaRPG, puedeUsarRPG, getWeightEffect } from "../lib/rpg-utils.js";
const COOLDOWN = 60 * 60 * 1000; // 60 min
const MIN_BANCO = 100;
const ROBO_MIN_PCT = 0.05;
const ROBO_MAX_PCT = 0.15;
const ROBO_TOPE = 50000;
const POLICE_CHANCE = 0.4;
const COUNTER_CHANCE = 0.2;
const MIN_FINE = 1000;
const MAX_FINE = 50000;
function onlyNum(v = '') {
    return String(v || '').replace(/[^0-9]/g, '');
}
function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}
function pickRandom(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}
const messages = {
    success: [
        "🏦 *¡ASALTO AL BANCO EXITOSO!* Le robaste {amount} {currency} a {target}",
        "💰 *Entraste a la bóveda* y te llevaste {amount} {currency} de {target}",
        "🥷 *Robo bancario perfecto* Le sacaste {amount} {currency} a {target}",
        "🤑 *¡Golpe maestro!* {amount} {currency} de {target} ahora son tuyos",
        "💎 *Vaciaste la caja fuerte* de {target} Te llevaste {amount} {currency}",
    ],
    police: [
        "👮‍♂️ *¡La policía te atrapó en el banco!* Multa de {fine} XP",
        "🚓 *Alarma activada!* Te detuvieron y pagaste {fine} XP de fianza",
        "🔫 *Los guardias te redujeron!* Perdiste {fine} XP en sobornos",
        "🚨 *¡Cámaras te grabaron!* Multa de {fine} XP por intento de asalto",
    ],
    counter: [
        "⚔️ *¡{target} tenía guardias!* Te contraatacaron y perdiste {amount} XP",
        "💥 *El sistema de seguridad de {target} te electrocutó!* Perdiste {amount} XP",
        "🤜 *{target} activó la alarma y te lincharon!* Perdiste {amount} XP",
        "🛡️ *La bóveda de {target} era blindada!* Te lastimaste y perdiste {amount} XP",
    ],
    poor: [
        "🍞 *{target} está en la ruina* No tiene ni 100 {currency} en el banco",
        "🥺 *{target} es más pobre que vos* Dejalo en paz",
        "😢 *{target} no tiene nada en el banco* Robale a alguien con plata",
        "🤡 *{target} tiene menos de 100 {currency}* No vale la pena el riesgo",
    ],
    protected: [
        "🛡️ *¡{target} tiene seguro anti-robo!* Tu intento falló y pagaste {fine} XP",
        "🔒 *La bóveda de {target} estaba protegida* Perdiste {fine} XP en el intento",
        "🚨 *¡Alarma anti-robo activada!* {target} estaba protegido y pagaste {fine} XP",
    ],
    protected_total: [
        "🔐 *¡{target} tiene seguro TOTAL!* Banco y XP protegidos",
        "🔐 *{target} pagó el seguro total* No pudiste robarle nada",
        "🔐 *Bóveda blindada con seguro total* Te detectaron y multaron {fine} XP",
    ],
};
// Daños por policía
const dañosPolicia = [
    { msg: "🚓 Te esposaron bruscamente", hp: 5 },
    { msg: "👮‍♂️ Te golpearon al detenerte", hp: 8 },
    { msg: "🩸 Te tiraron contra el patrullero", hp: 12 },
    { msg: "💥 ¡Te redujeron con fuerza!", hp: 15 },
];
// Daños por contraataque
const dañosCounter = [
    { msg: "⚡ El sistema de seguridad te electrocutó", hp: 10 },
    { msg: "🥊 Los guardias te dieron una paliza", hp: 15 },
    { msg: "💥 Te tiraron al piso con fuerza", hp: 18 },
    { msg: "🔫 ¡Los guardias te redujeron a golpes!", hp: 20 },
];
// Daños por seguro activado
const dañosSeguro = [
    { msg: "🛡️ El seguro te tiró gas pimienta", hp: 5 },
    { msg: "🚨 La alarma te dejó sordo y te golpearon", hp: 8 },
    { msg: "⚡ El sistema anti-robo te dio una descarga", hp: 10 },
];
// 🔥 Daños LEVES por escape exitoso
const dañosEscape = [
    { msg: "🩹 Te raspaste saltando la reja", hp: 3 },
    { msg: "🤕 Te caíste escapando por la ventana", hp: 5 },
    { msg: "🩸 Te cortaste con los vidrios", hp: 6 },
    { msg: "💥 Tropezaste con la alarma", hp: 8 },
];
// 🔥 FRASES DE PESO (tipo agilidad)
const FRASES_PESO = {
    muy_flaco: [
        "🦎 Sos tan flaco que te metiste por la ventana del banco sin hacer ruido",
        "⚡ La flacura te dio agilidad para escapar",
        "🥷 Te escabulliste entre las cámaras como un fantasma",
        "🐱 Sos tan flaco que ni las alarmas te detectaron",
    ],
    flaco: [
        "🏃 Sos ágil por estar flaco",
        "🤸 Te movés rápido, los guardias no te vieron",
        "💨 Tu delgadez te ayudó a escapar del banco",
    ],
    rellenito: [
        "🐢 La panza te hizo más lento al escapar",
        "👣 Tus pasos sonaron en el mármol del banco",
    ],
    gordito: [
        "🐘 Hiciste temblar el piso del banco al caminar",
        "👣 Las cámaras te detectaron por tus pisadas fuertes",
        "😬 Casi te caés escapando con la bolsa de diamantes",
    ],
    gordo: [
        "🐘 Caminás y tiembla el piso del banco, te escucharon",
        "💥 Te caíste con la bolsa y armaste un escándalo",
        "🍔 La panza te delató, no sos sigiloso",
    ],
    obeso: [
        "🐘 Hiciste temblar la bóveda entera al entrar",
        "🚨 Se activaron todas las alarmas por tu peso",
        "💥 El piso del banco crujió cuando caminaste",
    ],
};
function pickFrasePeso(categoria) {
    const frases = FRASES_PESO[categoria] || [];
    if (frases.length === 0)
        return "";
    return frases[Math.floor(Math.random() * frases.length)];
}
export default {
    name: ["robanco", "robarbanco", "asaltar", "robbank"],
    help: ["robanco @user"],
    desc: "Asalta el banco",
    tags: ["econ"],
    register: true,
    run: async ({ conn, m, prefijo, mentionedJid }) => {
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
            // ===== COOLDOWN DEL LADRÓN =====
            const { rows: [robber] } = await db.query("SELECT exp, limite, banco, lastrobanc, suerte_usos, salud, salud_max FROM usuarios WHERE id = $1 OR lid = $2", [m.sender, m.lid || ""]);
            if (!robber) {
                return m.reply(null, "❌ No estás registrado en la base de datos.");
            }
            const robberData = (robber || {});
            const lastrobanc = Number(robberData.lastrobanc || 0);
            const timeLeft = lastrobanc + COOLDOWN_FINAL - now;
            if (timeLeft > 0) {
                const h = Math.floor(timeLeft / 3600000);
                const min = Math.floor((timeLeft % 3600000) / 60000);
                let msg = `🚓 *La policía te tiene fichado.* Volvé en ${h}h ${min}min`;
                if (multiplier > 1) {
                    msg += `\n\n⚠️ _Cooldown ×${multiplier} por salud baja (${saludInfo.salud}/100)_`;
                }
                return m.reply(null, msg);
            }
            // ===== VÍCTIMA =====
            let who = mentionedJid?.[0] ||
                m.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0] ||
                m.quoted?.sender;
            if (!who) {
                return m.reply(null, "Etiquetá a alguien o respondé un mensaje para asaltar su banco");
            }
            if (who === m.sender) {
                return m.reply(null, "🤡 ¿Vas a asaltar tu propio banco? Sos un genio...");
            }
            // ===== RESOLVER LID =====
            if (who && who.endsWith("@lid")) {
                try {
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
                catch (e) {
                    console.log("⚠️ No se pudo resolver LID:", e.message);
                }
            }
            const whoNum = onlyNum(who);
            // ===== BUSCAR VÍCTIMA =====
            let resUser = await db.query(`SELECT * FROM usuarios WHERE id = $1 OR lid = $1 OR num = $2`, [who, whoNum]);
            if (resUser.rows.length === 0) {
                const fallback = await db.query(`SELECT * FROM usuarios WHERE num = $1`, [whoNum]);
                if (fallback.rows.length === 0) {
                    return m.reply(null, "🤷 Ese usuario no está registrado");
                }
                resUser.rows = fallback.rows;
            }
            const victimData = resUser.rows[0];
            // ===== RESOLVER NÚMERO Y LID =====
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
            const bancoVictim = Number(victimData.banco) || 0;
            // ===== BANCO SUFICIENTE =====
            if (bancoVictim < MIN_BANCO) {
                const msg = pickRandom(messages.poor);
                return m.reply(msg
                    .replace(/{target}/g, `@${realNum}`)
                    .replace(/{currency}/g, currencyName), null, [`${realNum}@s.whatsapp.net`]);
            }
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
            const seguroHasta = Number(victimData.seguro_hasta) || 0;
            const seguroTotalHasta = Number(victimData.anti_rob2) || 0;
            const tieneSeguroBancario = seguroHasta > now;
            const tieneSeguroTotal = seguroTotalHasta > now;
            if (tieneSeguroBancario || tieneSeguroTotal) {
                const expRobber = Number(robberData.exp) || 0;
                const bancoRobber = Number(robberData.banco) || 0;
                const fine = getRandomInt(MIN_FINE, Math.min(MAX_FINE, Math.max(expRobber, 1000)));
                const daño = pickRandom(dañosSeguro);
                const dañoHP = Math.min(daño.hp, saludRobber);
                const nuevaSalud = Math.max(0, saludRobber - dañoHP);
                if (bancoRobber >= fine) {
                    await db.query("UPDATE usuarios SET banco = banco - $1, lastrobanc = $2, salud = $3 WHERE id = $4 OR lid = $4", [fine, now, nuevaSalud, m.sender]);
                }
                else if (bancoRobber > 0) {
                    const resto = fine - bancoRobber;
                    await db.query("UPDATE usuarios SET banco = 0, exp = GREATEST(exp - $1, 0), lastrobanc = $2, salud = $3 WHERE id = $4 OR lid = $4", [resto, now, nuevaSalud, m.sender]);
                }
                else {
                    await db.query("UPDATE usuarios SET exp = GREATEST(exp - $1, 0), lastrobanc = $2, salud = $3 WHERE id = $4 OR lid = $4", [fine, now, nuevaSalud, m.sender]);
                }
                const listaMsg = tieneSeguroTotal ? messages.protected_total : messages.protected;
                const msg = pickRandom(listaMsg);
                let reply = msg
                    .replace(/{target}/g, `@${realNum}`)
                    .replace(/{fine}/g, fine.toLocaleString("es-AR"));
                reply += `\n\n${daño.msg} *-${dañoHP} HP*`;
                reply += aplicarPeso();
                if (nuevaSalud === 0) {
                    reply += `\n\n💀 *¡QUEDASTE NOQUEADO!*\n> Usá *${prefijo}comer* o *${prefijo}use* para curarte.`;
                }
                await m.react("🛡️");
                return m.reply(reply, null, [`${realNum}@s.whatsapp.net`]);
            }
            const suerteUsos = Number(robberData.suerte_usos) || 0;
            const boostSuerte = suerteUsos > 0 ? 0.20 : 0;
            if (suerteUsos > 0) {
                await db.query("UPDATE usuarios SET suerte_usos = GREATEST(suerte_usos - 1, 0) WHERE id = $1 OR lid = $2", [m.sender, m.lid || ""]);
            }
            const randomEvent = Math.random();
            const policeChance = Math.max(0, POLICE_CHANCE - boostSuerte);
            const counterChance = COUNTER_CHANCE;
            if (randomEvent < policeChance) {
                const expRobber = Number(robberData.exp) || 0;
                const bancoRobber = Number(robberData.banco) || 0;
                const fine = getRandomInt(MIN_FINE, Math.min(MAX_FINE, Math.max(expRobber, 1000)));
                const daño = pickRandom(dañosPolicia);
                const dañoHP = Math.min(daño.hp, saludRobber);
                const nuevaSalud = Math.max(0, saludRobber - dañoHP);
                if (bancoRobber >= fine) {
                    await db.query("UPDATE usuarios SET banco = banco - $1, lastrobanc = $2, salud = $3 WHERE id = $4 OR lid = $4", [fine, now, nuevaSalud, m.sender]);
                }
                else if (bancoRobber > 0) {
                    const resto = fine - bancoRobber;
                    await db.query("UPDATE usuarios SET banco = 0, exp = GREATEST(exp - $1, 0), lastrobanc = $2, salud = $3 WHERE id = $4 OR lid = $4", [resto, now, nuevaSalud, m.sender]);
                }
                else {
                    await db.query("UPDATE usuarios SET exp = GREATEST(exp - $1, 0), lastrobanc = $2, salud = $3 WHERE id = $4 OR lid = $4", [fine, now, nuevaSalud, m.sender]);
                }
                const msg = pickRandom(messages.police);
                let reply = msg.replace(/{fine}/g, fine.toLocaleString("es-AR"));
                reply += `\n\n${daño.msg} *-${dañoHP} HP*`;
                reply += aplicarPeso();
                if (nuevaSalud === 0) {
                    reply += `\n\n💀 *¡QUEDASTE NOQUEADO!*`;
                }
                await m.react("🚓");
                return m.reply(reply);
            }
            // ===== 2. CONTRAATAQUE =====
            if (randomEvent < policeChance + counterChance) {
                const expRobber = Number(robberData.exp) || 0;
                const counterAmount = getRandomInt(500, Math.min(10000, Math.max(expRobber, 500)));
                const daño = pickRandom(dañosCounter);
                const dañoHP = Math.min(daño.hp, saludRobber);
                const nuevaSalud = Math.max(0, saludRobber - dañoHP);
                await db.query("UPDATE usuarios SET exp = GREATEST(exp - $1, 0), lastrobanc = $2, salud = $3 WHERE id = $4 OR lid = $4", [counterAmount, now, nuevaSalud, m.sender]);
                await db.query("UPDATE usuarios SET exp = exp + $1 WHERE lid = $2 OR id = $2", [Math.floor(counterAmount * 0.5), victimLid]);
                const msg = pickRandom(messages.counter);
                let reply = msg
                    .replace(/{amount}/g, counterAmount.toLocaleString("es-AR"))
                    .replace(/{target}/g, `@${realNum}`);
                reply += `\n\n${daño.msg} *-${dañoHP} HP*`;
                reply += aplicarPeso();
                if (nuevaSalud === 0) {
                    reply += `\n\n💀 *¡QUEDASTE NOQUEADO!*`;
                }
                await m.react("🤜");
                return m.reply(reply, null, [`${realNum}@s.whatsapp.net`]);
            }
            // ===== 3. ROBO EXITOSO =====
            const pct = ROBO_MIN_PCT + Math.random() * (ROBO_MAX_PCT - ROBO_MIN_PCT);
            let robAmount = Math.floor(bancoVictim * pct);
            if (robAmount > ROBO_TOPE)
                robAmount = ROBO_TOPE;
            // 🔥 Aplicar peso a la cantidad robada
            robAmount = Math.floor(robAmount * weightEffect.multiplier);
            const minDejar = Math.floor(bancoVictim * 0.10);
            if (bancoVictim - robAmount < minDejar) {
                robAmount = bancoVictim - minDejar;
            }
            if (robAmount <= 0) {
                return m.reply(null, "🤷 No pudiste robar nada, el banco está muy vacío");
            }
            // 🔥 Daño leve por escape (20%)
            let replyEscape = "";
            let nuevaSalud = saludRobber;
            if (Math.random() < 0.20) {
                const daño = pickRandom(dañosEscape);
                const dañoHP = Math.min(daño.hp, saludRobber);
                nuevaSalud = Math.max(0, saludRobber - dañoHP);
                replyEscape = `\n\n${daño.msg} *-${dañoHP} HP*`;
                if (nuevaSalud === 0) {
                    replyEscape += `\n\n💀 *¡QUEDASTE NOQUEADO!*`;
                }
            }
            await db.query("UPDATE usuarios SET banco = banco + $1, lastrobanc = $2, salud = $3 WHERE id = $4 OR lid = $4", [robAmount, now, nuevaSalud, m.sender]);
            await db.query("UPDATE usuarios SET banco = GREATEST(banco - $1, 0) WHERE lid = $2 OR id = $2", [robAmount, victimLid]);
            const msg = pickRandom(messages.success);
            let replyText = msg
                .replace(/{amount}/g, robAmount.toLocaleString("es-AR"))
                .replace(/{target}/g, `@${realNum}`)
                .replace(/{currency}/g, `${currencyEmoji} ${currencyName}`);
            if (boostSuerte > 0) {
                replyText += `\n\n🍀 *Poción de suerte usada* (quedan ${suerteUsos - 1} usos)`;
            }
            replyText += replyEscape;
            replyText += aplicarPeso();
            await m.reply(replyText);
            // ===== REACCIONES =====
            if (replyEscape) {
                await m.react("🤕");
            }
            else if (robAmount > 20000) {
                await m.react("🤑");
            }
            else if (robAmount > 10000) {
                await m.react("💰");
            }
            else if (robAmount > 5000) {
                await m.react("💎");
            }
            else {
                await m.react("🥷");
            }
        }
        catch (e) {
            console.error("❌ Error en robanco:", e);
            await m.react("🚨");
            await m.reply(`❌ Error al asaltar el banco: ${e.message || e}`);
        }
    }
};
