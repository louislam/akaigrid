// @ts-ignore Performance issue when using "vue-i18n", so we use "vue-i18n/dist/vue-i18n.esm-browser.prod.js", but typescript doesn't like that.
import { createI18n } from "vue-i18n/dist/vue-i18n.esm-browser.prod.js";
import en from "./lang/en.json";

const languageList = {
    "zh-TW": "繁體中文(台灣)",
};

let messages = {
    en,
};

for (let lang in languageList) {
    messages[lang] = {
        languageName: languageList[lang],
    };
}

const rtlLangs = ["fa", "ar-SY", "ur", "ar"];

export const currentLocale = () =>
    localStorage.locale ||
    languageList[navigator.language] && navigator.language ||
    languageList[navigator.language.substring(0, 2)] && navigator.language.substring(0, 2) ||
    "en";

export const localeDirection = () => {
    return rtlLangs.includes(currentLocale()) ? "rtl" : "ltr";
};

export const i18n = createI18n({
    locale: currentLocale(),
    fallbackLocale: "en",
    silentFallbackWarn: true,
    silentTranslationWarn: true,
    messages: messages,
});
