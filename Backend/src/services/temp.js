const resume = {
  name: "Rakesh Naik",
  education: "B.Tech in Computer Science (AI & ML), 3rd Year",
  skills: [
    "Java",
    "Data Structures and Algorithms",
    "JavaScript",
    "React.js",
    "Node.js",
    "MongoDB"
  ],
  projects: [
    {
      title: "AI Plant Disease Detection",
      description: "Built a deep learning model to detect plant diseases using image classification."
    },
    {
      title: "Authentication System",
      description: "Developed a JWT-based authentication system with token blacklisting."
    }
  ],
  experience: "Fresher"
};

const selfDescription = {
  summary: `
    I am a motivated Computer Science student specializing in AI and ML.
    I enjoy solving DSA problems using Java and building full-stack applications.
    I am eager to learn new technologies and contribute to real-world projects.
  `
};


const jobDescription = {
  title: "Junior Full Stack Developer",
  company: "Tech Solutions Pvt Ltd",
  requiredSkills: [
    "JavaScript",
    "React.js",
    "Node.js",
    "MongoDB",
    "REST APIs",
    "Basic DSA knowledge"
  ],
  responsibilities: [
    "Develop scalable web applications",
    "Design and implement REST APIs",
    "Collaborate with frontend and backend teams",
    "Write clean and maintainable code"
  ]
};


module.exports = {
    resume, selfDescription, jobDescription
}