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
    const jsonSchema = zodSchemaToPlain(zodSchema)
    return jsonSchema
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
    matchScore: z.number().describe("A score between 0 and 100 indicating how well the candidate's profile matches the job describe"),
    technicalQuestions: z.array(z.object({
        question: z.string().describe("The technical question can be asked in the interview"),
        intention: z.string().describe("The intention of interviewer behind asking this question"),
        answer: z.string().describe("How to answer this question, what points to cover, what approach to take etc.")
    })).describe("Technical questions that can be asked in the interview along with their intention and how to answer them"),
    behavioralQuestions: z.array(z.object({
        question: z.string().describe("The technical question can be asked in the interview"),
        intention: z.string().describe("The intention of interviewer behind asking this question"),
        answer: z.string().describe("How to answer this question, what points to cover, what approach to take etc.")
    })).describe("Behavioral questions that can be asked in the interview along with their intention and how to answer them"),
    skillGaps: z.array(z.object({
        skill: z.string().describe("The skill which the candidate is lacking"),
        severity: z.enum([ "low", "medium", "high" ]).describe("The severity of this skill gap, i.e. how important is this skill for the job and how much it can impact the candidate's chances")
    })).describe("List of skill gaps in the candidate's profile along with their severity"),
    preparationPlan: z.array(z.object({
        day: z.number().describe("The day number in the preparation plan, starting from 1"),
        focus: z.string().describe("The main focus of this day in the preparation plan, e.g. data structures, system design, mock interviews etc."),
        tasks: z.array(z.string()).describe("List of tasks to be done on this day to follow the preparation plan, e.g. read a specific book or article, solve a set of problems, watch a video etc.")
    })).describe("A day-wise preparation plan for the candidate to follow in order to prepare for the interview effectively"),
    title: z.string().describe("The title of the job for which the interview report is generated"),
})

async function retryGenerateContent(prompt, schema) {
    let retries = 3;
    let delay = 2000; // 2 seconds

    while (retries > 0) {
        try {
            const response = await ai.models.generateContent({
                model: "gemini-2.5-flash",
                contents: prompt,
                config: {
                    responseMimeType: "application/json",
                    responseSchema: convertZodToGeminiSchema(schema),
                }
            });
            return response;
        } catch (error) {
            const status = error.status || error.httpErrorCode?.statusCode;
            if (status === 429 || error.message?.includes("429")) {
                console.warn(`Rate limit hit. Retrying in ${delay}ms... (${retries} retries left)`);
                await new Promise(resolve => setTimeout(resolve, delay));
                retries--;
                delay *= 2;
            } else {
                console.error("AI generation error — status:", status, "| message:", error.message);
                throw error;
            }
        }
    }
    throw new Error("AI service is currently overloaded. Please try again in a few minutes.");
}

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

    const response = await retryGenerateContent(prompt, interviewReportSchema);
    return JSON.parse(typeof response.text === 'function' ? response.text() : response.text);
}



async function generatePdfFromHtml(htmlContent) {
    const browser = await puppeteer.launch()
    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: "networkidle0" })

    const pdfBuffer = await page.pdf({
        format: "A4", margin: {
            top: "20mm",
            bottom: "20mm",
            left: "15mm",
            right: "15mm"
        }
    })

    await browser.close()

    return pdfBuffer
}

async function generateResumePdf({ resume, selfDescription, jobDescription }) {

    const resumePdfSchema = z.object({
        html: z.string().describe("The HTML content of the resume which can be converted to PDF using any library like puppeteer")
    })

    const prompt = `Generate resume for a candidate with the following details:
                        Resume: ${resume}
                        Self Description: ${selfDescription}
                        Job Description: ${jobDescription}

                        the response should be a JSON object with a single field "html" which contains the HTML content of the resume which can be converted to PDF using any library like puppeteer.
                        The resume should be tailored for the given job description and should highlight the candidate's strengths and relevant experience. The HTML content should be well-formatted and structured, making it easy to read and visually appealing.
                        The content of resume should be not sound like it's generated by AI and should be as close as possible to a real human-written resume.
                        you can highlight the content using some colors or different font styles but the overall design should be simple and professional.
                        The content should be ATS friendly, i.e. it should be easily parsable by ATS systems without losing important information.
                        The resume should not be so lengthy, it should ideally be 1-2 pages long when converted to PDF. Focus on quality rather than quantity and make sure to include all the relevant information that can increase the candidate's chances of getting an interview call for the given job description.
                    `

    const response = await retryGenerateContent(prompt, resumePdfSchema);


    const jsonContent = JSON.parse(typeof response.text === 'function' ? response.text() : response.text)

    const pdfBuffer = await generatePdfFromHtml(jsonContent.html)

    return pdfBuffer

}

module.exports = { generateInterviewReport, generateResumePdf }