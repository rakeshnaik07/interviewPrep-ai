import axios from "axios";

const API = axios.create({
    baseURL: "http://localhost:3000/api/interview",
    withCredentials: true
});

export async function createInterviewReport({ jobDescription, selfDescription, resumeFile }) {
    const formData = new FormData();
    formData.append("jobDescription", jobDescription || "");
    formData.append("selfDescription", selfDescription || "");
    if (resumeFile) {
        formData.append("resume", resumeFile);
    }

    const response = await API.post("/", formData, {
        headers: {
            "Content-Type": "multipart/form-data"
        }
    });
    return response.data;
}

export async function getInterviewReports() {
    const response = await API.get("/");
    return response.data;
}

export async function getInterviewReportById(interviewId) {
    const response = await API.get(`/report/${interviewId}`);
    return response.data;
}

export async function getInterviewResumePdf(interviewReportId) {
    const response = await API.post(`/resume/pdf/${interviewReportId}`, null, {
        responseType: "blob",
        validateStatus: (status) => status < 500
    });
    return response;
}
