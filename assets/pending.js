/* 尾货街 · 待开放动作统一处理
   ------------------------------------------------------------------
   解决的问题：站内有一批按钮点下去只弹一句"即将开放"，用户感受就是「点击无反应」。

   这里的做法是：任何一个还没做完的功能，点下去都要给出三样东西 ——
     · 这个功能是干什么的（不是黑箱）
     · 现在能不能用、卡在哪一步
     · 现在马上可以做的具体动作（绑手机号 / 复制客服微信 / 登记）

   用法：<button data-pending="group-join" data-pending-name="加入广州尾货批发群">申请加入</button>
   兜底：未登记的功能、以及老的 data-todo 按钮，都会走通用分支，不再只弹一句 toast。
*/
;(function (w, d) {
  'use strict';

  var WX = 'SXLH-888';

  var REG = {
    'group-join': {
      title: '加入微信群',
      kind: 'bind',
      desc: '微信群是拿货、甩货真正发生的地方。进群要先绑定手机号——群主才愿意放人，平台也才好对群成员负责。',
      steps: ['绑定手机号（约 30 秒，验证码直接给）', '绑定后把对应群主的联系方式推送给你', '着急的话直接加客服微信，备注要进的群名，可优先安排']
    },
    'contact': {
      title: '查看商家联系方式',
      kind: 'pending',
      desc: '平台的货源目前是「市场级真实行情」，档口级的电话与微信还没有收录，所以这一栏暂时没有可显示的内容。',
      steps: ['先看市场名录，找到你要去的市场，价位和拿货规则在上面', '需要找具体档口，加客服微信说清品类和市场，帮你问', '档口级联系方式会随商家入驻逐步开放']
    },
    'fav': {
      title: '收藏货源',
      kind: 'bind',
      desc: '收藏夹跟着你的手机号走，换页面也不会丢。',
      steps: ['绑定手机号', '绑定后点收藏即保存，在「我的」里能看到']
    },
    'publish': {
      title: '发布货源 / 采购需求',
      kind: 'bind',
      desc: '发布本身免费、不限条数。绑手机号是为了让有意向的人能联系到你。',
      steps: ['绑定手机号', '绑定后即可提交，提交内容先由平台人工过一遍', '平台不参与交易、不担保货物质量，请自行核实对方']
    },
    'publish-demand': {
      title: '发布采购需求',
      kind: 'bind',
      desc: '把你要找的品类、数量、地区发出来，让有货的档口来联系你。',
      steps: ['绑定手机号', '填好品类、数量、目标价区间后提交', '急单可以直接加客服微信，让客服帮你转给有货的档口']
    },
    'msg': {
      title: '站内消息',
      kind: 'bind',
      desc: '消息中心和手机号绑定，用来收"有人回复了你"的提醒。',
      steps: ['绑定手机号', '绑定后消息进入「我的 → 消息」', '短信提醒功能会随后开放，现阶段先站内红点']
    },
    'verify': {
      title: '实名认证',
      kind: 'pending',
      desc: '实名认证还没开放。它本来是为了解决"加群不限次"这类功能的追溯问题，所以随会员功能一起上线。',
      steps: ['前期用不到——发布货源、联系商家只需要绑定手机号', '想优先体验可以登记意向，开放后按登记顺序通知', '有问题直接加客服微信']
    },
    'vip': {
      title: '开通会员',
      kind: 'pending',
      desc: '会员功能还在开发中，暂未开放购买。现阶段绑定手机号就能免费发布货源、联系商家，不需要付费。',
      steps: ['先绑定手机号，免费发布与联系已经够用', '想优先体验可以登记意向，开放后按登记顺序通知', '加客服微信可优先安排']
    },
    'join': {
      title: '成为商家 / 入驻',
      kind: 'pending',
      desc: '商家入驻还在开发中，暂未开放自助提交。现在要挂档口信息的话，走人工登记。',
      steps: ['加客服微信，把市场、档口、主营品类、联系方式发过去', '平台人工核对后录入', '入驻不收费']
    },
    'report': {
      title: '举报与投诉',
      kind: 'manual',
      desc: '举报目前走人工受理。平台不参与交易，只能对站内信息做下架处理，交易纠纷请同时拨打 12315。',
      steps: ['保存好聊天记录、转账凭证、对方账号', '加客服微信提交，注明对方发布的信息标题', '平台核实后会下架信息并封禁账号']
    },
    'shop': {
      title: '进入档口主页',
      kind: 'pending',
      desc: '档口独立主页还在开发中。现在平台的货源以「市场级真实行情」为主，档口级信息随商家入驻逐步补充。',
      steps: ['先看市场名录，找到你要去的市场', '价位和拿货规则在行情页都有', '想找具体档口可加客服微信代问']
    },
    'ad': {
      title: '广告位咨询',
      kind: 'manual',
      desc: '首页轮播广告位是付费位置，目前在人工接单阶段。',
      steps: ['加客服微信，说明是广告位咨询', '确认档期与价格后由客服排期', '平台会标注广告位，不做混淆']
    },
    'demand-view': {
      title: '查看采购需求',
      kind: 'pending',
      desc: '平台目前还没有真实的采购需求数据——这一栏里现在的几条是建站期的示例内容，我们不打算拿示例当真实信息给你看。',
      steps: ['先看「批发市场名录」和「货源行情」，这两块是真实公开数据', '想让有货的档口来找你，可以直接发布你的采购需求', '需要人工牵线，加客服微信，把品类和数量说清楚']
    }
  };

  var GENERIC = {
    title: '这个功能还没做好',
    kind: 'pending',
    desc: '平台在分批上线功能。这个入口暂时还没有实际动作，不瞒你。',
    steps: ['先把手机号绑上，能用的功能会第一时间解锁', '需要人工处理的事，加客服微信直接说', '客服微信：' + WX]
  };

  /* ---------------- 通用小工具 ---------------- */
  function toast(msg) {
    if (w.WH_AUTH && w.WH_AUTH.toast) { w.WH_AUTH.toast(msg); return; }
    var el = d.getElementById('wh-t2');
    if (!el) {
      el = d.createElement('div');
      el.id = 'wh-t2';
      el.className = 'toast';
      (d.body || d.documentElement).appendChild(el);
    }
    el.textContent = msg;
    el.classList.add('show');
    setTimeout(function () { el.classList.remove('show'); }, 2200);
  }

  function copyWx() {
    var txt = WX;
    var done = function () { toast('客服微信号已复制：' + txt); };
    if (w.navigator && w.navigator.clipboard && w.navigator.clipboard.writeText) {
      w.navigator.clipboard.writeText(txt).then(done, function () { fallback(); });
    } else { fallback(); }
    function fallback() {
      try {
        var ta = d.createElement('textarea');
        ta.value = txt;
        ta.style.cssText = 'position:fixed;left:-9999px;top:0';
        d.body.appendChild(ta);
        ta.select();
        d.execCommand('copy');
        d.body.removeChild(ta);
        done();
      } catch (e) { toast('客服微信号：' + txt); }
    }
  }

  /* ---------------- 浮层 ---------------- */
  var layer = null;

  function build() {
    layer = d.createElement('div');
    layer.className = 'wh-layer';
    layer.innerHTML =
      '<div class="wh-mask" data-pd="close"></div>' +
      '<div class="wh-card" role="dialog">' +
        '<div class="wh-hd"><b id="pdTitle">功能说明</b><button type="button" class="wh-x" data-pd="close" aria-label="关闭">✕</button></div>' +
        '<div class="pd-body" id="pdBody"></div>' +
        '<div class="pd-acts" id="pdActs"></div>' +
      '</div>';
    (d.body || d.documentElement).appendChild(layer);
    layer.addEventListener('click', function (e) {
      var t = e.target.closest ? e.target.closest('[data-pd="close"]') : null;
      if (t) close();
    });
    return layer;
  }

  function open(label, key) {
    var info = REG[key] || GENERIC;
    if (!layer) build();

    var hc = layer.querySelector('#pdTitle');
    hc.textContent = (key === 'group-join' && label) ? (info.title + ' · ' + label) : info.title;

    var body = layer.querySelector('#pdBody');
    var cls = info.kind === 'bind' ? 'pd-state bind' : (info.kind === 'manual' ? 'pd-state manual' : 'pd-state wait');
    var stext = info.kind === 'bind' ? '▸ 绑定手机号后即可使用'
      : (info.kind === 'manual' ? '▸ 目前人工受理' : '▸ 功能开发中');
    body.innerHTML =
      '<div class="' + cls + '">' + stext + '</div>' +
      '<p class="pd-desc">' + info.desc + '</p>' +
      '<div class="pd-h">现在可以这样做</div>' +
      '<ol class="pd-steps">' + info.steps.map(function (s) { return '<li>' + s + '</li>'; }).join('') + '</ol>';

    var acts = layer.querySelector('#pdActs');
    acts.innerHTML = '';
    var bound = w.WH_AUTH ? w.WH_AUTH.isBound() : false;

    if (info.kind === 'bind' && !bound) {
      acts.appendChild(mkBtn('绑定手机号并继续', 'pd-main', function () {
        close();
        w.WH_AUTH.open(function () { toast('已绑定手机号，这个功能现在可以用了'); }, '这一步需要先绑定手机号');
      }));
    } else if (info.kind === 'bind' && bound) {
      acts.appendChild(mkBtn('已绑定手机号 · 提交', 'pd-main', function () {
        recordSubmit(key, info.title);
        close();
        toast('已提交「' + info.title + '」，平台人工核对后处理');
      }));
    } else {
      acts.appendChild(mkBtn('记下我的意向', 'pd-main', function () {
        recordApply(key, info.title);
        toast('已记下：' + info.title + '，开放后通知你');
      }));
    }

    acts.appendChild(mkBtn('复制客服微信号 ' + WX, 'pd-ghost', copyWx));
    layer.classList.add('show');
  }

  /* 记录一条提交（绑过手机的操作） */
  function recordSubmit(key, name) {
    try {
      var u = w.WH_AUTH && w.WH_AUTH.user();
      var k = 'wh_submit_v1';
      var arr = [];
      try { arr = JSON.parse(w.localStorage.getItem(k) || '[]') || []; } catch (e) { arr = []; }
      arr.push({ key: key, name: name, uid: u ? u.uid : '', phone: u ? u.masked : '', at: Date.now() });
      w.localStorage.setItem(k, JSON.stringify(arr));
    } catch (e2) {}
  }

  /* 记录一条"功能意向"登记 */
  function recordApply(key, name) {
    try {
      var u = w.WH_AUTH && w.WH_AUTH.user();
      var k = 'wh_apply_v1';
      var arr = [];
      try { arr = JSON.parse(w.localStorage.getItem(k) || '[]') || []; } catch (e) { arr = []; }
      arr = arr.filter(function (x) { return x.key !== key; });
      arr.push({ key: key, name: name, uid: u ? u.uid : '', phone: u ? u.masked : '', at: Date.now() });
      w.localStorage.setItem(k, JSON.stringify(arr));
    } catch (e2) {}
  }

  function mkBtn(text, cls, fn) {
    var b = d.createElement('button');
    b.type = 'button';
    b.className = cls;
    b.textContent = text;
    b.addEventListener('click', fn);
    return b;
  }

  function close() {
    if (layer) layer.classList.remove('show');
  }

  /* ---------------- 接管点击 ---------------- */
  /* 模板里那几个"点下去只弹正在接入"的按钮，用 id 绑定，这里按 id 接管。
     注意：绝不能放登录页的 btnCode / btnLogin / btnRebind / btnOut，那些是真功能。 */
  var ID_MAP = { btnSubmit: 'publish', btnPhoto: 'publish', btnJoin: 'join', btnVerify: 'verify' };

  d.addEventListener('click', function (e) {
    if (!e.target.closest) return;
    var el = e.target.closest('[data-pending]');
    var key = '', label = '';
    if (el) {
      key = el.getAttribute('data-pending') || '';
      label = el.getAttribute('data-pending-name') || '';
    } else {
      el = e.target.closest('[data-todo]');
      if (el) {
        label = el.getAttribute('data-todo') || '';
      } else {
        var idEl = e.target.closest('button[id]');
        var id = idEl ? idEl.id : '';
        if (!id || !Object.prototype.hasOwnProperty.call(ID_MAP, id)) return;
        el = idEl;
        key = ID_MAP[id];
      }
    }
    e.preventDefault();
    e.stopPropagation();
    open(label, key);
    return false;
  }, true);

  w.WH_PENDING = { open: open, reg: REG, wx: WX };
})(window, document);
