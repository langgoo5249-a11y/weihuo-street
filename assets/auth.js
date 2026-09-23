/* 尾货街 · 登录 / 手机号绑定（全站共用）
   ------------------------------------------------------------------
   前期定位：只要能登录 + 绑定手机号。会员、支付、实名等后续功能，
   一律先落到「绑定手机号」这一步。

   验证码通道（双模式，自动切换）：
     · 本地验证模式（默认）—— 未配置 WH_CONFIG.smsApi 时启用。
       点「获取验证码」会真实生成 6 位码并显示在页面上，可以走完整个绑定流程。
       页面会显著标注「本地验证模式」，不伪装成已上线短信。
     · 短信通道模式 —— 在页面里设置 window.WH_CONFIG = { smsApi:'/api/sms', verifyApi:'/api/verify' }
       即自动改走后端。后端只需实现两个 POST 接口，前端代码不用改。

   登录态存 localStorage（wh_user_v1）。纯静态站无后端，因此：
     同一浏览器内有效，换设备/清缓存需要重新绑定。接后端后可无缝迁移。
*/
;(function (w, d) {
  'use strict';

  var U_KEY = 'wh_user_v1';       // 登录态
  var C_KEY = 'wh_code_v1';       // 验证码状态
  var T_KEY = 'wh_bar_closed';    // 状态条关闭标记
  var CODE_TTL = 5 * 60 * 1000;   // 验证码 5 分钟有效
  var RESEND_COOL = 60 * 1000;    // 60 秒重发冷却

  var CFG = w.WH_CONFIG || {};
  var SMS_API = CFG.smsApi || '';
  var VERIFY_API = CFG.verifyApi || '';
  var LOCAL_MODE = !SMS_API;

  /* ---------------- 存储 ---------------- */
  function sget(k) { try { return w.localStorage.getItem(k); } catch (e) { return null; } }
  function sset(k, v) { try { w.localStorage.setItem(k, v); } catch (e) {} }
  function sdel(k) { try { w.localStorage.removeItem(k); } catch (e) {} }
  function jget(k) { try { return JSON.parse(sget(k) || 'null'); } catch (e) { return null; } }

  /* ---------------- 手机号校验（按工信部在用号段） ---------------- */
  var PHONE_RE = /^1(?:3\d|4[5-9]|5[0-35-9]|6[2567]|7[0-8]|8\d|9\d)\d{8}$/;
  function phoneErr(p) {
    p = (p || '').replace(/\D/g, '');
    if (!p) return '请输入手机号';
    if (p.length < 11) return '手机号应为 11 位，还差 ' + (11 - p.length) + ' 位';
    if (p.length > 11) return '手机号超出 11 位';
    if (p.charAt(0) !== '1') return '手机号应以 1 开头';
    if (!PHONE_RE.test(p)) return '这个号段不存在，请核对后再填';
    return '';
  }
  function mask(p) {
    p = p || '';
    return p.length === 11 ? p.slice(0, 3) + '****' + p.slice(7) : p;
  }
  function uidOf(p) {
    var s = 2166136261, i;
    for (i = 0; i < p.length; i++) { s ^= p.charCodeAt(i); s = (s * 16777619) >>> 0; }
    return 'WH' + ('000000' + s.toString(36).toUpperCase()).slice(-6);
  }

  /* ---------------- 登录态 ---------------- */
  function getUser() {
    var u = jget(U_KEY);
    if (!u || !u.phone || !PHONE_RE.test(u.phone)) return null;
    return u;
  }
  function isBound() { return !!getUser(); }

  function signIn(phone) {
    var u = { phone: phone, masked: mask(phone), uid: uidOf(phone), bindAt: Date.now() };
    sset(U_KEY, JSON.stringify(u));
    sdel(C_KEY);
    sdel(T_KEY);          // 重新登录时让状态条再次出现
    emit();
    return u;
  }
  function signOut() {
    sdel(U_KEY);
    emit();
  }

  /* 登录态变化广播：其他脚本可监听 wh:auth */
  function emit() {
    var u = getUser();
    try {
      w.dispatchEvent(new w.CustomEvent('wh:auth', { detail: { user: u } }));
    } catch (e) {
      // 老浏览器兜底
      try { var ev = d.createEvent('Event'); ev.initEvent('wh:auth', true, true); w.dispatchEvent(ev); } catch (e2) {}
    }
  }

  /* ---------------- 验证码 ---------------- */
  function codeState() { return jget(C_KEY); }
  function genCode() { return String(Math.floor(100000 + Math.random() * 900000)); }

  function sendCode(phone, cb) {
    var st = codeState(), now = Date.now();
    if (st && st.phone === phone && st.sentAt && now - st.sentAt < RESEND_COOL) {
      var left = Math.ceil((RESEND_COOL - (now - st.sentAt)) / 1000);
      cb({ ok: false, msg: '请 ' + left + ' 秒后再获取验证码', cooldown: left });
      return;
    }
    if (SMS_API) {
      var xhr = new w.XMLHttpRequest();
      xhr.open('POST', SMS_API, true);
      xhr.setRequestHeader('Content-Type', 'application/json');
      xhr.onreadystatechange = function () {
        if (xhr.readyState !== 4) return;
        if (xhr.status >= 200 && xhr.status < 300) {
          sset(C_KEY, JSON.stringify({ phone: phone, sentAt: now, mode: 'sms' }));
          cb({ ok: true, local: false, msg: '验证码已发送至 ' + mask(phone) });
        } else {
          var m = '发送失败，请稍后重试';
          try { m = JSON.parse(xhr.responseText).message || m; } catch (e) {}
          cb({ ok: false, msg: m });
        }
      };
      xhr.onerror = function () { cb({ ok: false, msg: '网络异常，发送失败' }); };
      xhr.send(JSON.stringify({ phone: phone }));
      return;
    }
    var c = genCode();
    sset(C_KEY, JSON.stringify({ phone: phone, code: c, sentAt: now, mode: 'local' }));
    cb({ ok: true, local: true, code: c, msg: '验证码已生成' });
  }

  /* ---------------- 校验并登录 ---------------- */
  function verifyAndLogin(phone, code, cb) {
    var e = phoneErr(phone);
    if (e) { cb({ ok: false, msg: e }); return; }
    phone = phone.replace(/\D/g, '');
    if (!/^\d{6}$/.test(code || '')) { cb({ ok: false, msg: '请输入 6 位数字验证码' }); return; }

    var st = codeState();
    if (!st || st.phone !== phone) { cb({ ok: false, msg: '请先点「获取验证码」' }); return; }
    if (Date.now() - (st.sentAt || 0) > CODE_TTL) { cb({ ok: false, msg: '验证码已过期，请重新获取' }); return; }

    if (st.mode === 'sms') {
      if (!VERIFY_API) { cb({ ok: false, msg: '校验接口未配置' }); return; }
      var xhr = new w.XMLHttpRequest();
      xhr.open('POST', VERIFY_API, true);
      xhr.setRequestHeader('Content-Type', 'application/json');
      xhr.onreadystatechange = function () {
        if (xhr.readyState !== 4) return;
        var j = null;
        try { j = JSON.parse(xhr.responseText); } catch (e2) {}
        if (xhr.status >= 200 && xhr.status < 300 && j && j.ok !== false) {
          cb({ ok: true, user: signIn(phone) });
        } else {
          cb({ ok: false, msg: (j && j.message) || '验证码不正确' });
        }
      };
      xhr.onerror = function () { cb({ ok: false, msg: '网络异常，请重试' }); };
      xhr.send(JSON.stringify({ phone: phone, code: code }));
      return;
    }

    if (st.code !== code) { cb({ ok: false, msg: '验证码不正确，请核对后重填' }); return; }
    cb({ ok: true, user: signIn(phone) });
  }

  /* ---------------- 轻提示 ---------------- */
  var tEl = null, tTimer = null;
  function toast(msg) {
    if (!tEl) {
      tEl = d.createElement('div');
      tEl.className = 'toast';
      (d.body || d.documentElement).appendChild(tEl);
    }
    tEl.textContent = msg;
    tEl.classList.add('show');
    clearTimeout(tTimer);
    tTimer = setTimeout(function () { tEl.classList.remove('show'); }, 2200);
  }

  /* ---------------- 绑定浮层 ---------------- */
  var layer = null;
  var pendingCb = null;
  var RETURN_KEY = 'wh_after_bind';

  function buildLayer() {
    if (layer) return layer;
    layer = d.createElement('div');
    layer.className = 'wh-layer';
    layer.innerHTML =
      '<div class="wh-mask" data-wh="close"></div>' +
      '<div class="wh-card" role="dialog" aria-label="绑定手机号">' +
        '<div class="wh-hd"><b>绑定手机号</b><button type="button" class="wh-x" data-wh="close" aria-label="关闭">✕</button></div>' +
        '<p class="wh-sub">绑定后可发布货源、联系商家、收藏关注。只想逛逛的话，<b>不绑也能看全站</b>。</p>' +
        '<div class="wh-fld"><label for="whPhone">手机号</label>' +
          '<input id="whPhone" type="tel" inputmode="numeric" maxlength="11" autocomplete="tel" placeholder="11 位手机号"></div>' +
        '<div class="wh-fld"><label for="whCode">验证码</label>' +
          '<div class="wh-row"><input id="whCode" type="text" inputmode="numeric" maxlength="6" autocomplete="one-time-code" placeholder="6 位验证码">' +
          '<button type="button" class="wh-send" id="whSend">获取验证码</button></div></div>' +
        '<div class="wh-tip" id="whTip" hidden></div>' +
        '<button type="button" class="wh-go" id="whGo">绑定并登录</button>' +
        '<div class="wh-agree">绑定即表示同意 <a href="/terms">用户协议</a> 与 <a href="/privacy">隐私政策</a></div>' +
      '</div>';
    (d.body || d.documentElement).appendChild(layer);

    var phone = layer.querySelector('#whPhone');
    var code = layer.querySelector('#whCode');
    var send = layer.querySelector('#whSend');
    var go = layer.querySelector('#whGo');
    var tip = layer.querySelector('#whTip');

    function say(msg, ok) {
      tip.hidden = false;
      tip.textContent = msg;
      tip.className = 'wh-tip' + (ok ? ' ok' : ' bad');
    }

    layer.addEventListener('click', function (e) {
      var t = e.target.closest ? e.target.closest('[data-wh="close"]') : null;
      if (t) { closeLayer(); }
    });

    phone.addEventListener('input', function () {
      phone.value = phone.value.replace(/\D/g, '');
    });
    code.addEventListener('input', function () {
      code.value = code.value.replace(/\D/g, '');
    });
    phone.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); send.click(); } });
    code.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); go.click(); } });

    var cdTimer = null;
    function startCd(sec) {
      var n = sec;
      send.disabled = true;
      send.classList.add('off');
      send.textContent = n + ' 秒后重发';
      clearInterval(cdTimer);
      cdTimer = setInterval(function () {
        n--;
        if (n <= 0) {
          clearInterval(cdTimer);
          send.disabled = false;
          send.classList.remove('off');
          send.textContent = '重新获取';
        } else {
          send.textContent = n + ' 秒后重发';
        }
      }, 1000);
    }

    send.addEventListener('click', function () {
      var e = phoneErr(phone.value);
      if (e) { say(e, false); phone.focus(); return; }
      send.disabled = true;
      sendCode(phone.value.replace(/\D/g, ''), function (r) {
        if (!r.ok) {
          say(r.msg, false);
          send.disabled = false;
          if (r.cooldown) startCd(r.cooldown);
          return;
        }
        if (r.local) {
          // 本地验证模式：把码显示出来，让用户能走完流程；同时明确标注不是真短信
          say('本地验证模式（未接短信）：本次验证码 ' + r.code + '，5 分钟内有效', true);
          code.value = r.code;
        } else {
          say(r.msg, true);
        }
        startCd(60);
      });
    });

    go.addEventListener('click', function () {
      go.disabled = true;
      verifyAndLogin(phone.value, code.value, function (r) {
        go.disabled = false;
        if (!r.ok) { say(r.msg, false); return; }
        var u = r.user;
        closeLayer();
        toast('已绑定 ' + u.masked + '，登录成功');
        if (pendingCb) { var cb = pendingCb; pendingCb = null; cb(u); }
        else { var to = sget(RETURN_KEY); sdel(RETURN_KEY); if (to && /\/(publish|groups|vip|me)/.test(to)) w.location.href = to; else render(); }
        try { d.dispatchEvent(new w.CustomEvent('wh:bound', { detail: { user: u } })); } catch (e3) {}
      });
    });

    return layer;
  }

  function openLayer(cb, hint) {
    buildLayer();
    pendingCb = cb || null;
    var tip = layer.querySelector('#whTip');
    if (hint) { tip.hidden = false; tip.className = 'wh-tip bad'; tip.textContent = hint; } else { tip.hidden = true; }
    layer.classList.add('show');
    var c = getUser();
    var ph = layer.querySelector('#whPhone');
    if (c && c.phone) ph.value = c.phone;
    setTimeout(function () { (ph.value ? layer.querySelector('#whCode') : ph).focus(); }, 80);
  }
  function closeLayer() {
    if (!layer) return;
    layer.classList.remove('show');
    pendingCb = null;
  }

  /* ---------------- 需要绑定的动作 ---------------- */
  /* 用法：<a data-need="bind" data-back="/publish">发布货源</a>
     已绑定 → 正常跳转/执行；未绑定 → 弹绑定浮层，绑完再继续                       */
  function guardClick(e) {
    var el = e.target.closest ? e.target.closest('[data-need="bind"]') : null;
    if (!el) return;
    if (isBound()) return;
    e.preventDefault();
    e.stopPropagation();
    var back = el.getAttribute('data-back') || el.getAttribute('href') || '';
    if (back && back.charAt(0) === '/') sset(RETURN_KEY, back);
    openLayer(null, '这一步需要先绑定手机号');
    return false;
  }

  /* ---------------- 渲染登录态 ---------------- */
  function render() {
    var u = getUser();

    /* 1. tabbar「我的」→ 未登录时显示「登录」（只改图标后紧跟的那个文本节点） */
    var meTabs = d.querySelectorAll('.tabbar a[href="/me"]');
    Array.prototype.forEach.call(meTabs, function (a) {
      var ti = a.querySelector('.ti');
      var tn = ti && ti.nextSibling;
      if (tn && tn.nodeType === 3) tn.nodeValue = u ? '我的' : '登录';
    });

    /* 2. 顶栏状态条（仅已登录时插入） */
    var old = d.getElementById('whBar');
    if (old) old.parentNode.removeChild(old);
    if (!u) return;
    if (sget(T_KEY) === '1') return;
    var bar = d.createElement('div');
    bar.id = 'whBar';
    bar.className = 'wh-bar';
    bar.innerHTML = '<span class="wh-dot"></span>已绑定 <b>' + u.masked + '</b>' +
      '<span class="wh-uid">' + u.uid + '</span>' +
      '<a href="/me" class="wh-bar-a">我的</a>' +
      '<button type="button" class="wh-bar-x" aria-label="关闭">✕</button>';
    bar.querySelector('.wh-bar-x').addEventListener('click', function () {
      sset(T_KEY, '1');
      bar.parentNode.removeChild(bar);
    });
    var tb = d.querySelector('header.topbar') || d.querySelector('header.me-head');
    if (tb && tb.parentNode) tb.parentNode.insertBefore(bar, tb.nextSibling);
    else if (d.body) d.body.insertBefore(bar, d.body.firstChild);
  }

  /* ---------------- 对外 API ---------------- */
  var API = {
    user: getUser,
    isBound: isBound,
    open: openLayer,
    close: closeLayer,
    logout: function () {
      var u = getUser();
      signOut();
      toast(u ? '已退出登录' : '当前未登录');
      render();
      try { d.dispatchEvent(new w.CustomEvent('wh:auth', { detail: { user: null } })); } catch (e) {}
    },
    mask: mask,
    phoneErr: phoneErr,
    sendCode: sendCode,
    verify: verifyAndLogin,
    localMode: function () { return LOCAL_MODE; },
    render: render,
    toast: toast
  };
  w.WH_AUTH = API;

  /* ---------------- 启动 ---------------- */
  function init() {
    d.addEventListener('click', guardClick, true);
    render();
    /* 页面内声明式退出按钮 */
    d.addEventListener('click', function (e) {
      var el = e.target.closest ? e.target.closest('[data-auth="logout"]') : null;
      if (el) { e.preventDefault(); API.logout(); }
      var el2 = e.target.closest ? e.target.closest('[data-auth="open"]') : null;
      if (el2) { e.preventDefault(); openLayer(null); }
    });
  }
  if (d.readyState === 'loading') d.addEventListener('DOMContentLoaded', init);
  else init();
})(window, document);
