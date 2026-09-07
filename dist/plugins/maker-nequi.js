import fetch from "node-fetch";
export default {
    name: ["fakenequi", "nequi"],
    help: ["fakenequi <nombre | valor | numero>"],
    desc: "Genera un comprobante falso de Nequi",
    tags: ["tools"],
    register: true,
    premium: true,
    run: async ({ conn, m, text, prefijo, cmd, args }) => {
        const fullMessage = text || "";
        const parts = fullMessage.split("|").map(p => p.trim());
        const cleanParts = parts.filter(p => p.length > 0);
        if (cleanParts.length < 3) {
            return m.reply(`*❌ USO INCORRECTO*\n\n` +
                `*Formato:*\n` +
                `└ ${prefijo + cmd} nombre | valor | numero\n\n` +
                `*Ejemplos:*\n` +
                `└ ${prefijo + cmd} Juan Pérez | 150000 | 3123456789\n` +
                `└ ${prefijo + cmd} Juan Pérez | 150000 | 3123456789 | 10/Ene/2025 2:30pm | MTZ-2025-001 | NO\n\n` +
                `*Parámetros requeridos:*\n` +
                `├ *nombre* - Nombre completo del titular\n` +
                `├ *valor* - Monto en pesos colombianos\n` +
                `└ *numero* - Número de celular (10 dígitos)\n\n` +
                `*Parámetros opcionales:*\n` +
                `├ *fecha* - Fecha personalizada\n` +
                `└ *referencia* - Referencia personalizada\n\n` +
                `*Nota:* Los parámetros se separan con *|*`);
        }
        const nombre = cleanParts[0] || "";
        const valor = cleanParts[1] || "";
        const numero = cleanParts[2] || "";
        const fecha = cleanParts[3] || "";
        const referencia = cleanParts[4] || "";
        let disponible = cleanParts[5] || "";
        if (!/^\d{10}$/.test(numero)) {
            return m.reply(`*❌ NÚMERO INVÁLIDO*\n\n` +
                `El número *${numero}* debe tener exactamente 10 dígitos.\n\n` +
                `*Ejemplo correcto:*\n` +
                `${prefijo + cmd} Juan Pérez | 150000 | 3123456789`);
        }
        const valorLimpio = valor.replace(/\./g, "").replace(/,/g, ".");
        const valorNum = parseFloat(valorLimpio);
        if (isNaN(valorNum) || valorNum <= 0) {
            return m.reply(`*❌ VALOR INVÁLIDO*\n\n` +
                `El valor *${valor}* no es un monto válido.\n\n` +
                `*Ejemplos válidos:*\n` +
                `├ 150000\n` +
                `├ 150.000\n` +
                `└ 150,000\n\n` +
                `*Ejemplo correcto:*\n` +
                `${prefijo + cmd} Juan Pérez | 150000 | 3123456789`);
        }
        if (disponible && disponible.toUpperCase() !== "SI" && disponible.toUpperCase() !== "NO") {
            disponible = "SI";
        }
        else if (disponible) {
            disponible = disponible.toUpperCase();
        }
        await m.react("⏳");
        await m.reply(`⏳ *Generando comprobante Nequi...*`);
        try {
            const params = new URLSearchParams({
                nombre: nombre,
                valor: valor,
                numero: numero,
                apikey: process.env.API_KEY || ""
            });
            if (fecha)
                params.append("fecha", fecha);
            if (referencia)
                params.append("referencia", referencia);
            if (disponible)
                params.append("disponible", disponible);
            const url = `https://api.mitzuki.xyz/maker/nequi?${params.toString()}`;
            const response = await fetch(url);
            const data = await response.json(); // 🔥 CORREGIDO
            if (!data.status) {
                await m.react("❌");
                return m.reply(`*❌ ERROR AL GENERAR*\n\n${data.error || "Error desconocido"}`);
            }
            await m.react("✅");
            await conn.sendMessage(m.chat, {
                image: { url: data.data.image_url },
                caption: `*✅ COMPROBANTE NEQUI*\n\n` +
                    `*📝 Datos:*\n` +
                    `├ *Nombre:* ${data.data.nombre}\n` +
                    `├ *Valor:* ${data.data.valor}\n` +
                    `├ *Número:* ${data.data.numero}\n` +
                    `├ *Fecha:* ${data.data.fecha}\n` +
                    `└ *Referencia:* ${data.data.referencia}`
            }, { quoted: m });
        }
        catch (error) {
            console.error("[NEQUI ERROR]", error);
            await m.react("❌");
            await m.reply(`*❌ ERROR*\n\n${error.message || "Error desconocido"}`);
        }
    }
};
