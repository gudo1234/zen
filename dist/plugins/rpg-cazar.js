// @ts-nocheck
import { chequearSaludParaRPG, puedeUsarRPG, getWeightEffect, getMascotasBonus, sleep, aplicarHambreMascotas, MASCOTAS, MASCOTA_HP_MAX } from "../lib/rpg-utils.js";
const COOLDOWN = 30 * 60 * 1000; // 30 minutos
const DESGASTE_MASCOTA = 3; // HP que pierde cada mascota al cazar
// ===== ARMAS =====
const ARMAS = {
    arco_basico: { name: "🏹 Arco básico", bonus: 0, durabilidad: 30 },
    arco_cazador: { name: "🏹 Arco de cazador", bonus: 0.25, durabilidad: 60 },
    ballesta: { name: "🏹 Ballesta", bonus: 0.50, durabilidad: 100 },
    rifle_caza: { name: "🔫 Rifle de caza", bonus: 0.75, durabilidad: 200 },
};
// ===== ANIMALES =====
const ANIMALES = [
    // Comunes (55%)
    { nombre: "🐰 Conejo", carne: "carne_conejo", cantidad: 1, rareza: "comun" },
    { nombre: "🐿️ Ardilla", carne: "carne_ardilla", cantidad: 1, rareza: "comun" },
    { nombre: "🦆 Pato", carne: "carne_pato", cantidad: 1, rareza: "comun" },
    { nombre: "🐔 Gallina", carne: "carne_gallina", cantidad: 1, rareza: "comun" },
    { nombre: "🐖 Cerdo", carne: "carne_cerdo", cantidad: 2, rareza: "comun" },
    { nombre: "🐄 Vaca", carne: "carne_vaca", cantidad: 3, rareza: "comun" },
    // Poco comunes (25%)
    { nombre: "🦊 Zorro", carne: "carne_zorro", cantidad: 2, rareza: "poco_comun" },
    { nombre: "🦌 Ciervo", carne: "carne_ciervo", cantidad: 3, rareza: "poco_comun" },
    { nombre: "🐗 Jabalí", carne: "carne_jabali", cantidad: 4, rareza: "poco_comun" },
    // Raros (15%)
    { nombre: "🐺 Lobo", carne: "carne_lobo", cantidad: 3, rareza: "raro", drop: "pelaje_lobo", dropProb: 0.30 },
    { nombre: "🐻 Oso", carne: "carne_oso", cantidad: 6, rareza: "raro", drop: "garra_oso", dropProb: 0.30 },
    { nombre: "🦁 León", carne: "carne_leon", cantidad: 5, rareza: "raro", drop: "melena_leon", dropProb: 0.25 },
    // Legendarios (5%)
    { nombre: "🦄 Unicornio", carne: "carne_unicornio", cantidad: 4, rareza: "legendario", drop: "cuerno_unicornio", dropProb: 0.50 },
    { nombre: "🐉 Dragón", carne: "carne_dragon", cantidad: 10, rareza: "legendario", drop: "huevo_dragon", dropProb: 0.50 },
];
// ===== DAÑO POR RAREZA =====
const DAÑOS = {
    comun: { min: 0, max: 0, prob: 0 },
    poco_comun: { min: 10, max: 15, prob: 0.20 },
    raro: { min: 15, max: 25, prob: 0.30 },
    legendario: { min: 25, max: 40, prob: 0.50 },
};
// ===== PELEA DE MASCOTAS =====
// Chance de que la mascota pelee con el animal según rareza
const PELEA_CHANCE = {
    comun: 0.20,
    poco_comun: 0.35,
    raro: 0.50,
    legendario: 0.70,
};
// HP que pierde la mascota si PIERDE la pelea (según rareza del animal)
const PELEA_PERDIDA_HP = {
    comun: { min: 5, max: 10 },
    poco_comun: { min: 10, max: 18 },
    raro: { min: 15, max: 25 },
    legendario: { min: 25, max: 40 },
};
// HP que pierde la mascota si GANA la pelea
const PELEA_GANADA_HP = { min: 5, max: 10 };
// Bonus de carne si la mascota gana (según rareza)
const PELEA_BONUS_CARNE = {
    comun: 1,
    poco_comun: 2,
    raro: 3,
    legendario: 5,
};
// ===== PASOS =====
const PASOS = [
    { emoji: "🏹", texto: "Equipando arco", delay: 900 },
    { emoji: "🐾", texto: "Llamando mascotas", delay: 900 },
    { emoji: "🌲", texto: "Entrando al bosque", delay: 1000 },
    { emoji: "🔍", texto: "Buscando presas", delay: 1200 },
    { emoji: "🎯", texto: "Apuntando", delay: 800 },
];
// ===== FRASES =====
const frasesExito = [
    "🏹 *¡Buena puntería!* Cazaste",
    "🎯 *¡Tiro perfecto!* Conseguiste",
    "🌟 *¡Cazador experto!* Obtuviste",
    "🐾 *¡Buena presa!* Cazaste",
    "🔥 *¡Tiro certero!* Capturaste",
];
const frasesFracaso = [
    "😤 *¡Fallaste el tiro!* El animal escapó",
    "💨 *¡Se te escapó!* No pudiste cazar nada",
    "🤡 *¡Pésima puntería!* El animal se fue",
    "😢 *¡Mala suerte!* La presa huyó",
];
// ===== FRASES DE PESO =====
const FRASES_PESO = {
    muy_flaco: [
        "🦎 Sos tan flaco que te escabulliste sin hacer ruido",
        "⚡ La flacura te dio agilidad para cazar",
        "🥷 Te movés como un fantasma en el bosque",
    ],
    flaco: [
        "🏃 Sos ágil por estar flaco",
        "🤸 Tu delgadez te ayudó a cazar",
    ],
    rellenito: [
        "🐢 La panza te hizo un poco lento",
    ],
    gordito: [
        "🐘 Los animales te escucharon desde lejos",
        "👣 Tus pisadas espantaron a la presa",
    ],
    gordo: [
        "🐘 Caminás y tiembla el bosque, los animales huyen",
        "💥 Te caíste y espantaste a todo",
    ],
    obeso: [
        "🐘 Hiciste temblar el bosque entero",
        "🚨 Los animales te escucharon a 5 km",
    ],
};
// ===== FRASES DE MASCOTAS SEGÚN ESTADO =====
const FRASES_MASCOTAS = {
    feliz: [
        "{mascota} olfateó la presa antes que vos",
        "{mascota} fue corriendo contento por el bosque",
        "{mascota} te ayudó a rastrear como un profesional",
        "{mascota} movía la cola emocionado",
    ],
    normal: [
        "{mascota} te siguió sin mucho entusiasmo",
        "{mascota} caminaba tranquilo a tu lado",
        "{mascota} te acompañó sin quejarse",
    ],
    hambriento: [
        "{mascota} estaba muy cansado para ayudar bien",
        "{mascota} se quedó atrás varias veces",
        "{mascota} miraba con hambre a los animales",
    ],
    triste: [
        "{mascota} se quedó dormido en el camino",
        "{mascota} estaba muy triste para hacer algo",
        "{mascota} casi ni se movió",
    ],
};
// ===== FRASES DE PELEA =====
const FRASES_PELEA_GANADA = [
    "⚔️ *¡{mascota} se enfrentó al {animal} y GANÓ!*",
    "🔥 *{mascota} peleó como un campeón contra el {animal}*",
    "💪 *{mascota} derrotó al {animal} en una pelea épica*",
    "🏆 *{mascota} le dio una paliza al {animal}*",
];
const FRASES_PELEA_PERDIDA = [
    "💀 *{mascota} perdió la pelea contra el {animal}*",
    "😢 *{mascota} intentó pelear pero el {animal} ganó*",
    "🤕 *{mascota} salió lastimado de la pelea con el {animal}*",
    "💥 *El {animal} venció a {mascota} en combate*",
];
function pickFrasePeso(categoria) {
    const frases = FRASES_PESO[categoria] || [];
    if (frases.length === 0)
        return "";
    return frases[Math.floor(Math.random() * frases.length)];
}
function pickFraseMascota(estado, nombre) {
    const frases = FRASES_MASCOTAS[estado] || [];
    if (frases.length === 0)
        return "";
    return frases[Math.floor(Math.random() * frases.length)].replace(/{mascota}/g, nombre);
}
function pickFrasePelea(lista, mascota, animal) {
    return pickRandom(lista)
        .replace(/{mascota}/g, mascota)
        .replace(/{animal}/g, animal);
}
function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}
function pickRandom(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}
function elegirAnimal() {
    const r = Math.random();
    let rareza = "comun";
    if (r < 0.55)
        rareza = "comun";
    else if (r < 0.80)
        rareza = "poco_comun";
    else if (r < 0.95)
        rareza = "raro";
    else
        rareza = "legendario";
    const opciones = ANIMALES.filter(a => a.rareza === rareza);
    return pickRandom(opciones);
}
function armarMensaje(pasos, actual) {
    let txt = `🏹 *CAZANDO...*\n\n`;
    for (let i = 0; i < pasos.length; i++) {
        const p = pasos[i];
        if (i < actual) {
            txt += `✅ ${p.emoji} ~${p.texto}~\n`;
        }
        else if (i === actual) {
            txt += `⌛ ${p.emoji} *${p.texto}...*\n`;
        }
        else {
            txt += `⬜ ${p.emoji} ${p.texto}\n`;
        }
    }
    return txt;
}
// 🔥 Función para simular pelea de mascota contra animal
function simularPelea(mascotas, animal) {
    // Elegir mascota viva de caza al azar
    const mascotasCaza = mascotas.filter(m => {
        const key = typeof m === "string" ? m : m.key;
        const info = MASCOTAS[key];
        const hp = typeof m === "string" ? MASCOTA_HP_MAX : (Number(m.hp) || MASCOTA_HP_MAX);
        return info?.tipo === "caza" && hp > 0;
    });
    if (mascotasCaza.length === 0)
        return null;
    const mascota = pickRandom(mascotasCaza);
    const key = typeof mascota === "string" ? mascota : mascota.key;
    const info = MASCOTAS[key];
    const hpMascota = typeof mascota === "string" ? MASCOTA_HP_MAX : (Number(mascota.hp) || MASCOTA_HP_MAX);
    // Chance de que ocurra la pelea
    const chancePelea = PELEA_CHANCE[animal.rareza] || 0;
    if (Math.random() > chancePelea)
        return null;
    // Calcular chance de ganar según HP de mascota y rareza del animal
    // HP alto → más chance. Animal raro → menos chance.
    let chanceGanar = hpMascota / MASCOTA_HP_MAX; // 0 a 1 según HP
    // Ajustar por rareza del animal
    if (animal.rareza === "poco_comun")
        chanceGanar -= 0.10;
    else if (animal.rareza === "raro")
        chanceGanar -= 0.25;
    else if (animal.rareza === "legendario")
        chanceGanar -= 0.40;
    chanceGanar = Math.max(0.10, Math.min(0.90, chanceGanar));
    const gano = Math.random() < chanceGanar;
    if (gano) {
        const hpPerdido = getRandomInt(PELEA_GANADA_HP.min, PELEA_GANADA_HP.max);
        const nuevoHp = Math.max(0, hpMascota - hpPerdido);
        const bonusCarne = PELEA_BONUS_CARNE[animal.rareza] || 0;
        return {
            mascotaKey: key,
            mascotaNombre: info.name,
            hpAntes: hpMascota,
            hpDespues: nuevoHp,
            hpPerdido,
            gano: true,
            bonusCarne,
        };
    }
    else {
        const rango = PELEA_PERDIDA_HP[animal.rareza] || { min: 10, max: 20 };
        const hpPerdido = getRandomInt(rango.min, rango.max);
        const nuevoHp = Math.max(0, hpMascota - hpPerdido);
        return {
            mascotaKey: key,
            mascotaNombre: info.name,
            hpAntes: hpMascota,
            hpDespues: nuevoHp,
            hpPerdido,
            gano: false,
            bonusCarne: 0,
        };
    }
}
export default {
    name: ["cazar", "caza", "hunt"],
    help: ["cazar"],
    desc: "Salí a cazar animales",
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
        const weightEffect = getWeightEffect(peso, "agilidad");
        try {
            const now = Date.now();
            const { rows: [user] } = await m.db.query(`SELECT salud, salud_max, peso, inventario, mascotas, 
                arma_caza_equipada, arma_caza_usos, lastcazar 
         FROM usuarios WHERE id = $1 OR lid = $2`, [m.sender, m.lid || ""]);
            if (!user)
                return m.reply(null, "❌ No estás registrado.");
            // ===== COOLDOWN =====
            const lastCazar = Number(user.lastcazar) || 0;
            const cd = lastCazar + COOLDOWN_FINAL - now;
            if (cd > 0) {
                const min = Math.floor(cd / 60000);
                const seg = Math.floor((cd % 60000) / 1000);
                const tiempo = min > 0 ? `${min}m ${seg}s` : `${seg}s`;
                return m.reply(null, `⏳ *Esperá ${tiempo} para volver a cazar*`);
            }
            // ===== ARMA =====
            const armaKey = user.arma_caza_equipada;
            if (!armaKey) {
                return m.reply(null, `🏹 *Necesitás un arco para cazar*\n\n> Comprá uno con *${prefijo}buy arco_basico*`);
            }
            const arma = ARMAS[armaKey];
            if (!arma) {
                return m.reply(null, `❌ Tu arma está rota o no existe`);
            }
            // ===== FLECHAS =====
            const inventario = user.inventario || {};
            const flechas = Number(inventario.flechas) || 0;
            if (flechas <= 0) {
                return m.reply(null, `🎯 *¡No tenés flechas!*\n\n> Comprá con *${prefijo}buy flechas 10*`);
            }
            // ===== MASCOTAS (aplicar hambre + desgaste) =====
            const { mascotas: mascotasHambre } = aplicarHambreMascotas(user.mascotas || []);
            let mascotasDesgastadas = mascotasHambre.map(m => {
                if (typeof m === "string") {
                    return { key: m, hp: Math.max(0, MASCOTA_HP_MAX - DESGASTE_MASCOTA), last_feed: now };
                }
                const hpActual = Number(m.hp) || MASCOTA_HP_MAX;
                if (hpActual <= 0)
                    return m;
                return { ...m, hp: Math.max(0, hpActual - DESGASTE_MASCOTA) };
            });
            let mascotas = mascotasDesgastadas;
            // ==========================================================
            // 🔥 PROCESO CON MENSAJE EDITADO
            // ==========================================================
            const sent = await conn.sendMessage(m.chat, {
                text: armarMensaje(PASOS, 0)
            }, { quoted: m });
            for (let i = 0; i < PASOS.length; i++) {
                await sleep(PASOS[i].delay);
                await conn.sendMessage(m.chat, {
                    text: armarMensaje(PASOS, i + 1),
                    edit: sent.key
                });
            }
            // ==========================================================
            // 🔥 LÓGICA DE CAZA
            // ==========================================================
            // Consumir flecha
            inventario.flechas = flechas - 1;
            if (inventario.flechas <= 0)
                delete inventario.flechas;
            // Bonus
            const bonusMascotas = getMascotasBonus(mascotas, "caza");
            const bonusTotal = arma.bonus + bonusMascotas;
            // Elegir animal
            const animal = elegirAnimal();
            const dañoConfig = DAÑOS[animal.rareza];
            const chanceExito = Math.min(0.95, 0.85 + bonusTotal);
            let exito = Math.random() < chanceExito;
            let texto = "";
            let bonusCarnePelea = 0;
            let infoPelea = "";
            let mascotaPeleaNombre = "";
            // 🔥 SIMULAR PELEA DE MASCOTA
            if (exito && mascotas.length > 0) {
                const pelea = simularPelea(mascotas, animal);
                if (pelea) {
                    mascotaPeleaNombre = pelea.mascotaNombre;
                    // Actualizar HP de la mascota en el array
                    mascotas = mascotas.map(m => {
                        const key = typeof m === "string" ? m : m.key;
                        if (key === pelea.mascotaKey) {
                            return { ...m, hp: pelea.hpDespues };
                        }
                        return m;
                    });
                    if (pelea.gano) {
                        // Bonus de carne
                        bonusCarnePelea = pelea.bonusCarne;
                        infoPelea = `\n\n${pickFrasePelea(FRASES_PELEA_GANADA, pelea.mascotaNombre, animal.nombre)}`;
                        infoPelea += `\n💥 HP: *${pelea.hpAntes}* → *${pelea.hpDespues}* (-${pelea.hpPerdido})`;
                        infoPelea += `\n🎁 *+${bonusCarnePelea}* carne extra`;
                        if (pelea.hpDespues === 0) {
                            infoPelea += `\n💀 *¡${pelea.mascotaNombre} MURIÓ en la pelea!*`;
                        }
                    }
                    else {
                        // Perdió la pelea
                        infoPelea = `\n\n${pickFrasePelea(FRASES_PELEA_PERDIDA, pelea.mascotaNombre, animal.nombre)}`;
                        infoPelea += `\n💥 HP: *${pelea.hpAntes}* → *${pelea.hpDespues}* (-${pelea.hpPerdido})`;
                        if (pelea.hpDespues === 0) {
                            infoPelea += `\n💀 *¡${pelea.mascotaNombre} MURIÓ en la pelea!*`;
                        }
                        // El animal escapa si la mascota pierde
                        exito = false;
                    }
                }
            }
            if (!exito) {
                texto = `${pickRandom(frasesFracaso)}`;
                if (infoPelea)
                    texto += infoPelea;
            }
            else {
                const carneTotal = animal.cantidad + bonusCarnePelea;
                inventario[animal.carne] = (Number(inventario[animal.carne]) || 0) + carneTotal;
                texto = `${pickRandom(frasesExito)} *${animal.nombre}*`;
                texto += `\n🥩 Carne obtenida: *${carneTotal}x*`;
                if (bonusCarnePelea > 0) {
                    texto += ` _(${animal.cantidad} + ${bonusCarnePelea} por pelea)_`;
                }
                // Drop raro
                if (animal.drop && Math.random() < animal.dropProb) {
                    inventario[animal.drop] = (Number(inventario[animal.drop]) || 0) + 1;
                    texto += `\n\n🎁 *¡DROP RARO!* ${animal.drop}`;
                }
                // Info de pelea
                texto += infoPelea;
            }
            // Daño al usuario
            let dañoHP = 0;
            let nuevaSalud = Number(user.salud) || 100;
            if (exito && dañoConfig.prob > 0 && Math.random() < dañoConfig.prob) {
                dañoHP = getRandomInt(dañoConfig.min, dañoConfig.max);
                nuevaSalud = Math.max(0, nuevaSalud - dañoHP);
                texto += `\n\n🤕 ¡El animal se defendió! *-${dañoHP} HP*`;
                if (nuevaSalud === 0) {
                    texto += `\n\n💀 *¡QUEDASTE NOQUEADO!*\n> Usá *${prefijo}comer* o *${prefijo}use* para curarte.`;
                }
            }
            // Consumir uso del arma
            let avisoArma = "";
            const usosActuales = Number(user.arma_caza_usos) || 0;
            const nuevosUsos = usosActuales - 1;
            if (nuevosUsos <= 0) {
                await m.db.query("UPDATE usuarios SET arma_caza_equipada = NULL, arma_caza_usos = 0 WHERE id = $1 OR lid = $1", [m.sender]);
                avisoArma = `\n\n💔 *¡Tu ${arma.name} se rompió!* Comprá otro`;
            }
            else {
                await m.db.query("UPDATE usuarios SET arma_caza_usos = $1 WHERE id = $2 OR lid = $2", [nuevosUsos, m.sender]);
                if (nuevosUsos <= 5) {
                    avisoArma = `\n\n⚠️ *¡Arma casi rota!* (${nuevosUsos} usos)`;
                }
            }
            // Peso
            let pesoExtra = "";
            if (weightEffect.categoria !== "normal") {
                const frase = pickFrasePeso(weightEffect.categoria);
                if (frase)
                    pesoExtra += `\n\n${weightEffect.emoji} _${frase}_`;
                if (weightEffect.multiplier < 1) {
                    const pct = Math.round((1 - weightEffect.multiplier) * 100);
                    pesoExtra += `\n📉 *-${pct}% éxito por peso (${peso} kg)*`;
                }
                else if (weightEffect.multiplier > 1) {
                    const pct = Math.round((weightEffect.multiplier - 1) * 100);
                    pesoExtra += `\n📈 *+${pct}% éxito por peso (${peso} kg)*`;
                }
            }
            // Frases de mascotas
            let frasesMascotasMsg = "";
            const mascotasCaza = mascotas.filter(m => {
                const key = typeof m === "string" ? m : m.key;
                const info = MASCOTAS[key];
                return info?.tipo === "caza";
            });
            if (mascotasCaza.length > 0 && !infoPelea) {
                const frases = [];
                for (const m of mascotasCaza) {
                    const key = typeof m === "string" ? m : m.key;
                    const hp = typeof m === "string" ? MASCOTA_HP_MAX : (Number(m.hp) || MASCOTA_HP_MAX);
                    const info = MASCOTAS[key];
                    if (!info)
                        continue;
                    let categoria = "feliz";
                    if (hp >= 70)
                        categoria = "feliz";
                    else if (hp >= 40)
                        categoria = "normal";
                    else if (hp >= 20)
                        categoria = "hambriento";
                    else if (hp > 0)
                        categoria = "triste";
                    else
                        continue;
                    const frase = pickFraseMascota(categoria, info.name);
                    if (frase)
                        frases.push(`🐾 ${frase}`);
                }
                if (frases.length > 0) {
                    frasesMascotasMsg = `\n\n${frases.join("\n")}`;
                }
            }
            texto += pesoExtra + avisoArma + frasesMascotasMsg;
            // Update DB
            await m.db.query("UPDATE usuarios SET inventario = $1::jsonb, lastcazar = $2, salud = $3, mascotas = $4::jsonb WHERE id = $5 OR lid = $5", [JSON.stringify(inventario), now, nuevaSalud, JSON.stringify(mascotas), m.sender]);
            // Editar el mensaje final con el resultado
            await conn.sendMessage(m.chat, {
                text: texto,
                edit: sent.key
            });
            // ===== REACCIONES =====
            if (dañoHP > 0)
                await m.react("🤕");
            else if (exito && animal.rareza === "legendario")
                await m.react("🎰");
            else if (exito && animal.rareza === "raro")
                await m.react("🔥");
            else if (exito)
                await m.react("🏹");
            else
                await m.react("😢");
        }
        catch (err) {
            console.error("cazar error:", err);
            m.reply("❌ Ocurrió un error al cazar.");
            await m.react("🚨");
        }
    }
};
