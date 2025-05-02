// src/markdownRenderer.js

// 在标准的模块化项目中，应该通过 npm/yarn 安装 marked 和 highlight.js
// 然后像这样导入:
// import { marked } from 'marked';
// import hljs from 'highlight.js/lib/core'; // 导入核心库
// // 按需导入语言，例如：
// import javascript from 'highlight.js/lib/languages/javascript';
// import python from 'highlight.js/lib/languages/python';
// import css from 'highlight.js/lib/languages/css';
// import xml from 'highlight.js/lib/languages/xml'; // HTML is based on XML
// // 注册语言
// hljs.registerLanguage('javascript', javascript);
// hljs.registerLanguage('python', python);
// hljs.registerLanguage('css', css);
// hljs.registerLanguage('html', xml); // Register HTML as XML
// hljs.registerLanguage('xml', xml);

/**
 * 使用 marked 将 Markdown 字符串解析为 HTML。
 * @param {string} markdownString - 要解析的 Markdown 文本。
 * @returns {string} 解析后的 HTML 字符串，如果 marked 不可用则返回错误提示或原始文本。
 */
export function renderMarkdown(markdownString) {
    if (typeof marked === 'undefined') {
        console.error("Marked.js is not loaded. Cannot render Markdown.");
        // 返回格式化的原始文本作为回退
        const escapedText = markdownString.replace(/</g, "<").replace(/>/g, ">");
        return `<pre>${escapedText}</pre>`;
    }
    try {
        // 可以根据需要配置 marked
        // marked.setOptions({ gfm: true, breaks: true, /* ... other options */ });
        return marked.parse(markdownString);
    } catch (error) {
        console.error("Error rendering Markdown:", error);
        // 返回错误信息或格式化的原始文本
        const escapedText = markdownString.replace(/</g, "<").replace(/>/g, ">");
        return `<pre>Markdown渲染出错:\n${escapedText}</pre>`;
    }
}

/**
 * 处理指定容器内的代码块：应用语法高亮、添加语言标签和复制代码按钮。
 * @param {HTMLElement} container - 要处理其内部代码块的容器元素。
 */
export function highlightCodeBlocks(container) {
    if (typeof hljs === 'undefined' || !container) {
        if (typeof hljs === 'undefined') console.error("Highlight.js is not loaded. Cannot highlight code.");
        return;
    }

    container.querySelectorAll('pre').forEach(preElement => {
        // 防止重复处理同一个 pre 元素
        if (preElement.dataset.codeProcessed) return;

        const codeBlock = preElement.querySelector('code');
        if (!codeBlock) return;

        // 1. 应用高亮
        try {
            hljs.highlightElement(codeBlock);
        } catch (highlightError) {
             console.error("Error highlighting code block:", highlightError, codeBlock.textContent.substring(0, 100));
             // 即使高亮失败，也继续尝试添加标签和按钮
        }


        // 2. 添加语言标签
        let language = '';
        // 优先从 class 获取语言
        codeBlock.classList.forEach(className => {
            if (className.startsWith('language-')) {
                language = className.replace('language-', '').toLowerCase();
                // 简单别名处理
                if (language === 'js') language = 'javascript';
                if (language === 'py') language = 'python';
                if (language === 'html') language = 'html'; // 确保 html 被识别
                if (language === 'shell') language = 'bash'; // 常见别名
            }
        });
         // 如果 class 中没有，尝试从 hljs 的结果中获取（如果高亮成功）
         if (!language && codeBlock.dataset.highlightedLanguage) {
             language = codeBlock.dataset.highlightedLanguage.toLowerCase();
         }
         // 最终回退：简单检查内容开头 (效果有限)
         if (!language) {
             const text = codeBlock.textContent.trimStart().toLowerCase();
             if (text.startsWith('python')) language = 'python';
             else if (text.startsWith('javascript')) language = 'javascript';
             else if (text.startsWith('function') || text.startsWith('const') || text.startsWith('let')) language = 'javascript'; // 猜测
             else if (text.startsWith('def')) language = 'python'; // 猜测
             else if (text.startsWith('<')) language = 'html'; // 猜测
         }


        if (language) {
            const langLabel = document.createElement('span');
            langLabel.className = 'code-language-label';
            langLabel.textContent = language;
            // 插入到 pre 元素内部，但在 code 元素之前（或作为 pre 的第一个子元素）
            preElement.style.position = 'relative'; // 确保 pre 是定位上下文
            preElement.insertBefore(langLabel, preElement.firstChild);
        }


        // 3. 添加代码块复制按钮
        const copyBtn = document.createElement('button');
        copyBtn.className = 'code-copy-button'; // 应用特定样式
        copyBtn.textContent = '复制';
        copyBtn.title = '复制代码';
        // 附加到 pre 元素，通常放在右上角
        preElement.appendChild(copyBtn);

        copyBtn.addEventListener('click', (e) => {
            e.stopPropagation(); // 防止触发其他事件
            const codeToCopy = codeBlock.textContent;
            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(codeToCopy).then(() => {
                    const originalText = copyBtn.textContent;
                    copyBtn.textContent = '已复制!';
                    copyBtn.disabled = true;
                    setTimeout(() => {
                        copyBtn.textContent = originalText;
                        copyBtn.disabled = false;
                    }, 2000);
                }).catch(err => {
                    console.error('无法复制代码到剪贴板: ', err);
                    alert('复制失败! 可能需要 HTTPS 或浏览器权限。');
                });
            } else {
                 console.warn('Clipboard API 不可用。');
                 alert('您的浏览器不支持自动复制功能。');
            }
        });

        // 标记该 pre 元素已处理
        preElement.dataset.codeProcessed = 'true';
    });
}

// 注意：原 index.html 中的 enableCopyButton 函数与消息级别的复制按钮相关，
// 其逻辑应在 ui.js 的 finalizeAssistantMessage 中实现。