import { db } from "../lib/db.js";
const MAX_ROB = 30000;
const MIN_ROB = 100;
const MAX_ROB_DIAMONDS = 150;
const MIN_ROB_DIAMONDS = 5;
const COOLDOWN = 30 * 60 * 1000; // 30 min
const POLICE_CHANCE = 0.3; // 30% de que aparezca la policía
const MAX_FINE = 50000;
const MIN_FINE = 1000;
function cleanJid(jid = '') {
    return String(jid || '').replace(/:\d+/, '');
}
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
    ],
    counter: [
        "⚔️ *{target} te contraatacó!* Perdiste {amount} XP",
        "💥 *{target} se defendió!* Te quitó {amount} XP",
        "🤜 *{target} te partió la cara!* Perdiste {amount} XP",
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
    ]
};
export default {
    name: ["rob", "robar"],
    help: ["rob @user"],
    desc: "Robar XP a otro usuario",
    tags: ["econ"],
    register: true,
    run: async ({ conn, m, mentionedJid }) => {
        try {
            const now = Date.now();
            const currencyEmoji = m.e?.currency_emoji || "💎";
            const currencyName = m.e?.currency_name || "Diamante(s)";
            // ===== VERIFICAR COOLDOWN =====
            const { rows: [robber] } = await db.query("SELECT exp, limite, lastrob, money FROM usuarios WHERE id = $1 OR lid = $2", [m.sender, m.lid || ""]);
            const robberData = (robber || {});
            const lastRob = Number(robberData.lastrob || 0);
            const timeLeft = lastRob + COOLDOWN - now;
            if (timeLeft > 0) {
                const h = Math.floor(timeLeft / 3600000);
                const mLeft = Math.floor((timeLeft % 3600000) / 60000);
                return m.reply(null, `🚓 Policía te tiene en la mira. Volvé en ${h}h ${mLeft}min`);
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
            const realJid = `${realNum}@s.whatsapp.net`;
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
            const xpVictim = Number(victimData.exp) || 0;
            const diamVictim = Number(victimData.limite) || 0;
            // ===== VERIFICAR SI VÍCTIMA TIENE ALGO =====
            if (xpVictim < 100 && diamVictim < 5) {
                const msg = pickRandom(robMessages.poor);
                return m.reply(msg.replace(/{target}/g, `@${realNum}`));
            }
            // ===== DECIDIR QUÉ ROBAR =====
            let robarDiamantes = false;
            let robarExp = false;
            // Si la víctima tiene diamantes y EXP, 50/50
            if (diamVictim >= 5 && xpVictim >= 100) {
                robarDiamantes = Math.random() < 0.5;
                robarExp = !robarDiamantes;
            }
            // Si solo tiene diamantes
            else if (diamVictim >= 5) {
                robarDiamantes = true;
            }
            // Si solo tiene EXP
            else if (xpVictim >= 100) {
                robarExp = true;
            }
            // Si no tiene nada
            else {
                const msg = pickRandom(robMessages.poor);
                return m.reply(msg.replace(/{target}/g, `@${realNum}`));
            }
            // ===== EVENTOS ALEATORIOS =====
            const randomEvent = Math.random();
            let robAmount = 0;
            let robDiamAmount = 0;
            let tipoRobo = "";
            // ===== 1. CONTRAATAQUE (15%) =====
            if (randomEvent < 0.15) {
                const counterAmount = getRandomInt(100, Math.min(5000, xpVictim));
                await db.query("UPDATE usuarios SET exp = exp - $1 WHERE id = $2 OR lid = $2", [counterAmount, m.sender]);
                await db.query("UPDATE usuarios SET exp = exp + $1 WHERE lid = $2 OR id = $2", [counterAmount, victimLid]);
                const msg = pickRandom(robMessages.counter);
                return m.reply(msg.replace(/{amount}/g, counterAmount.toLocaleString("es-AR")).replace(/{target}/g, `@${realNum}`));
            }
            // ===== 2. POLICÍA (30%) =====
            if (randomEvent < 0.45) {
                const fine = getRandomInt(MIN_FINE, Math.min(MAX_FINE, Number(robberData.exp) || 0));
                await db.query("UPDATE usuarios SET exp = exp - $1 WHERE id = $2 OR lid = $2", [fine, m.sender]);
                await db.query("UPDATE usuarios SET lastrob = $1 WHERE id = $2 OR lid = $2", [now, m.sender]);
                const msg = pickRandom(robMessages.police);
                return m.reply(msg.replace(/{fine}/g, fine.toLocaleString("es-AR")));
            }
            // ===== 3. ROBO EXITOSO =====
            // Determinar cantidad a robar
            if (robarDiamantes) {
                robDiamAmount = getRandomInt(MIN_ROB_DIAMONDS, Math.min(MAX_ROB_DIAMONDS, diamVictim));
                tipoRobo = "diamantes";
                // Verificar si la víctima tiene suficientes diamantes
                if (robDiamAmount > diamVictim) {
                    robDiamAmount = Math.max(1, Math.floor(diamVictim * 0.5));
                }
                // Si la víctima tiene menos de 5 diamantes, robar EXP en su lugar
                if (robDiamAmount < 1) {
                    robarDiamantes = false;
                    robarExp = true;
                    robAmount = getRandomInt(MIN_ROB, Math.min(MAX_ROB, xpVictim));
                    tipoRobo = "exp";
                    const msg = pickRandom(robMessages.noDiamonds);
                    await db.query("UPDATE usuarios SET exp = exp + $1, lastrob = $2 WHERE id = $3 OR lid = $3", [robAmount, now, m.sender]);
                    await db.query("UPDATE usuarios SET exp = exp - $1 WHERE lid = $2 OR id = $2", [robAmount, victimLid]);
                    return m.reply(msg
                        .replace(/{amount}/g, robAmount.toLocaleString("es-AR"))
                        .replace(/{target}/g, `@${realNum}`)
                        .replace(/{currency}/g, currencyEmoji));
                }
                // Robar diamantes
                await db.query("UPDATE usuarios SET limite = limite + $1, lastrob = $2 WHERE id = $3 OR lid = $3", [robDiamAmount, now, m.sender]);
                await db.query("UPDATE usuarios SET limite = limite - $1 WHERE lid = $2 OR id = $2", [robDiamAmount, victimLid]);
                const msg = pickRandom(robMessages.successDiam);
                return m.reply(msg
                    .replace(/{amount}/g, robDiamAmount.toLocaleString("es-AR"))
                    .replace(/{target}/g, `@${realNum}`)
                    .replace(/{currency}/g, currencyEmoji));
            }
            // ===== ROBO DE EXP =====
            if (robarExp) {
                robAmount = getRandomInt(MIN_ROB, Math.min(MAX_ROB, xpVictim));
                // Si la víctima es muy rica
                if (xpVictim > 500000 && Math.random() < 0.3) {
                    const msg = pickRandom(robMessages.rich);
                    await m.reply(msg.replace(/{amount}/g, robAmount.toLocaleString("es-AR")).replace(/{target}/g, `@${realNum}`));
                }
                // Si la víctima tiene menos de 1000 XP
                if (xpVictim < 1000 && Math.random() < 0.2) {
                    robAmount = Math.floor(robAmount * 0.3);
                }
                await db.query("UPDATE usuarios SET exp = exp + $1, lastrob = $2 WHERE id = $3 OR lid = $3", [robAmount, now, m.sender]);
                await db.query("UPDATE usuarios SET exp = exp - $1 WHERE lid = $2 OR id = $2", [robAmount, victimLid]);
                const msg = pickRandom(robMessages.successExp);
                await m.reply(msg
                    .replace(/{amount}/g, robAmount.toLocaleString("es-AR"))
                    .replace(/{target}/g, `@${realNum}`));
            }
            // ===== REACCIÓN =====
            if (robDiamAmount > 20) {
                await m.react("💎");
            }
            else if (robAmount > 20000) {
                await m.react("🤑");
            }
            else if (robAmount > 10000) {
                await m.react("😈");
            }
            else if (robDiamAmount > 0) {
                await m.react("💰");
            }
            else {
                await m.react("🤏");
            }
        }
        catch (e) {
            m.react("🚓");
            console.error("❌ Error en rob:", e);
            await m.reply(`❌ Error al robar: ${e.message || e}`);
        }
    }
};
