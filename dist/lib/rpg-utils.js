// @ts-nocheck
import { db } from "./db.js";
// ===== CONFIGURACIÓN =====
export const HAMBRE_INTERVALO_MS = 30 * 60 * 1000; // -1 HP cada 30 min
export const MAX_HAMBRE_PER_CHECK = 20; // máximo 20 HP de golpe
export const HAMBRE_INTERVALO_COMER_MS = 60 * 1000; // 1 min entre comidas
export const SALUD_MINIMA_RPG = 20;
export function puedeUsarRPG(salud) {
    if (salud < SALUD_MINIMA_RPG) {
        return {
            ok: false,
            razon: `🩺 *Salud demasiado baja (${salud}/100)*\n\nNo podés hacer actividades RPG hasta recuperarte.\n\n> Comé algo con *${'comer'} <item>* o curate con *use <item>*\n> Usá *.hp* para ver tu estado`,
        };
    }
    return { ok: true };
}
// ===== MULTIPLICADOR DE COOLDOWN SEGÚN HP =====
export function getCooldownMultiplier(salud) {
    if (salud >= 70)
        return 1.0;
    if (salud >= 40)
        return 1.5;
    if (salud >= 20)
        return 2.0;
    if (salud >= 1)
        return 3.0;
    return 5.0; // 0 HP
}
// ===== PRECIO DE COMIDA SEGÚN HP (emergencia) =====
export function getPriceMultiplier(salud) {
    if (salud >= 70)
        return 1.0;
    if (salud >= 40)
        return 1.25;
    if (salud >= 20)
        return 1.5;
    return 2.0;
}
// ===== APLICAR HAMBRE POR TIEMPO =====
export async function aplicarHambre(userId, lid = "") {
    const now = Date.now();
    const { rows: [user] } = await db.query("SELECT salud, salud_max, last_hambre_tick FROM usuarios WHERE id = $1 OR lid = $2", [userId, lid]);
    if (!user)
        return null;
    const lastTick = Number(user.last_hambre_tick) || now;
    const tiempoTranscurrido = now - lastTick;
    const ticks = Math.floor(tiempoTranscurrido / HAMBRE_INTERVALO_MS);
    if (ticks <= 0)
        return null;
    const hambre = Math.min(ticks, MAX_HAMBRE_PER_CHECK);
    const saludActual = Number(user.salud) || 100;
    const nuevaSalud = Math.max(0, saludActual - hambre);
    await db.query(`UPDATE usuarios 
     SET salud = $1, 
         last_hambre_tick = $2
     WHERE id = $3 OR lid = $3`, [nuevaSalud, now, userId]);
    return { hambre, nuevaSalud, saludAntes: saludActual };
}
// ===== CHEQUEAR SI PUEDE USAR COMANDO RPG (devuelve multiplicador) =====
export async function chequearSaludParaRPG(userId, lid = "") {
    const { rows: [user] } = await db.query("SELECT salud, salud_max, peso FROM usuarios WHERE id = $1 OR lid = $2", [userId, lid]);
    if (!user)
        return { ok: false, multiplier: 1, salud: 100, peso: 70 };
    const salud = Number(user.salud) || 100;
    const multiplier = getCooldownMultiplier(salud);
    return {
        ok: true,
        multiplier,
        salud,
        peso: Number(user.peso) || 70,
        saludMax: Number(user.salud_max) || 100,
    };
}
// ===== PESO Y SUS EFECTOS RPG =====
export function getWeightEffect(peso, tipo) {
    // Normal
    if (peso >= 55 && peso < 70) {
        return { multiplier: 1.0, categoria: "normal", emoji: "🟢" };
    }
    // Muy flaco
    if (peso < 25) {
        switch (tipo) {
            case "fisico": return { multiplier: 0.70, categoria: "muy_flaco", emoji: "💀" };
            case "lastima": return { multiplier: 1.30, categoria: "muy_flaco", emoji: "💀" };
            case "social": return { multiplier: 0.80, categoria: "muy_flaco", emoji: "💀" }; // 🔥 antes 0.90
            case "agilidad": return { multiplier: 1.10, categoria: "muy_flaco", emoji: "💀" };
            case "mixto": return { multiplier: 0.80, categoria: "muy_flaco", emoji: "💀" };
        }
    }
    // Flaco
    if (peso < 55) {
        switch (tipo) {
            case "fisico": return { multiplier: 0.85, categoria: "flaco", emoji: "🪶" };
            case "lastima": return { multiplier: 1.15, categoria: "flaco", emoji: "🪶" };
            case "social": return { multiplier: 0.90, categoria: "flaco", emoji: "🪶" }; // 🔥 antes 0.95
            case "agilidad": return { multiplier: 1.05, categoria: "flaco", emoji: "🪶" };
            case "mixto": return { multiplier: 0.90, categoria: "flaco", emoji: "🪶" };
        }
    }
    // Rellenito
    if (peso < 85) {
        switch (tipo) {
            case "fisico": return { multiplier: 0.90, categoria: "rellenito", emoji: "🟡" };
            case "lastima": return { multiplier: 0.90, categoria: "rellenito", emoji: "🟡" };
            case "social": return { multiplier: 1.20, categoria: "rellenito", emoji: "🟡" }; // 🔥 antes 1.10
            case "agilidad": return { multiplier: 0.90, categoria: "rellenito", emoji: "🟡" };
            case "mixto": return { multiplier: 0.95, categoria: "rellenito", emoji: "🟡" };
        }
    }
    // Gordito
    if (peso < 100) {
        switch (tipo) {
            case "fisico": return { multiplier: 0.80, categoria: "gordito", emoji: "🟠" };
            case "lastima": return { multiplier: 0.80, categoria: "gordito", emoji: "🟠" };
            case "social": return { multiplier: 1.10, categoria: "gordito", emoji: "🟠" }; // 🔥 antes 1.20
            case "agilidad": return { multiplier: 0.80, categoria: "gordito", emoji: "🟠" };
            case "mixto": return { multiplier: 0.90, categoria: "gordito", emoji: "🟠" };
        }
    }
    // Gordo
    if (peso < 120) {
        switch (tipo) {
            case "fisico": return { multiplier: 0.65, categoria: "gordo", emoji: "🔴" };
            case "lastima": return { multiplier: 0.65, categoria: "gordo", emoji: "🔴" };
            case "social": return { multiplier: 0.85, categoria: "gordo", emoji: "🔴" }; // 🔥 antes 1.30
            case "agilidad": return { multiplier: 0.65, categoria: "gordo", emoji: "🔴" };
            case "mixto": return { multiplier: 0.80, categoria: "gordo", emoji: "🔴" };
        }
    }
    // Obeso
    switch (tipo) {
        case "fisico": return { multiplier: 0.50, categoria: "obeso", emoji: "🚨" };
        case "lastima": return { multiplier: 0.50, categoria: "obeso", emoji: "🚨" };
        case "social": return { multiplier: 0.70, categoria: "obeso", emoji: "🚨" }; // 🔥 antes 1.40
        case "agilidad": return { multiplier: 0.50, categoria: "obeso", emoji: "🚨" };
        case "mixto": return { multiplier: 0.70, categoria: "obeso", emoji: "🚨" };
    }
    return { multiplier: 1.0, categoria: "normal", emoji: "🟢" };
}
// ===== FORMATEAR COOLDOWN DINÁMICO =====
export function formatCooldown(baseMs, multiplier) {
    const total = Math.floor(baseMs * multiplier);
    const h = Math.floor(total / 3600000);
    const m = Math.floor((total % 3600000) / 60000);
    const s = Math.floor((total % 60000) / 1000);
    const partes = [];
    if (h > 0)
        partes.push(`${h}h`);
    if (m > 0)
        partes.push(`${m}m`);
    if (s > 0 && h === 0)
        partes.push(`${s}s`);
    return partes.join(" ");
}
// ===== MASCOTAS =====
export const MASCOTAS = {
    // Caza
    perro_cazador: { name: "🐕 Perro cazador", tipo: "caza", bonus_caza: 0.10 },
    aguila: { name: "🦅 Águila", tipo: "caza", bonus_caza: 0.20 },
    lobo_amaestrado: { name: "🐺 Lobo amaestrado", tipo: "caza", bonus_caza: 0.30 },
    dragon_caza: { name: "🐉 Dragón de caza", tipo: "caza", bonus_caza: 0.50 },
    // Normales
    gato: { name: "🐱 Gato", tipo: "normal", bonus_comando: 0.05 },
    perro: { name: "🐶 Perro", tipo: "normal", bonus_comando: 0.05 },
    conejo: { name: "🐰 Conejo", tipo: "normal", bonus_comando: 0.05 },
    loro: { name: "🦜 Loro", tipo: "normal", bonus_comando: 0.05 },
    tortuga: { name: "🐢 Tortuga", tipo: "normal", bonus_comando: -0.10 },
    serpiente: { name: "🐍 Serpiente", tipo: "normal", bonus_comando: 0.10 },
};
// ===== COMIDA DE MASCOTAS =====
export const COMIDA_MASCOTA = {
    // Carnes crudas (dan poco)
    carne_conejo: { hp: 10 },
    carne_ardilla: { hp: 10 },
    carne_pato: { hp: 10 },
    carne_gallina: { hp: 10 },
    carne_cerdo: { hp: 15 },
    carne_vaca: { hp: 15 },
    carne_zorro: { hp: 15 },
    carne_ciervo: { hp: 15 },
    carne_jabali: { hp: 15 },
    carne_lobo: { hp: 20 },
    carne_oso: { hp: 20 },
    carne_leon: { hp: 20 },
    carne_unicornio: { hp: 30 },
    carne_dragon: { hp: 30 },
    // Carnes mal cocidas (dañan)
    carne_conejo_mal_cocida: { hp: -10 },
    carne_ardilla_mal_cocida: { hp: -10 },
    carne_pato_mal_cocida: { hp: -10 },
    carne_gallina_mal_cocida: { hp: -10 },
    carne_cerdo_mal_cocida: { hp: -15 },
    carne_vaca_mal_cocida: { hp: -15 },
    carne_zorro_mal_cocida: { hp: -15 },
    carne_ciervo_mal_cocida: { hp: -15 },
    carne_jabali_mal_cocida: { hp: -15 },
    carne_lobo_mal_cocida: { hp: -20 },
    carne_oso_mal_cocida: { hp: -20 },
    carne_leon_mal_cocida: { hp: -20 },
    carne_unicornio_mal_cocida: { hp: -25 },
    carne_dragon_mal_cocida: { hp: -30 },
    // Carnes cocidas (dan más)
    carne_conejo_cocida: { hp: 30 },
    carne_ardilla_cocida: { hp: 30 },
    carne_pato_cocida: { hp: 30 },
    carne_gallina_cocida: { hp: 30 },
    carne_cerdo_cocida: { hp: 40 },
    carne_vaca_cocida: { hp: 40 },
    carne_zorro_cocida: { hp: 40 },
    carne_ciervo_cocida: { hp: 40 },
    carne_jabali_cocida: { hp: 40 },
    carne_lobo_cocida: { hp: 50 },
    carne_oso_cocida: { hp: 50 },
    carne_leon_cocida: { hp: 50 },
    carne_unicornio_cocida: { hp: 70 },
    carne_dragon_cocida: { hp: 100 },
};
// ===== CONFIGURACIÓN =====
export const MASCOTA_HP_MAX = 100;
export const MASCOTA_HAMBRE_INTERVALO_MS = 60 * 60 * 1000; // -1 HP cada 1h
// ===== ESTADO DE MASCOTA =====
export function estadoMascota(hp) {
    if (hp >= 70)
        return { emoji: "😊", texto: "Feliz", barra: "🟢", factor: 1.0 };
    if (hp >= 40)
        return { emoji: "😐", texto: "Normal", barra: "🟡", factor: 0.7 };
    if (hp >= 20)
        return { emoji: "😢", texto: "Hambriento", barra: "🟠", factor: 0.3 };
    if (hp > 0)
        return { emoji: "😭", texto: "Triste", barra: "🔴", factor: 0 };
    return { emoji: "💀", texto: "Muerta", barra: "⚫", factor: 0 };
}
// ===== BONUS DE MASCOTAS (soporta formato viejo y nuevo) =====
export function getMascotasBonus(mascotas, comando) {
    if (!Array.isArray(mascotas) || mascotas.length === 0)
        return 0;
    let bonus = 0;
    for (const m of mascotas) {
        const key = typeof m === "string" ? m : m.key;
        const hp = typeof m === "string" ? MASCOTA_HP_MAX : (Number(m.hp) || MASCOTA_HP_MAX);
        const info = MASCOTAS[key];
        if (!info)
            continue;
        const estado = estadoMascota(hp);
        if (estado.factor <= 0)
            continue; // Muerta o triste → no da bonus
        // Bonus de caza
        if (comando === "caza" && info.bonus_caza) {
            bonus += info.bonus_caza * estado.factor;
        }
        // Bonus general
        if (info.bonus_comando) {
            bonus += info.bonus_comando * estado.factor;
        }
    }
    return bonus;
}
// ===== APLICAR HAMBRE A MASCOTAS =====
// Devuelve { mascotas, cambios }
export function aplicarHambreMascotas(mascotas) {
    if (!Array.isArray(mascotas) || mascotas.length === 0) {
        return { mascotas: [], cambios: false };
    }
    const now = Date.now();
    let cambios = false;
    const nuevas = mascotas.map(m => {
        // Migrar formato viejo
        if (typeof m === "string") {
            cambios = true;
            return { key: m, hp: MASCOTA_HP_MAX, last_feed: now };
        }
        const lastFeed = Number(m.last_feed) || now;
        const tiempo = now - lastFeed;
        const ticks = Math.floor(tiempo / MASCOTA_HAMBRE_INTERVALO_MS);
        if (ticks > 0) {
            cambios = true;
            const nuevoHp = Math.max(0, m.hp - ticks);
            return { key: m.key, hp: nuevoHp, last_feed: now };
        }
        return m;
    });
    return { mascotas: nuevas, cambios };
}
export function sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
}
