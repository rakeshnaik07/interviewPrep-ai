import { createInterviewReport, getInterviewReports, getInterviewReportById, getInterviewResumePdf } from "../services/interview.api"
import { useContext, useEffect } from "react"
import { InterviewContext } from "../interview.context"
import { useParams } from "react-router"


export const useInterview = () => {

    const context = useContext(InterviewContext)
    const { interviewId } = useParams()

    if (!context) {
        throw new Error("useInterview must be used within an InterviewProvider")
    }

    const { loading, setLoading, pdfLoading, setPdfLoading, report, setReport, reports, setReports } = context

    const generateReport = async ({ jobDescription, selfDescription, resumeFile }) => {
        setLoading(true)
        let response = null
        try {
            response = await createInterviewReport({ jobDescription, selfDescription, resumeFile })
            setReport(response?.interviewReport || response)
        } catch (error) {
            console.log(error)
        } finally {
            setLoading(false)
        }

        return response?.interviewReport || response
    }

    const getReportById = async (interviewId) => {
        setLoading(true)
        let response = null
        try {
            response = await getInterviewReportById(interviewId)
            setReport(response?.interviewReport || response)
        } catch (error) {
            console.log(error)
        } finally {
            setLoading(false)
        }
        return response?.interviewReport || response
    }

    const getReports = async () => {
        setLoading(true)
        let response = null
        try {
            response = await getInterviewReports()
            setReports(response?.interviewReports || response || [])
        } catch (error) {
            console.log(error)
        } finally {
            setLoading(false)
        }

        return response?.interviewReports || response || []
    }

    const getResumePdf = async (interviewReportId) => {
        setPdfLoading(true)
        let response = null
        try {
            response = await getInterviewResumePdf(interviewReportId)
            if (response.status >= 400) {
                const errorText = await response.data.text()
                let message = "Failed to generate resume PDF."
                try {
                    const parsed = JSON.parse(errorText)
                    message = parsed?.message || message
                } catch (_) {
                    message = errorText || message
                }
                throw new Error(message)
            }
            const url = window.URL.createObjectURL(new Blob([response.data], { type: "application/pdf" }))
            const link = document.createElement("a")
            link.href = url
            link.setAttribute("download", `resume_${interviewReportId}.pdf`)
            document.body.appendChild(link)
            link.click()
            window.URL.revokeObjectURL(url)
        }
        catch (error) {
            console.log(error)
            alert(error?.message || "Failed to generate resume PDF.")
        } finally {
            setPdfLoading(false)
        }
    }

    useEffect(() => {
        if (interviewId) {
            getReportById(interviewId)
        } else {
            getReports()
        }
    }, [ interviewId ])

    return { loading, pdfLoading, report, reports, generateReport, getReportById, getReports, getResumePdf }

}
