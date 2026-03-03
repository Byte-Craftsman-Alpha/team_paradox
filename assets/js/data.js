import { DEFAULT_TEAM_CONFIG, TEAM_DATA_URL } from "./config.js";

let teamData = null;
let membersData = [];
let allRoles = new Set(["all"]);
let loadDiagnostics = {
    teamSourceOk: false,
    memberProfilesFetched: 0,
    githubEnriched: 0
};

export function getTeamData() {
    return teamData;
}

export function getMembersData() {
    return membersData;
}

export function getAllRoles() {
    return [...allRoles];
}

export function getLoadDiagnostics() {
    return { ...loadDiagnostics };
}

export async function initializeData() {
    teamData = await loadTeamData();
    await loadAllMembers();
}

async function loadTeamData() {
    try {
        const response = await fetch(TEAM_DATA_URL, { cache: "no-store" });
        if (response.ok) {
            const data = await response.json();
            loadDiagnostics.teamSourceOk = true;
            return mergeTeamData(data);
        }
    } catch (err) {
        console.log("Using default team config:", err);
    }
    return DEFAULT_TEAM_CONFIG;
}

function mergeTeamData(fetchedData) {
    const config = JSON.parse(JSON.stringify(DEFAULT_TEAM_CONFIG));

    if (fetchedData.team) {
        Object.assign(config.team, fetchedData.team);
    }
    if (fetchedData.members) {
        config.members = fetchedData.members;
    }

    if (fetchedData.name && !fetchedData.team) {
        config.members = [fetchedData];
    }

    return config;
}

async function loadAllMembers() {
    loadDiagnostics.memberProfilesFetched = 0;
    loadDiagnostics.githubEnriched = 0;
    const membersFromConfig = Array.isArray(teamData?.members) ? teamData.members : [];
    const fetchPromises = membersFromConfig.map((member) => fetchMemberProfile(member));
    const fetchedMembers = (await Promise.all(fetchPromises)).filter(Boolean);
    loadDiagnostics.memberProfilesFetched = fetchedMembers.length;

    membersData = dedupeMembers(fetchedMembers);

    if (membersData.length === 0) {
        membersData = getSampleMembers();
    }

    membersData = membersData.map(normalizeMemberData);
    membersData = await Promise.all(membersData.map((member) => enrichWithGitHubStats(member)));
    loadDiagnostics.githubEnriched = membersData.filter((member) => member.githubStats?.source === "github").length;

    allRoles = new Set(["all"]);
    membersData.forEach((m) => {
        if (m.role) {
            allRoles.add(m.role.toLowerCase());
        }
    });
}

async function fetchMemberProfile(memberSeed) {
    const profileUrl = memberSeed.aboutme || memberSeed.aboutMe || memberSeed.jsonUrl || memberSeed.profileUrl || "";
    if (!profileUrl) {
        return memberSeed;
    }

    try {
        const response = await fetch(profileUrl, { cache: "no-store" });
        if (!response.ok) {
            console.warn(`Profile fetch failed (${response.status}) for ${profileUrl}`);
            return memberSeed;
        }
        const remoteData = await response.json();
        const extracted = extractProfilePayload(remoteData);
        if (!extracted || typeof extracted !== "object") {
            console.warn(`Profile payload not usable for ${profileUrl}`);
            return memberSeed;
        }
        return mergeMemberSeed(memberSeed, extracted);
    } catch (err) {
        console.log(`Failed to fetch member profile from ${profileUrl}:`, err);
        return memberSeed;
    }
}

function extractProfilePayload(payload) {
    if (!payload) return null;
    if (Array.isArray(payload)) {
        return payload[0] || null;
    }

    const candidates = [payload, payload.data, payload.profile, payload.member, payload.result];
    for (const candidate of candidates) {
        if (candidate && typeof candidate === "object" && (candidate.name || candidate.bio || candidate.skills || candidate.projects || candidate.social_accounts || candidate.socials)) {
            return candidate;
        }
    }

    if (payload.data && Array.isArray(payload.data)) {
        return payload.data[0] || null;
    }

    return payload;
}

function mergeMemberSeed(seed = {}, remote = {}) {
    const remoteSocials = remote.socials || remote.social_accounts || {};
    const mergedSocials = {
        ...(seed.socials || {}),
        ...remoteSocials
    };

    return {
        ...seed,
        ...remote,
        socials: mergedSocials,
        aboutme: seed.aboutme || seed.aboutMe || seed.jsonUrl || seed.profileUrl || remote.aboutme || remote.aboutMe || ""
    };
}

