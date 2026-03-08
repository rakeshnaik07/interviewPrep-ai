const { GoogleGenAI } = require("@google/genai");
const {z} = require('zod')
const { zodToJsonSchema } = require('zod-to-json-schema')
const puppeteer = require('puppeteer')

const ai = new GoogleGenAI({
    apiKey: process.env.GOOGLE_GENAI_API_KEY
})

const REPORT_MODELS = ["gemini-3-flash-preview", "gemini-2.5-flash"]
const RETRYABLE_STATUS_CODES = new Set([429, 500, 503, 504])
const MAX_RETRIES_PER_MODEL = 3
const BASE_RETRY_DELAY_MS = 1000

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms))
}

function isRetryableError(error) {
    return RETRYABLE_STATUS_CODES.has(error?.status)
}

function toText(value) {
    if (typeof value === "string") {
        return value.trim()
    }
    if (value === undefined || value === null) {
        return ""
    }
    return String(value).trim()
}

function parseNumber(value, fallback = 65) {
    if (typeof value === "number" && Number.isFinite(value)) {
        return Math.max(0, Math.min(100, value))
    }
    const parsed = Number.parseFloat(toText(value))
    if (Number.isFinite(parsed)) {
        return Math.max(0, Math.min(100, parsed))
    }
    return fallback
}

function ensureTechnicalQuestions(input) {
    const list = Array.isArray(input) ? input : []
    const mapped = list.slice(0, 5).map((item, idx) => {
        if (item && typeof item === "object") {
            return {
                question: toText(item.question) || `Technical question ${idx + 1}`,
                intention: toText(item.intention) || "Assess core technical understanding for the role.",
                answer: toText(item.answer) || "Explain your approach clearly, share concrete examples, and discuss tradeoffs."
            }
        }
        const question = toText(item) || `Technical question ${idx + 1}`
        return {
            question,
            intention: "Assess core technical understanding for the role.",
            answer: "Explain your approach clearly, share concrete examples, and discuss tradeoffs."
        }
    })

    while (mapped.length < 5) {
        mapped.push({
            question: `Technical question ${mapped.length + 1}`,
            intention: "Assess core technical understanding for the role.",
            answer: "Explain your approach clearly, share concrete examples, and discuss tradeoffs."
        })
    }
    return mapped
}

function ensureBehavioralQuestions(input) {
    const list = Array.isArray(input) ? input : []
    const mapped = list.slice(0, 5).map((item, idx) => {
        if (item && typeof item === "object") {
            return {
                question: toText(item.question) || `Behavioral question ${idx + 1}`,
                intention: toText(item.intention) || "Assess communication, ownership, and collaboration skills.",
                answer: toText(item.answer) || "Use STAR format with a real example, measurable impact, and key learning."
            }
        }
        const question = toText(item) || `Behavioral question ${idx + 1}`
        return {
            question,
            intention: "Assess communication, ownership, and collaboration skills.",
            answer: "Use STAR format with a real example, measurable impact, and key learning."
        }
    })

    while (mapped.length < 5) {
        mapped.push({
            question: `Behavioral question ${mapped.length + 1}`,
            intention: "Assess communication, ownership, and collaboration skills.",
            answer: "Use STAR format with a real example, measurable impact, and key learning."
        })
    }
    return mapped
}

function ensureSkillGaps(input) {
    const list = Array.isArray(input) ? input : []
    const mapped = list.slice(0, 6).map((item) => {
        if (item && typeof item === "object") {
            const severity = [ "low", "medium", "high" ].includes(item.severity) ? item.severity : "medium"
            return {
                skill: toText(item.skill) || "Missing relevant skill",
                severity
            }
        }
        return {
            skill: toText(item) || "Missing relevant skill",
            severity: "medium"
        }
    }).filter((item) => item.skill.length >= 2)

    while (mapped.length < 3) {
        mapped.push({
            skill: `Skill gap ${mapped.length + 1}`,
            severity: "medium"
        })
    }
    return mapped
}

function ensurePreparationPlan(input) {
    const list = Array.isArray(input) ? input : []
    const mapped = []

    for (let i = 0; i < 7; i++) {
        const raw = list[i]
        const day = i + 1
        if (raw && typeof raw === "object") {
            const tasks = Array.isArray(raw.tasks) ? raw.tasks.map(toText).filter(Boolean) : []
            while (tasks.length < 2) {
                tasks.push(`Complete focused practice task ${tasks.length + 1} for day ${day}`)
            }
            mapped.push({
                day,
                focus: toText(raw.focus) || `Interview preparation focus for day ${day}`,
                tasks: tasks.slice(0, 5)
            })
            continue
        }

        const focusFromString = toText(raw) || `Interview preparation focus for day ${day}`
        mapped.push({
            day,
            focus: focusFromString,
            tasks: [
                `Study core topics related to "${focusFromString}"`,
                `Solve problems and review solutions for "${focusFromString}"`
            ]
        })
    }
    return mapped
}

function normalizeInterviewReport(raw, jobDescription) {
    const base = raw && typeof raw === "object" ? raw : {}
    const derivedTitle = toText(base.title) || toText(jobDescription).split("\n")[0].slice(0, 80) || "Interview Report"

    return {
        matchScore: parseNumber(base.matchScore, 65),
        technicalQuestions: ensureTechnicalQuestions(base.technicalQuestions),
        behavioralQuestions: ensureBehavioralQuestions(base.behavioralQuestions),
        skillGaps: ensureSkillGaps(base.skillGaps),
        preparationPlan: ensurePreparationPlan(base.preparationPlan),
        title: derivedTitle
    }
}

