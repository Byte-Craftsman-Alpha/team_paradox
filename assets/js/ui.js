import { getAllRoles, getMembersData, getTeamData } from "./data.js";
import { capitalizeFirst, getRoleClass } from "./utils.js";

export function renderTeamInfo() {
    const team = getTeamData().team;
    document.getElementById("nav-team-name").textContent = team.shortName || team.name;
    document.getElementById("hero-team-name").textContent = team.name;
    document.getElementById("hero-campus").textContent = `${team.campus} • ${team.university}`;
    document.getElementById("hero-tagline").innerHTML = `${team.tagline}<span class="typing-cursor"></span>`;
    document.getElementById("hero-description").textContent = team.description;
    document.getElementById("footer-team-name").textContent = team.name;
    document.title = `${team.name} | ${team.campus}`;
}

export function renderStats() {
    const container = document.getElementById("stats-container");
    const members = getMembersData();
    const stats = [
        { label: "Team Members", value: String(members.length), icon: "fa-users" },
        {
            label: "Commits",
            value: String(members.reduce((sum, member) => sum + (member.githubStats?.commits || member.contributions || 0), 0)),
            icon: "fa-code-branch"
        },
        {
            label: "Projects (Repos)",
            value: String(members.reduce((sum, member) => sum + (member.githubStats?.repos || (member.projects || []).length), 0)),
            icon: "fa-folder-open"
        },
        {
            label: "Languages",
            value: String(
                new Set(
                    members.flatMap((member) =>
                        Array.isArray(member.githubStats?.languages) && member.githubStats.languages.length > 0
                            ? member.githubStats.languages
                            : member.skills || []
                    )
                ).size
            ),
            icon: "fa-code"
        }
    ];

    container.innerHTML = stats
        .map(
            (stat) => `
                <div class="stat-card">
                    <i class="fas ${stat.icon} text-2xl text-indigo-400 mb-3"></i>
                    <div class="text-3xl font-bold mb-1">${stat.value}</div>
                    <div class="text-sm text-gray-500">${stat.label}</div>
                </div>
            `
        )
        .join("");
}

export function renderAbout() {
    const team = getTeamData().team;

    document.getElementById("about-title").textContent = "Our Mission";
    document.getElementById("about-description").textContent = team.mission || team.description;

    const highlightsContainer = document.getElementById("about-highlights");
    highlightsContainer.innerHTML = team.highlights
        .map(
            (highlight) => `
                <div class="flex items-start gap-4 p-4 rounded-xl bg-white/[0.02] border border-white/5 hover:border-indigo-500/20 transition-all">
                    <div class="w-10 h-10 rounded-lg bg-indigo-500/10 flex items-center justify-center flex-shrink-0">
                        <i class="fas ${highlight.icon} text-indigo-400"></i>
                    </div>
                    <div>
                        <h4 class="font-semibold mb-1">${highlight.title}</h4>
                        <p class="text-sm text-gray-500">${highlight.desc}</p>
                    </div>
                </div>
            `
        )
        .join("");

    const techGrid = document.getElementById("about-tech-grid");
    techGrid.innerHTML = team.techStack
        .map(
            (tech) => `
                <div class="flex items-center gap-3 p-4 rounded-xl bg-white/[0.02] border border-white/5 hover:border-white/10 transition-all hover:-translate-y-1">
                    <i class="${tech.icon} text-2xl" style="color: ${tech.color}"></i>
                    <span class="font-medium text-sm">${tech.name}</span>
                </div>
            `
        )
        .join("");
}

export function renderAchievements() {
    const container = document.getElementById("achievements-timeline");
    container.innerHTML = getTeamData().team.achievements
        .map(
            (achievement) => `
                <div class="timeline-item">
                    <span class="text-xs text-indigo-400 font-mono">${achievement.date}</span>
                    <h4 class="font-semibold mt-1 mb-1">${achievement.title}</h4>
                    <p class="text-sm text-gray-500">${achievement.desc}</p>
                </div>
            `
        )
        .join("");
}

export function renderTeamSocials() {
    const socials = getTeamData().team.socials;
    const container = document.getElementById("team-socials");
    const socialMap = [
        { key: "github", icon: "fa-brands fa-github", label: "GitHub" },
        { key: "linkedin", icon: "fa-brands fa-linkedin", label: "LinkedIn" },
        { key: "twitter", icon: "fa-brands fa-x-twitter", label: "Twitter" },
        { key: "discord", icon: "fa-brands fa-discord", label: "Discord" },
        { key: "email", icon: "fas fa-envelope", label: "Email" }
    ];

    container.innerHTML = socialMap
        .filter((social) => socials[social.key])
        .map((social) => {
            const href = social.key === "email" ? `mailto:${socials[social.key]}` : socials[social.key];
            return `
                <a href="${href}" target="_blank" rel="noopener"
                   class="flex items-center gap-3 px-5 py-3 rounded-xl bg-white/[0.03] border border-white/5 hover:border-indigo-500/30 hover:bg-indigo-500/5 transition-all hover:-translate-y-1">
                    <i class="${social.icon} text-lg text-indigo-400"></i>
                    <span class="text-sm font-medium">${social.label}</span>
                </a>
            `;
        })
        .join("");
}

