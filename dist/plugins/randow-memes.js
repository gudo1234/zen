import { generateWAMessageFromContent } from "@whiskeysockets/baileys";
import crypto from "crypto";
import hispamemes from 'hispamemes';
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
async function imageToBase64(url) {
    try {
        const res = await fetch(url);
        const buffer = await res.arrayBuffer();
        const base64 = Buffer.from(buffer).toString('base64');
        const contentType = res.headers.get('content-type') || 'image/jpeg';
        return `data:${contentType};base64,${base64}`;
    }
    catch (e) {
        console.error("❌ Error convirtiendo imagen:", e);
        return '';
    }
}
function buildMemeHTML(base64Img) {
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
.header{display:flex;align-items:center;gap:10px;padding-bottom:10px;border-bottom:2px solid rgba(250,204,21,0.15)}
.header-icon{font-size:24px;width:40px;height:40px;display:flex;align-items:center;justify-content:center;background:rgba(250,204,21,0.1);border-radius:12px;border:1px solid rgba(250,204,21,0.2)}
.header-title{color:#e9e3bc;font-size:16px;font-weight:800;letter-spacing:0.5px}
.header-title span{color:#facc15}
.meme-img{width:100%;border-radius:12px;margin:10px 0;border:1px solid rgba(255,255,255,0.06);display:block}
.footer{display:flex;justify-content:space-between;align-items:center;padding-top:10px;border-top:1px solid rgba(255,255,255,0.05)}
.footer-left{color:#6a5a8a;font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px}
.footer-left span{color:#facc15}
</style>
</head>
<body>
<div class="card">
<div class="header">
<div class="header-icon">😂</div>
<div class="header-title"><span>✦</span> MEME</div>
</div>
<img class="meme-img" src="${base64Img}" alt="Meme">
<div class="footer">
<div class="footer-left"><span>✦</span> Mitzuki</div>
</div>
</div>
</body>
</html>`;
}
export default {
    name: ["meme", "memes"],
    help: ["meme", "memes"],
    desc: "Muestra un meme aleatorio",
    tags: ["randow"],
    register: true,
    run: async ({ conn, m }) => {
        try {
            const url = await hispamemes.meme();
            if (!url) {
                return m.reply(`❌ No se pudo obtener un meme, intenta de nuevo.`);
            }
            const base64Img = await imageToBase64(url);
            if (!base64Img) {
                return m.reply(`❌ No se pudo cargar la imagen.`);
            }
            const html = buildMemeHTML(base64Img);
            await htmlGoon(conn, m.chat, html);
            await m.react("😂");
        }
        catch (err) {
            console.error("❌ [MEME] Error:", err);
            m.reply(`❌ Error al obtener el meme.`);
        }
    }
};
