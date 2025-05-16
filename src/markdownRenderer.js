// src/markdownRenderer.js
import { copyTextFallback } from './ui/copyUtils.js'; // Import the fallback function from its new location

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

// 检查并动态加载本地的marked.js库（如果尚未加载）
function ensureMarkedLoaded() {
    return new Promise((resolve, reject) => {
        // 输出文档状态
        console.log("文档加载状态:", document.readyState);
        console.log("检查marked是否已加载:", typeof marked !== 'undefined');

        // 如果marked已经加载，直接返回
        if (typeof marked !== 'undefined') {
            console.log("Marked.js已经加载");
            try {
                marked.setOptions({ 
                    gfm: true, 
                    breaks: true,
                    mangle: false,
                    headerIds: false
                });
                console.log("Marked.js配置成功");
            } catch (err) {
                console.error("配置Marked.js时出错:", err);
            }
            resolve(true);
            return;
        }

        console.log("尝试动态加载本地Marked.js");
        // 尝试加载本地的marked.min.js文件
        const script = document.createElement('script');
        
        // 尝试不同的路径
        const possiblePaths = [
            './js/marked.min.js',     // 相对于HTML文件的路径
            '/js/marked.min.js',      // 从根目录开始
            '../js/marked.min.js',    // 相对于src目录
            'js/marked.min.js'        // 直接路径
        ];
        
        // 先检查文件是否存在
        fetch('./js/marked.min.js')
            .then(response => {
                if (response.ok) {
                    console.log("找到本地marked.min.js文件");
                } else {
                    console.warn("本地marked.min.js文件可能不存在:", response.status, response.statusText);
                }
            })
            .catch(err => {
                console.error("检查marked.min.js文件时出错:", err);
            });
            
        script.src = './js/marked.min.js'; // 使用相对于HTML文件的路径
        script.onload = () => {
            console.log("本地Marked.js加载成功，marked类型:", typeof marked);
            // 配置 marked
            if (typeof marked !== 'undefined') {
                try {
                    marked.setOptions({ 
                        gfm: true, 
                        breaks: true,
                        mangle: false,
                        headerIds: false
                    });
                    console.log("Marked 版本:", marked.version);
                    console.log("Marked.js 配置完成");
                    resolve(true);
                } catch (err) {
                    console.error("配置marked失败:", err);
                    reject(err);
                }
            } else {
                console.error("Marked.js加载后仍然undefined");
                reject(new Error("Marked.js加载后仍然undefined"));
            }
        };
        script.onerror = (err) => {
            console.error("本地Marked.js加载失败:", err);
            // 尝试从CDN加载作为后备
            console.log("尝试从CDN加载Marked.js作为后备方案");
            const cdnScript = document.createElement('script');
            cdnScript.src = 'https://cdn.jsdelivr.net/npm/marked@4.3.0/marked.min.js';
            cdnScript.onload = () => {
                console.log("CDN Marked.js加载成功");
                if (typeof marked !== 'undefined') {
                    try {
                        marked.setOptions({ 
                            gfm: true, 
                            breaks: true,
                            mangle: false,
                            headerIds: false
                        });
                        resolve(true);
                    } catch (err) {
                        console.error("配置CDN marked失败:", err);
                        reject(err);
                    }
                } else {
                    reject(new Error("CDN Marked.js加载后仍然undefined"));
                }
            };
            cdnScript.onerror = () => {
                reject(new Error("本地和CDN Marked.js加载均失败"));
            };
            document.head.appendChild(cdnScript);
        };
        document.head.appendChild(script);
    });
}

/**
 * 使用 marked 将 Markdown 字符串解析为 HTML。
 * @param {string} markdownString - 要解析的 Markdown 文本。
 * @returns {string} 解析后的 HTML 字符串，如果 marked 不可用则返回错误提示或原始文本。
 */
export async function renderMarkdownAsync(markdownString) {
    try {
        // 尝试加载marked.js
        await ensureMarkedLoaded();
        
        // 现在应该可以使用marked了
        return marked.parse(markdownString);
    } catch (error) {
        console.error("加载或使用Marked.js出错:", error);
        // 如果动态加载失败，回退到基本处理
        return renderMarkdownFallback(markdownString);
    }
}

