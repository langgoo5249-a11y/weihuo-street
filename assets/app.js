/* 尾货街 · 演示版交互脚本
   仅做前端展示交互：未开放功能提示、城市选择、搜索占位。
   不涉及任何后端调用。 */

(function () {
  'use strict';

  var CITIES = ['杭州', '广州', '义乌', '常熟', '虎门', '白沟', '南通', '佛山'];
  var CITY_KEY = 'wh_city';

  /* ---------- toast ---------- */
  var toastEl = null;
  var toastTimer = null;
  function toast(msg) {
    if (!toastEl) {
      toastEl = document.createElement('div');
      toastEl.className = 'toast';
      document.body.appendChild(toastEl);
    }
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove('show'); }, 1900);
  }

  /* ---------- 未开放功能统一提示 ---------- */
  document.addEventListener('click', function (e) {
    var el = e.target.closest ? e.target.closest('[data-todo]') : null;
    if (!el) return;
    e.preventDefault();
    var name = el.getAttribute('data-todo') || '该功能';
    toast('「' + name + '」在正式版开放');
  });

  /* ---------- 城市选择 ---------- */
  var cityBtn = document.getElementById('cityBtn');
  var cityName = document.getElementById('cityName');

  var saved = null;
  try { saved = window.localStorage.getItem(CITY_KEY); } catch (err) { saved = null; }
  if (saved && CITIES.indexOf(saved) !== -1 && cityName) cityName.textContent = saved;

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
    CITIES.forEach(function (c) {
      var b = document.createElement('button');
      b.type = 'button';
      b.textContent = c;
      if (cityName && cityName.textContent === c) b.className = 'on';
      b.addEventListener('click', function () {
        if (cityName) cityName.textContent = c;
        try { window.localStorage.setItem(CITY_KEY, c); } catch (err) {}
        closeSheet();
        toast('已切换到 ' + c + '（演示版仅切换显示）');
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

  if (cityBtn) {
    cityBtn.addEventListener('click', function (e) {
      e.preventDefault();
      openSheet();
    });
  }

  /* ---------- 搜索 ---------- */
  var q = document.getElementById('q');
  if (q) {
    q.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        var v = q.value.trim();
        toast(v ? '搜索「' + v + '」在正式版开放' : '请输入要搜的品类或市场');
      }
    });
  }

  /* ---------- 列表页品类筛选（仅前端高亮） ---------- */
  var filters = document.querySelectorAll('.filters .f');
  if (filters.length) {
    Array.prototype.forEach.call(filters, function (f) {
      f.addEventListener('click', function () {
        Array.prototype.forEach.call(filters, function (x) { x.classList.remove('on'); });
        f.classList.add('on');
      });
    });
  }
})();
