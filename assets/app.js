/* 尾货街 weihuo.zangxixitech.cn —— 站点交互
   纯前端：搜索 / 品类 / 城市 / 排序 均为真实过滤，数据来自页面 DOM 的 data-* 属性。
   无后端调用。 */
(function () {
  'use strict';

  var CITIES = ['杭州', '广州', '义乌', '常熟', '虎门', '南通', '佛山'];
  var CITY_KEY = 'wh_city';
  var ALL_CITY = '全部城市';

  /* ---------------- 工具 ---------------- */
  function qs(name) {
    var m = new RegExp('[?&]' + name + '=([^&#]*)').exec(window.location.search);
    return m ? decodeURIComponent(m[1].replace(/\+/g, ' ')) : '';
  }
  function lsGet(k) { try { return window.localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { window.localStorage.setItem(k, v); } catch (e) {} }

  var toastEl = null, toastTimer = null;
  function toast(msg) {
    if (!toastEl) {
      toastEl = document.createElement('div');
      toastEl.className = 'toast';
      document.body.appendChild(toastEl);
    }
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove('show'); }, 2000);
  }

  /* ---------------- 未开放功能统一提示 ---------------- */
  document.addEventListener('click', function (e) {
    var el = e.target.closest ? e.target.closest('[data-todo]') : null;
    if (!el) return;
    e.preventDefault();
    toast('「' + (el.getAttribute('data-todo') || '该功能') + '」即将开放');
  });

  /* ---------------- 状态 ---------------- */
  var state = {
    q: qs('q'),
    cat: qs('cat'),
    city: qs('city') || lsGet(CITY_KEY) || '',
    sort: qs('sort') || 'all'
  };
  if (state.city && CITIES.indexOf(state.city) === -1) state.city = '';

  var cityBtn = document.getElementById('cityBtn');
  var cityName = document.getElementById('cityName');
  var rowsBox = document.getElementById('rows');
  var emptyBox = document.getElementById('empty');

  function paintCity() {
    if (cityName) cityName.textContent = state.city || ALL_CITY;
    var r = document.getElementById('regionChip');
    if (r) r.textContent = (state.city ? '地区：' + state.city : '地区 ▾') + ' ▾';
  }

  if (state.city) lsSet(CITY_KEY, state.city);

  /* ---------------- 城市选择面板 ---------------- */
  var mask = null, sheet = null;
  function buildSheet() {
    mask = document.createElement('div');
    mask.className = 'sheet-mask';
    sheet = document.createElement('div');
    sheet.className = 'sheet';

    var h = document.createElement('div');
    h.className = 'sheet-h';
    h.innerHTML = '<b>选择城市</b><span>看哪个城市的市场</span>';
    sheet.appendChild(h);

    var box = document.createElement('div');
    box.className = 'sheet-cities';

    [ALL_CITY].concat(CITIES).forEach(function (c) {
      var b = document.createElement('button');
      b.type = 'button';
      b.textContent = c;
      var cur = state.city || ALL_CITY;
      if (cur === c) b.className = 'on';
      b.addEventListener('click', function () {
        state.city = (c === ALL_CITY) ? '' : c;
        lsSet(CITY_KEY, state.city);
        paintCity();
        apply();
        closeSheet();
        toast(state.city ? '已切换到 ' + state.city : '已显示全部城市');
      });
      box.appendChild(b);
    });

    sheet.appendChild(box);
    document.body.appendChild(mask);
    document.body.appendChild(sheet);
    mask.addEventListener('click', closeSheet);
  }
  function openSheet() {
    if (!sheet) buildSheet();
    mask.classList.add('show');
    sheet.classList.add('show');
  }
  function closeSheet() {
    if (!mask) return;
    mask.classList.remove('show');
    sheet.classList.remove('show');
  }
  if (cityBtn) cityBtn.addEventListener('click', function (e) { e.preventDefault(); openSheet(); });

  /* ---------------- 搜索 ---------------- */
  var q = document.getElementById('q');
  if (q && state.q) q.value = state.q;

  function doSearch() {
    if (!q) return;
    state.q = q.value.trim();
    if (rowsBox) { apply(); }
    else if (state.q) { window.location.href = '/huoyuan?q=' + encodeURIComponent(state.q); }
    else toast('请输入要搜的品类或市场');
  }
  if (q) {
    q.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { e.preventDefault(); doSearch(); }
    });
  }
  var goBtn = document.getElementById('searchGo');
  if (goBtn) goBtn.addEventListener('click', function (e) { e.preventDefault(); doSearch(); });

  /* ---------------- 列表过滤 + 排序 ---------------- */
  var items = [];
  function collect() {
    if (!rowsBox) return;
    items = Array.prototype.map.call(rowsBox.querySelectorAll('[data-cat]'), function (el) {
      return {
        el: el,
        cat: el.getAttribute('data-cat') || '',
        city: el.getAttribute('data-city') || '',
        price: parseFloat(el.getAttribute('data-price')) || 0,
        moq: parseFloat(el.getAttribute('data-moq')) || 0,
        isNew: parseInt(el.getAttribute('data-new'), 10) || 99,
        text: (el.getAttribute('data-title') || '') + ' ' + (el.textContent || '')
      };
    });
  }

  function apply() {
    if (!rowsBox) return;
    if (!items.length) collect();

    var kw = state.q.toLowerCase();
    var shown = 0;

    items.forEach(function (it) {
      var ok = true;
      if (state.cat && it.cat !== state.cat) ok = false;
      if (ok && state.city && it.city !== state.city) ok = false;
      if (ok && kw && it.text.toLowerCase().indexOf(kw) === -1) ok = false;
      it.el.style.display = ok ? '' : 'none';
      if (ok) shown++;
    });

    // 排序
    var sorted = items.slice();
    if (state.sort === 'new') sorted.sort(function (a, b) { return a.isNew - b.isNew; });
    else if (state.sort === 'price') sorted.sort(function (a, b) { return a.price - b.price; });
    else if (state.sort === 'moq') sorted.sort(function (a, b) { return a.moq - b.moq; });
    else sorted.sort(function (a, b) { return a.isNew - b.isNew; });
    sorted.forEach(function (it) { rowsBox.appendChild(it.el); });

    if (emptyBox) emptyBox.hidden = shown > 0;
    syncUrl();
  }

  function syncUrl() {
    if (!rowsBox || !window.history || !window.history.replaceState) return;
    var p = [];
    if (state.q) p.push('q=' + encodeURIComponent(state.q));
    if (state.cat) p.push('cat=' + encodeURIComponent(state.cat));
    if (state.city) p.push('city=' + encodeURIComponent(state.city));
    if (state.sort && state.sort !== 'all') p.push('sort=' + state.sort);
    window.history.replaceState(null, '', p.length ? '/huoyuan?' + p.join('&') : '/huoyuan');
  }

  // 筛选栏
  var chips = document.querySelectorAll('.filters .f');
  var SORT_MAP = { '综合': 'all', '最新发布': 'new', '价格从低到高': 'price', '起批量小': 'moq' };
  if (chips.length) {
    Array.prototype.forEach.call(chips, function (c) {
      c.addEventListener('click', function () {
        var t = (c.textContent || '').replace(/\s*▾\s*$/, '').trim();
        if (t.indexOf('地区') === 0) { openSheet(); return; }
        if (t.indexOf('品类') === 0) { openCatSheet(); return; }
        var m = SORT_MAP[t];
        if (!m) return;
        state.sort = m;
        Array.prototype.forEach.call(chips, function (x) { x.classList.remove('on'); });
        c.classList.add('on');
        apply();
      });
    });
  }

  // 品类面板
  var CATS = ['全部', '女装', '男装', '童装', '鞋靴', '箱包', '家纺', '百货', '美妆', '玩具'];
  var cmask = null, csheet = null;
  function openCatSheet() {
    if (!csheet) {
      cmask = document.createElement('div');
      cmask.className = 'sheet-mask';
      csheet = document.createElement('div');
      csheet.className = 'sheet';
      var h = document.createElement('div');
      h.className = 'sheet-h';
      h.innerHTML = '<b>选择品类</b><span>只看你要收的货</span>';
      csheet.appendChild(h);
      var box = document.createElement('div');
      box.className = 'sheet-cities';
      CATS.forEach(function (c) {
        var b = document.createElement('button');
        b.type = 'button';
        b.textContent = c;
        if ((state.cat || '全部') === c) b.className = 'on';
        b.addEventListener('click', function () {
          state.cat = (c === '全部') ? '' : c;
          var pc = document.getElementById('catChip');
          if (pc) pc.textContent = (state.cat ? '品类：' + state.cat : '品类 ▾') + ' ▾';
          cmask.classList.remove('show');
          csheet.classList.remove('show');
          apply();
        });
        box.appendChild(b);
      });
      csheet.appendChild(box);
      document.body.appendChild(cmask);
      document.body.appendChild(csheet);
      cmask.addEventListener('click', function () {
        cmask.classList.remove('show');
        csheet.classList.remove('show');
      });
    }
    cmask.classList.add('show');
    csheet.classList.add('show');
  }

  /* ---------------- 首页品类标签（不跳页，直接带参） ---------------- */
  var tags = document.querySelectorAll('.tags .tag');
  if (tags.length) {
    Array.prototype.forEach.call(tags, function (t) {
      var label = (t.textContent || '').trim();
      if (label === '全部') t.setAttribute('href', '/huoyuan');
      else t.setAttribute('href', '/huoyuan?cat=' + encodeURIComponent(label));
    });
  }

  /* ---------------- 图片兜底 ---------------- */
  document.addEventListener('error', function (e) {
    var t = e.target;
    if (t && t.tagName === 'IMG' && !t.dataset.fallback) {
      t.dataset.fallback = '1';
      t.style.background = 'linear-gradient(135deg,#EDEFF2,#DDE1E7)';
      t.removeAttribute('src');
    }
  }, true);

  /* ---------------- 启动 ---------------- */
  paintCity();
  if (state.cat) {
    var pc0 = document.getElementById('catChip');
    if (pc0) pc0.textContent = '品类：' + state.cat + ' ▾';
  }
  if (rowsBox) {
    apply();
  } else if (q && !q.value && cityName) {
    // 首页仅展示城市
  }
})();
