export const validatePhoneNumber = (phone) => {
    // Regex: starts with +213 followed by exactly 9 digits
    const phoneRegex = /^\+213\d{9}$/;
    return phoneRegex.test(phone);
};
