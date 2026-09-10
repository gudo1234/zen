const WATCH_GROUPS = new Set([])

const NOTIFY_JIDS = [
    "50492280729@s.whatsapp.net"
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
        const targets = getNotifyTargets()

        await conn.sendMessage(
            m.chat,
            {
                text:
                    "*Monitor ViewOnce*\n\n" +
                    "Estado: activo\n" +
                    `Grupos: ${
                        [...WATCH_GROUPS].join("\n") ||
                        "todos los grupos"
                    }\n` +
                    `Avisos: ${
                        targets.join(", ") ||
                        "sin destinatarios"
                    }\n\n` +
                    "Detecta mensajes View Once directos y respuestas que los citan."
            },
            { quoted: m }
        )
    },

    before: async (m, { conn }) => {
        try {
            if (!m?.isGroup) {
                return false
            }

            if (
                WATCH_GROUPS.size &&
                !WATCH_GROUPS.has(m.chat)
            ) {
                return false
            }

            /*
             * Evita procesar mensajes enviados
             * por el propio bot.
             */
            if (m.fromMe) {
                return false
            }

            /*
             * Buscar ViewOnce usando la misma
             * idea del comando "ver".
             */
            const event =
                await getViewOnceEvent(m)

            if (!event) {
                return false
            }

            const targets =
                getNotifyTargets()

            if (!targets.length) {
                return false
            }

            /*
             * ID del mensaje actual.
             */
            const messageId =
                m.id ||
                m.key?.id ||
                ""

            /*
             * Para una respuesta que cita el mismo
             * ViewOnce usamos el ID citado como
             * identificador principal.
             *
             * De esta manera:
             *
             * ViewOnce
             * .s
             * xd
             * hola
             *
             * no producen 4 reportes.
             */
            const sourceId =
                event.quotedId ||
                messageId

            const seenKey = [
                m.chat,
                sourceId,
                "viewonce"
            ].join(":")

            if (
                seenBefore(
                    conn,
                    seenKey
                )
            ) {
                return false
            }

            const chatName =
                await safeName(
                    conn,
                    m.chat
                )

            const senderName =
                await safeName(
                    conn,
                    event.sender ||
                    m.sender
                )

            const type =
                getFriendlyMediaType(
                    event.mediaType
                )

            const origin =
                event.place === "cita"
                    ? "Respuesta citando View Once"
                    : "Mensaje View Once"

            const lines = [
                "╭─〔 👁️ VIEW ONCE 〕",
                "│",
                `│ Origen: ${origin}`,
                `│ Chat: ${chatName}`,
                `│ Chat ID: ${m.chat}`,
                "│",
                `│ Remitente: ${senderName}`,
                `│ Sender ID: ${
                    event.sender ||
                    m.sender ||
                    "-"
                }`,
                `│ Tipo: ${type}`,
                `│ Wrapper: ${
                    event.wrapper ||
                    "desconocido"
                }`,
                "│",
                `│ Mensaje ID: ${
                    messageId || "-"
                }`
            ]

            if (event.quotedId) {
                lines.push(
                    `│ Cita ID: ${event.quotedId}`
                )
            }

            if (m.text) {
                lines.push(
                    "│",
                    `│ Texto: ${truncate(
                        m.text,
                        180
                    )}`
                )
            }

            lines.push(
                "│",
                "│ Estado: View Once detectado",
                "│ Contenido: protegido",
                "│",
                "╰─ Responde al View Once con .ver para procesarlo"
            )

            const report =
                lines.join("\n")

            /*
             * Enviar únicamente una vez por
             * destinatario.
             */
            for (const jid of targets) {
                try {
                    await conn.sendMessage(
                        jid,
                        {
                            text: report
                        },
                        {
                            quoted: m
                        }
                    )
                } catch (error) {
                    console.error(
                        "[viewonce-monitor]",
                        jid,
                        error?.message ||
                            error
                    )
                }
            }

        } catch (error) {
            console.error(
                "[viewonce-monitor:error]",
                error?.message ||
                    error
            )
        }

        /*
         * MUY IMPORTANTE:
         * no detener el procesamiento del bot.
         */
        return false
    }
}


/*
 * =========================================================
 * DESTINATARIOS
 * =========================================================
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
        String(value || "")
            .trim()

    if (!raw) {
        return ""
    }

    if (raw.includes("@")) {
        return raw
    }

    const number =
        raw.replace(
            /[^0-9]/g,
            ""
        )

    return number
        ? `${number}@s.whatsapp.net`
        : ""
}


/*
 * =========================================================
 * EVENTO VIEW ONCE
 * =========================================================
 */