export function renderMembers() {
    const tabs = document.getElementById("filter-tabs");

    const roles = getAllRoles();
    tabs.innerHTML = roles
        .map(
            (role) => `
                <button class="tab-btn ${role === "all" ? "active" : ""}" onclick="filterMembers('${role}', this)">
                    ${role === "all" ? "All" : capitalizeFirst(role)}
                </button>
            `
        )
        .join("");

    renderMemberCards(getMembersData());
}

export function renderMemberCards(members) {
    const grid = document.getElementById("members-grid");

    if (members.length === 0) {
        grid.innerHTML = '<p class="col-span-full text-center text-gray-500 py-12">No team members found.</p>';
        return;
    }

    grid.innerHTML = members
        .map((member, index) => {
            const roleClass = getRoleClass(member.role);
            const topSkills = (member.skills || []).slice(0, 3);
            const avatar =
                member.avatar ||
                `https://ui-avatars.com/api/?name=${encodeURIComponent(member.name)}&background=6366f1&color=fff&size=200`;

            return `
                <div class="member-card p-6 cursor-pointer animate-fade-in-up" style="animation-delay: ${index * 0.1}s" onclick="openMemberModal(${index})">
                    <div class="flex flex-col items-center text-center">
                        <div class="avatar-ring mb-4">
                            <img src="${avatar}" alt="${member.name}" class="w-20 h-20 object-cover" onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(member.name)}&background=6366f1&color=fff&size=200'">
                        </div>

                        <h3 class="font-bold text-lg mb-1">${member.name}</h3>
                        <span class="inline-block px-3 py-1 rounded-full text-xs font-medium border ${roleClass} mb-3">${member.role}</span>

                        <p class="text-sm text-gray-500 mb-4 line-clamp-2" style="display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">${member.shortBio || member.bio}</p>

                        <div class="flex flex-wrap gap-1.5 justify-center mb-4">
                            ${topSkills.map((skill) => `<span class="skill-badge">${typeof skill === "string" ? skill : skill.name || skill}</span>`).join("")}
                            ${member.skills && member.skills.length > 3 ? `<span class="skill-badge">+${member.skills.length - 3}</span>` : ""}
                        </div>

                        <div class="flex gap-2 mt-auto">
                            ${member.socials?.github ? `<a href="${member.socials.github}" target="_blank" rel="noopener" class="social-icon github" onclick="event.stopPropagation()"><i class="fa-brands fa-github"></i></a>` : ""}
                            ${member.socials?.linkedin ? `<a href="${member.socials.linkedin}" target="_blank" rel="noopener" class="social-icon linkedin" onclick="event.stopPropagation()"><i class="fa-brands fa-linkedin-in"></i></a>` : ""}
                            ${member.socials?.twitter ? `<a href="${member.socials.twitter}" target="_blank" rel="noopener" class="social-icon twitter" onclick="event.stopPropagation()"><i class="fa-brands fa-x-twitter"></i></a>` : ""}
                            ${member.socials?.portfolio ? `<a href="${member.socials.portfolio}" target="_blank" rel="noopener" class="social-icon portfolio" onclick="event.stopPropagation()"><i class="fas fa-globe"></i></a>` : ""}
                        </div>
                    </div>
                </div>
            `;
        })
        .join("");
}

export function filterMembers(role, btn) {
    document.querySelectorAll(".tab-btn").forEach((tab) => tab.classList.remove("active"));
    btn.classList.add("active");

    const members = getMembersData();
    const filtered = role === "all" ? members : members.filter((member) => member.role.toLowerCase() === role);

    renderMemberCards(filtered);
}

