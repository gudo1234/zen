const WATCH_GROUPS = new Set([])

const NOTIFY_JIDS = [
    '50492280729@s.whatsapp.net'
]

const SEEN_TTL_MS = 10 * 60 * 1000
const SEEN_LIMIT = 250

export default {
    name: ["viewoncewatch", "vowatch"],
    help: ["viewoncewatch"],
    desc: "Monitorear mensajes View Once",
    tags: ["owner"],
    owner: true,

    run: async ({ conn, m }) => {
        await m.reply(
            `*Monitor ViewOnce*\n\n` +
            `Estado: activo\n` +
            `Grupos: ${[...WATCH_GROUPS].join("\n") || "todos los grupos"}\n` +
            `Avisos: ${getNotifyTargets().join(", ") || "sin destinatarios"}\n\n` +
            `El monitor detecta mensajes View Once y respuestas que los citan.`
        )
    },

    before: async (m, { conn }) => {
        try {
            if (!m?.isGroup) return false

            if (
                WATCH_GROUPS.size &&
                !WATCH_GROUPS.has(m.chat)
            ) {
                return false
            }

            const event = getViewOnceEvent(m)

            if (!event) return false

            if (
                m.fromMe &&
                event.place === "mensaje"
            ) {
                return false
            }

            const messageId =
                m.id ||
                m.key?.id ||
                ""

            const key = [
                m.chat,
                messageId,
                event.place,
                event.quotedId || ""
            ].join(":")

            if (seenBefore(conn, key)) {
                return false
            }

            const targets = getNotifyTargets()

            if (!targets.length) {
                return false
            }

            const chatName =
                await safeName(conn, m.chat)

            const senderName =
                await safeName(conn, m.sender)

            const lines = [
                "*ViewOnce detectado*",
                "",
                `Origen: ${
                    event.place === "cita"
                        ? "respuesta citando View Once"
                        : "mensaje View Once"
                }`,
                `Chat: ${chatName}`,
                `Chat ID: ${m.chat}`,
                `Remitente: ${senderName}`,
                `Sender ID: ${m.sender}`,
                `Tipo: ${event.mediaType || "desconocido"}`,
                `Wrapper: ${event.wrapper || "desconocido"}`,
                `Mensaje ID: ${messageId || "-"}`
            ]

            if (event.quotedId) {
                lines.push(
                    `Cita ID: ${event.quotedId}`
                )
            }

            if (m.text) {
                lines.push(
                    `Texto: ${truncate(m.text, 180)}`
                )
            }

            lines.push(
                "",
                "Contenido: protegido (no reenviado)"
            )

            for (const jid of targets) {
                try {
                    await conn.sendMessage(
                        jid,
                        {
                            text: lines.join("\n")
                        },
                        {
                            quoted: m
                        }
                    )
                } catch (error) {
                    console.error(
                        "[viewonce-monitor]",
                        jid,
                        error?.message || error
                    )
                }
            }

        } catch (error) {
            console.error(
                "[viewonce-monitor]",
                error?.message || error
            )
        }

        // MUY IMPORTANTE:
        // before NO debe retornar true,
        // porque eso bloquearía el resto
        // de comandos del bot.
        return false
    }
}


/*
 * ==========================
 * DESTINATARIOS
 * ==========================
 */

function getNotifyTargets() {
    const configured =
        NOTIFY_JIDS
            .map(normalizeTargetJid)
            .filter(Boolean)

    if (configured.length) {
        return unique(configured)
    }

    const owners =
        Array.isArray(global.owner)
            ? global.owner
            : []

    return unique(
        owners
            .map(entry =>
                normalizeTargetJid(
                    Array.isArray(entry)
                        ? entry[0]
                        : entry
                )
            )
            .filter(Boolean)
    )
}

function normalizeTargetJid(value) {
    const raw =
        String(value || "").trim()

    if (!raw) return ""

    if (raw.includes("@")) {
        return raw
    }

    const number =
        raw.replace(/[^0-9]/g, "")

    return number
        ? `${number}@s.whatsapp.net`
        : ""
}


/*
 * ==========================
 * DETECCIÓN VIEW ONCE
 * ==========================
 */

function getViewOnceEvent(m) {

    const direct =
        detectViewOnceMessage(
            m?.message
        )

    if (direct) {
        return {
            ...direct,

            place: "mensaje",

            quotedId: "",

            webMessage:
                m?.vM ||
                m?.fakeObj ||
                m
        }
    }

    if (m?.key?.isViewOnce) {
        const inner =
            normalizeInnerMessage(
                m?.message
            )

        return {
            wrapper: "key.isViewOnce",

            mediaType:
                firstMessageType(inner) ||
                m?.mediaType ||
                "",

            place: "mensaje",

            quotedId: "",

            innerMessage: inner,

            webMessage:
                m?.vM ||
                m?.fakeObj ||
                m
        }
    }

    const contextInfo =
        getContextInfo(m)

    const quoted =
        m?.quoted

    const quotedWebMessage =
        quoted?.vM ||
        quoted?.fakeObj ||
        null

    const quotedMessage =
        contextInfo?.quotedMessage ||
        quotedWebMessage?.message ||
        quoted?.message ||
        makeMessageFromSerialized(quoted)

    const quotedInfo =
        detectViewOnceMessage(
            quotedMessage
        )

    if (!quotedInfo) {
        return null
    }

    return {
        ...quotedInfo,

        place: "cita",

        quotedId:
            contextInfo?.stanzaId ||
            quoted?.id ||
            quoted?.key?.id ||
            "",

        webMessage:
            quotedWebMessage
    }
}

