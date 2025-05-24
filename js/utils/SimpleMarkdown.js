// /* console.log('[SimpleMarkdown] Loading...'); */ // Removed

/**
 * 简单的 Markdown 解析器
 * 支持基本的 Markdown 语法：标题、列表、表格等
 */
class SimpleMarkdown {
    /**
     * 解析 Markdown 文本
     * @param {string} text - 要解析的 Markdown 文本
     * @returns {string} 解析后的 HTML
     */
    static parse(text) {
        // 1. 首先处理表格 (保持独立逻辑)
        text = this.parseTables(text);
        
        // 2. 处理水平分割线 (新增)
        // 匹配行首可选空格 + 3个以上 - 或 * 或 _ + 可选空格 + 行尾
        text = text.replace(/^\s*([-*_]){3,}\s*$/gm, '<hr class="markdown-hr">');

        // 3. 处理标题 (确保匹配行首)
        text = text.replace(/^### (.*?)$/gm, '<h3 class="markdown-h3">$1</h3>'); 
        text = text.replace(/^#### (.*?)$/gm, '<h4 class="markdown-h4">$1</h4>'); 
        
        // 4. 处理粗体 (可以在块级元素处理后进行，但放在这里也行，只要后续段落逻辑正确)
        text = text.replace(/\*\*(.*?)\*\*/g, '<strong class="markdown-strong">$1</strong>');
        
        // 5. 处理无序列表 (确保匹配行首，并改进包裹逻辑)
        // 先将 `- ` 替换为临时标记，避免干扰其他逻辑
        text = text.replace(/^- (.*?)$/gm, 'LIST_ITEM_MARKER$1END_LIST_ITEM'); 
        
        // 重新构建文本，正确包裹列表
        let listItems = [];
        let inList = false;
        let processedText = '';
        const linesForList = text.split('\n');
        for (let i = 0; i < linesForList.length; i++) {
            let line = linesForList[i];
            if (line.includes('LIST_ITEM_MARKER')) {
                if (!inList) {
                    inList = true;
                    listItems = []; // Start a new list
                }
                // 提取内容并创建 li 标签
                const itemContent = line.substring(line.indexOf('LIST_ITEM_MARKER') + 'LIST_ITEM_MARKER'.length, line.indexOf('END_LIST_ITEM'));
                listItems.push(`<li class="markdown-li">${itemContent}</li>`);
            } else {
                if (inList) {
                    // End of list detected
                    processedText += '<ul class="markdown-ul">\n' + listItems.join('\n') + '\n</ul>\n';
                    inList = false;
                    listItems = [];
                }
                processedText += line + (i < linesForList.length - 1 ? '\n' : ''); // Add non-list line
            }
        }
        // Handle list ending at the end of the file
        if (inList) {
             processedText += '<ul class="markdown-ul">\n' + listItems.join('\n') + '\n</ul>';
        }
        text = processedText;

        // 6. 处理段落 - 关键改进：避免包裹已处理的块级元素
        processedText = '';
        const blocks = text.split('\n\n'); // 按双换行分割成块
        for (let i = 0; i < blocks.length; i++) {
            let block = blocks[i].trim();
            if (!block) continue; // 跳过空块

            // 检查块是否已经是我们生成的块级元素
            if (/^<(h[34]|ul|table|hr)/.test(block)) {
                // 如果是，直接添加，不包裹 P 标签
                processedText += block;
            } else {
                // 否则，认为是段落，包裹 P 标签，并将内部单换行转为 BR
                processedText += '<p class="markdown-p">' + block.replace(/\n/g, '<br>') + '</p>';
            }
            // 在块之间添加换行符，保持间距 (如果不是最后一个块)
            if (i < blocks.length - 1) {
                processedText += '\n\n'; 
            }
        }
        text = processedText;

        // 7. 移除可能产生的空 P 标签 (保留)
        text = text.replace(/<p class="markdown-p">\s*<\/p>/g, '');
        
        // 8. 清理首尾空格 (保留)
        return text.trim();
    }
    
    /**
     * 解析表格
     * @param {string} text - 包含表格的文本
     * @returns {string} 解析后的 HTML
     */
    static parseTables(text) {
        const lines = text.split('\n');
        let inTable = false;
        let tableContent = '';
        let result = '';
        
        for (let line of lines) {
            line = line.trim(); // Trim the line first
            if (line.startsWith('|') && line.endsWith('|')) { // Ensure it's a proper table row
                // 跳过分隔行（只包含 |、-、:、空格）
                if (/^\|[- :\s|]+\|$/.test(line)) continue;

                if (!inTable) {
                    inTable = true;
                    tableContent = '<table class="markdown-table">\n<tbody class="markdown-tbody">\n'; // Add tbody and classes
                }
                
                // 处理表格行
                const cells = line.split('|')
                    .slice(1, -1) // Remove the first and last empty strings from split
                    .map(cell => cell.trim());
                
                tableContent += '<tr class="markdown-tr">\n'; // Add class
                cells.forEach(cell => {
                    tableContent += `<td class="markdown-td">${cell}</td>\n`; // Add class
                });
                tableContent += '</tr>\n';
            } else {
                if (inTable) {
                    inTable = false;
                    tableContent += '</tbody>\n</table>\n'; // Close tbody
                    result += tableContent;
                    tableContent = '';
                }
                result += line + '\n'; // Append non-table lines
            }
        }
        
        // Handle table ending at the end of the file
        if (inTable) {
            result += tableContent + '</tbody>\n</table>\n'; // Close tbody
        }
        
        // Return result without extra newline at the end if added
        return result.trim(); 
    }
}

// 导出到全局对象
window.SimpleMarkdown = SimpleMarkdown; 