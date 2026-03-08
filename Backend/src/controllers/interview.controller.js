const { PDFParse } = require("pdf-parse")
const interviewReportModel = require("../models/interviewReport.model")
const {generateInterviewReport, generateResumePdf} = require("../services/ai.service")

function normalizeText(value) {
    if (value === undefined || value === null) {
        return ""
    }

    if (typeof value === "string") {
        return value.trim()
    }

    try {
        return JSON.stringify(value)
    } catch (_) {
        return String(value).trim()
    }
}

async function extractResumeText(req) {
    const resumeFile = req.file || req.resumeFile

    if (!resumeFile) {
        return ""
    }

    if (!resumeFile.buffer) {
        throw new Error("Resume file buffer is missing")
    }

    const parser = new PDFParse({ data: resumeFile.buffer })

    try {
        const parsed = await parser.getText()
        return normalizeText(parsed?.text)
    } finally {
        await parser.destroy()
    }
}

/**
 * @name generateInterViewReportController
 * @description generate interview report from resume, self description and job description
 * @access private
 */
async function generateInterViewReportController(req, res) {
    try {
        const selfDescription = normalizeText(req.body?.selfDescription)
        const jobDescription = normalizeText(req.body?.jobDescription)

        if (!jobDescription) {
            return res.status(400).json({
                message: "Job description is required"
            })
        }

        const resume = await extractResumeText(req)

        const aiReport = await generateInterviewReport({
            resume,
            selfDescription,
            jobDescription
        })

        const interviewReport = await interviewReportModel.create({
            jobDescription,
            resume,
            selfDescription,
            matchScore: aiReport.matchScore,
            technicalQuestions: aiReport.technicalQuestions,
            behavioralQuestions: aiReport.behavioralQuestions,
            skillGaps: aiReport.skillGaps,
            preparationPlan: aiReport.preparationPlan,
            title: normalizeText(aiReport.title) || "Interview Report",
            user: req.user.id
        })

        return res.status(201).json({
            message: "Interview report generated successfully",
            interviewReport
        })
    } catch (error) {
        const statusCode = error?.status || 500
        return res.status(statusCode).json({
            message: "Failed to generate interview report",
            error: error.message,
            ...(Array.isArray(error?.issues) ? { issues: error.issues } : {})
        })
    }
}

/**
 * @name getInterviewReportByIdController
 * @description get interview report by id for current user
 * @access private
 */
async function getInterviewReportByIdController(req, res) {
    try {
        const { interviewId } = req.params

        const interviewReport = await interviewReportModel.findOne({
            _id: interviewId,
            user: req.user.id
        })

        if (!interviewReport) {
            return res.status(404).json({
                message: "Interview report not found"
            })
        }

        return res.status(200).json({
            message: "Interview report fetched successfully",
            interviewReport
        })
    } catch (error) {
        return res.status(500).json({
            message: "Failed to fetch interview report",
            error: error.message
        })
    }
}

/**
 * @name getAllInterviewReportsController
 * @description get all interview reports for current user
 * @access private
 */
async function getAllInterviewReportsController(req, res) {
    try {
        const interviewReports = await interviewReportModel.find({ user: req.user.id }).sort({ createdAt: -1 })

        return res.status(200).json({
            message: "Interview reports fetched successfully",
            interviewReports
        })
    } catch (error) {
        return res.status(500).json({
            message: "Failed to fetch interview reports",
            error: error.message
        })
    }
}

/**
 * @name generateResumePdfController
 * @description placeholder endpoint for future resume PDF generation
 * @access private
 */
async function generateResumePdfController(req, res) {
    try {
        const reportId = req.params.interviewReportId || req.params.interviewId

        if (!reportId) {
            return res.status(400).json({
                message: "Interview report id is required."
            })
        }

        const interviewReport = await interviewReportModel.findOne({
            _id: reportId,
            user: req.user.id
        })

        if (!interviewReport) {
            return res.status(404).json({
                message: "Interview report not found."
            })
        }

        const { resume, jobDescription, selfDescription } = interviewReport
        const pdfBuffer = await generateResumePdf({ resume, jobDescription, selfDescription })

        res.set({
            "Content-Type": "application/pdf",
            "Content-Disposition": `attachment; filename=resume_${reportId}.pdf`
        })

        return res.send(pdfBuffer)
    } catch (error) {
        return res.status(500).json({
            message: "Failed to generate resume PDF.",
            error: error.message
        })
    }
}


module.exports = {
    generateInterViewReportController,
    generateInterviewReportController: generateInterViewReportController,
    getInterviewReportByIdController,
    getAllInterviewReportsController,
    generateResumePdfController
}
