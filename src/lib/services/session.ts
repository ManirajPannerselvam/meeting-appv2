export function getCurrentUser() {
    if (typeof localStorage === "undefined") return null;

    try {
        const user = localStorage.getItem("currentUser");
        return user ? JSON.parse(user) : null;
    } catch {
        return null;
    }
}

export function isAdmin() {
    return getCurrentUser()?.role === "Admin";
}