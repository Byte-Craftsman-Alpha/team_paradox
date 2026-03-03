export function capitalizeFirst(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

export function getRoleClass(role) {
    const value = (role || "").toLowerCase();
    if (value.includes("lead") || value.includes("head")) return "role-lead";
    if ((value.includes("frontend") || value.includes("backend") || value.includes("full") || value.includes("dev")) && !value.includes("devops")) return "role-dev";
    if (value.includes("design") || value.includes("ui") || value.includes("ux")) return "role-design";
    if (value.includes("ml") || value.includes("data") || value.includes("ai")) return "role-ml";
    if (value.includes("devops") || value.includes("cloud") || value.includes("infra")) return "role-devops";
    return "role-default";
}