function detectViewOnceMessage(
    message,
    depth = 0
) {
    if (
        !message ||
        typeof message !== "object" ||
        depth > 10
    ) {
        return null
    }

    for (
        const wrapper of [
            "viewOnceMessage",
            "viewOnceMessageV2",
            "viewOnceMessageV2Extension"
        ]
    ) {
        const inner =
            message?.[wrapper]?.message

        if (
            inner &&
            typeof inner === "object"
        ) {
            return {
                wrapper,

                mediaType:
                    firstMessageType(inner),

                innerMessage:
                    inner
            }
        }
    }

    const type =
        firstMessageType(message)

    const node =
        type
            ? message[type]
            : null

    if (
        node &&
        typeof node === "object" &&
        node.viewOnce
    ) {
        return {
            wrapper: "media.viewOnce",

            mediaType: type,

            innerMessage: message
        }
    }

    for (
        const wrapper of [
            "ephemeralMessage",
            "documentWithCaptionMessage",
            "editedMessage",
            "deviceSentMessage"
        ]
    ) {
        const found =
            detectViewOnceMessage(
                message?.[wrapper]?.message,
                depth + 1
            )

        if (found) {
            return found
        }
    }

    return null
}


/*
 * ==========================
 * CONTEXT INFO
 * ==========================
 */

function getContextInfo(m) {
    if (m?.msg?.contextInfo) {
        return m.msg.contextInfo
    }

    return findContextInfo(m?.message)
}

function findContextInfo(
    message,
    depth = 0
) {
    if (
        !message ||
        typeof message !== "object" ||
        depth > 8
    ) {
        return null
    }

    const type =
        firstMessageType(message)

    const node =
        type
            ? message[type]
            : null

    if (node?.contextInfo) {
        return node.contextInfo
    }

    for (
        const wrapper of [
            "ephemeralMessage",
            "documentWithCaptionMessage",
            "editedMessage",
            "deviceSentMessage"
        ]
    ) {
        const found =
            findContextInfo(
                message?.[wrapper]?.message,
                depth + 1
            )

        if (found) {
            return found
        }
    }

    return null
}


/*
 * ==========================
 * UTILIDADES
 * ==========================
 */

function firstMessageType(message) {
    if (
        !message ||
        typeof message !== "object"
    ) {
        return ""
    }

    return (
        Object.keys(message).find(
            key =>
                key &&
                ![
                    "senderKeyDistributionMessage",
                    "messageContextInfo"
                ].includes(key) &&
                message[key] != null
        ) || ""
    )
}

function normalizeInnerMessage(message) {
    if (
        !message ||
        typeof message !== "object"
    ) {
        return null
    }

    for (
        const wrapper of [
            "ephemeralMessage",
            "documentWithCaptionMessage",
            "editedMessage",
            "deviceSentMessage"
        ]
    ) {
        if (
            message?.[wrapper]?.message
        ) {
            return normalizeInnerMessage(
                message[wrapper].message
            )
        }
    }

    return message
}

function makeMessageFromSerialized(q) {
    if (
        !q ||
        typeof q !== "object"
    ) {
        return null
    }

    if (q.mtype && q.msg) {
        return {
            [q.mtype]: q.msg
        }
    }

    if (q.mediaType && q.msg) {
        return {
            [q.mediaType]: q.msg
        }
    }

    return null
}

async function safeName(conn, jid) {
    try {
        return await conn.getName(jid)
    } catch {
        return jid
    }
}

function truncate(value, max) {
    const text =
        String(value || "")
            .replace(/\s+/g, " ")
            .trim()

    return text.length > max
        ? `${text.slice(0, max - 3)}...`
        : text
}

function seenBefore(conn, key) {
    const now = Date.now()

    const seen =
        conn._viewOnceMonitorSeen ||
        (
            conn._viewOnceMonitorSeen =
                new Map()
        )

    for (const [id, at] of seen) {
        if (
            !at ||
            now - at > SEEN_TTL_MS
        ) {
            seen.delete(id)
        }
    }

    if (seen.has(key)) {
        return true
    }

    seen.set(key, now)

    while (seen.size > SEEN_LIMIT) {
        seen.delete(
            seen.keys().next().value
        )
    }

    return false
}

function unique(values) {
    return [
        ...new Set(
            values.filter(Boolean)
        )
    ]
              }
