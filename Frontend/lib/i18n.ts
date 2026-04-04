export type Language = "zh-CN" | "zh-TW" | "en"

export const languageOptions: Array<{ value: Language; label: string }> = [
  { value: "zh-CN", label: "简体中文" },
  { value: "zh-TW", label: "繁体中文" },
  { value: "en", label: "英文界面" },
]

type Messages = {
  brandTagline: string
  navHome: string
  navSoftware: string
  navArticles: string
  navRequests: string
  navSearch: string
  login: string
  register: string
  profile: string
  favorites: string
  myRequests: string
  logout: string
  searchPlaceholder: string
  footerLinks: string
  footerAccount: string
  footerLanguage: string
  themeToLight: string
  themeToDark: string
  mobileMenu: string
}

const messages: Record<Language, Messages> = {
  "zh-CN": {
    brandTagline: "软件 / 文章 / 需求",
    navHome: "首页",
    navSoftware: "软件库",
    navArticles: "文章",
    navRequests: "需求墙",
    navSearch: "搜索",
    login: "登录",
    register: "注册",
    profile: "个人中心",
    favorites: "我的收藏",
    myRequests: "我的需求",
    logout: "退出登录",
    searchPlaceholder: "搜索软件、文章或需求",
    footerLinks: "网站入口",
    footerAccount: "账号功能",
    footerLanguage: "页面语言",
    themeToLight: "切换为浅色模式",
    themeToDark: "切换为深色模式",
    mobileMenu: "打开菜单",
  },
  "zh-TW": {
    brandTagline: "軟體 / 文章 / 需求",
    navHome: "首頁",
    navSoftware: "軟體庫",
    navArticles: "文章",
    navRequests: "需求牆",
    navSearch: "搜尋",
    login: "登入",
    register: "註冊",
    profile: "個人中心",
    favorites: "我的收藏",
    myRequests: "我的需求",
    logout: "登出",
    searchPlaceholder: "搜尋軟體、文章或需求",
    footerLinks: "網站入口",
    footerAccount: "帳號功能",
    footerLanguage: "頁面語言",
    themeToLight: "切換為淺色模式",
    themeToDark: "切換為深色模式",
    mobileMenu: "打開選單",
  },
  en: {
    brandTagline: "Apps / Articles / Requests",
    navHome: "Home",
    navSoftware: "Apps",
    navArticles: "Articles",
    navRequests: "Requests",
    navSearch: "Search",
    login: "Log in",
    register: "Sign up",
    profile: "Profile",
    favorites: "Favorites",
    myRequests: "My requests",
    logout: "Log out",
    searchPlaceholder: "Search apps, articles, or requests",
    footerLinks: "Navigation",
    footerAccount: "Account",
    footerLanguage: "Language",
    themeToLight: "Switch to light mode",
    themeToDark: "Switch to dark mode",
    mobileMenu: "Open menu",
  },
}

export function isLanguage(value: string | null | undefined): value is Language {
  return value === "zh-CN" || value === "zh-TW" || value === "en"
}

export function getMessages(language: Language) {
  return messages[language] ?? messages["zh-CN"]
}
