// 헤더 "+" 분류체계 오버레이 — /api/categories에서 분류 기준을 받아와 렌더링.
// 원형 점을 누르면 분류 기준(연도 → 매체 → ... )을 순환하며 전환한다 (기준이 늘어나도 그대로 동작).
// #plusBtn, #contentLayer, #taxonomyPanel, #taxonomyList, #dotToggle가 있는 페이지에서 공통 동작.
(function () {
  var plusBtn = document.getElementById("plusBtn");
  var contentLayer = document.getElementById("contentLayer");
  var taxonomyPanel = document.getElementById("taxonomyPanel");
  var taxonomyList = document.getElementById("taxonomyList");
  var dotToggle = document.getElementById("dotToggle");

  if (!plusBtn || !contentLayer || !taxonomyPanel || !taxonomyList || !dotToggle) {
    return;
  }

  var isOpen = false;
  var types = [];
  var typeIndex = 0;
  var loaded = false;

  function renderList() {
    var type = types[typeIndex];
    taxonomyList.innerHTML = "";
    if (!type) return;
    type.categories.forEach(function (category, index) {
      var li = document.createElement("li");
      var a = document.createElement("a");
      a.href = "category.html?type=" + encodeURIComponent(type.key) + "&value=" + encodeURIComponent(category.label);
      a.textContent = category.label;
      a.style.setProperty("--i", index);
      li.appendChild(a);
      taxonomyList.appendChild(li);
    });
  }

  function ensureLoaded() {
    if (loaded) return Promise.resolve();
    return fetch("/api/categories")
      .then(function (res) { return res.json(); })
      .then(function (data) {
        types = data.types || [];
        loaded = true;
      });
  }

  // 슬라이스된 카드(분류 항목) 바깥을 클릭하면 닫힘. "+"와 원형 점은 항상 예외.
  function outsideClickHandler(e) {
    if (taxonomyPanel.contains(e.target)) return;
    if (plusBtn.contains(e.target)) return;
    closePanel();
  }

  function openPanel() {
    ensureLoaded().then(function () {
      if (isOpen) return;
      isOpen = true;
      renderList();
      taxonomyPanel.hidden = false;
      contentLayer.classList.add("is-blurred");
      plusBtn.setAttribute("aria-expanded", "true");
      document.addEventListener("click", outsideClickHandler);
    });
  }

  function closePanel() {
    isOpen = false;
    taxonomyPanel.hidden = true;
    contentLayer.classList.remove("is-blurred");
    plusBtn.setAttribute("aria-expanded", "false");
    document.removeEventListener("click", outsideClickHandler);
  }

  // "+"는 항상 열기만 한다 (다시 눌러도 안 닫힘). 닫기는 바깥 클릭으로만.
  plusBtn.addEventListener("click", function () {
    openPanel();
  });

  // 원형 점은 오직 분류 기준 전환만 한다 (닫히지 않음).
  dotToggle.addEventListener("click", function () {
    if (types.length === 0) return;
    typeIndex = (typeIndex + 1) % types.length;
    renderList();
  });
})();
