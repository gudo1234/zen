// @ts-nocheck
import { db } from "../lib/db.js";
import { chequearSaludParaRPG, puedeUsarRPG, getWeightEffect } from "../lib/rpg-utils.js";
const COOLDOWN = 30 * 60 * 1000; // 30 min
// ===== DROGAS =====
const DROGAS = {
    droga_marihuana: {
        name: "🌿 Marihuana",
        xp: { min: 500, max: 1500 },
        riesgo: 0.10,
        usos: 10,
        prioridad: 10,
    },
    droga_cocaina: {
        name: "❄️ Cocaína",
        xp: { min: 1500, max: 3000 },
        riesgo: 0.20,
        usos: 8,
        prioridad: 20,
    },
    droga_metanfetamina: {
        name: "💊 Metanfetamina",
        xp: { min: 2000, max: 4000 },
        riesgo: 0.25,
        usos: 6,
        prioridad: 30,
    },
    droga_lsd: {
        name: "🎨 LSD",
        xp: { min: 3000, max: 6000 },
        riesgo: 0.30,
        usos: 5,
        prioridad: 40,
    },
    droga_heroina: {
        name: "💉 Heroína",
        xp: { min: 4000, max: 8000 },
        riesgo: 0.35,
        usos: 4,
        prioridad: 50,
    },
};
// ===== ITEMS ILEGALES VENDIBLES =====
const ITEMS_ILEGALES = {
    // Armas ilegales (más valiosas)
    pistola: {
        name: "🔫 Pistola",
        xp: { min: 800, max: 1600 },
        riesgo: 0.25,
        prioridad: 45,
    },
    cuchillo: {
        name: "🔪 Cuchillo",
        xp: { min: 400, max: 800 },
        riesgo: 0.20,
        prioridad: 15,
    },
    // Herramientas ilegales
    documentos_falsos: {
        name: "📄 Documentos falsos",
        xp: { min: 1200, max: 1800 },
        riesgo: 0.30,
        prioridad: 35,
    },
    disfraz: {
        name: "🎭 Disfraz",
        xp: { min: 800, max: 1200 },
        riesgo: 0.25,
        prioridad: 25,
    },
    ganzua: {
        name: "🔓 Ganzúa",
        xp: { min: 500, max: 900 },
        riesgo: 0.20,
        prioridad: 12,
    },
};
// ===== TRABAJO SIN ITEMS =====
const TRABAJO_JEFE = {
    xp: { min: 100, max: 300 },
    riesgo: 0.15,
};
// ===== HERRAMIENTAS QUE AYUDAN =====
const HERRAMIENTAS_BONUS = {
    ganzua: { name: "🔓 Ganzúa", bonus: 0.10 },
    disfraz: { name: "🎭 Disfraz", bonus: 0.15 },
    documentos_falsos: { name: "📄 Documentos falsos", bonus: 0.20 },
    pistola: { name: "🔫 Pistola", bonus: 0.25 },
};
// ===== FRASES =====
const frasesExito = [
    "💰 *¡Venta exitosa!* El cliente pagó sin chistar",
    "🤝 *Trato cerrado* en el callejón",
    "💸 *El cliente pagó y se fue contento*",
    "🕶️ *Noche tranquila, buena venta*",
    "🎉 *¡Buen cliente!* Pagó al toque",
    "😎 *Vendiste sin que nadie sospechara*",
    "🔥 *La mercancía voló*",
];
const frasesClienteRico = [
    "👑 *¡CLIENTE RICO!* Te pagó el doble",
    "💎 *Un millonario te compró todo*",
    "🏆 *¡JACKPOT!* Cliente VIP",
    "🤑 *El cliente estaba desesperado y pagó más*",
    "🎰 *¡Boss final!* Te dieron una fortuna",
];
const frasesPolicia = [
    "🚔 *¡LA POLICÍA TE ATRAPÓ!*",
    "👮 *¡Redada policial!* Te agarraron vendiendo",
    "🚨 *Los policías te tenían fichado*",
    "🔒 *Te detuvieron en plena venta*",
    "🕵️ *Un policía encubierto te compró*",
];
const frasesEstafa = [
    "🤡 *¡Te estafaron!* El cliente se fue sin pagar",
    "🏃 *El cliente salió corriendo con la mercancía*",
    "😤 *Te robaron en plena venta*",
    "💀 *El cliente era un estafador*",
    "😱 *El cliente sacó un arma y se fue con todo*",
];
const frasesRedada = [
    "💀 *¡REDADA POLICIAL MASIVA!*",
    "🚔 *¡La DEA te encontró!*",
    "🔴 *¡Operativo policial!* Te agarraron con todo",
    "🚨 *¡Te allanaron el rancho!*",
];
const frasesJefeExito = [
    "🕶️ *El jefe te mandó a hacer un mandado*",
    "🤵 *Le hiciste un trabajito al jefe mafia*",
    "💼 *El jefe te pagó por un favor pequeño*",
    "🤝 *Le cumpliste al jefe y te pagó*",
    "📦 *Entregaste un paquete misterioso*",
    "🔥 *El jefe quedó conforme con tu laburo*",
];
const frasesJefePolicia = [
    "🚔 *¡La policía te paró por sospechoso!*",
    "👮 *Te agarraron en un control*",
    "🚨 *Te ficharon por estar en la zona*",
];
const frasesJefeEstafa = [
    "🤡 *El jefe se quedó con tu plata*",
    "😤 *Te pagaron menos de lo prometido*",
    "💀 *El jefe te cagó y no te pagó nada*",
];
// ===== FRASES DE PESO =====
const FRASES_PESO = {
    muy_flaco: [
        "🦎 Sos tan flaco que te escabulliste de la policía",
        "⚡ La flacura te hizo pasar desapercibido",
        "🥷 Sos un fantasma en el callejón",
    ],
    flaco: [
        "🏃 Sos ágil por estar flaco",
        "🤸 Tu delgadez te ayudó a escapar",
    ],
    rellenito: [
        "🐢 La panza te hizo un poco lento",
        "👣 Tus pasos suenan un poco fuerte",
    ],
    gordito: [
        "🐘 Hiciste ruido al caminar por el callejón",
        "👣 Los policías te escucharon desde lejos",
    ],
    gordo: [
        "🐘 Caminás y tiembla el piso, te escucharon",
        "💥 Casi te caés y llamás la atención",
    ],
    obeso: [
        "🐘 Hiciste temblar la cuadra entera",
        "🚨 Se activaron todas las alarmas por tu peso",
    ],
};
function pickFrasePeso(categoria) {
    const frases = FRASES_PESO[categoria] || [];
    if (frases.length === 0)
        return "";
    return frases[Math.floor(Math.random() * frases.length)];
}
function fmt(n) {
    return Number(n || 0).toLocaleString("es-AR");
}
function pickRandom(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}
function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}
// 🔥 Obtener usos de una droga
function getUsos(droga) {
    if (typeof droga === "number")
        return droga;
    if (typeof droga === "object" && droga !== null)
        return Number(droga.usos) || 0;
    return 0;
}
// 🔥 Elegir el mejor item vendible
function elegirItemVendible(drogas, inventario) {
    const opciones = [];
    // Drogas (con usos > 0)
    for (const [key, valor] of Object.entries(drogas || {})) {
        const usos = getUsos(valor);
        if (usos > 0 && DROGAS[key]) {
            opciones.push({
                tipo: "droga",
                key,
                info: DROGAS[key],
                usos,
                prioridad: DROGAS[key].prioridad,
            });
        }
    }
    // Items ilegales (con cantidad > 0)
    for (const [key, valor] of Object.entries(inventario || {})) {
        const cant = Number(valor) || 0;
        if (cant > 0 && ITEMS_ILEGALES[key]) {
            opciones.push({
                tipo: "item",
                key,
                info: ITEMS_ILEGALES[key],
                cantidad: cant,
                prioridad: ITEMS_ILEGALES[key].prioridad,
            });
        }
    }
    if (opciones.length === 0)
        return null;
    // Ordenar por prioridad descendente
    opciones.sort((a, b) => b.prioridad - a.prioridad);
    return opciones[0];
}
export default {
    name: ["traficar", "venderdroga", "drugsell", "venderilegal"],
    help: ["traficar"],
    desc: "Vende drogas o items ilegales",
    tags: ["econ"],
    register: true,
    run: async ({ conn, m, args, prefijo }) => {
        try {
            const now = Date.now();
            // ===== CHEQUEAR SALUD =====
            const saludInfo = await chequearSaludParaRPG(m.sender, m.lid || "");
            const check = puedeUsarRPG(saludInfo.salud);
            if (!check.ok)
                return m.reply(null, check.razon);
            const multiplier = saludInfo.multiplier;
            const COOLDOWN_FINAL = COOLDOWN * multiplier;
            const peso = saludInfo.peso;
            const weightEffect = getWeightEffect(peso, "agilidad");
            // ===== COOLDOWN =====
            const { rows: [user] } = await db.query("SELECT drogas, inventario, exp, lasttraficar FROM usuarios WHERE id = $1 OR lid = $2", [m.sender, m.lid || ""]);
            if (!user)
                return m.reply(null, "❌ No estás registrado.");
            const lastTraficar = Number(user.lasttraficar) || 0;
            const cd = lastTraficar + COOLDOWN_FINAL - now;
            if (cd > 0) {
                const min = Math.floor(cd / 60000);
                const seg = Math.floor((cd % 60000) / 1000);
                const tiempo = min > 0 ? `${min}m ${seg}s` : `${seg}s`;
                let msg = `⏳ *Esperá ${tiempo} para volver a traficar*`;
                if (multiplier > 1) {
                    msg += `\n\n⚠️ _Cooldown ×${multiplier} por salud baja_`;
                }
                return m.reply(null, msg);
            }
            // ===== HERRAMIENTAS QUE AYUDAN =====
            const inventario = user.inventario || {};
            let bonusHerramientas = 0;
            let herramientasUsadas = [];
            for (const [key, tool] of Object.entries(HERRAMIENTAS_BONUS)) {
                if (Number(inventario[key]) > 0) {
                    bonusHerramientas += tool.bonus;
                    herramientasUsadas.push({ key, name: tool.name, bonus: tool.bonus });
                }
            }
            bonusHerramientas = Math.min(0.50, bonusHerramientas);
            // ===== DETECTAR QUÉ VENDER =====
            const drogas = user.drogas || {};
            const itemVendible = elegirItemVendible(drogas, inventario);
            // ==========================================================
            // 🔥 MODO JEFE MAFIA (sin nada)
            // ==========================================================
            if (!itemVendible) {
                const riesgoFinal = Math.max(0.05, TRABAJO_JEFE.riesgo * (2 - weightEffect.multiplier) - bonusHerramientas);
                const randomEvent = Math.random();
                let texto = "";
                let expGanado = 0;
                let perdidaXP = 0;
                // 1. REDADA (15%)
                if (randomEvent < 0.15) {
                    perdidaXP = getRandomInt(50, 200);
                    texto = `${pickRandom(frasesRedada)}\n\n`;
                    texto += `▢ El jefe te mandó a un lugar peligroso\n`;
                    texto += `▢ Perdiste: *${fmt(perdidaXP)}* XP\n\n`;
                    texto += `📉 Zafaste de milagro`;
                    await db.query(`UPDATE usuarios SET exp = GREATEST(exp - $1, 0), lasttraficar = $2 WHERE id = $3 OR lid = $3`, [perdidaXP, now, m.sender]);
                    await m.reply(null, texto);
                    await m.react("💀");
                    return;
                }
                // 2. ESTAFA JEFE (15%)
                if (randomEvent < 0.20) {
                    texto = `${pickRandom(frasesJefeEstafa)}\n\n`;
                    texto += `▢ Trabajaste gratis para el jefe\n`;
                    texto += `▢ No ganaste nada 💸`;
                    await db.query(`UPDATE usuarios SET lasttraficar = $1 WHERE id = $2 OR lid = $2`, [now, m.sender]);
                    await m.reply(null, texto);
                    await m.react("😢");
                    return;
                }
                // 3. POLICÍA (según riesgo)
                if (randomEvent < 0.20 + riesgoFinal) {
                    perdidaXP = getRandomInt(100, 500);
                    texto = `${pickRandom(frasesJefePolicia)}\n\n`;
                    texto += `▢ Perdiste: *${fmt(perdidaXP)}* XP\n`;
                    texto += `\n_Te llevaron preso por sospechoso_`;
                    await db.query(`UPDATE usuarios SET exp = GREATEST(exp - $1, 0), lasttraficar = $2 WHERE id = $3 OR lid = $3`, [perdidaXP, now, m.sender]);
                    await m.reply(null, texto);
                    await m.react("🚔");
                    return;
                }
                // 4. TRABAJO EXITOSO
                const xpUnit = getRandomInt(TRABAJO_JEFE.xp.min, TRABAJO_JEFE.xp.max);
                expGanado = xpUnit;
                texto = `${pickRandom(frasesJefeExito)}\n\n`;
                texto += `▢ El jefe te pagó: *${fmt(expGanado)} XP*\n`;
                texto += `\n\n💡 _Comprá drogas o items ilegales para ganar más_`;
                texto += `\n👉 *${prefijo}blackmarket*`;
                await db.query(`UPDATE usuarios SET exp = exp + $1, lasttraficar = $2 WHERE id = $3 OR lid = $3`, [expGanado, now, m.sender]);
                // Aviso de peso
                if (weightEffect.categoria !== "normal") {
                    const frase = pickFrasePeso(weightEffect.categoria);
                    if (frase)
                        texto += `\n\n${weightEffect.emoji} _${frase}_`;
                    if (weightEffect.multiplier < 1) {
                        const pct = Math.round((1 - weightEffect.multiplier) * 100);
                        texto += `\n📉 *-${pct}% éxito por peso (${peso} kg)*`;
                    }
                    else if (weightEffect.multiplier > 1) {
                        const pct = Math.round((weightEffect.multiplier - 1) * 100);
                        texto += `\n📈 *+${pct}% éxito por peso (${peso} kg)*`;
                    }
                }
                await m.reply(null, texto);
                await m.react("💼");
                return;
            }
            // ==========================================================
            // 🔥 MODO VENDER
            // ==========================================================
            const { tipo, key, info } = itemVendible;
            const esDroga = tipo === "droga";
            const usosActuales = esDroga ? getUsos(drogas[key]) : 0;
            const cantidadActual = !esDroga ? (Number(inventario[key]) || 0) : 0;
            const usosMax = esDroga ? info.usos : 0;
            // 🔥 Calcular riesgo
            let riesgoFinal = info.riesgo * (2 - weightEffect.multiplier);
            riesgoFinal = Math.max(0.05, riesgoFinal - bonusHerramientas);
            const randomEvent = Math.random();
            let texto = "";
            let expGanado = 0;
            let perdidaXP = 0;
            // 1. REDADA (5%) — pierde TODO
            if (randomEvent < 0.05) {
                perdidaXP = getRandomInt(500, 3000);
                texto = `${pickRandom(frasesRedada)}\n\n`;
                texto += `▢ Perdiste TODA tu mercancía ilegal\n`;
                texto += `▢ Perdiste: *${fmt(perdidaXP)}* XP\n\n`;
                texto += `📉 Perdiste TODO por una redada`;
                // Borra drogas Y items ilegales del inventario
                const invLimpio = { ...inventario };
                for (const key of Object.keys(ITEMS_ILEGALES)) {
                    delete invLimpio[key];
                }
                await db.query(`UPDATE usuarios SET drogas = '{}'::jsonb, inventario = $1::jsonb, lasttraficar = $2 WHERE id = $3 OR lid = $3`, [JSON.stringify(invLimpio), now, m.sender]);
                await m.reply(null, texto);
                await m.react("💀");
                return;
            }
            // 2. ESTAFA (10%)
            if (randomEvent < 0.15) {
                texto = `${pickRandom(frasesEstafa)}\n\n`;
                const drogasFinal = { ...drogas };
                const inventarioFinal = { ...inventario };
                if (esDroga) {
                    const usosRestantes = Math.max(0, usosActuales - 1);
                    texto += `▢ Perdiste: *1 uso* de ${info.name}\n`;
                    if (usosRestantes > 0) {
                        drogasFinal[key] = { usos: usosRestantes };
                        texto += `\n📦 Quedan: *${usosRestantes}/${usosMax}* usos`;
                    }
                    else {
                        delete drogasFinal[key];
                        texto += `\n💀 *Se te acabó la ${info.name}*`;
                    }
                }
                else {
                    const cantRestante = Math.max(0, cantidadActual - 1);
                    texto += `▢ Perdiste: *1x ${info.name}*\n`;
                    if (cantRestante > 0) {
                        inventarioFinal[key] = cantRestante;
                        texto += `\n📦 Quedan: *${cantRestante}* en inventario`;
                    }
                    else {
                        delete inventarioFinal[key];
                        texto += `\n💀 *Se te acabó la ${info.name}*`;
                    }
                }
                texto += `\n▢ No recibiste nada 💸`;
                await db.query(`UPDATE usuarios SET drogas = $1::jsonb, inventario = $2::jsonb, lasttraficar = $3 WHERE id = $4 OR lid = $4`, [JSON.stringify(drogasFinal), JSON.stringify(inventarioFinal), now, m.sender]);
                await m.reply(null, texto);
                await m.react("😢");
                return;
            }
            // 3. POLICÍA (según riesgo)
            if (randomEvent < 0.30 + riesgoFinal) {
                perdidaXP = getRandomInt(500, 2000);
                texto = `${pickRandom(frasesPolicia)}\n\n`;
                const drogasFinal = { ...drogas };
                const inventarioFinal = { ...inventario };
                if (esDroga) {
                    const usosRestantes = Math.max(0, usosActuales - 1);
                    texto += `▢ Te agarraron con *1 uso* de ${info.name}\n`;
                    if (usosRestantes > 0) {
                        drogasFinal[key] = { usos: usosRestantes };
                        texto += `\n📦 Quedan: *${usosRestantes}/${usosMax}* usos`;
                    }
                    else {
                        delete drogasFinal[key];
                        texto += `\n💀 *Se te acabó la ${info.name}*`;
                    }
                }
                else {
                    const cantRestante = Math.max(0, cantidadActual - 1);
                    texto += `▢ Te agarraron con *1x ${info.name}*\n`;
                    if (cantRestante > 0) {
                        inventarioFinal[key] = cantRestante;
                        texto += `\n📦 Quedan: *${cantRestante}* en inventario`;
                    }
                    else {
                        delete inventarioFinal[key];
                        texto += `\n💀 *Se te acabó la ${info.name}*`;
                    }
                }
                texto += `\n▢ Perdiste: *${fmt(perdidaXP)}* XP\n`;
                texto += `\n_La mercancía fue confiscada_`;
                await db.query(`UPDATE usuarios SET drogas = $1::jsonb, inventario = $2::jsonb, exp = GREATEST(exp - $3, 0), lasttraficar = $4 WHERE id = $5 OR lid = $5`, [JSON.stringify(drogasFinal), JSON.stringify(inventarioFinal), perdidaXP, now, m.sender]);
                await m.reply(null, texto);
                await m.react("🚔");
                return;
            }
            // ===== RESTO = VENTA EXITOSA =====
            const drogasFinal = { ...drogas };
            const inventarioFinal = { ...inventario };
            let usosRestantes = 0;
            let cantRestante = 0;
            // 4. CLIENTE RICO (15%)
            if (randomEvent < 0.15 + riesgoFinal + 0.15) {
                const xpUnit = getRandomInt(info.xp.min, info.xp.max);
                expGanado = Math.floor(xpUnit * 2);
                texto = `${pickRandom(frasesClienteRico)}\n\n`;
                texto += `▢ Vendiste: *1 ${esDroga ? "uso" : "unidad"}* de ${info.name}\n`;
                texto += `▢ Ganaste: *${fmt(expGanado)} XP*\n`;
                texto += `\n💰 _¡El doble de lo normal!_`;
            }
            // 5. VENTA EXITOSA
            else {
                const xpUnit = getRandomInt(info.xp.min, info.xp.max);
                expGanado = xpUnit;
                texto = `${pickRandom(frasesExito)}\n\n`;
                texto += `▢ Vendiste: *1 ${esDroga ? "uso" : "unidad"}* de ${info.name}\n`;
                texto += `▢ Ganaste: *${fmt(expGanado)} XP*`;
            }
            // Consumir
            if (esDroga) {
                usosRestantes = Math.max(0, usosActuales - 1);
                if (usosRestantes > 0) {
                    drogasFinal[key] = { usos: usosRestantes };
                    texto += `\n📦 Quedan: *${usosRestantes}/${usosMax}* usos`;
                }
                else {
                    delete drogasFinal[key];
                    texto += `\n💀 *Se te acabó la ${info.name}*`;
                }
            }
            else {
                cantRestante = Math.max(0, cantidadActual - 1);
                if (cantRestante > 0) {
                    inventarioFinal[key] = cantRestante;
                    texto += `\n📦 Quedan: *${cantRestante}* en inventario`;
                }
                else {
                    delete inventarioFinal[key];
                    texto += `\n💀 *Se te acabó la ${info.name}*`;
                }
            }
            // Consumir herramientas
            let herramientasMsg = "";
            if (herramientasUsadas.length > 0) {
                herramientasMsg = `\n\n🕶️ *Herramientas usadas:*\n`;
                for (const tool of herramientasUsadas) {
                    inventarioFinal[tool.key] = Number(inventarioFinal[tool.key]) - 1;
                    if (inventarioFinal[tool.key] <= 0)
                        delete inventarioFinal[tool.key];
                    herramientasMsg += `▢ ${tool.name} (+${Math.round(tool.bonus * 100)}%)\n`;
                }
                herramientasMsg += `_Se consumieron al usarse_`;
            }
            await db.query(`UPDATE usuarios 
         SET drogas = $1::jsonb, 
             exp = exp + $2, 
             inventario = $3::jsonb,
             lasttraficar = $4 
         WHERE id = $5 OR lid = $5`, [
                JSON.stringify(drogasFinal),
                expGanado,
                JSON.stringify(inventarioFinal),
                now,
                m.sender
            ]);
            texto += herramientasMsg;
            // Aviso de peso
            if (weightEffect.categoria !== "normal") {
                const frase = pickFrasePeso(weightEffect.categoria);
                if (frase)
                    texto += `\n\n${weightEffect.emoji} _${frase}_`;
                if (weightEffect.multiplier < 1) {
                    const pct = Math.round((1 - weightEffect.multiplier) * 100);
                    texto += `\n📉 *-${pct}% éxito por peso (${peso} kg)*`;
                }
                else if (weightEffect.multiplier > 1) {
                    const pct = Math.round((weightEffect.multiplier - 1) * 100);
                    texto += `\n📈 *+${pct}% éxito por peso (${peso} kg)*`;
                }
            }
            await m.reply(null, texto);
            await m.react("💰");
        }
        catch (err) {
            console.error("traficar error:", err);
            m.reply("❌ Ocurrió un error al traficar.");
            await m.react("🚨");
        }
    }
};
