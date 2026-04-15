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
  next();
});

app.use(express.static(path.join(__dirname, 'public')));

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

app.listen(3001, () => {
  console.log('✅ AI工作台服务已启动：http://localhost:3001');
});