export function openMemberModal(index) {
    const members = getMembersData();
    const member = members[index];
    const modal = document.getElementById("member-modal");
    const body = document.getElementById("modal-body");
    const avatar =
        member.avatar ||
        `https://ui-avatars.com/api/?name=${encodeURIComponent(member.name)}&background=6366f1&color=fff&size=200`;
    const roleClass = getRoleClass(member.role);

    body.innerHTML = `
        <div class="relative">
            <div class="h-32 bg-gradient-to-r from-indigo-600/30 via-purple-600/20 to-cyan-600/30 rounded-t-[20px]"></div>

            <button onclick="closeModal()" class="absolute top-4 right-4 w-8 h-8 rounded-full bg-black/50 hover:bg-black/80 flex items-center justify-center transition-colors text-gray-300 hover:text-white">
                <i class="fas fa-times"></i>
            </button>

            <div class="absolute -bottom-12 left-8">
                <div class="avatar-ring">
                    <img src="${avatar}" alt="${member.name}" class="w-24 h-24 object-cover" onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(member.name)}&background=6366f1&color=fff&size=200'">
                </div>
            </div>
        </div>

        <div class="pt-16 px-8 pb-8">
            <div class="flex flex-col sm:flex-row sm:items-center gap-2 mb-2">
                <h2 class="text-2xl font-bold">${member.name}</h2>
                <span class="inline-block px-3 py-1 rounded-full text-xs font-medium border ${roleClass} self-start">${member.role}</span>
            </div>

            ${member.username ? `<p class="text-sm text-gray-500 font-mono mb-1">@${member.username}</p>` : ""}
            ${member.location ? `<p class="text-sm text-gray-500 mb-4"><i class="fas fa-map-marker-alt mr-1 text-indigo-400"></i> ${member.location}</p>` : '<div class="mb-4"></div>'}

            <p class="text-gray-400 leading-relaxed mb-6">${member.bio}</p>

            <div class="flex flex-wrap gap-2 mb-8">
                ${member.socials?.github ? `<a href="${member.socials.github}" target="_blank" rel="noopener" class="social-icon github"><i class="fa-brands fa-github"></i></a>` : ""}
                ${member.socials?.linkedin ? `<a href="${member.socials.linkedin}" target="_blank" rel="noopener" class="social-icon linkedin"><i class="fa-brands fa-linkedin-in"></i></a>` : ""}
                ${member.socials?.twitter ? `<a href="${member.socials.twitter}" target="_blank" rel="noopener" class="social-icon twitter"><i class="fa-brands fa-x-twitter"></i></a>` : ""}
                ${member.socials?.portfolio ? `<a href="${member.socials.portfolio}" target="_blank" rel="noopener" class="social-icon portfolio"><i class="fas fa-globe"></i></a>` : ""}
                ${member.socials?.email ? `<a href="mailto:${member.socials.email}" class="social-icon email"><i class="fas fa-envelope"></i></a>` : ""}
                ${member.socials?.instagram ? `<a href="${member.socials.instagram}" target="_blank" rel="noopener" class="social-icon instagram"><i class="fa-brands fa-instagram"></i></a>` : ""}
            </div>

            <div class="flex gap-2 border-b border-white/5 pb-2 mb-6 overflow-x-auto">
                <button class="tab-btn active" onclick="switchModalTab('skills', this, ${index})">Skills</button>
                <button class="tab-btn" onclick="switchModalTab('projects', this, ${index})">Projects</button>
                ${member.experience && member.experience.length > 0 ? `<button class="tab-btn" onclick="switchModalTab('experience', this, ${index})">Experience</button>` : ""}
                <button class="tab-btn" onclick="switchModalTab('stats', this, ${index})">Stats</button>
            </div>

            <div id="modal-tab-content">
                ${renderSkillsTab(member)}
            </div>
        </div>
    `;

    modal.classList.add("active");
    document.body.style.overflow = "hidden";
}

export function switchModalTab(tab, btn, index) {
    const member = getMembersData()[index];
    const contentEl = document.getElementById("modal-tab-content");

    btn.parentElement.querySelectorAll(".tab-btn").forEach((button) => button.classList.remove("active"));
    btn.classList.add("active");

    switch (tab) {
        case "skills":
            contentEl.innerHTML = renderSkillsTab(member);
            break;
        case "projects":
            contentEl.innerHTML = renderProjectsTab(member);
            break;
        case "experience":
            contentEl.innerHTML = renderExperienceTab(member);
            break;
        case "stats":
            contentEl.innerHTML = renderStatsTab(member);
            break;
        default:
            contentEl.innerHTML = renderSkillsTab(member);
    }
}

function renderSkillsTab(member) {
    const skills = member.skills || [];
    return `
        <div class="flex flex-wrap gap-2">
            ${skills
                .map((skill) => {
                    const name = typeof skill === "string" ? skill : skill.name || skill;
                    return `<span class="skill-badge text-sm px-4 py-2">${name}</span>`;
                })
                .join("")}
        </div>
        ${skills.length === 0 ? '<p class="text-gray-500 text-sm">No skills listed yet.</p>' : ""}
    `;
}