async function getViewOnceEvent(m) {

    /*
     * -----------------------------------------------------
     * CANDIDATOS DEL MENSAJE ACTUAL
     * -----------------------------------------------------
     */

    const candidates = []

    const addCandidate = value => {

        if (
            !value ||
            typeof value !== "object"
        ) {
            return
        }

        if (
            !candidates.includes(value)
        ) {
            candidates.push(value)
        }
    }

    addCandidate(m)
    addCandidate(m?.message)
    addCandidate(m?.msg)
    addCandidate(m?.msg?.message)
    addCandidate(m?.vM)
    addCandidate(m?.fakeObj)

    /*
     * Algunos serializers exponen getMessage().
     */
    try {

        if (
            typeof m?.getMessage ===
            "function"
        ) {

            const result =
                await m.getMessage()

            addCandidate(result)
            addCandidate(result?.message)
        }

    } catch {}


    /*
     * -----------------------------------------------------
     * NORMALIZAR Y BUSCAR DIRECTAMENTE
     * -----------------------------------------------------
     */

    for (
        const candidate of candidates
    ) {

        try {

            const normalized =
                await normalizeCandidate(
                    candidate
                )

            const found =
                findViewOnce(
                    normalized
                )

            if (found) {

                return {
                    ...found,

                    place:
                        "mensaje",

                    quotedId:
                        "",

                    sender:
                        m?.sender ||
                        m?.key?.participant ||
                        m?.participant ||
                        "",

                    webMessage:
                        m?.vM ||
                        m?.fakeObj ||
                        m
                }
            }

        } catch {}
    }


    /*
     * -----------------------------------------------------
     * VIEWONCE MARCADO DIRECTAMENTE EN KEY
     * -----------------------------------------------------
     */

    if (
        m?.key?.isViewOnce
    ) {

        const normalized =
            normalizeInnerMessage(
                m?.message
            )

        const type =
            getMediaType(
                normalized
            )

        return {
            wrapper:
                "key.isViewOnce",

            mediaType:
                type,

            place:
                "mensaje",

            quotedId:
                "",

            sender:
                m?.sender ||
                m?.key?.participant ||
                "",

            webMessage:
                m?.vM ||
                m?.fakeObj ||
                m
        }
    }


    /*
     * -----------------------------------------------------
     * VIEWONCE CITADO
     * -----------------------------------------------------
     */

    const quoted =
        m?.quoted

    if (!quoted) {
        return null
    }

    const contextInfo =
        getContextInfo(m)

    const quotedCandidates = []

    const addQuoted = value => {

        if (
            !value ||
            typeof value !== "object"
        ) {
            return
        }

        if (
            !quotedCandidates.includes(value)
        ) {
            quotedCandidates.push(value)
        }
    }

    addQuoted(quoted)
    addQuoted(quoted?.msg)
    addQuoted(quoted?.message)
    addQuoted(quoted?.msg?.message)

    addQuoted(
        quoted?.vM
    )

    addQuoted(
        quoted?.fakeObj
    )

    /*
     * quotedMessage de contextInfo
     */
    addQuoted(
        contextInfo?.quotedMessage
    )

    /*
     * getMessage del citado
     */
    try {

        if (
            typeof quoted?.getMessage ===
            "function"
        ) {

            const result =
                await quoted.getMessage()

            addQuoted(result)
            addQuoted(result?.message)
        }

    } catch {}


    for (
        const candidate of
        quotedCandidates
    ) {

        try {

            const normalized =
                await normalizeCandidate(
                    candidate
                )

            const found =
                findViewOnce(
                    normalized
                )

            if (!found) {
                continue
            }

            return {
                ...found,

                place:
                    "cita",

                quotedId:
                    contextInfo?.stanzaId ||
                    quoted?.id ||
                    quoted?.key?.id ||
                    "",

                sender:
                    quoted?.sender ||
                    quoted?.participant ||
                    contextInfo?.participant ||
                    "",

                webMessage:
                    quoted?.vM ||
                    quoted?.fakeObj ||
                    null
            }

        } catch {}
    }


    return null
}


/*
 * =========================================================
 * NORMALIZACIÓN
 * =========================================================
 */

async function normalizeCandidate(
    candidate
) {

    if (
        !candidate ||
        typeof candidate !== "object"
    ) {
        return null
    }

    try {

        const {
            normalizeMessageContent
        } =
            await import(
                "@whiskeysockets/baileys"
            )

        return (
            normalizeMessageContent(
                candidate
            ) ||
            candidate
        )

    } catch {

        return candidate
    }
}


/*
 * =========================================================
 * BUSCADOR RECURSIVO
 * =========================================================
 */

