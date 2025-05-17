

export function functions_desc(){
    return JSON.stringify({
        functions: [
            {
              name: 'search_tool',
              description: '执行Tavily网络搜索并返回结果',
              parameters: {
                type: 'object',
                properties: {
                  query: {
                    type: 'string',
                    description: '搜索关键词或问题，例如：中国最新经济政策'
                  },
                  options: {
                    type: 'object',
                    properties: {
                      includeAnswer: {
                        type: 'boolean',
                        description: '是否包含直接回答',
                        default: true
                      },
                      maxResults: {
                        type: 'number',
                        description: '最大返回结果数量',
                        default: 5
                      },
                      searchDepth: {
                        type: 'string',
                        enum: ['basic', 'advanced'],
                        description: '搜索深度级别',
                        default: 'basic'
                      },
                      includeRawContent: {
                        type: 'boolean',
                        description: '是否包含原始内容',
                        default: false
                      },
                      includeImages: {
                        type: 'boolean',
                        description: '是否包含图片',
                        default: false
                      },
                      includeDomains: {
                        type: 'array',
                        items: { type: 'string' },
                        description: '要包含的域名白名单'
                      },
                      excludeDomains: {
                        type: 'array',
                        items: { type: 'string' },
                        description: '要排除的域名黑名单'
                      }
                    },
                    required: [] // 所有选项参数均为可选
                  }
                },
                required: ['query'] // query 是必填参数
              }
            },
            {
              name: 'extract_tool',
              description: '从指定网页URL中提取内容',
              parameters: {
                type: 'object',
                properties: {
                  urls: {
                    type: 'array',
                    items: { type: 'string' },
                    description: '要提取内容的网页URL列表'
                  },
                  options: {
                    type: 'object',
                    properties: {
                      includeRawContent: {
                        type: 'boolean',
                        description: '是否包含原始HTML内容',
                        default: false
                      },
                      extractMode: {
                        type: 'string',
                        enum: ['article', 'code', 'auto'],
                        description: '内容提取模式',
                        default: 'article'
                      }
                    },
                    required: [] // 所有选项参数均为可选
                  }
                },
                required: ['urls'] // urls 是必填参数
              }
            }
          ]
    })
}

;