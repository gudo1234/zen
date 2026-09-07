import { generateWAMessageFromContent } from "@whiskeysockets/baileys";
import crypto from "crypto";
async function htmlGoon(sock, jid, html) {
    const msg = generateWAMessageFromContent(jid, {
        botForwardedMessage: {
            message: {
                richResponseMessage: {
                    messageType: 1,
                    unifiedResponse: {
                        data: Buffer.from(JSON.stringify({
                            __typename: "GenAIUnifiedResponse",
                            response_id: crypto.randomUUID(),
                            sections: [{
                                    __typename: "GenAIUnifiedResponseSection",
                                    view_model: {
                                        __typename: "GenAISingleLayoutViewModel",
                                        primitive: {
                                            __typename: "FOAHtmlPrimitiveDemoDONOTUSE",
                                            trusted_sources: [],
                                            payload: html.trim()
                                        }
                                    }
                                }]
                        })).toString("base64")
                    },
                    contextInfo: { isForwarded: true, forwardOrigin: 4 }
                }
            }
        }
    }, {});
    return sock.relayMessage(jid, msg.message, { messageId: msg.key.id });
}
// ✅ EMOJIS Y TÍTULOS CORRECTOS
const config = {
    piropo: { emoji: '💘', title: 'PIROPO ROMÁNTICO' },
    chiste: { emoji: '😂', title: 'CHISTE GRACIOSO' },
    reto: { emoji: '⚡', title: 'RETO EXTREMO' },
    verdad: { emoji: '🤔', title: 'VERDAD' },
    frases: { emoji: '💭', title: 'FRASE INSPIRADORA' }
};
const fallbacks = {
    piropo: "Tus ojos son dos luceros que iluminan mi camino cada día ✨",
    chiste: "¿Qué le dice un cable a otro? Te veo tenso... ¡jaja! 😂",
    reto: "¡Reto! Haz 20 flexiones ahora mismo sin soltar el teléfono 💪",
    verdad: "¿Cuál es el recuerdo más vergonzoso de tu infancia? 🤫",
    frases: "La vida es como una bicicleta, hay que seguir pedaleando para no caer. - Albert Einstein 🚲"
};
const systemPrompts = {
    piropo: "Eres un experto en piropos románticos y creativos. Genera un piropo original, bonito, elegante y no vulgar. Responde SOLO con el piropo, máximo 2 líneas.",
    chiste: "Eres un comediante experto. Genera un chiste corto, gracioso, original y con buen humor. Responde SOLO con el chiste, máximo 3 líneas.",
    reto: "Eres un creador de retos divertidos, originales y extremos para grupos de amigos. Genera un reto emocionante, seguro y que genere adrenalina. Responde SOLO con el reto, máximo 2 líneas.",
    verdad: "Eres un experto en preguntas profundas. Genera una pregunta interesante, original y que haga pensar. Responde SOLO con la pregunta, máximo 2 líneas.",
    frases: "Eres un escritor de frases motivacionales profundas. Genera una frase inspiradora, original y con mucho significado. Responde SOLO con la frase y su autor. Máximo 2 líneas."
};
const IA_URLS = [
    {
        name: 'Gemini',
        url: (text, prompt) => `https://api.mitzuki.xyz/ia/gemini?text=${encodeURIComponent(text)}&model=flash&prompt=${encodeURIComponent(prompt)}&search=true&apikey=${process.env.API_KEY}`,
        parse: (data) => data?.data?.result || data?.result || ''
    },
    {
        name: 'Groq',
        url: (text, prompt) => `https://api.mitzuki.xyz/ia/groq?text=${encodeURIComponent(text)}&model=llama3&prompt=${encodeURIComponent(prompt)}&apikey=${process.env.API_KEY}`,
        parse: (data) => data?.data?.result || data?.result || ''
    },
    {
        name: 'Mistral',
        url: (text, prompt) => `https://api.mitzuki.xyz/ia/mistral?text=${encodeURIComponent(text)}&model=mistral-medium&prompt=${encodeURIComponent(prompt)}&apikey=${process.env.API_KEY}`,
        parse: (data) => data?.data?.result || data?.result || ''
    }
];
async function getAIResult(text, prompt) {
    for (const ia of IA_URLS) {
        try {
            const res = await fetch(ia.url(text, prompt));
            if (!res.ok)
                continue;
            const data = await res.json();
            const result = ia.parse(data);
            if (result && typeof result === 'string' && result.trim().length > 0) {
                return result.trim();
            }
        }
        catch (e) { }
    }
    return '';
}
// ✅ HTML SIN EMOJIS REPETIDOS
function buildIAHTML(type, result) {
    const cfg = config[type] || { emoji: '🎯', title: 'CONTENIDO' };
    const text = result || fallbacks[type] || "No pude generar contenido, intenta de nuevo.";
    return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<style>
*{box-sizing:border-box;margin:0;padding:0}
html,body{width:100%;background:transparent;font-family:'Segoe UI',Arial,sans-serif;overflow:hidden}
body{padding:6px;background:transparent}
.card{position:relative;overflow:hidden;padding:14px;border-radius:18px;background:linear-gradient(145deg,#0f0a2a,#1a154a);border:2px solid #facc15;box-shadow:0 8px 32px rgba(250,204,21,0.15),inset 0 1px 0 rgba(255,255,255,0.05)}
.card::before{content:'';position:absolute;top:-50%;left:-50%;width:200%;height:200%;background:radial-gradient(circle at 30% 20%,rgba(250,204,21,0.03),transparent 60%);pointer-events:none}
.header{display:flex;align-items:center;gap:10px;padding-bottom:10px;border-bottom:2px solid rgba(250,204,21,0.15)}
.header-icon{font-size:24px;width:40px;height:40px;display:flex;align-items:center;justify-content:center;background:rgba(250,204,21,0.1);border-radius:12px;border:1px solid rgba(250,204,21,0.2)}
.header-title{color:#e9e3bc;font-size:16px;font-weight:800;letter-spacing:0.5px;text-shadow:0 0 20px rgba(250,204,21,0.1)}
.header-title span{color:#facc15}
.content{margin:12px 0;padding:14px 12px;border-radius:12px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);color:#e8e0d4;font-size:16px;line-height:1.7;text-align:center;min-height:60px;display:flex;align-items:center;justify-content:center;font-weight:400;letter-spacing:0.2px}
.footer{display:flex;justify-content:space-between;align-items:center;padding-top:10px;border-top:1px solid rgba(255,255,255,0.05)}
.footer-left{display:flex;align-items:center;gap:6px;color:#6a5a8a;font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px}
.footer-left span{color:#facc15}
.footer-right{display:flex;gap:4px}
.dot{width:6px;height:6px;border-radius:50%;background:#facc15;animation:pulse 1.5s ease-in-out infinite}
.dot:nth-child(2){animation-delay:0.3s}
.dot:nth-child(3){animation-delay:0.6s}
@keyframes pulse{0%,100%{opacity:0.3;transform:scale(0.8)}50%{opacity:1;transform:scale(1.2)}}
</style>
</head>
<body>
<div class="card">
<div class="header">
<div class="header-icon">${cfg.emoji}</div>
<div class="header-title"><span>✦</span> ${cfg.title}</div>
</div>
<div class="content">${text}</div>
<div class="footer">
<div class="footer-left"><span>✦</span> Mitzuki · ${type.toUpperCase()}</div>
<div class="footer-right"><span class="dot"></span><span class="dot"></span><span class="dot"></span></div>
</div>
</div>
</body>
</html>`;
}
export default {
    name: ["piropo", "chiste", "reto", "verdad", "frases", "iafun"],
    help: ["piropo", "chiste", "reto", "verdad", "frases"],
    desc: "Genera contenido divertido con IA",
    tags: ["fun"],
    register: true,
    run: async ({ conn, m, cmd, args }) => {
        let type = cmd.toLowerCase();
        if (type === 'iafun') {
            const subCmd = args[0]?.toLowerCase() || 'chiste';
            if (['piropo', 'chiste', 'reto', 'verdad', 'frases'].includes(subCmd)) {
                type = subCmd;
            }
            else {
                type = 'chiste';
            }
        }
        const systemPrompt = systemPrompts[type] || systemPrompts.chiste;
        const cleanUserText = `Genera un ${type}`;
        try {
            let result = await getAIResult(cleanUserText, systemPrompt);
            if (!result)
                result = fallbacks[type] || "No pude generar contenido, intenta de nuevo.";
            const html = buildIAHTML(type, result);
            await htmlGoon(conn, m.chat, html);
            await m.react("✨");
        }
        catch (err) {
            console.error("❌ Error en iafun:", err);
            const fallback = fallbacks[type] || "No pude generar contenido, intenta de nuevo.";
            const html = buildIAHTML(type, fallback);
            await htmlGoon(conn, m.chat, html);
            await m.react("💡");
        }
    }
};