/**
 * 同步版本的Markdown渲染函数，用于保持兼容性
 * @param {string} markdownString - 要解析的Markdown文本
 * @returns {string} 解析后的HTML
 */
export function renderMarkdown(markdownString) {
    // 检查marked库是否加载
    if (typeof marked === 'undefined') {
        console.error("Marked.js is not loaded. Cannot render Markdown.");
        
        // 尝试一种简化的即时处理方式
        let simpleHTML = markdownString;
        
        // 处理简单的粗体文本
        simpleHTML = simpleHTML.replace(/\*\*([^\*]+)\*\*/g, '<strong>$1</strong>');
        
        // 转义HTML标签
        simpleHTML = simpleHTML.replace(/</g, "&lt;").replace(/>/g, "&gt;");
        
        console.log("简易处理Markdown:", simpleHTML.substring(0, 50));
        
        // 尝试动态加载marked，但因为这是同步函数，不能等待加载完成
        // 在后台加载，未来的调用可能会受益
        ensureMarkedLoaded().catch(err => console.error("后台加载Marked.js失败:", err));
        
        // 使用回退方案处理当前内容
        return renderMarkdownFallback(markdownString);
    }
    
    try {
        console.log("使用marked处理Markdown内容");
        // 配置 marked 以启用 GitHub Flavored Markdown
        marked.setOptions({ 
            gfm: true, 
            breaks: true,
            mangle: false,
            headerIds: false
        });
        const result = marked.parse(markdownString);
        return result;
    } catch (error) {
        console.error("使用marked渲染Markdown出错:", error);
        // 回退到基本处理
        return renderMarkdownFallback(markdownString);
    }
}

/**
 * 基本的Markdown处理回退函数，当marked不可用时使用
 * @param {string} markdownString - 需要处理的Markdown文本
 * @returns {string} - 处理后的HTML
 */
