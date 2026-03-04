export const ADMIN_USER_KEY = 'forsaj_admin_user';
export const ADMIN_TOKEN_KEY = 'forsaj_admin_token';
export const SESSION_EXPIRED_EVENT = 'forsaj:session-expired';

export const getAuthToken = () => {
    const token = localStorage.getItem(ADMIN_TOKEN_KEY);
    if (!token || token === 'null' || token === 'undefined') {
        return null;
    }
    return token;
};

export const clearAdminSession = () => {
    localStorage.removeItem(ADMIN_USER_KEY);
    localStorage.removeItem(ADMIN_TOKEN_KEY);
    window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
};
