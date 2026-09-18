// @ts-nocheck
import { db } from "../lib/db.js";
import { HAMBRE_INTERVALO_COMER_MS } from "../lib/rpg-utils.js";
const COMIDAS = {
    // ===== COMIDAS NORMALES =====
    chocolate: { name: "🍫 Chocolate", hp: 10, peso: 1 },
    ensalada: { name: "🥗 Ensalada", hp: 15, peso: -1 },
    guisos: { name: "🍝 Guisos", hp: 15, peso: 1 },
    hamburguesa: { name: "🍔 Hamburguesa", hp: 30, peso: 2 },
    milanesa: { name: "🍗 Milanesa", hp: 40, peso: 2 },
    pizza: { name: "🍕 Pizza", hp: 50, peso: 3 },
    sushi: { name: "🍣 Sushi", hp: 60, peso: 1 },
    asado: { name: "🥩 Asado", hp: 100, peso: 5 },
    // ===== CARNES COCIDAS =====
    carne_conejo_cocida: { name: "🍖 Carne de conejo cocida", hp: 15, peso: 2, cocida: true },
    carne_ardilla_cocida: { name: "🍖 Carne de ardilla cocida", hp: 10, peso: 1, cocida: true },
    carne_pato_cocida: { name: "🍖 Carne de pato cocida", hp: 20, peso: 2, cocida: true },
    carne_gallina_cocida: { name: "🍖 Carne de gallina cocida", hp: 18, peso: 2, cocida: true },
    carne_cerdo_cocida: { name: "🍖 Carne de cerdo cocida", hp: 35, peso: 3, cocida: true },
    carne_vaca_cocida: { name: "🍖 Carne de vaca cocida", hp: 50, peso: 4, cocida: true },
    carne_zorro_cocida: { name: "🍖 Carne de zorro cocida", hp: 30, peso: 3, cocida: true },
    carne_ciervo_cocida: { name: "🍖 Carne de ciervo cocida", hp: 45, peso: 4, cocida: true },
    carne_jabali_cocida: { name: "🍖 Carne de jabalí cocida", hp: 60, peso: 5, cocida: true },
    carne_lobo_cocida: { name: "🍖 Carne de lobo cocida", hp: 70, peso: 4, cocida: true },
    carne_oso_cocida: { name: "🍖 Carne de oso cocida", hp: 90, peso: 6, cocida: true },
    carne_leon_cocida: { name: "🍖 Carne de león cocida", hp: 80, peso: 5, cocida: true },
    carne_unicornio_cocida: { name: "🍖 Carne de unicornio cocida", hp: 120, peso: 3, cocida: true },
    carne_dragon_cocida: { name: "🍖 Carne de dragón cocida", hp: 200, peso: 10, cocida: true },
    // ===== CARNES MAL COCIDAS =====
    carne_conejo_mal_cocida: { name: "Carne de conejo mal cocida", hp: -5, peso: 1, mal_cocida: true },
    carne_ardilla_mal_cocida: { name: "Carne de ardilla mal cocida", hp: -4, peso: 1, mal_cocida: true },
    carne_pato_mal_cocida: { name: "Carne de pato mal cocida", hp: -6, peso: 1, mal_cocida: true },
    carne_gallina_mal_cocida: { name: "Carne de gallina mal cocida", hp: -5, peso: 1, mal_cocida: true },
    carne_cerdo_mal_cocida: { name: "Carne de cerdo mal cocida", hp: -10, peso: 2, mal_cocida: true },
    carne_vaca_mal_cocida: { name: "Carne de vaca mal cocida", hp: -12, peso: 2, mal_cocida: true },
    carne_zorro_mal_cocida: { name: "Carne de zorro mal cocida", hp: -8, peso: 2, mal_cocida: true },
    carne_ciervo_mal_cocida: { name: "Carne de ciervo mal cocida", hp: -10, peso: 2, mal_cocida: true },
    carne_jabali_mal_cocida: { name: "Carne de jabalí mal cocida", hp: -15, peso: 3, mal_cocida: true },
    carne_lobo_mal_cocida: { name: "Carne de lobo mal cocida", hp: -18, peso: 2, mal_cocida: true },
    carne_oso_mal_cocida: { name: "Carne de oso mal cocida", hp: -22, peso: 4, mal_cocida: true },
    carne_leon_mal_cocida: { name: "Carne de león mal cocida", hp: -20, peso: 3, mal_cocida: true },
    carne_unicornio_mal_cocida: { name: "Carne de unicornio mal cocida", hp: -25, peso: 2, mal_cocida: true },
    carne_dragon_mal_cocida: { name: "Carne de dragón mal cocida", hp: -30, peso: 5, mal_cocida: true },
};
// 🔥 LÍMITES DE PESO
const PESO_MINIMO = 25;
const PESO_MAXIMO = 300;
// 🔥 FRASES CUANDO YA ESTÁ LLENO (pero come igual)
const frasesLleno = [
    "Te lo comiste igual, gordito 🐷",
    "Tas lleno pero no desperdicias comida 🍔",
    "Ya no te entraba pero igual lo mandaste pa' dentro 🤰",
    "Comiste por gula, no por hambre 😋",
    "Sos un pozo sin fondo, no llenás nunca 🕳️",
    "Comiste al 100% pero tu estómago dice 'otra vez' 🍽️",
    "No tenías hambre pero te tentaste 🤤",
    "Tas relleno pero igual le entraste 😂",
    "Te comiste todo aunque estabas lleno, animal 🐮",
    "Tu barriga va a explotar 💥",
];
// 🔥 FRASES CUANDO ESTÁ MUY FLACO
const frasesMuyFlaco = [
    "🪶 ¡Tas muy flaco! No podés comer eso, te vas a convertir en fantasma",
    "💀 ¡Necesitás subir de peso! Comé algo con proteína primero",
    "😬 ¡Tas puro hueso! No comas ensalada, comé algo con grasa",
    "🦴 Si seguís así te lleva el viento. ¡Comé algo que te engorde!",
    "⚠️ ¡Tas bajo peso! Necesitás comer algo como asado, no eso",
];
// 🔥 FRASES CUANDO ESTÁ MUY GORDO
const frasesMuyGordo = [
    "🐷 ¡Tas enorme! No podés comer más, comé una ensalada",
    "🍔 ¡Pará de comer! Andá a buscar una ensalada mejor",
    "🚨 ¡300 kg! Necesitás bajar, comé algo light",
    "😭 ¡Tas como una casa! No comas eso, comé ensalada",
    "💥 ¡Basta de comida! Comé algo que te haga bajar de peso",
];
// 🔥 FRASES PARA CARNE MAL COCIDA
const frasesMalCocida = [
    "🤢 ¡Qué asco! Te cayó mal al estómago",
    "💀 ¡Intoxicación alimentaria en camino!",
    "🤮 ¡Casi vomitás! Estaba cruda por dentro",
    "😷 ¡Te sentís mal! La próxima cocinala mejor",
    "🥴 ¡Te revolvió el estómago!",
];
function fmt(n) {
    return Number(n || 0).toLocaleString("es-AR");
}
function pickRandom(list) {
    return list[Math.floor(Math.random() * list.length)];
}
export default {
    name: ["comer", "eat", "comida"],
    help: ["comer <item>"],
    desc: "Come una comida para recuperar salud",
    tags: ["econ"],
    register: true,
    run: async ({ conn, m, args, prefijo }) => {
        try {
            const now = Date.now();
            const itemKey = (args[0] || "").toLowerCase();
            if (!itemKey) {
                return m.reply(null, `⚠️ Uso: *${prefijo}comer <item>*\n\n📌 Ejemplo: *${prefijo}comer hamburguesa*`);
            }
            const item = COMIDAS[itemKey];
            if (!item) {
                return m.reply(null, `❌ *${itemKey}* no es una comida válida.\n\n> Usa *${prefijo}shop* para ver las comidas`);
            }
            const { rows: [user] } = await db.query("SELECT salud, salud_max, peso, inventario, lastcomer FROM usuarios WHERE id = $1 OR lid = $2", [m.sender, m.lid || ""]);
            if (!user)
                return m.reply(null, "❌ No estás registrado.");
            // Cooldown comer
            const lastComer = Number(user.lastcomer) || 0;
            const cdComer = lastComer + HAMBRE_INTERVALO_COMER_MS - now;
            if (cdComer > 0) {
                const seg = Math.ceil(cdComer / 1000);
                return m.reply(null, `⏳ Esperá *${seg}s* antes de volver a comer`);
            }
            const inventario = user.inventario || {};
            const cantidad = Number(inventario[itemKey]) || 0;
            if (cantidad <= 0) {
                return m.reply(null, `❌ No tenés *${item.name}* en tu inventario.\n\n> Comprala con *${prefijo}buy ${itemKey}*`);
            }
            // Calcular cantidad a comer
            let count = 1;
            if (args[1] && /all/i.test(args[1])) {
                count = cantidad;
            }
            else if (args[1]) {
                count = Math.min(Number(args[1]) || 1, cantidad);
            }
            const saludActual = Number(user.salud) || 100;
            const saludMax = Number(user.salud_max) || 100;
            const pesoActual = Number(user.peso) || 40;
            const pesoDeltaTotal = item.peso * count;
            // ==========================================================
            // 🔥 BLOQUEO POR PESO EXTREMO (solo comidas normales, no carnes)
            // ==========================================================
            if (!item.cocida && !item.mal_cocida) {
                // Muy flaco + comida que baja peso → BLOQUEAR
                if (pesoActual < PESO_MINIMO && pesoDeltaTotal < 0) {
                    const frase = pickRandom(frasesMuyFlaco);
                    return m.reply(null, `🚫 *NO PODÉS COMER ESO*\n\n${frase}\n\n` +
                        `⚖️ Tu peso: *${pesoActual} kg*\n` +
                        `📉 Esa comida: *${pesoDeltaTotal} kg*\n\n` +
                        `👉 Comé algo como *asado*, *pizza* o *hamburguesa* para subir de peso`);
                }
                // Muy gordo + comida que sube peso → BLOQUEAR
                if (pesoActual >= PESO_MAXIMO && pesoDeltaTotal > 0) {
                    const frase = pickRandom(frasesMuyGordo);
                    return m.reply(null, `🚫 *NO PODÉS COMER ESO*\n\n${frase}\n\n` +
                        `⚖️ Tu peso: *${pesoActual} kg*\n` +
                        `📈 Esa comida: *+${pesoDeltaTotal} kg*\n\n` +
                        `👉 Comé algo como *ensalada* o *sushi* para bajar de peso`);
                }
            }
            // ==========================================================
            // 🔥 CALCULAR HP (soporta negativo)
            // ==========================================================
            const hpTeorico = item.hp * count;
            let nuevaSalud;
            if (hpTeorico >= 0) {
                // Comida que cura
                nuevaSalud = Math.min(saludActual + hpTeorico, saludMax);
            }
            else {
                // Comida que daña (carne mal cocida)
                nuevaSalud = Math.max(0, saludActual + hpTeorico);
            }
            const hpReal = nuevaSalud - saludActual;
            const nuevoPeso = Math.max(20, pesoActual + pesoDeltaTotal);
            // Consumir del inventario
            inventario[itemKey] = cantidad - count;
            if (inventario[itemKey] <= 0)
                delete inventario[itemKey];
            // Update
            await db.query(`UPDATE usuarios 
         SET salud = $1, peso = $2, inventario = $3::jsonb, lastcomer = $4
         WHERE id = $5 OR lid = $5`, [nuevaSalud, nuevoPeso, JSON.stringify(inventario), now, m.sender]);
            // ==========================================================
            // 🔥 MENSAJE
            // ==========================================================
            let msg = `${m.e.ok} *${item.name}* ${count > 1 ? `x${count} ` : ""}comido\n\n`;
            msg += `❤️ Salud: *${saludActual}* → *${nuevaSalud}*`;
            if (hpReal > 0) {
                msg += ` (+${hpReal})`;
            }
            else if (hpReal < 0) {
                msg += ` (${hpReal})`;
            }
            else {
                msg += ` _(ya estabas al máximo)_`;
            }
            msg += `\n⚖️ Peso: *${pesoActual}* → *${nuevoPeso}* kg`;
            if (pesoDeltaTotal > 0)
                msg += ` (+${pesoDeltaTotal})`;
            else if (pesoDeltaTotal < 0)
                msg += ` (${pesoDeltaTotal})`;
            msg += `\n📦 Quedan: *${inventario[itemKey] || 0}* en inventario`;
            // 🔥 Aviso de carne mal cocida
            if (item.mal_cocida) {
                msg += `\n\n${pickRandom(frasesMalCocida)}`;
            }
            // 🔥 Aviso si ya estaba lleno
            if (hpReal === 0 && !item.mal_cocida) {
                msg += `\n🍽️ ${pickRandom(frasesLleno)}`;
            }
            // 🔥 Aviso de KO por carne mal cocida
            if (nuevaSalud === 0) {
                msg += `\n\n💀 *¡QUEDASTE NOQUEADO!*\n> Usá *${prefijo}comer* o *${prefijo}use* para curarte.`;
            }
            // 🔥 Aviso si se está acercando a los límites
            if (!item.cocida && !item.mal_cocida) {
                if (nuevoPeso < PESO_MINIMO + 5 && nuevoPeso >= PESO_MINIMO) {
                    msg += `\n\n⚠️ *¡Cuidado!* Estás cerca del límite de flacura (${PESO_MINIMO} kg)`;
                }
                else if (nuevoPeso > PESO_MAXIMO - 10 && nuevoPeso <= PESO_MAXIMO) {
                    msg += `\n\n⚠️ *¡Cuidado!* Estás cerca del límite de gordura (${PESO_MAXIMO} kg)`;
                }
            }
            await m.reply(null, msg);
            // ==========================================================
            // 🔥 REACCIONES
            // ==========================================================
            if (item.mal_cocida) {
                await m.react("🤢");
            }
            else if (nuevaSalud === 0) {
                await m.react("💀");
            }
            else if (itemKey === "ensalada") {
                await m.react("🥗");
            }
            else {
                await m.react("🍽️");
            }
        }
        catch (e) {
            console.error("❌ Error en comer:", e);
            await m.react("🚨");
            m.reply(`❌ Error al comer: ${e.message || e}`);
        }
    }
};