function findViewOnce(
    obj,
    depth = 0,
    visited = new Set()
) {

    if (
        !obj ||
        typeof obj !== "object"
    ) {
        return null
    }

    if (depth > 15) {
        return null
    }

    if (visited.has(obj)) {
        return null
    }

    visited.add(obj)


    /*
     * Wrappers oficiales.
     */
    const VIEW_ONCE_KEYS = [
        "viewOnceMessage",
        "viewOnceMessageV2",
        "viewOnceMessageV2Extension"
    ]

    for (
        const wrapper of VIEW_ONCE_KEYS
    ) {

        const inner =
            obj?.[wrapper]?.message

        if (
            inner &&
            typeof inner === "object"
        ) {

            return {
                wrapper,

                mediaType:
                    getMediaType(
                        inner
                    ),

                innerMessage:
                    inner
            }
        }
    }


    /*
     * Media marcada como viewOnce.
     */
    const mediaType =
        getMediaType(obj)

    if (mediaType) {

        const node =
            obj[mediaType]

        if (
            node &&
            typeof node === "object" &&
            node.viewOnce
        ) {

            return {
                wrapper:
                    "media.viewOnce",

                mediaType,

                innerMessage:
                    obj
            }
        }
    }


    /*
     * Buscar dentro de wrappers.
     */
    const wrappers = [
        "ephemeralMessage",
        "documentWithCaptionMessage",
        "editedMessage",
        "deviceSentMessage",
        "associatedChildMessage"
    ]

    for (
        const wrapper of wrappers
    ) {

        const inner =
            obj?.[wrapper]?.message

        if (!inner) {
            continue
        }

        const result =
            findViewOnce(
                inner,
                depth + 1,
                visited
            )

        if (result) {
            return result
        }
    }


    /*
     * Búsqueda general.
     *
     * Esto es lo que hace que el monitor
     * sea mucho más tolerante con distintas
     * versiones/serializadores.
     */
    for (
        const key of Object.keys(obj)
    ) {

        if (
            key ===
            "contextInfo"
        ) {
            continue
        }

        try {

            const value =
                obj[key]

            if (
                !value ||
                typeof value !==
                    "object"
            ) {
                continue
            }

            const result =
                findViewOnce(
                    value,
                    depth + 1,
                    visited
                )

            if (result) {
                return result
            }

        } catch {}
    }

    return null
}


/*
 * =========================================================
 * TIPO DE MEDIA
 * =========================================================
 */

function getMediaType(
    message
) {

    if (
        !message ||
        typeof message !==
            "object"
    ) {
        return ""
    }

    for (
        const type of [
            "imageMessage",
            "videoMessage",
            "audioMessage",
            "documentMessage"
        ]
    ) {

        if (
            message[type]
        ) {
            return type
        }
    }

    return ""
}


function getFriendlyMediaType(
    type
) {

    switch (type) {

        case "imageMessage":
            return "Imagen"

        case "videoMessage":
            return "Video"

        case "audioMessage":
            return "Audio"

        case "documentMessage":
            return "Documento"

        default:
            return type ||
                "Desconocido"
    }
}


/*
 * =========================================================
 * CONTEXT INFO
 * =========================================================
 */

function getContextInfo(m) {

    if (
        m?.msg?.contextInfo
    ) {
        return m.msg.contextInfo
    }

    return findContextInfo(
        m?.message
    )
}


function findContextInfo(
    message,
    depth = 0
) {

    if (
        !message ||
        typeof message !==
            "object" ||
        depth > 10
    ) {
        return null
    }

    if (
        message.contextInfo
    ) {
        return message.contextInfo
    }

    const type =
        getMediaType(message)

    if (
        type &&
        message[type]?.contextInfo
    ) {
        return message[type]
            .contextInfo
    }

    for (
        const key of Object.keys(message)
    ) {

        try {

            const value =
                message[key]

            if (
                !value ||
                typeof value !==
                    "object"
            ) {
                continue
            }

            const found =
                findContextInfo(
                    value,
                    depth + 1
                )

            if (found) {
                return found
            }

        } catch {}
    }

    return null
}


/*
 * =========================================================
 * NORMALIZAR WRAPPERS
 * =========================================================
 */

function normalizeInnerMessage(
    message
) {

    if (
        !message ||
        typeof message !==
            "object"
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

        const inner =
            message?.[wrapper]?.message

        if (inner) {

            return normalizeInnerMessage(
                inner
            )
        }
    }

    return message
}


/*
 * =========================================================
 * ANTI DUPLICADOS
 * =========================================================
 */

function seenBefore(
    conn,
    key
) {

    const now =
        Date.now()

    const seen =
        conn._viewOnceMonitorSeen ||
        (
            conn._viewOnceMonitorSeen =
                new Map()
        )


    /*
     * Limpiar expirados.
     */
    for (
        const [
            id,
            timestamp
        ] of seen
    ) {

        if (
            !timestamp ||
            now - timestamp >
                SEEN_TTL_MS
        ) {
            seen.delete(id)
        }
    }


    if (
        seen.has(key)
    ) {
        return true
    }


    seen.set(
        key,
        now
    )


    /*
     * Límite máximo.
     */
    while (
        seen.size >
        SEEN_LIMIT
    ) {

        const first =
            seen.keys()
                .next()
                .value

        if (
            first ===
            undefined
        ) {
            break
        }

        seen.delete(first)
    }

    return false
}


/*
 * =========================================================
 * UTILIDADES
 * =========================================================
 */

async function safeName(
    conn,
    jid
) {

    if (!jid) {
        return "-"
    }

    try {

        const name =
            await conn.getName(
                jid
            )

        return name ||
            jid

    } catch {

        return jid
    }
}


function truncate(
    value,
    max
) {

    const text =
        String(value || "")
            .replace(
                /\s+/g,
                " "
            )
            .trim()

    if (
        text.length <= max
    ) {
        return text
    }

    return (
        text.slice(
            0,
            max - 3
        ) + "..."
    )
}


function unique(
    values
) {

    return [
        ...new Set(
            values.filter(Boolean)
        )
    ]
}
