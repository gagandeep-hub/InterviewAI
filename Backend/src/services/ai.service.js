const { GoogleGenAI, Type } = require("@google/genai")
const { z } = require("zod")
const puppeteer = require("puppeteer")

const ai = new GoogleGenAI({
    apiKey: process.env.GOOGLE_GENAI_API_KEY
})

/* ── Zod → Gemini schema converter ────────────────────────────────
   Gemini's responseSchema expects its own Type-based format.
   zodToJsonSchema produces JSON Schema Draft-07 which Gemini ignores.
   This helper converts Zod schemas to Gemini's native format.
   ─────────────────────────────────────────────────────────────── */
function convertZodToGeminiSchema(zodSchema) {
    return zodSchemaToPlain(zodSchema)
}

function zodSchemaToPlain(schema) {
    const def = schema._def
    const typeName = schema.constructor.name

    // ZodObject
    if (typeName === "ZodObject") {
        const shape = typeof def.shape === "function" ? def.shape() : schema.shape
        const properties = {}
        const required = []
        for (const [key, value] of Object.entries(shape)) {
            properties[key] = zodSchemaToPlain(value)
            if (value.constructor.name !== "ZodOptional") {
                required.push(key)
            }
        }
        const result = { type: Type.OBJECT, properties }
        if (required.length > 0) result.required = required
        if (def.description) result.description = def.description
        return result
    }

    // ZodArray
    if (typeName === "ZodArray") {
        const result = { type: Type.ARRAY, items: zodSchemaToPlain(def.element) }
        if (def.description) result.description = def.description
        return result
    }

    // ZodString
    if (typeName === "ZodString") {
        const result = { type: Type.STRING }
        if (def.description) result.description = def.description
        return result
    }

    // ZodNumber
    if (typeName === "ZodNumber") {
        const result = { type: Type.NUMBER }
        if (def.description) result.description = def.description
        return result
    }

    // ZodEnum
    if (typeName === "ZodEnum") {
        const result = { type: Type.STRING, enum: schema.options || def.values }
        if (def.description) result.description = def.description
        return result
    }

    // ZodBoolean
    if (typeName === "ZodBoolean") {
        const result = { type: Type.BOOLEAN }
        if (def.description) result.description = def.description
        return result
    }

    // ZodOptional — unwrap
    if (typeName === "ZodOptional") {
        return zodSchemaToPlain(def.innerType)
    }

    // ZodDefault — unwrap
    if (typeName === "ZodDefault") {
        return zodSchemaToPlain(def.innerType)
    }

    // Fallback
    return { type: Type.STRING }
}


const interviewReportSchema = z.object({
    matchScore: z.number().describe("A score between 0 and 100 indicating how well the candidate's profile matches the job description"),
    technicalQuestions: z.array(z.object({
        question: z.string().describe("The technical question that can be asked in the interview"),
        intention: z.string().describe("The intention of the interviewer behind asking this question"),
        answer: z.string().describe("How to answer this question, what points to cover, what approach to take etc.")
    })).describe("Technical questions that can be asked in the interview along with their intention and how to answer them"),
    behavioralQuestions: z.array(z.object({
        question: z.string().describe("The behavioral question that can be asked in the interview"),
        intention: z.string().describe("The intention of the interviewer behind asking this question"),
        answer: z.string().describe("How to answer this question, what points to cover, what approach to take etc.")
    })).describe("Behavioral questions that can be asked in the interview along with their intention and how to answer them"),
    skillGaps: z.array(z.object({
        skill: z.string().describe("The skill which the candidate is lacking"),
        severity: z.enum(["low", "medium", "high"]).describe("The severity of this skill gap")
    })).describe("List of skill gaps in the candidate's profile along with their severity"),
    preparationPlan: z.array(z.object({
        day: z.number().describe("The day number in the preparation plan, starting from 1"),
        focus: z.string().describe("The main focus of this day in the preparation plan"),
        tasks: z.array(z.string()).describe("List of tasks to be done on this day")
    })).describe("A day-wise preparation plan for the candidate"),
    title: z.string().describe("The title of the job for which the interview report is generated"),
})

/* ── Safe text extractor ───────────────────────────────────────── */
function extractText(response) {
    if (typeof response.text === "function") return response.text()
    if (typeof response.text === "string") return response.text
    // Fallback: dig into candidates
    const parts = response?.candidates?.[0]?.content?.parts
    if (Array.isArray(parts)) return parts.map(p => p.text || "").join("")
    throw new Error("Unable to extract text from AI response")
}