function dedupeMembers(members) {
    const uniqueMap = new Map();
    members.forEach((member) => {
        const key =
            (member.name || "").trim().toLowerCase() ||
            (member.username || member.github_username || "").trim().toLowerCase() ||
            (member.aboutme || member.aboutMe || member.jsonUrl || "").trim().toLowerCase() ||
            `member-${uniqueMap.size}`;

        if (!uniqueMap.has(key)) {
            uniqueMap.set(key, member);
        }
    });
    return [...uniqueMap.values()];
}

function normalizeMemberData(data) {
    const normalizeSkill = (skill) => (typeof skill === "string" ? skill : skill?.name || skill?.title || skill?.label || "");
    const sourceSkills = data.skills || data.technologies || data.tech_stack || [];
    const sourceProjects = data.projects || data.repositories || [];
    const sourceExperience = data.experience || data.work || [];
    const socialsObj = data.socials && typeof data.socials === "object" ? data.socials : {};
    const socialAccountsObj = data.social_accounts && typeof data.social_accounts === "object" ? data.social_accounts : {};
    const sourceSocials = Object.keys(socialsObj).length > 0 ? socialsObj : socialAccountsObj;

    const normalizedProjects = sourceProjects.map((project) => ({
        name: project.name || project.title || project.project_title || "Untitled",
        description: project.description || project.desc || project.project_description || "",
        tech: Array.isArray(project.tech || project.technologies || project.core_technology)
            ? (project.tech || project.technologies || project.core_technology)
            : (project.tech || project.technologies || project.core_technology ? [project.tech || project.technologies || project.core_technology] : []),
        url: project.url || project.project_link || project.repository || ""
    }));

    const normalizedExperience = sourceExperience.map((entry) => ({
        title: entry.title || entry.role || entry.post || "",
        company: entry.company || entry.organization || entry.company_name || "",
        period: entry.period || entry.date || entry.duration || "",
        description: entry.description || entry.details || ""
    }));

    return {
        name: data.name || data.username || "Unknown",
        username: data.username || data.github_username || "",
        avatar:
            data.avatar ||
            data.avatar_url ||
            data.profile_photo ||
            data.image ||
            `https://ui-avatars.com/api/?name=${encodeURIComponent(data.name || "U")}&background=6366f1&color=fff&size=200`,
        role: data.role || data.designation || data.current_profession || "Developer",
        bio: data.bio || data.about || data.description || "",
        shortBio: data.shortBio || data.tagline || "",
        location: data.location || data.city || data.address?.city || "",
        skills: Array.isArray(sourceSkills) ? sourceSkills.map(normalizeSkill).filter(Boolean) : [],
        projects: normalizedProjects,
        experience: normalizedExperience,
        education: data.education || [],
        socials: {
            github: sourceSocials.github || data.github || data.github_url || "",
            linkedin: sourceSocials.linkedin || data.linkedin || data.linkedin_url || "",
            twitter: sourceSocials.twitter || data.twitter || data.twitter_url || "",
            portfolio: sourceSocials.portfolio || data.website || data.portfolio || data.portfolio_url || data.resume_link || "",
            email: sourceSocials.email || data.email || data.contact?.email || "",
            instagram: sourceSocials.instagram || data.instagram || ""
        },
        contributions: data.contributions || data.commits || 0,
        joinedYear: data.joinedYear || data.joined || ""
    };
}

async function enrichWithGitHubStats(member) {
    const username = extractGitHubUsername(member);
    if (!username) {
        return {
            ...member,
            githubStats: {
                source: "fallback",
                reason: "missing_username",
                commits: member.contributions || 0,
                repos: (member.projects || []).length,
                joinedAt: member.joinedYear || "",
                languages: Array.isArray(member.skills) ? member.skills : []
            }
        };
    }

    try {
        const headers = {
            Accept: "application/vnd.github+json"
        };
        const userResponse = await fetch(`https://api.github.com/users/${encodeURIComponent(username)}`, { headers });
        if (!userResponse.ok) {
            console.warn(`GitHub profile fetch failed for ${username}: ${userResponse.status}`);
            return {
                ...member,
                githubStats: {
                    source: "fallback",
                    reason: `github_profile_${userResponse.status}`,
                    commits: member.contributions || 0,
                    repos: (member.projects || []).length,
                    joinedAt: member.joinedYear || "",
                    languages: Array.isArray(member.skills) ? member.skills : []
                }
            };
        }

        const profile = await userResponse.json();
        const reposResponse = await fetch(`https://api.github.com/users/${encodeURIComponent(username)}/repos?per_page=100&type=owner&sort=updated`, { headers });
        const repos = reposResponse.ok ? await reposResponse.json() : [];
        const repoCount = Array.isArray(repos) ? repos.length : 0;
        const languages = Array.isArray(repos)
            ? [...new Set(repos.map((repo) => repo.language).filter(Boolean))]
            : [];
        const commitsResponse = await fetch(`https://api.github.com/users/${encodeURIComponent(username)}/events/public?per_page=100`, { headers });
        const commits = commitsResponse.ok ? countRecentCommits(await commitsResponse.json()) : 0;

        return {
            ...member,
            contributions: commits || member.contributions || 0,
            skills: languages.length > 0 ? languages : member.skills,
            githubStats: {
                source: "github",
                username,
                commits,
                repos: repoCount || profile.public_repos || 0,
                joinedAt: profile.created_at || "",
                languages
            }
        };
    } catch (err) {
        console.log(`Failed to fetch GitHub stats for ${username}:`, err);
        return {
            ...member,
            githubStats: {
                source: "fallback",
                reason: "github_exception",
                commits: member.contributions || 0,
                repos: (member.projects || []).length,
                joinedAt: member.joinedYear || "",
                languages: Array.isArray(member.skills) ? member.skills : []
            }
        };
    }
}

