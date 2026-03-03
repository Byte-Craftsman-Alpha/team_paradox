import { getLoadDiagnostics, getMembersData, getTeamData, initializeData } from "./data.js";
import { initActiveNavLink, initParticles, initScrollAnimations } from "./effects.js";
import {
    closeModal,
    closeModalOutside,
    filterMembers,
    initModalHotkeys,
    openMemberModal,
    renderAbout,
    renderAchievements,
    renderMembers,
    renderStats,
    renderTeamInfo,
    renderTeamSocials,
    switchModalTab,
    toggleMobileMenu
} from "./ui.js";

window.toggleMobileMenu = toggleMobileMenu;
window.filterMembers = filterMembers;
window.openMemberModal = openMemberModal;
window.switchModalTab = switchModalTab;
window.closeModal = closeModal;
window.closeModalOutside = closeModalOutside;

document.addEventListener("DOMContentLoaded", async () => {
    document.getElementById("current-year").textContent = new Date().getFullYear();

    initParticles();
    await initializeData();

    renderTeamInfo();
    renderStats();
    renderAbout();
    renderAchievements();
    renderTeamSocials();
    renderMembers();

    initScrollAnimations();
    initActiveNavLink();
    initModalHotkeys();

    window.teamParadoxDebug = {
        getTeamData,
        getMembersData,
        getLoadDiagnostics
    };

    console.log("Team Paradox diagnostics:", getLoadDiagnostics(), getMembersData().map((m) => ({
        name: m.name,
        github: m.socials?.github || "",
        githubStatsSource: m.githubStats?.source || "none",
        githubStatsReason: m.githubStats?.reason || ""
    })));
});


