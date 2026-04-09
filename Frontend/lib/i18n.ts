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
  themeToLight: string
  themeToDark: string
  mobileMenu: string
}

const messages: Messages = {
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
  themeToLight: "切换为浅色模式",
  themeToDark: "切换为深色模式",
  mobileMenu: "打开菜单",
}

export function getMessages() {
  return messages
}