const interviewReportSchema = z.object({
    matchScore: z.number().min(0).max(100).describe("A score between 0 and 100 indicating how well the candidate's profile matches the job description"),
    technicalQuestions: z.array(z.object({
        question: z.string().min(5).describe("The technical question can be asked in the interview"),
        intention: z.string().min(5).describe("The intention of interviewer behind asking this question"),
        answer: z.string().min(20).describe("How to answer this question, what points to cover, what approach to take etc.")
    })).length(5).describe("Exactly 5 technical questions that can be asked in the interview along with their intention and how to answer them"),
    behavioralQuestions: z.array(z.object({
        question: z.string().min(5).describe("The behavioral question that can be asked in the interview"),
        intention: z.string().min(5).describe("The intention of interviewer behind asking this question"),
        answer: z.string().min(20).describe("How to answer this question, what points to cover, what approach to take etc.")
    })).length(5).describe("Exactly 5 behavioral questions that can be asked in the interview along with their intention and how to answer them"),
    skillGaps: z.array(z.object({
        skill: z.string().min(2).describe("The skill which the candidate is lacking"),
        severity: z.enum([ "low", "medium", "high" ]).describe("The severity of this skill gap, i.e. how important is this skill for the job and how much it can impact the candidate's chances")
    })).min(3).describe("At least 3 skill gaps in the candidate's profile along with their severity"),
    preparationPlan: z.array(z.object({
        day: z.number().int().min(1).describe("The day number in the preparation plan, starting from 1"),
        focus: z.string().min(3).describe("The main focus of this day in the preparation plan, e.g. data structures, system design, mock interviews etc."),
        tasks: z.array(z.string().min(3)).min(2).describe("List of tasks to be done on this day to follow the preparation plan, e.g. read a specific book or article, solve a set of problems, watch a video etc.")
    })).length(7).describe("A day-wise preparation plan for the candidate to follow in order to prepare for the interview effectively"),
    title: z.string().min(2).describe("The title of the job for which the interview report is generated"),
}).superRefine((data, ctx) => {
    const days = data.preparationPlan.map((item) => item.day)
    const uniqueDays = new Set(days)
    const hasAllDays = [1, 2, 3, 4, 5, 6, 7].every((day) => uniqueDays.has(day))

    if (uniqueDays.size !== 7 || !hasAllDays) {
        ctx.addIssue({
            code: "custom",
            path: ["preparationPlan"],
            message: "Preparation plan must contain exactly one entry for each day from 1 to 7"
        })
    }
})

class ReportValidationError extends Error {
    constructor(message, issues = []) {
        super(message)
        this.name = "ReportValidationError"
        this.status = 422
        this.issues = issues
    }
}


async function generateInterviewReport({ resume, selfDescription, jobDescription }) {


    const prompt = `Generate a strict JSON interview report for the candidate using the provided schema.
Rules you must follow:
1) Return valid JSON only, with all required fields populated.
2) matchScore must be a number between 0 and 100.
3) Provide exactly 5 technicalQuestions and exactly 5 behavioralQuestions.
4) Provide at least 3 skillGaps.
5) Provide a 7-day preparationPlan with day values 1 through 7, and each day must include at least 2 tasks.
6) Keep answers specific to the resume and job description.
7) Do not return empty arrays or placeholder text.

Resume:
${resume}

Self Description:
${selfDescription}

Job Description:
${jobDescription}
`

    let lastError

    for (const model of REPORT_MODELS) {
        for (let attempt = 1; attempt <= MAX_RETRIES_PER_MODEL; attempt++) {
            try {
                const response = await ai.models.generateContent({
                    model,
                    contents: prompt,
                    config: {
                        responseMimeType: "application/json",
                        responseSchema: zodToJsonSchema(interviewReportSchema),
                    }
                })

                const parsedText = JSON.parse(response.text)
                const normalizedReport = normalizeInterviewReport(parsedText, jobDescription)
                const validated = interviewReportSchema.safeParse(normalizedReport)

                if (!validated.success) {
                    throw new ReportValidationError("AI returned incomplete interview report", validated.error.issues)
                }

                return validated.data
            } catch (error) {
                lastError = error
                if (error instanceof ReportValidationError) {
                    throw error
                }
                const canRetry = isRetryableError(error)
                const hasMoreAttempts = attempt < MAX_RETRIES_PER_MODEL

                if (!canRetry || !hasMoreAttempts) {
                    break
                }

                const delayMs = BASE_RETRY_DELAY_MS * Math.pow(2, attempt - 1)
                await sleep(delayMs)
            }
        }
    }

    const statusText = lastError?.status ? ` (status ${lastError.status})` : ""
    throw new Error(`Unable to generate interview report after retries and model fallback${statusText}`)

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

    const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: zodToJsonSchema(resumePdfSchema),
        }
    })


    const jsonContent = JSON.parse(response.text)

    const pdfBuffer = await generatePdfFromHtml(jsonContent.html)

    return pdfBuffer

}

module.exports = {generateInterviewReport,  generateResumePdf }
