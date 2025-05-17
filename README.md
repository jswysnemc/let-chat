# let caht - 多模态聊天应用

一个基于 Web 技术的现代多模态聊天应用程序，允许用户与 AI进行文本和图片交互。

## 主要功能

*   **多会话管理**: 用户可以创建和管理多个独立的聊天会话。
*   **多模态输入**: 支持文本和图片作为输入。
*   **联网搜索**: 集成了 Tavily API，允许 AI 在需要时进行联网搜索以获取最新信息 (需要模型支持函数调用)。
*   **模型切换**: 支持在运行时切换不同的 AI 模型 (通过服务商配置)。
*   **服务商配置**: 允许用户配置和管理多个 AI 服务商及其 API 密钥、基础 URL 和可用模型。
*   **Markdown 渲染**: AI 的回复支持 Markdown 格式，包括代码块高亮。
*   **通知中心**: 提供应用内通知功能。
*   **响应式设计**: 界面适应桌面和移动设备。
*   **本地存储**: 会话、服务商配置等数据存储在用户本地浏览器中。

## 技术栈 (推断)

*   HTML5
*   CSS3 (包含 Flexbox, Grid 布局)
*   JavaScript (ES6+ 模块化)
*   Font Awesome (图标)
*   (可能) Marked.js 或类似库用于 Markdown 渲染
*   (可能) Highlight.js 或类似库用于代码高亮

## 项目结构 (推断)

```
/
├── css/                # CSS 样式文件
│   ├── main.css
│   ├── fix.css
│   ├── mobile-fixes.css
│   ├── modal-style.css
│   └── ...
├── js/                 # 第三方 JavaScript 库 (如 marked.min.js, highlight.min.js)
├── src/                # 项目核心 JavaScript 源代码
│   ├── api/            # (可能) API 客户端或相关逻辑 (例如 tavilyAPI.js)
│   ├── ui/             # UI 管理模块 (domElements.js, sidebar.js, settingsManager.js, etc.)
│   ├── apiClient.js    # AI API 请求处理
│   ├── config.js       # 应用配置管理 (服务商、API密钥等)
│   ├── inputController.js # 处理用户输入区域的逻辑
│   ├── main.js         # 应用主入口点和核心逻辑
│   ├── markdownRenderer.js # Markdown 解析和渲染
│   ├── state.js        # 应用状态管理 (会话、消息等)
│   └── tools/          # AI 工具定义 (functions_desc.js, tavilySearchServer.js)
├── index.html          # 主 HTML 文件
├── logo.svg            # 应用 Logo
├── README.md           # 项目说明文件 (本文档)
└── LICENSE             # 项目许可证文件
```

## 如何运行

1.  **克隆或下载项目**到本地。
2.  **确保有一个现代浏览器** (如 Chrome, Firefox, Edge, Safari 最新版)。
3.  **直接在浏览器中打开 `index.html` 文件**。
4.  **配置服务商**: 
    *   首次运行时，应用可能会创建一个默认的服务商配置。
    *   点击侧边栏底部的"设置"按钮。
    *   配置您的 AI 服务商的 API 基础 URL、API 密钥、可用模型名称和可选的系统提示。
    *   如果需要使用联网搜索功能，请确保配置了全局的 Tavily API 密钥。
5.  **开始聊天**!

## 注意事项

*   **API 密钥安全**: 项目中直接处理 API 密钥是在前端。在生产环境中，强烈建议通过后端代理来处理 API 请求，以保护您的密钥安全。
*   **模型兼容性**: 联网搜索等高级功能依赖于所选 AI 模型对函数调用 (Function Calling / Tool Usage) 的支持。
*   **本地存储**: 所有会话数据和配置都存储在浏览器的 `localStorage` 中。清除浏览器数据会导致这些信息丢失。

## 贡献

(如果您希望他人贡献，可以在此添加贡献指南)

## 许可证

本项目采用 [GNU General Public License v3.0](LICENSE) 授权。 