function renderMarkdownFallback(markdownString) {
    try {
        // 输出一些原始内容用于调试
        console.log("原始Markdown内容(前40字符):", markdownString.substring(0, 40));
        
        // 特殊情况：直接处理整个文本，如果它完全匹配 **text** 格式
        if (/^\*\*(.*)\*\*$/.test(markdownString)) {
            const innerText = markdownString.replace(/^\*\*|\*\*$/g, '');
            console.log("整行粗体文本:", innerText);
            return `<p><strong>${innerText}</strong></p>`;
        }
        
        // 特殊处理以 ** 开头的行
        const startsWithBold = /^\*\*([^*]+)\*\*(.*)$/.test(markdownString);
        console.log("以粗体开头:", startsWithBold);
        
        // 转义尖括号（在应用格式前）
        let htmlContent = markdownString;
        
        // 调试特殊粗体模式的存在性
        const hasBoldText = /\*\*([^*]+)\*\*/g.test(htmlContent);
        console.log("内联粗体文本存在:", hasBoldText);
        if (hasBoldText) {
            console.log("粗体匹配示例:", htmlContent.match(/\*\*([^*]+)\*\*/g));
        }
        
        // 直接替换，而不是先转义HTML
        // 先处理以**开头的特殊行
        htmlContent = htmlContent.replace(/^\*\*([^*]+?)\*\*(.*)$/gm, '<p><strong>$1</strong>$2</p>');
        
        // 专门处理内联粗体文本
        htmlContent = htmlContent.replace(/\*\*([^*\n]+?)\*\*/g, '<strong>$1</strong>');
        
        // 处理普通粗体文本
        htmlContent = htmlContent.replace(/\*\*([\s\S]*?)\*\*/g, '<strong>$1</strong>');
        
        // 处理斜体文本
        htmlContent = htmlContent.replace(/\*([^*\n]+)\*/g, '<em>$1</em>');
        
        // 最后进行HTML转义（但保留已处理的标签）
        const tempContent = htmlContent;
        htmlContent = tempContent.replace(/</g, "&lt;").replace(/>/g, "&gt;");
        
        // 还原已处理的HTML标签
        htmlContent = htmlContent.replace(/&lt;(\/?)strong&gt;/g, "<$1strong>");
        htmlContent = htmlContent.replace(/&lt;(\/?)em&gt;/g, "<$1em>");
        htmlContent = htmlContent.replace(/&lt;(\/?)p&gt;/g, "<$1p>");
        
        // 处理代码块 (`code`)
        htmlContent = htmlContent.replace(/`([^`]+)`/g, '<code>$1</code>');
        
        // 处理标题 (# text)
        htmlContent = htmlContent.replace(/^# (.*?)$/gm, '<h1>$1</h1>');
        htmlContent = htmlContent.replace(/^## (.*?)$/gm, '<h2>$1</h2>');
        htmlContent = htmlContent.replace(/^### (.*?)$/gm, '<h3>$1</h3>');
        
        // 处理无序列表 (- item)
        htmlContent = htmlContent.replace(/^- (.*?)$/gm, '<li>$1</li>');
        // 将连续的列表项包装在<ul>标签中
        htmlContent = htmlContent.replace(/(<li>.*?<\/li>)(\s*<li>.*?<\/li>)+/g, '<ul>$&</ul>');
        
        // 处理换行，将单个换行转换为<br>
        htmlContent = htmlContent.replace(/\n/g, '<br>');
        
        // 确保每个段落都被包裹在<p>标签中
        // 先将已有的HTML标签段落(<p>, <h1>等)替换为标记符，避免干扰
        htmlContent = htmlContent.replace(/<(\/?(p|h\d|li|ul|ol|code|pre|strong|em))[^>]*>/gi, '###$1###');
        // 将未包装的文本分割成段落并添加<p>标签
        const segments = htmlContent.split('<br>');
        htmlContent = segments.map(segment => {
            // 如果包含标记符，还原原始HTML标签
            segment = segment.replace(/###(\/?(p|h\d|li|ul|ol|code|pre|strong|em))###/gi, '<$1>');
            // 如果不是以HTML标签开头，包装在<p>标签中
            if (segment.trim().length > 0 && !segment.trim().startsWith('<')) {
                return `<p>${segment}</p>`;
            }
            return segment;
        }).join('');
        
        console.log("处理后的HTML(部分):", htmlContent.substring(0, 100));
        return htmlContent;
    } catch (fallbackError) {
        console.error("基本Markdown处理回退也失败了:", fallbackError);
        // 如果回退处理也失败，尝试最基本的处理
        try {
            // 最简单的处理：直接替换**文本**为<strong>文本</strong>
            let simpleHTML = markdownString.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
            // 转义HTML
            simpleHTML = simpleHTML.replace(/</g, "&lt;").replace(/>/g, "&gt;");
            // 还原strong标签
            simpleHTML = simpleHTML.replace(/&lt;strong&gt;/g, "<strong>").replace(/&lt;\/strong&gt;/g, "</strong>");
            return `<p>${simpleHTML}</p>`;
        } catch (e) {
            // 最后的回退：仅转义
            const escapedText = markdownString.replace(/</g, "&lt;").replace(/>/g, "&gt;");
            return `<pre>${escapedText}</pre>`;
        }
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

        // --- Create Wrapper ---
        const wrapper = document.createElement('div');
        wrapper.className = 'code-block-wrapper';
        preElement.parentNode.insertBefore(wrapper, preElement);
        wrapper.appendChild(preElement); // Move pre inside wrapper
        // --------------------

        const codeBlock = preElement.querySelector('code');
        if (!codeBlock) {
             // If no code block found, remove the potentially empty wrapper? Or just skip.
             // For now, just skip processing this element further.
             return;
        }


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
            // 插入到 wrapper 元素内部, 在 pre 元素之前
            // preElement.style.position = 'relative'; // No longer needed on pre
            wrapper.insertBefore(langLabel, preElement); // Insert into wrapper, before pre
        }


        // 3. 添加代码块复制按钮
        const copyBtn = document.createElement('button');
        copyBtn.className = 'code-copy-button'; // 应用特定样式
        copyBtn.textContent = '复制';
        copyBtn.title = '复制代码';
        // 附加到 wrapper 元素, 在 pre 元素之前 (或者之后, CSS 定位决定最终位置)
        wrapper.insertBefore(copyBtn, preElement); // Insert into wrapper, before pre

        copyBtn.addEventListener('click', (e) => {
            e.stopPropagation(); // 防止触发其他事件
            const codeToCopy = codeBlock.textContent;

            const handleCopySuccess = () => {
                const originalText = copyBtn.textContent;
                copyBtn.textContent = '已复制!';
                copyBtn.disabled = true;
                setTimeout(() => {
                    copyBtn.textContent = originalText;
                    copyBtn.disabled = false;
                }, 2000);
            };

            const handleCopyFailure = (methodUsed) => {
                 console.error(`Code block copy failed using ${methodUsed}.`);
                 if (methodUsed === 'navigator.clipboard' && !window.isSecureContext) {
                     alert('复制失败：此功能需要安全连接 (HTTPS) 或在 localhost 上运行。');
                 } else if (methodUsed === 'document.execCommand') {
                      alert('复制失败！浏览器不支持或禁止了后备复制方法。');
                 } else {
                     alert('复制失败！您的浏览器可能不支持此操作或权限不足。');
                 }
            };

            // --- Main Copy Logic ---
            if (window.isSecureContext && navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(codeToCopy).then(() => {
                    handleCopySuccess();
                }).catch(err => {
                    console.error('navigator.clipboard.writeText failed for code block:', err);
                    handleCopyFailure('navigator.clipboard');
                });
            } else {
                // Insecure context or clipboard API not available, try fallback
                if (copyTextFallback(codeToCopy)) { // Use imported fallback
                    handleCopySuccess();
                } else {
                    handleCopyFailure('document.execCommand');
                }
            }
            // --- End Main Copy Logic ---
        });

        // 4. 添加代码块折叠/展开功能 (JS Controlled Height)
        const codeBlockHeightThreshold = 800; // Set desired collapsed height in pixels
        let isInitiallyCollapsed = false;

        // Check scrollHeight of the pre element itself
        if (preElement.scrollHeight > codeBlockHeightThreshold) {
            isInitiallyCollapsed = true;
            // Set initial collapsed state using JS
            wrapper.style.height = `${codeBlockHeightThreshold}px`;
            wrapper.style.overflow = 'hidden'; // Hide overflow when collapsed by JS

            const expandBtn = document.createElement('button');
            expandBtn.className = 'code-expand-button';
            expandBtn.textContent = '展开代码'; // Initial text
            expandBtn.title = '展开/收起代码块';

            // 插入按钮在 wrapper 元素之后
            wrapper.parentNode.insertBefore(expandBtn, wrapper.nextSibling);

            expandBtn.addEventListener('click', () => {
                // Check current state by looking at style.height
                if (wrapper.style.height && wrapper.style.height !== 'auto') {
                    // --- Expand ---
                    wrapper.style.height = 'auto'; // Remove fixed height
                    wrapper.style.overflow = 'visible'; // Allow overflow
                    expandBtn.textContent = '收起代码';
                } else {
                    // --- Collapse ---
                    wrapper.style.height = `${codeBlockHeightThreshold}px`;
                    wrapper.style.overflow = 'hidden';
                    expandBtn.textContent = '展开代码';
                }
                // Optional: Scroll adjustment after animation
                // setTimeout(scrollChatToBottom, 310);
            });
        } else {
             // Ensure wrapper has auto height if not collapsible
             wrapper.style.height = 'auto';
             wrapper.style.overflow = 'visible';
        }


        // 标记该 wrapper (及其内容) 已处理
        wrapper.dataset.codeProcessed = 'true'; // Mark wrapper instead of pre
        preElement.dataset.codeProcessed = 'true'; // Mark pre too, just in case
    });
}

// 提供给浏览器控制台使用的测试函数
window.testMarkdownRender = function(text) {
    console.log("测试渲染Markdown文本:", text);
    
    // 测试回退函数
    const fallbackResult = renderMarkdownFallback(text);
    console.log("回退函数渲染结果:", fallbackResult);
    
    // 测试同步渲染
    try {
        const syncResult = renderMarkdown(text);
        console.log("同步渲染结果:", syncResult);
    } catch (err) {
        console.error("同步渲染失败:", err);
    }
    
    // 测试异步渲染
    renderMarkdownAsync(text)
        .then(result => {
            console.log("异步渲染结果:", result);
        })
        .catch(err => {
            console.error("异步渲染失败:", err);
        });
        
    // 向页面添加测试元素
    const testDiv = document.createElement('div');
    testDiv.className = 'markdown-test-container';
    testDiv.style.cssText = "border: 1px solid #ccc; padding: 10px; margin: 10px; background: #f9f9f9;";
    
    const originalText = document.createElement('div');
    originalText.innerHTML = `<h3>原始文本</h3><pre>${text}</pre>`;
    
    const renderedText = document.createElement('div');
    renderedText.innerHTML = `<h3>渲染结果</h3>${renderMarkdown(text)}`;
    
    testDiv.appendChild(originalText);
    testDiv.appendChild(renderedText);
    
    document.body.appendChild(testDiv);
    return fallbackResult;
};

// 立即尝试加载 marked 库
document.addEventListener('DOMContentLoaded', () => {
    // 检查marked是否已经被index.html中的<script>加载
    if (typeof marked !== 'undefined') {
        console.log('marked.js已通过HTML脚本标签加载，配置选项...');
        // 已经加载，直接配置
        marked.setOptions({ 
            gfm: true, 
            breaks: true,
            mangle: false,
            headerIds: false
        });
        
        // 添加简单的测试
        window.testMarkdownRender("**这是粗体文本**");
    } else {
        // 页面加载完成后尝试加载本地的 marked 库
        console.log('页面加载完成但marked未定义，尝试通过JS动态加载...');
        ensureMarkedLoaded().then(() => {
            console.log('marked.js已在页面加载时成功初始化');
            // 添加简单的测试
            window.testMarkdownRender("**这是粗体文本**");
        }).catch(err => {
            console.error('页面加载时初始化marked.js失败:', err);
        });
    }
});

// 注意：原 index.html 中的 enableCopyButton 函数与消息级别的复制按钮相关，
// 其逻辑应在 ui.js 的 finalizeAssistantMessage 中实现。

// 单独的粗体文本渲染测试，可以从控制台调用
export function testBoldTextRender(text) {
    console.log("测试粗体文本渲染:", text);
    
    // 创建测试元素
    const testDiv = document.createElement('div');
    testDiv.className = 'bold-test-container';
    testDiv.style.cssText = "border: 2px solid red; padding: 15px; margin: 15px; background: #f0f0f0; color: black;";
    
    // 显示原始文本
    const originalEl = document.createElement('div');
    originalEl.innerHTML = `<h3>原始文本</h3><pre>${text.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre>`;
    testDiv.appendChild(originalEl);
    
    // 测试各种渲染方式
    const methods = [
        {
            name: "简单替换",
            func: (text) => {
                let html = text.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
                return html;
            }
        },
        {
            name: "带HTML转义的替换",
            func: (text) => {
                let html = text;
                html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
                html = html.replace(/</g, "&lt;").replace(/>/g, "&gt;");
                html = html.replace(/&lt;strong&gt;/g, "<strong>").replace(/&lt;\/strong&gt;/g, "</strong>");
                return html;
            }
        },
        {
            name: "Markdown回退函数",
            func: renderMarkdownFallback
        },
        {
            name: "完整Markdown渲染",
            func: renderMarkdown
        }
    ];
    
    // 测试每种方法
    methods.forEach(method => {
        try {
            const result = method.func(text);
            const methodEl = document.createElement('div');
            methodEl.innerHTML = `<h3>${method.name}</h3>
                                  <div class="result">${result}</div>
                                  <div class="raw-html"><pre>${result.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre></div>`;
            testDiv.appendChild(methodEl);
        } catch (err) {
            const errorEl = document.createElement('div');
            errorEl.innerHTML = `<h3>${method.name} - 出错</h3><pre>${err.message}</pre>`;
            testDiv.appendChild(errorEl);
        }
    });
    
    // 添加到页面并返回最简单的结果
    document.body.appendChild(testDiv);
    return methods[0].func(text);
}

// 在window上暴露测试函数
window.testBoldText = function(text) {
    return testBoldTextRender(text || "**这是粗体文本**测试");
};