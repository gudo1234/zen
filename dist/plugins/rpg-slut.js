// @ts-nocheck
import { chequearSaludParaRPG, puedeUsarRPG, getWeightEffect } from "../lib/rpg-utils.js";
const COOLDOWN = 10 * 60 * 1000; // 10 minutos
const frasesExito = [
    "💅 Te vendiste por un combo del McDonald's",
    "👄 Le diste una buena mamada a un admin del grupo",
    "💃 Le hiciste un baile sensual al admin y te pagó",
    "📱 Tu OnlyFans explotó por 10 minutos",
    "🐾 Tu cliente era un furry y te pagó el doble",
    "👗 Te disfrazaste de maid y funcionó",
    "👴 El viejo verde del grupo te dio propina",
    "🤗 Ofreciste abrazos por monedas, pero te malinterpretaron",
    "🎮 Trabajaste en una esquina pixelada de San Andreas",
    "🤫 Te pagaron por quedarte calladito... y lo hiciste muy bien",
    "🌹 Fuiste a la zona roja del grupo y volviste con billete",
    "🔥 Tu cosplay de Nezuko encendió el ambiente",
    "🎭 Hiciste roleplay con el bot y te pagaron por no romper personaje",
    "😈 Te disfrazaste de emoji y alguien pagó por usarte",
    "💰 Un sugar daddy te ofreció XP a cambio de cariñitos virtuales",
    "🎲 Participaste en un 'verdad o reto' y te pasaste de atrevid@",
    "🖼️ Tu avatar provocó donaciones en un grupo de solteros",
    "📱 Te alquilaste como fondo de pantalla personalizado",
    "💋 Vendiste besos digitales y fue un éxito",
    "🌸 Tu waifu interior salió a facturar",
    "📸 Tu foto de perfil enamoró a un moderador",
    "😏 Aceptaste una cita con alguien que solo habla en stickers",
    "🤖 Te disfrazaste de bot NSFW y nadie notó la diferencia",
    "🎵 Hiciste un dúo de TikTok caliente y lo monetizaste",
    "🎮 Un VTuber te contrató como su asistente picante",
    "📦 Tu pack de stickers se volvió viral y pediste comisión",
    "🎙️ Te pagaron por enviar audios diciendo 'papi'",
    "📱 Te disfrazaste de Siri y alguien te pidió comandos indecentes",
    "📚 Te ofreciste para dar tutoriales privados en el grupo",
    "🏰 Fuiste la estrella de una noche en la taberna del RPG",
    "👣 Le vendiste 'fotos de pies' en formato ASCII",
    "🎭 Cobraste por dejar que te usaran de NPC caliente",
    "⛏️ Participaste en un evento hot en un servidor de Minecraft",
    "👊 Le hiciste un peter al admin del grupo",
    "🎤 Te grabaste susurrando comandos y alguien lo compró",
    "📱 Creaste un OnlyBots y fuiste trending",
    "👮 Te hiciste pasar por moderador sexy y cobraste multas",
    "📖 Tu nombre salió en un fanfic y alguien te recompensó",
    "👋 Organizaste un evento de 'nalgadas virtuales' con entrada paga",
    "💃 Le bailaste a un bot de economía y te soltó todo su saldo",
    "🔥 Hiciste un striptease virtual y te llovieron propinas",
    "💬 Vendiste packs de stickers hot en el grupo",
    "🌙 Fuiste el/la acompañante de un admin en una cita virtual",
    "😈 Tu voz hot en un audio generó donaciones masivas",
];
const frasesFracaso = [
    "😤 *¡Te rechazaron!* Solo ganaste",
    "💀 *¡El admin te baneó temporalmente!* Ganaste",
    "😅 *¡No fue tu noche!* Solo ganaste",
    "🤡 *¡Te confundieron con un bot!* Ganaste",
    "😢 *¡Te reportaron por spam hot!* Ganaste",
    "🥴 *¡Te dormiste en el trabajo!* Ganaste",
    "🤮 *¡El cliente era un asco!* Apenas sacaste",
    "🤕 *¡Un cliente te trató mal!* Solo ganaste",
];
const frasesBonus = [
    "🎰 *¡SESIÓN DE LUJO!*",
    "👑 *¡ESTRELLA DEL GRUPO!*",
    "⭐ *¡RENDIMIENTO ESTELAR!*",
    "💎 *¡CLIENTE VIP!*",
    "🔥 *¡FIESTA SALVAJE!*",
];
// Daños por fracaso
const dañosFracaso = [
    { msg: "🥴 Te dio asco el cliente", hp: 5 },
    { msg: "🤕 El cliente fue muy brusco", hp: 8 },
    { msg: "🩸 Te maltrataron feo", hp: 12 },
    { msg: "💥 ¡Un cliente violento te golpeó!", hp: 15 },
];
// Curaciones por éxito
const curacionesExito = [
    "💆 Te dieron un masaje relajante",
    "🛁 Te invitaron a un baño de espuma",
    "🍷 Te consintieron con vino y chocolates",
    "💅 Te regalaron un día de spa",
];
// Curaciones por fiesta salvaje / jackpot
const curacionesVIP = [
    "🛏️ ¡Sesión VIP con descanso incluido!",
    "💎 ¡Te trataron como realeza!",
    "🌴 ¡Te llevaron a un hotel 5 estrellas!",
    "✨ ¡Experiencia de lujo total!",
];
// 🔥 FRASES DE PESO (tipo social)
const FRASES_PESO = {
    muy_flaco: [
        "😬 Los clientes te pidieron que comas algo antes",
        "🙄 'Muy flaca/o, no gracias' te dijeron",
        "😐 Se te acercaron, te vieron flaco y se fueron",
        "🤨 'Andá a comer algo primero' te dijeron",
        "💀 Sos puro hueso, no gustás a nadie",
    ],
    flaco: [
        "😐 Los clientes te miraron raro",
        "🤔 'Estás muy flaco' te dijeron",
        "🙁 Te dijeron que comas más",
    ],
    rellenito: [
        "🍑 Los clientes te prefieren rellenito, +20%",
        "🔥 ¡Estás en el punto perfecto!",
        "💋 Tu curvy body gustó mucho",
        "😏 Te dicen que estás en tu mejor momento",
    ],
    gordito: [
        "😏 Te prefieren con pancita, +10%",
        "🍑 Los clientes te miraron bien",
        "💕 'Qué lindo gordito' te dijeron",
    ],
    gordo: [
        "😬 Los clientes te dijeron que bajes unos kilos",
        "🙄 'Muy gordo, no gracias' te dijeron",
        "🤨 Se te acercaron, vieron tu panza y se fueron",
    ],
    obeso: [
        "😂 Se cagaron de risa y no te contrataron",
        "🤮 'Ni en pedo' te dijeron",
        "🚨 Salieron corriendo cuando te vieron",
        "😭 Nadie quiere un obeso, lo siento",
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
function pickRandom(list) {
    return list[Math.floor(Math.random() * list.length)];
}
export default {
    name: ["slut"],
    help: ["slut"],
    desc: "Acción RPG para ganar XP",
    tags: ["econ"],
    register: true,
    run: async ({ conn, m, prefijo }) => {
        // 🔥 CHEQUEAR SALUD PRIMERO
        const saludInfo = await chequearSaludParaRPG(m.sender, m.lid || "");
        const check = puedeUsarRPG(saludInfo.salud);
        if (!check.ok)
            return m.reply(null, check.razon);
        const multiplier = saludInfo.multiplier;
        const COOLDOWN_FINAL = COOLDOWN * multiplier;
        const peso = saludInfo.peso;
        // 🔥 EFECTO DEL PESO (tipo: social)
        const weightEffect = getWeightEffect(peso, "social");
        try {
            const now = Date.now();
            const { rows: [user] } = await m.db.query("SELECT exp, lastslut, salud, salud_max FROM usuarios WHERE id = $1 OR lid = $2", [m.sender, m.lid || ""]);
            const last = Number(user.lastslut) || 0;
            const cd = last + COOLDOWN_FINAL - now;
            if (cd > 0) {
                const min = Math.floor(cd / 60000);
                const seg = Math.floor((cd % 60000) / 1000);
                const tiempo = min > 0 ? `${min}m ${seg}s` : `${seg}s`;
                let msg = `💦 *Descansá ${tiempo} antes de volver a prostitute*`;
                if (multiplier > 1) {
                    msg += `\n\n⚠️ _Cooldown ×${multiplier} por salud baja (${saludInfo.salud}/100)_`;
                }
                return m.reply(null, msg);
            }
            // ===== ESTADO INICIAL =====
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
            // ===== EVENTOS =====
            const eventType = Math.random();
            let texto = "";
            let xpGanado = 0;
            let esFracaso = false;
            let dañoHP = 0;
            let curaHP = 0;
            // ===== 1. ÉXITO (55%) =====
            if (eventType < 0.55) {
                const xp = getRandomInt(1000, 3500);
                xpGanado = Math.floor(xp * weightEffect.multiplier);
                // Cura leve por éxito
                curaHP = getRandomInt(3, 8);
                const fraseCura = pickRandom(curacionesExito);
                // 15% de chance de sesión de lujo
                if (Math.random() < 0.15) {
                    const bonusXp = Math.floor(getRandomInt(500, 3000) * weightEffect.multiplier);
                    xpGanado += bonusXp;
                    curaHP = getRandomInt(10, 20);
                    texto = `${pickRandom(frasesBonus)}\n${pickRandom(frasesExito)}\nGanaste: *${xpGanado.toLocaleString("es-AR")} XP*\n\n🎁 *¡BONUS!* +${bonusXp.toLocaleString("es-AR")} XP extra\n💖 ${fraseCura} *+${curaHP} HP*`;
                }
                else {
                    texto = `${pickRandom(frasesExito)}\nGanaste: *${xpGanado.toLocaleString("es-AR")} XP*\n💖 ${fraseCura} *+${curaHP} HP*`;
                }
                texto += aplicarPeso();
                const nuevaSalud = Math.min(saludActual + curaHP, saludMax);
                await m.db.query("UPDATE usuarios SET exp = exp + $1, lastslut = $2, salud = $3 WHERE id = $4 OR lid = $4", [xpGanado, now, nuevaSalud, m.sender]);
            }
            // ===== 2. FRACASO (30%) — CON DAÑO =====
            else if (eventType < 0.85) {
                const xp = getRandomInt(50, 500);
                xpGanado = Math.floor(xp * weightEffect.multiplier);
                esFracaso = true;
                // Daño aleatorio
                const daño = pickRandom(dañosFracaso);
                dañoHP = Math.min(daño.hp, saludActual);
                const nuevaSalud = Math.max(0, saludActual - dañoHP);
                texto = `${pickRandom(frasesFracaso)} *${xpGanado.toLocaleString("es-AR")} XP*\n\n${daño.msg} *-${dañoHP} HP*`;
                if (nuevaSalud === 0) {
                    texto += `\n\n💀 *¡QUEDASTE NOQUEADO!*\n> No podés usar comandos RPG hasta recuperarte.\n> Usá *${prefijo}comer* o *${prefijo}use* para curarte.`;
                }
                texto += aplicarPeso();
                await m.db.query("UPDATE usuarios SET exp = exp + $1, lastslut = $2, salud = $3 WHERE id = $4 OR lid = $4", [xpGanado, now, nuevaSalud, m.sender]);
            }
            // ===== 3. FIESTA SALVAJE (10%) =====
            else if (eventType < 0.95) {
                const xp = getRandomInt(3000, 7000);
                xpGanado = Math.floor(xp * weightEffect.multiplier);
                // Cura VIP
                curaHP = getRandomInt(15, 25);
                const fraseCura = pickRandom(curacionesVIP);
                const nuevaSalud = Math.min(saludActual + curaHP, saludMax);
                texto = `🔥 *¡FIESTA SALVAJE!* 🔥\n${pickRandom(frasesExito)}\nGanaste: *${xpGanado.toLocaleString("es-AR")} XP*\n\n💃 *¡La noche fue épica!*\n${fraseCura} *+${curaHP} HP*`;
                texto += aplicarPeso();
                await m.db.query("UPDATE usuarios SET exp = exp + $1, lastslut = $2, salud = $3 WHERE id = $4 OR lid = $4", [xpGanado, now, nuevaSalud, m.sender]);
            }
            // ===== 4. JACKPOT HOT (5%) =====
            else {
                const xp = getRandomInt(5000, 13000);
                xpGanado = Math.floor(xp * weightEffect.multiplier);
                // Cura máxima
                curaHP = getRandomInt(25, 40);
                const fraseCura = pickRandom(curacionesVIP);
                const nuevaSalud = Math.min(saludActual + curaHP, saludMax);
                texto = `🎰 *¡JACKPOT HOT!* 🔥🔥🔥\n${pickRandom(frasesExito)}\nGanaste: *${xpGanado.toLocaleString("es-AR")} XP*\n\n⭐ *¡ERES LA ESTRELLA DEL GRUPO!* ⭐\n${fraseCura} *+${curaHP} HP*`;
                texto += aplicarPeso();
                await m.db.query("UPDATE usuarios SET exp = exp + $1, lastslut = $2, salud = $3 WHERE id = $4 OR lid = $4", [xpGanado, now, nuevaSalud, m.sender]);
            }
            await m.reply(null, texto);
            // ===== REACCIONES =====
            if (dañoHP > 0) {
                await m.react("🤕");
            }
            else if (curaHP > 0) {
                await m.react("💖");
            }
            else if (xpGanado > 5000) {
                await m.react("🔥");
            }
            else if (xpGanado > 3000) {
                await m.react("💃");
            }
            else if (xpGanado > 1000) {
                await m.react("😈");
            }
            else if (esFracaso) {
                await m.react("😢");
            }
            else {
                await m.react("💅");
            }
        }
        catch (err) {
            console.error("slut error:", err);
            m.reply("❌ Ocurrió un error.");
            await m.react("🚨");
        }
    }
};