function countRecentCommits(events) {
    if (!Array.isArray(events)) return 0;
    return events.reduce((sum, event) => {
        if (event?.type === "PushEvent" && typeof event?.payload?.size === "number") {
            return sum + event.payload.size;
        }
        return sum;
    }, 0);
}

function extractGitHubUsername(member) {
    const githubUrl = member?.socials?.github || "";
    if (githubUrl) {
        try {
            const url = new URL(githubUrl);
            if (url.hostname.toLowerCase().includes("github.com")) {
                const path = url.pathname.replace(/^\/+|\/+$/g, "");
                const firstSegment = path.split("/")[0];
                if (firstSegment) return firstSegment;
            }
        } catch {
            const match = githubUrl.match(/github\.com\/([^/?#]+)/i);
            if (match?.[1]) return match[1];
        }
    }

    if (member.github_username) return member.github_username;
    if (member.username && !member.username.includes(" ")) return member.username;
    return "";
}

function getSampleMembers() {
    return [
        {
            name: "Arjun Menon",
            username: "arjun-dev",
            avatar: "",
            role: "Team Lead",
            bio: "Full-stack developer passionate about building scalable web applications and mentoring junior developers. Active open source contributor with a focus on React ecosystem.",
            shortBio: "Full-stack dev | OSS contributor",
            location: "Kottayam, Kerala",
            skills: ["React", "Node.js", "TypeScript", "PostgreSQL", "Docker", "AWS", "GraphQL"],
            projects: [
                { name: "CampusConnect", description: "A social platform for university students", tech: ["React", "Node.js", "MongoDB"], url: "#" },
                { name: "CodeReview Bot", description: "AI-powered code review automation", tech: ["Python", "OpenAI", "GitHub API"], url: "#" },
                { name: "SmartAttendance", description: "Face recognition based attendance system", tech: ["Python", "OpenCV", "Flask"], url: "#" }
            ],
            experience: [
                { title: "Software Engineering Intern", company: "Google", period: "Summer 2024" },
                { title: "GSoC Contributor", company: "Mozilla", period: "2023" }
            ],
            socials: { github: "https://github.com", linkedin: "https://linkedin.com", twitter: "https://twitter.com", portfolio: "#", email: "arjun@example.com" },
            contributions: 847,
            joinedYear: "2023"
        },
        {
            name: "Priya Sharma",
            username: "priya-ml",
            avatar: "",
            role: "ML Engineer",
            bio: "Machine learning enthusiast with a knack for computer vision and NLP. Published researcher and Kaggle expert.",
            shortBio: "ML Engineer | Kaggle Expert",
            location: "Kottayam, Kerala",
            skills: ["Python", "TensorFlow", "PyTorch", "Scikit-learn", "OpenCV", "NLP", "Computer Vision"],
            projects: [
                { name: "HealthAI", description: "Medical image classification system", tech: ["PyTorch", "FastAPI", "React"], url: "#" },
                { name: "SentimentScope", description: "Real-time social media sentiment analysis", tech: ["BERT", "Flask", "D3.js"], url: "#" }
            ],
            socials: { github: "https://github.com", linkedin: "https://linkedin.com", email: "priya@example.com" },
            contributions: 523,
            joinedYear: "2023"
        },
        {
            name: "Rahul Krishna",
            username: "rahul-k",
            avatar: "",
            role: "Backend Developer",
            bio: "Backend specialist with deep expertise in distributed systems and microservices architecture.",
            shortBio: "Backend dev | System design enthusiast",
            location: "Kottayam, Kerala",
            skills: ["Go", "Rust", "PostgreSQL", "Redis", "Kubernetes", "gRPC", "Kafka"],
            projects: [
                { name: "ScaleDB", description: "Distributed key-value store", tech: ["Rust", "Raft"], url: "#" },
                { name: "APIGateway", description: "High-performance API gateway", tech: ["Go", "Redis"], url: "#" }
            ],
            socials: { github: "https://github.com", linkedin: "https://linkedin.com", twitter: "https://twitter.com" },
            contributions: 612,
            joinedYear: "2023"
        },
        {
            name: "Ananya Nair",
            username: "ananya-ui",
            avatar: "",
            role: "UI/UX Designer",
            bio: "Creative designer bridging the gap between aesthetics and functionality. Passionate about accessible design.",
            shortBio: "Designer | Accessibility advocate",
            location: "Kottayam, Kerala",
            skills: ["Figma", "Adobe XD", "Illustrator", "CSS", "Tailwind", "Framer Motion", "React"],
            projects: [
                { name: "DesignSystem Pro", description: "Comprehensive component library", tech: ["Figma", "React", "Storybook"], url: "#" },
                { name: "AccessiCheck", description: "Web accessibility testing tool", tech: ["React", "Node.js"], url: "#" }
            ],
            socials: { github: "https://github.com", linkedin: "https://linkedin.com", portfolio: "#", instagram: "https://instagram.com" },
            contributions: 345,
            joinedYear: "2024"
        },
        {
            name: "Vishnu Prasad",
            username: "vishnu-devops",
            avatar: "",
            role: "DevOps Engineer",
            bio: "Infrastructure automation expert. Making deployments boring (in a good way) with CI/CD and IaC.",
            shortBio: "DevOps | Cloud architect",
            location: "Kottayam, Kerala",
            skills: ["Docker", "Kubernetes", "Terraform", "AWS", "GitHub Actions", "Prometheus", "Grafana"],
            projects: [
                { name: "AutoDeploy", description: "Zero-downtime deployment pipeline", tech: ["GitHub Actions", "Docker", "K8s"], url: "#" },
                { name: "InfraMonitor", description: "Infrastructure monitoring dashboard", tech: ["Prometheus", "Grafana", "Go"], url: "#" }
            ],
            socials: { github: "https://github.com", linkedin: "https://linkedin.com" },
            contributions: 456,
            joinedYear: "2023"
        },
        {
            name: "Meera Raj",
            username: "meera-web",
            avatar: "",
            role: "Frontend Developer",
            bio: "Frontend enthusiast creating beautiful and performant web experiences with modern frameworks.",
            shortBio: "Frontend dev | Animation lover",
            location: "Kottayam, Kerala",
            skills: ["React", "Next.js", "Three.js", "GSAP", "TypeScript", "Tailwind CSS", "WebGL"],
            projects: [
                { name: "3D Portfolio", description: "Interactive 3D portfolio website", tech: ["Three.js", "React", "GSAP"], url: "#" },
                { name: "AnimateUI", description: "Micro-interaction animation library", tech: ["TypeScript", "CSS"], url: "#" }
            ],
            socials: { github: "https://github.com", twitter: "https://twitter.com", portfolio: "#" },
            contributions: 389,
            joinedYear: "2024"
        },
        {
            name: "Aditya Pillai",
            username: "aditya-sec",
            avatar: "",
            role: "Security Researcher",
            bio: "Cybersecurity enthusiast and CTF player. Finding bugs so others don't have to.",
            shortBio: "Security researcher | CTF player",
            location: "Kottayam, Kerala",
            skills: ["Python", "Burp Suite", "Wireshark", "Nmap", "Metasploit", "Linux", "Cryptography"],
            projects: [
                { name: "VulnScanner", description: "Automated vulnerability scanner", tech: ["Python", "Nmap"], url: "#" },
                { name: "SecureAuth", description: "OAuth2 security analysis tool", tech: ["Python", "Burp Suite"], url: "#" }
            ],
            socials: { github: "https://github.com", linkedin: "https://linkedin.com", twitter: "https://twitter.com" },
            contributions: 278,
            joinedYear: "2024"
        },
        {
            name: "Lakshmi Devi",
            username: "lakshmi-data",
            avatar: "",
            role: "Data Scientist",
            bio: "Data storyteller turning numbers into actionable insights. Passionate about data visualization and analytics.",
            shortBio: "Data scientist | Visualization expert",
            location: "Kottayam, Kerala",
            skills: ["Python", "R", "SQL", "Tableau", "Power BI", "Pandas", "Apache Spark"],
            projects: [
                { name: "DataViz Hub", description: "Interactive data visualization platform", tech: ["D3.js", "Python", "Flask"], url: "#" },
                { name: "PredictStock", description: "Stock price prediction using LSTM", tech: ["Python", "TensorFlow", "Streamlit"], url: "#" }
            ],
            socials: { github: "https://github.com", linkedin: "https://linkedin.com", email: "lakshmi@example.com" },
            contributions: 301,
            joinedYear: "2024"
        }
    ];
}


