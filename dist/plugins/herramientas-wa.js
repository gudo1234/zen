import fetch from "node-fetch";
export default {
    name: ["wa", "wacheck", "bancheck"],
    help: ["wa <número>"],
    desc: "Verifica si un número está baneado de WhatsApp",
    tags: ["owner", "tools"],
    register: true,
    run: async ({ conn, m, args, prefijo, cmd }) => {
        const raw = (args && args.length) ? args.join(" ").trim() : "";
        if (!raw)
            return m.reply(`${m.e.warn} *Uso correcto:* ${prefijo + cmd} <número>\n\n*• Ejemplo:*\n${prefijo + cmd} +573246652986`);
        let number = raw.replace(/\s+/g, "");
        if (!number.startsWith("+"))
            number = "+" + number;
        const num = number.replace(/[^0-9]/g, "");
        if (num.length < 7 || num.length > 15)
            return m.reply(m.e.warn + " Número inválido. Incluye el código de país. Ej: +573019801135");
        m.react("⏳");
        try {
            const res = await fetch(`https://api.mitzuki.xyz/tools/checkban?number=${num}&apikey=${process.env.API_KEY}`);
            const data = await res.json(); // 🔥 CORREGIDO
            if (!data?.status)
                return m.reply("❌ No se pudo obtener información del número.");
            const info = data.data || {};
            if (!info.banned) {
                let txt = `*\`🔎 CHEQUEO WHATSAPP\`*\n\n`;
                txt += `*• Number:* ${info.number || number}\n`;
                txt += `*• Estado:* Activo ✅`;
                await m.reply(txt);
                m.react("✅");
                return;
            }
            let txt = `*\`🔎 CHEQUEO WHATSAPP\`*\n\n*• Number:* ${info.number || number}\n*• isBanned:* ${info.banned ? "✅" : "❌"}\n*• Requiere app oficial:* ${info.isNeedOfficialWa ? "✅" : "❌"}`;
            if (info.isPermanent !== undefined)
                txt += `\n*• Permanente:* ${info.isPermanent ? "✅" : "❌"}`;
            if (info.violation_type)
                txt += `\n*• Tipo de violación:* ${info.violation_type}`;
            if (info.violation_description)
                txt += `\n*• Razón:* ${info.violation_description}`;
            if (info.in_app_ban_appeal !== undefined)
                txt += `\n*• Apelación in-app:* ${info.in_app_ban_appeal ? "Disponible ✅" : "No disponible ❌"}`;
            /*if (info.appeal_token) {
            const token = String(info.appeal_token)
            const short = token.length > 100 ? token.slice(0, 100) + "…" : token
            txt += `\n*• Token de apelación:*\n${info.appeal_token}`
            }*/
            await m.reply(txt);
            m.react("✅");
        }
        catch (err) {
            console.error("Error /wa:", err);
            await m.react("❌️");
        }
    },
};
