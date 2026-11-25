import express from 'express';
import dotenv from 'dotenv';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { GoogleGenAI } from '@google/genai';
import OpenAI from 'openai';
import { createQuota } from './quota.js';
import helmet from 'helmet'; // 1. Import Helmet
import rateLimit from 'express-rate-limit'; // 2. Import Rate Limiter

const here = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(here, '.env') });
const devEnv = join(here, '../frontend/.env');
const local = process.env.NODE_ENV !== 'production' && existsSync(devEnv) ? dotenv.parse(readFileSync(devEnv)) : {};
const authUrl = new URL('/auth/v1/user', process.env.SUPABASE_URL || local.VITE_SUPABASE_URL);
const apiKey = process.env.SUPABASE_ANON_KEY || local.VITE_SUPABASE_ANON_KEY;
if (!apiKey || (authUrl.protocol !== 'https:' && !['localhost', '127.0.0.1'].includes(authUrl.hostname))) {
  throw new Error('Configure the Supabase Auth URL and public API key');
}
const admit = createQuota(process.env.AI_QUOTA_DB || join(here, '.runtime/quota.sqlite'), Number(process.env.AI_DAILY_REQUEST_LIMIT ?? 100));
const gemini = process.env.GEMINI_API_KEY && new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: { timeout: 15000, retryOptions: { attempts: 1 } }
});
const groq = process.env.GROQ_API_KEY && new OpenAI({ apiKey: process.env.GROQ_API_KEY, baseURL: 'https://api.groq.com/openai/v1', timeout: 15000, maxRetries: 0 });
const tones = new Set(['Strict Financial Advisor', 'Friendly & Encouraging', 'Sarcastic & Roast Me', 'Analytical Data Scientist']);
const known = new Set(['Food & Dining', 'Entertainment', 'Groceries', 'Travel', 'Shopping', 'Utilities', 'Housing & Rent', 'Software', 'Other']);
const validName = name => typeof name === 'string' && name.length > 0 && name.length <= 80 && name.trim() === name;
const validMoney = n => typeof n === 'number' && Number.isFinite(n) && n >= 0 && n <= 1e12;
const app = express();

app.use(helmet({
  contentSecurityPolicy: process.env.NODE_ENV === 'production' ? undefined : false, // Allows Vite local dev
}));

app.disable('x-powered-by');

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per 15 minutes
  message: { error: 'Too many requests from this IP, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api', apiLimiter);

app.use('/api', async (req, res, next) => {
  res.set('Cache-Control', 'no-store');
  const bearer = req.headers.authorization || '';
  if (!/^Bearer [^\s]{1,8192}$/.test(bearer)) return res.status(401).json({ error: 'Sign in required.' });
  try {
    const check = await fetch(authUrl, { headers: { apikey: apiKey, Authorization: bearer }, redirect: 'error', signal: AbortSignal.timeout(5000) });
    if (!check.ok) return res.status(check.status >= 500 ? 503 : 401).json({ error: 'Unable to verify session.' });
    const user = await check.json();
    if (!user.id || user.is_anonymous) return res.status(401).json({ error: 'Account required.' });
    req.userId = user.id;
    next();
  } catch { res.status(503).json({ error: 'Authentication is temporarily unavailable.' }); }
});
app.use('/api', express.json({ limit: '12kb' }));

async function generate(instruction, data, parse) {
  const input = JSON.stringify(data);
  if (gemini) {
    try {
      const response = await gemini.models.generateContent({
        model: process.env.GEMINI_MODEL || 'gemini-3.8-flash',
        contents: input, config: { systemInstruction: instruction, maxOutputTokens: 800 }
      });
      return { result: parse(response.text), provider: 'Google Gemini' };
    } catch { console.warn('Gemini response unavailable'); }
  }
  if (groq) {
    try {
      const response = await groq.chat.completions.create({
        model: process.env.GROQ_MODEL || 'openai/gpt-oss-20b',
        messages: [{ role: 'system', content: instruction }, { role: 'user', content: input }], max_completion_tokens: 800
      });
      return { result: parse(response.choices[0].message.content), provider: 'Groq' };
    } catch { console.warn('Groq response unavailable'); }
  }
  return null;
}

function reserve(req, res) {
  if (admit(req.userId)) return true;
  res.status(429).json({ error: 'AI request quota reached.' });
  return false;
}
const bad = res => res.status(400).json({ error: 'Invalid report data.' });

app.post('/api/analyze', async (req, res, next) => {
  try {
    const { groups, tone } = req.body || {};
    if (!tones.has(tone) || !Array.isArray(groups) || !groups.length || groups.length > 64 ||
      groups.some(g => !g || !validName(g.category) || !validMoney(g.total) || !Number.isSafeInteger(g.count) || g.count < 1 || g.count > 10000000)) return bad(res);
    if (!reserve(req, res)) return;
    const aggregates = groups.map(g => ({ category: known.has(g.category) ? g.category : 'Other', total: g.total, count: g.count }));
    const answer = await generate('Summarize these expense totals in INR in three sentences. Tone: ' + tone, aggregates, text => {
      if (typeof text !== 'string' || !text.trim() || text.length > 6000) throw new Error();
      return text.trim();
    });
    const sum = aggregates.reduce((n, g) => n + Math.round(g.total * 100), 0) / 100;
    res.json({ insight: answer?.result || 'Total recorded spending in this selection is ₹' + sum.toLocaleString('en-IN') + '.', provider: answer?.provider || 'Trackit local summary' });
  } catch (error) { next(error); }
});

app.post('/api/suggest-limits', async (req, res, next) => {
  try {
    const { masterLimit, categories } = req.body || {};
    if (!validMoney(masterLimit) || masterLimit <= 0 || !Array.isArray(categories) || !categories.length || categories.length > 32 ||
      !categories.every(validName) || new Set(categories).size !== categories.length) return bad(res);
    if (!reserve(req, res)) return;
    const items = categories.map((name, i) => ({ id: 'c' + i, category: known.has(name) ? name : 'Other' }));
    const answer = await generate('Allocate the INR budget across the listed category IDs. Return only a JSON object mapping every ID to a nonnegative whole-rupee limit, with their sum at most the budget.', { masterLimit, items }, text => {
      const values = JSON.parse(text.trim().replace(/^\x60\x60\x60(?:json)?\s*|\s*\x60\x60\x60$/gi, ''));
      if (!values || Array.isArray(values) || Object.keys(values).length !== items.length) throw new Error();
      const limits = items.map(item => values[item.id]);
      if (!limits.every(n => Number.isSafeInteger(n) && n >= 0 && n <= masterLimit) || limits.reduce((a, b) => a + b, 0) > masterLimit) throw new Error();
      return limits;
    });
    if (!answer) return res.status(503).json({ error: 'No valid suggestions available.' });
    res.json(Object.fromEntries(categories.map((name, i) => [name, answer.result[i]])));
  } catch (error) { next(error); }
});
app.use('/api', (_req, res) => res.sendStatus(404));
app.use((err, _req, res, _next) => {
  const status = [400, 413, 415].includes(err.status) ? err.status : 500;
  res.status(status).json({ error: status === 500 ? 'Request failed.' : 'Invalid request body.' });
});
const dist = join(here, '../frontend/dist');
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(dist));
  app.get('*', (_req, res) => res.sendFile(join(dist, 'index.html')));
}
app.listen(process.env.PORT || 5000, process.env.HOST || '127.0.0.1', () => console.log('Trackit API ready'));
