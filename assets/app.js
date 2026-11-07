/* ICE-study: 출제기준 점검표와 법규 퀴즈 */
(function () {
  "use strict";

  function store(key, value) {
    try {
      if (value === undefined) return JSON.parse(localStorage.getItem(key) || "null");
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) { return null; }
  }

  function el(tag, attrs, children) {
    var n = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      if (k === "text") n.textContent = attrs[k];
      else if (k === "html") n.innerHTML = attrs[k];
      else if (k === "class") n.className = attrs[k];
      else n.setAttribute(k, attrs[k]);
    });
    (children || []).forEach(function (c) { if (c) n.appendChild(c); });
    return n;
  }

  var TAG_LABEL = { "new": "2026 신설", chg: "2026 변경" };
  function tagEl(t, note) {
    if (!t) return null;
    var s = el("span", { "class": "tag " + t, text: TAG_LABEL[t] || t });
    if (note) s.title = note;
    return s;
  }

  /* ---------- 출제기준 점검표 ---------- */
  function renderSyllabus(root, data) {
    var KEY = "ice-syllabus-2026v1";
    var state = store(KEY) || {};
    var onlyNew = document.getElementById("only-new");
    var openAll = document.getElementById("open-all");
    var reset = document.getElementById("reset-checks");
    var summary = document.getElementById("syl-summary");

    data.subjects.forEach(function (s, si) {
      var bar = el("span");
      var prog = el("span", { "class": "progress" }, [bar]);
      var pct = el("span", { "class": "pct" });
      var sum = el("summary", null, [
        el("span", { text: s.name }),
        el("span", { "class": "note", text: s.kind + (s.count ? " · " + s.count + "문항" : "") }),
        prog, pct
      ]);
      var body = el("div", { "class": "subject-body" });
      var det = el("details", { "class": "subject" }, [sum, body]);
      if (si === 0) det.open = true;

      s.mains.forEach(function (m, mi) {
        var mh = el("h3", { text: (mi + 1) + ". " + m.name });
        var t = tagEl(m.tag, m.note); if (t) mh.appendChild(t);
        var mdiv = el("div", { "class": "main-item" }, [mh]);
        if (m.note) mdiv.appendChild(el("div", { "class": "note", text: m.note }));
        m.subs.forEach(function (u, ui) {
          var uh = el("div", { "class": "sub-item", text: (mi + 1) + "-" + (ui + 1) + " " + u.name });
          var ut = tagEl(u.tag, u.note); if (ut) uh.appendChild(ut);
          var ul = el("ul", { "class": "checks" });
          u.items.forEach(function (it, ii) {
            var text = typeof it === "string" ? it : it[0];
            var tg = typeof it === "string" ? null : it[1];
            var nt = typeof it === "string" ? null : it[2];
            var id = "c" + si + "-" + mi + "-" + ui + "-" + ii;
            var cb = el("input", { type: "checkbox", id: id });
            cb.checked = !!state[id];
            var lab = el("label", { "for": id, text: text });
            var tt = tagEl(tg || (m.tag === "new" ? "new" : (u.tag === "new" ? "new" : null)), nt);
            if (tt) lab.appendChild(tt);
            if (nt) lab.appendChild(el("span", { "class": "note", text: " (" + nt + ")" }));
            var li = el("li", null, [cb, lab]);
            li.dataset.isnew = (tg || m.tag === "new" || u.tag === "new") ? "1" : "0";
            if (cb.checked) li.classList.add("done");
            cb.addEventListener("change", function () {
              state[id] = cb.checked; if (!cb.checked) delete state[id];
              li.classList.toggle("done", cb.checked);
              store(KEY, state); update();
            });
            ul.appendChild(li);
          });
          mdiv.appendChild(uh); mdiv.appendChild(ul);
        });
        body.appendChild(mdiv);
      });
      det._bar = bar; det._pct = pct;
      root.appendChild(det);
    });

    function update() {
      var tot = 0, done = 0, newTot = 0, newDone = 0;
      root.querySelectorAll("details.subject").forEach(function (d) {
        var boxes = d.querySelectorAll("input[type=checkbox]");
        var c = 0; boxes.forEach(function (b) {
          if (b.checked) c++;
          if (b.closest("li").dataset.isnew === "1") { newTot++; if (b.checked) newDone++; }
        });
        tot += boxes.length; done += c;
        var p = boxes.length ? Math.round(c * 100 / boxes.length) : 0;
        d._bar.style.width = p + "%"; d._pct.textContent = c + "/" + boxes.length + " (" + p + "%)";
      });
      if (summary) summary.textContent = "전체 " + done + "/" + tot + " 완료 · 2026 신설·변경 " + newDone + "/" + newTot;
    }
    function applyFilter() {
      var on = onlyNew && onlyNew.checked;
      root.querySelectorAll("ul.checks li").forEach(function (li) {
        li.classList.toggle("hidden", on && li.dataset.isnew !== "1");
      });
    }
    if (onlyNew) onlyNew.addEventListener("change", applyFilter);
    if (openAll) openAll.addEventListener("click", function () {
      var ds = root.querySelectorAll("details.subject");
      var anyClosed = Array.prototype.some.call(ds, function (d) { return !d.open; });
      ds.forEach(function (d) { d.open = anyClosed; });
      openAll.textContent = anyClosed ? "모두 접기" : "모두 펼치기";
    });
    if (reset) reset.addEventListener("click", function () {
      if (!confirm("체크 표시를 모두 지울까요? 이 브라우저에 저장된 진도만 지워집니다.")) return;
      state = {}; store(KEY, state);
      root.querySelectorAll("input[type=checkbox]").forEach(function (b) { b.checked = false; b.closest("li").classList.remove("done"); });
      update();
    });
    update();
  }

  /* ---------- 법규 퀴즈 ---------- */
  function renderQuiz(root, items) {
    var scoreEl = document.getElementById("quiz-score");
    var order = items.map(function (_, i) { return i; });
    var result = {};

    function draw(list) {
      root.innerHTML = "";
      result = {};
      list.forEach(function (idx, n) {
        var it = items[idx];
        var box = el("div", { "class": "q" });
        box.appendChild(el("div", { "class": "stem", text: (n + 1) + ". " + it.q }));
        var opts = el("div", { "class": "opts" + (it.type === "mc" ? " col" : "") });
        var choices = it.type === "ox" ? ["O", "X"] : it.opts;
        var answer = it.type === "ox" ? it.a : it.a;
        var exp = el("div", { "class": "exp hidden" });
        choices.forEach(function (c, ci) {
          var label = it.type === "mc" ? ["①", "②", "③", "④", "⑤"][ci] + " " + c : c;
          var b = el("button", { type: "button", text: label });
          b.addEventListener("click", function () {
            if (result[idx] !== undefined) return;
            var ok = it.type === "ox" ? c === answer : ci === answer;
            result[idx] = ok;
            b.classList.add(ok ? "correct" : "incorrect");
            if (!ok) {
              var buttons = opts.querySelectorAll("button");
              var ri = it.type === "ox" ? (answer === "O" ? 0 : 1) : answer;
              buttons[ri].classList.add("correct");
            }
            exp.innerHTML = "";
            exp.appendChild(el("span", { "class": "tag " + (ok ? "ok" : "bad"), text: ok ? "정답" : "오답" }));
            exp.appendChild(document.createTextNode(" " + it.exp));
            exp.appendChild(el("span", { "class": "src", text: "근거: " + it.src }));
            exp.classList.remove("hidden");
            score(list.length);
          });
          opts.appendChild(b);
        });
        box.appendChild(opts); box.appendChild(exp);
        root.appendChild(box);
      });
      score(list.length);
    }
    function score(total) {
      var done = Object.keys(result).length;
      var ok = Object.keys(result).filter(function (k) { return result[k]; }).length;
      if (scoreEl) scoreEl.textContent = "푼 문제 " + done + "/" + total + " · 정답 " + ok;
    }
    function shuffle(a) {
      for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; }
      return a;
    }
    var btnShuffle = document.getElementById("quiz-shuffle");
    var btnWrong = document.getElementById("quiz-wrong");
    var btnReset = document.getElementById("quiz-reset");
    if (btnShuffle) btnShuffle.addEventListener("click", function () { order = shuffle(order.slice()); draw(order); });
    if (btnWrong) btnWrong.addEventListener("click", function () {
      var wrong = Object.keys(result).filter(function (k) { return !result[k]; }).map(Number);
      if (!wrong.length) { alert("아직 틀린 문제가 없습니다."); return; }
      order = wrong; draw(order);
    });
    if (btnReset) btnReset.addEventListener("click", function () { order = items.map(function (_, i) { return i; }); draw(order); });
    draw(order);
  }

  document.addEventListener("DOMContentLoaded", function () {
    var syl = document.getElementById("syllabus");
    if (syl && window.SYLLABUS) renderSyllabus(syl, window.SYLLABUS);
    var quiz = document.getElementById("quiz");
    if (quiz && window.QUIZ) renderQuiz(quiz, window.QUIZ);
  });
})();