function renderProjectsTab(member) {
    const projects = member.projects || [];
    if (projects.length === 0) return '<p class="text-gray-500 text-sm">No projects listed yet.</p>';

    return `
        <div class="grid sm:grid-cols-2 gap-4">
            ${projects
                .map(
                    (project) => `
                        <div class="project-card">
                            <div class="flex items-start justify-between mb-2">
                                <h4 class="font-semibold text-sm">${project.name || project.title || "Untitled"}</h4>
                                ${project.url ? `<a href="${project.url}" target="_blank" rel="noopener" class="text-indigo-400 hover:text-indigo-300 text-xs"><i class="fas fa-external-link-alt"></i></a>` : ""}
                            </div>
                            <p class="text-xs text-gray-500 mb-3">${project.description || project.desc || ""}</p>
                            <div class="flex flex-wrap gap-1">
                                ${(project.tech || project.technologies || [])
                                    .map((tech) => `<span class="text-[10px] px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">${tech}</span>`)
                                    .join("")}
                            </div>
                        </div>
                    `
                )
                .join("")}
        </div>
    `;
}

function renderExperienceTab(member) {
    const experience = member.experience || [];
    if (experience.length === 0) return '<p class="text-gray-500 text-sm">No experience listed yet.</p>';

    return `
        <div class="space-y-0">
            ${experience
                .map(
                    (entry) => `
                        <div class="timeline-item">
                            <span class="text-xs text-indigo-400 font-mono">${entry.period || entry.date || ""}</span>
                            <h4 class="font-semibold text-sm mt-1">${entry.title || entry.role || ""}</h4>
                            <p class="text-xs text-gray-500">${entry.company || entry.organization || ""}</p>
                            ${entry.description ? `<p class="text-xs text-gray-600 mt-1">${entry.description}</p>` : ""}
                        </div>
                    `
                )
                .join("")}
        </div>
    `;
}

function renderStatsTab(member) {
    const members = getMembersData();
    const maxContrib = Math.max(...members.map((entry) => entry.contributions || 0));
    const contribPercent = maxContrib > 0 ? Math.round(((member.contributions || 0) / maxContrib) * 100) : 50;
    const github = member.githubStats || {};
    const joined = github.joinedAt ? new Date(github.joinedAt).toISOString().slice(0, 10) : member.joinedYear || "N/A";
    const commitsValue = github.commits ?? member.contributions ?? 0;
    const reposValue = github.repos ?? (member.projects || []).length;
    const skillsValue = Array.isArray(github.languages) && github.languages.length > 0 ? github.languages : member.skills || [];

    return `
        <div class="grid grid-cols-2 gap-4 mb-6">
            <div class="stat-card">
                <i class="fas fa-code-commit text-indigo-400 text-xl mb-2"></i>
                <div class="text-2xl font-bold">${commitsValue}</div>
                <div class="text-xs text-gray-500">Contributions (Commits)</div>
            </div>
            <div class="stat-card">
                <i class="fas fa-folder-open text-cyan-400 text-xl mb-2"></i>
                <div class="text-2xl font-bold">${reposValue}</div>
                <div class="text-xs text-gray-500">Projects (Repos)</div>
            </div>
            <div class="stat-card">
                <i class="fas fa-calendar text-purple-400 text-xl mb-2"></i>
                <div class="text-sm font-bold break-all">${joined}</div>
                <div class="text-xs text-gray-500">Joined Date</div>
            </div>
            <div class="stat-card">
                <i class="fas fa-code text-green-400 text-xl mb-2"></i>
                <div class="text-2xl font-bold">${skillsValue.length}</div>
                <div class="text-xs text-gray-500">Skills (Languages)</div>
            </div>
        </div>

        <div class="flex flex-wrap gap-2 mb-6">
            ${skillsValue.map((lang) => `<span class="skill-badge">${lang}</span>`).join("")}
        </div>

        <div>
            <div class="flex justify-between text-sm mb-2">
                <span class="text-gray-400">Commit Activity Level</span>
                <span class="text-indigo-400 font-mono">${contribPercent}%</span>
            </div>
            <div class="contrib-bar">
                <div class="contrib-fill" style="width: ${contribPercent}%"></div>
            </div>
        </div>
    `;
}

export function closeModal() {
    const modal = document.getElementById("member-modal");
    modal.classList.remove("active");
    document.body.style.overflow = "";
}

export function closeModalOutside(event) {
    if (event.target === event.currentTarget) {
        closeModal();
    }
}

export function initModalHotkeys() {
    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape") {
            closeModal();
        }
    });
}

export function toggleMobileMenu() {
    document.getElementById("mobile-menu").classList.toggle("active");
}

