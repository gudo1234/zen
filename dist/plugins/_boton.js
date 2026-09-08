import { generateWAMessageFromContent } from "@whiskeysockets/baileys";
import fetch from "node-fetch";

export default {
    name: ["testbutton"],
    help: ["testbutton"],
    desc: "Probar botones interactivos de WhatsApp",
    tags: ["tools"],
    group: false,
    botAdmin: false,
    register: false,

    run: async ({ conn, m, body }) => {
        try {
            const iconUrl = global.icono();
            const response = await fetch(iconUrl);

            if (!response.ok) {
                throw new Error(`Error al obtener el icono: ${response.status}`);
            }

            const thumbnail = Buffer.from(
                await response.arrayBuffer()
            );

            const rawContent = {
                buttonsMessage: {
                    locationMessage: {
                        degreesLatitude: 0,
                        degreesLongitude: 0,
                        jpegThumbnail: thumbnail
                    },

                    contentText: "Halo dunia",

                    footerText: "Zentríx Bot",

                    buttons: [
                        {
                            buttonId: ".menu",
                            buttonText: {
                                displayText: "📦 Menu"
                            },
                            type: 1
                        },
                        {
                            buttonId: "compra",
                            buttonText: {
                                displayText: "👤 Profile"
                            },
                            type: 1
                        }
                    ],

                    headerType: 6
                }
            };

            const msg = generateWAMessageFromContent(
                m.chat,
                rawContent,
                {
                    userJid: conn.user.id
                }
            );

            await conn.relayMessage(
                m.chat,
                msg.message,
                {
                    messageId: msg.key.id
                }
            );

        } catch (error) {
            console.error("❌ Error en testbutton:", error);

            await conn.sendMessage(
                m.chat,
                {
                    text: "❌ Ocurrió un error al enviar el mensaje."
                },
                {
                    quoted: m
                }
            );
        }
    }
};
