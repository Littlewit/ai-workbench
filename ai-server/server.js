const express = require('express');
const axios = require('axios');
const app = express();
const path = require('path');

require('dotenv').config();

app.use(express.json({ limit: '10mb' }));
app.use(express.text({ limit: '10mb' }));

// 跨域
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  next();
});

// ========== Render 必须加：托管前端 dist 静态文件 ==========
app.use(express.static(path.join(__dirname, 'dist')));

// RAG 全局文档 
let globalDoc = '';

// 上传文档
app.post('/api/upload-doc', (req, res) => {
  globalDoc = req.body || '';
  res.json({ success: true, msg: '文档已加载' });
});

// 统一 AI 流式接口
app.post('/api/ai', async (req, res) => {
  try {
    let { messages, prompt } = req.body;

    if (prompt && globalDoc) {
      messages = [
        {
          role: 'user',
          content: `根据以下文档回答：\n${globalDoc}\n---\n问题：${prompt}`
        }
      ];
    }

    const resp = await axios.post(
      'https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation',
      {
        model: 'qwen-turbo',
        input: { messages },
        parameters: {
          result_format: 'stream',
          incremental_output: true
        }
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.ALI_API_KEY}`,
          'Content-Type': 'application/json'
        },
        responseType: 'stream'
      }
    );
    resp.data.pipe(res);
  } catch (err) {
    res.status(500).send('error');
  }
});

// ========== Render 强制要求：使用环境变量端口 ==========
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log('✅ AI工作台服务已启动：端口 ' + PORT);
});
