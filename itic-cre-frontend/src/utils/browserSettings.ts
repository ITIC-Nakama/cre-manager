export const getBrowserLang = () => {
    const rawLang = navigator.language || 'fr';
    const shortLang = rawLang.split('-')[0].toLowerCase();
    return (shortLang === 'en' || shortLang === 'fr') ? shortLang : 'fr';
};