/* ── Retry wrapper with exponential back-off ───────────────────── */
async function retryGenerateContent(prompt, schema) {
    let retries = 3
    let delay = 2000 // 2 seconds

    while (retries > 0) {
        try {
            const response = await ai.models.generateContent({
                model: "gemini-2.0-flash",          // ✅ confirmed valid model string
                contents: prompt,
                config: {
                    responseMimeType: "application/json",
                    responseSchema: convertZodToGeminiSchema(schema),
                }
            })

            const rawText = extractText(response)

            if (!rawText || rawText.trim() === "") {
                throw new Error("Empty response received from AI model")
            }

            return rawText   // return raw text, not the response object

        } catch (error) {
            const status = error.status || error.httpErrorCode?.statusCode
            if (status === 429 || error.message?.includes("429")) {
                console.warn(`Rate limit hit. Retrying in ${delay}ms... (${retries} retries left)`)
                await new Promise(resolve => setTimeout(resolve, delay))
                retries--
                delay *= 2
            } else {
                console.error("AI generation error — status:", status, "| message:", error.message)
                throw error
            }
        }
    }

    throw new Error("AI service is currently overloaded. Please try again in a few minutes.")
}

/* ── Interview report ──────────────────────────────────────────── */
async function generateInterviewReport({ resume, selfDescription, jobDescription }) {
    const prompt = `Generate an interview report for a candidate with the following details:
Resume: ${resume}
Self Description: ${selfDescription}
Job Description: ${jobDescription}

CRITICAL INSTRUCTIONS:
- You MUST generate exactly 5 technical questions.
- You MUST generate exactly 3 behavioral questions.
- Identify at least 3 skill gaps.
- Create a 7-day preparation plan.
`

    const rawText = await retryGenerateContent(prompt, interviewReportSchema)

    // Strip markdown code fences if present (some models wrap JSON in ```json ... ```)
    const clean = rawText.replace(/```json|```/g, "").trim()

    return JSON.parse(clean)
}

/* ── Puppeteer PDF generator ───────────────────────────────────── */
async function generatePdfFromHtml(htmlContent) {
    // ✅ Required args for Render (and any cloud Linux environment)
    const browser = await puppeteer.launch({
        args: [
            "--no-sandbox",
            "--disable-setuid-sandbox",
            "--disable-dev-shm-usage",   // Render has limited /dev/shm
            "--disable-gpu",
            "--single-process"           // Helps on memory-constrained hosts
        ],
        headless: true
    })

    const page = await browser.newPage()

    try {
        await page.setContent(htmlContent, { waitUntil: "networkidle0" })

        const pdfBuffer = await page.pdf({
            format: "A4",
            margin: {
                top: "20mm",
                bottom: "20mm",
                left: "15mm",
                right: "15mm"
            },
            printBackground: true   // renders background colors/images
        })

        return pdfBuffer
    } finally {
        await browser.close()   // ✅ Always closes, even if pdf() throws
    }
}

/* ── Resume PDF ────────────────────────────────────────────────── */
async function generateResumePdf({ resume, selfDescription, jobDescription }) {
    const resumePdfSchema = z.object({
        html: z.string().describe("The HTML content of the resume which can be converted to PDF using puppeteer")
    })

    const prompt = `Generate a resume for a candidate with the following details:
Resume: ${resume}
Self Description: ${selfDescription}
Job Description: ${jobDescription}

The response should be a JSON object with a single field "html" containing the full HTML content of the resume.
Requirements:
- Tailored for the given job description, highlighting relevant strengths and experience.
- Well-formatted, visually appealing, and easy to read.
- Should NOT sound AI-generated; write naturally like a human.
- Simple, professional design. You may use colors or varied font styles sparingly.
- ATS-friendly: easily parsable without losing important information.
- Concise: ideally 1-2 pages when converted to PDF. Quality over quantity.
- Include all relevant information that increases interview chances for the given role.
`

    const rawText = await retryGenerateContent(prompt, resumePdfSchema)
    const clean = rawText.replace(/```json|```/g, "").trim()
    const jsonContent = JSON.parse(clean)

    if (!jsonContent.html || jsonContent.html.trim() === "") {
        throw new Error("AI returned empty HTML for resume")
    }

    const pdfBuffer = await generatePdfFromHtml(jsonContent.html)
    return pdfBuffer
}

module.exports = { generateInterviewReport, generateResumePdf }