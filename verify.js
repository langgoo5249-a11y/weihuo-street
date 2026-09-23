const { chromium } = require('playwright-core');
const path = require('path');
const fs = require('fs');
const { pathToFileURL } = require('url');

const DIR = 'E:\\lang个人知识库\\99-Temp\\weihuo-site';
const SHOTS = path.join(DIR, 'shots');
if (!fs.existsSync(SHOTS)) fs.mkdirSync(SHOTS, { recursive: true });

const PAGES = [
  { f: 'index.html',   name: 'home',    must: ['尾货街', '最新货源', '金牌商家', '推荐位', '示例数据'] },
  { f: 'huoyuan.html', name: 'huoyuan', must: ['尾货街', '最新发布', '示例数据'] },
  { f: 'detail.html',  name: 'detail',  must: ['雪纺小衫', '商家手机号', '实名认证', '安全提醒', '不代收货款'] },
  { f: 'caigou.html',  name: 'caigou',  must: ['采购需求', '查看全文', '示例数据'] },
  { f: 'vip.html',     name: 'vip',     must: ['¥59', '¥168', '¥400', '权益对比', '每日 8 个位置'] },
  { f: 'me.html',      name: 'me',      must: ['手机未绑定', '未实名', '求购线索库', '微信群广场'] },
  { f: '404.html',     name: 'e404',    must: ['404', '回到首页'] },
  { f: 'disclaimer.html', name: 'disclaimer', must: ['免责声明', '不代收货款', '不是交易平台'] },
  { f: 'terms.html',      name: 'terms',      must: ['用户协议', '实名认证说明', '只能认证一个账号'] },
  { f: 'privacy.html',    name: 'privacy',    must: ['隐私政策', '不会展示给其他用户', '哈希'] },
  { f: 'about.html',      name: 'about',      must: ['关于尾货街', '不做什么'] }
];

const VIEWPORTS = [
  { w: 390,  h: 844, tag: 'm' },   // 手机
  { w: 1280, h: 900, tag: 'd' }    // 桌面
];

(async () => {
  const browser = await chromium.launch({
    executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    headless: true,
    args: ['--no-sandbox']
  });

  const out = { pages: [], errors: [], overflow: [], missing: [], deadlinks: [] };

  for (const vp of VIEWPORTS) {
    for (const p of PAGES) {
      const ctx = await browser.newContext({
        viewport: { width: vp.w, height: vp.h },
        deviceScaleFactor: 1
      });
      const page = await ctx.newPage();
      const errs = [];
      const is404 = p.name === 'e404';
      page.on('console', m => {
        if (m.type() !== 'error') return;
        // 404.html 用绝对路径 /assets/xxx，file:// 下必然 ERR_FILE_NOT_FOUND；
        // 真实域名部署下这是正确的写法（404 可能出现在任意路径层级）→ 属预期，不当错误
        if (is404 && /ERR_FILE_NOT_FOUND/.test(m.text())) return;
        errs.push(vp.tag + '/' + p.name + ': ' + m.text());
      });
      page.on('pageerror', e => errs.push(vp.tag + '/' + p.name + ' pageerror: ' + e.message));

      const url = pathToFileURL(path.join(DIR, p.f)).href;
      await page.goto(url, { waitUntil: 'load' });
      await page.waitForTimeout(250);

      // 横向溢出
      const ow = await page.evaluate(() =>
        document.documentElement.scrollWidth - document.documentElement.clientWidth);
      const hs = await page.evaluate(() =>
        document.documentElement.scrollWidth > document.documentElement.clientWidth);

      // 关键文案
      const html = await page.content();
      const miss = p.must.filter(s => !html.includes(s));

      // 死链（站内相对链接是否存在）
      const links = await page.evaluate(() =>
        Array.from(document.querySelectorAll('a[href]')).map(a => a.getAttribute('href')));
      links.forEach(h => {
        if (!h || h.startsWith('#') || h.startsWith('http') || h.startsWith('data:')) return;
        const target = path.join(DIR, h.split('#')[0].split('?')[0]);
        if (!fs.existsSync(target)) out.deadlinks.push(vp.tag + '/' + p.name + ' -> ' + h);
      });

      // tabbar 是否存在且固定
      const hasTabbar = await page.locator('.tabbar').count();

      out.pages.push({
        vp: vp.tag, page: p.name,
        overflowW: ow, hScroll: hs,
        docH: await page.evaluate(() => document.documentElement.scrollHeight),
        errs: errs.length, tabbar: hasTabbar
      });
      if (ow > 1) out.overflow.push(vp.tag + '/' + p.name + ' = ' + ow + 'px');
      if (miss.length) out.missing.push(vp.tag + '/' + p.name + ' 缺: ' + miss.join(', '));
      errs.forEach(e => out.errors.push(e));

      // 截图（只截前 900px 高，兼顾整屏观感）
      await page.screenshot({
        path: path.join(SHOTS, vp.tag + '-' + p.name + '.png'),
        fullPage: false
      });
      await ctx.close();
    }
  }

  await browser.close();

  console.log(JSON.stringify(out, null, 1));
  console.log('\n================ 汇总 ================');
  console.log('渲染页次        :', out.pages.length);
  console.log('横向溢出        :', out.overflow.length, out.overflow.join(' | '));
  console.log('关键文案缺失    :', out.missing.length, out.missing.join(' | '));
  console.log('站内死链        :', out.deadlinks.length, Array.from(new Set(out.deadlinks)).join(' | '));
  console.log('console/pageerr :', out.errors.length, out.errors.slice(0, 6).join(' | '));
  console.log('缺 tabbar 的页  :', out.pages.filter(x => !x.tabbar).map(x => x.vp + '/' + x.page).join(' | ') || '无');
})();
