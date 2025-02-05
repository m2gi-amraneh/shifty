export const generateId = (): string => {
    return new Date().getTime() + (Math.random()).toString(36).substring(2);
}