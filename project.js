// 프로젝트 상세 페이지 — id로 데이터를 fetch해서 렌더링하고,
// 같은 분류(연도 또는 매체 등) 내에서 최신순 기준 이전/다음 프로젝트로 이동하는 원형 점을 연결한다.
(function () {
  // "[텍스트](https://...)" 형식을 실제 링크로 변환해서 el 안에 렌더링한다.
  // href는 http/https만 허용(그 외 스킴은 텍스트로만 남김, javascript: 등 방지).
  var LINK_PATTERN = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g;

  function renderLinkedText(el, text) {
    el.innerHTML = "";
    if (!text) return;
    var lastIndex = 0;
    var match;
    LINK_PATTERN.lastIndex = 0;
    while ((match = LINK_PATTERN.exec(text))) {
      if (match.index > lastIndex) {
        el.appendChild(document.createTextNode(text.slice(lastIndex, match.index)));
      }
      var a = document.createElement("a");
      a.href = match[2];
      a.textContent = match[1];
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      el.appendChild(a);
      lastIndex = LINK_PATTERN.lastIndex;
    }
    if (lastIndex < text.length) {
      el.appendChild(document.createTextNode(text.slice(lastIndex)));
    }
  }

  // 라이트박스 — 이미지 클릭 시 크게 보기. 확대된 이미지의 좌/우 절반을 클릭하면 이전/다음 이미지로 이동.
  var lightboxImages = [];
  var lightboxIndex = 0;
  var lightboxOverlay = null;
  var lightboxImg = null;

  function initLightbox() {
    if (lightboxOverlay) return;
    lightboxOverlay = document.createElement("div");
    lightboxOverlay.className = "lightbox-overlay";

    lightboxImg = document.createElement("img");
    lightboxImg.className = "lightbox-img";

    var prevZone = document.createElement("div");
    prevZone.className = "lightbox-zone lightbox-zone-prev";
    prevZone.addEventListener("click", function (e) { e.stopPropagation(); lightboxNav(-1); });

    var nextZone = document.createElement("div");
    nextZone.className = "lightbox-zone lightbox-zone-next";
    nextZone.addEventListener("click", function (e) { e.stopPropagation(); lightboxNav(1); });

    var closeBtn = document.createElement("button");
    closeBtn.type = "button";
    closeBtn.className = "lightbox-close";
    closeBtn.textContent = "×";
    closeBtn.addEventListener("click", function (e) { e.stopPropagation(); closeLightbox(); });

    var stage = document.createElement("div");
    stage.className = "lightbox-stage";
    stage.appendChild(lightboxImg);
    stage.appendChild(prevZone);
    stage.appendChild(nextZone);

    lightboxOverlay.appendChild(stage);
    lightboxOverlay.appendChild(closeBtn);
    lightboxOverlay.addEventListener("click", function (e) {
      if (e.target === lightboxOverlay) closeLightbox();
    });
    document.body.appendChild(lightboxOverlay);

    document.addEventListener("keydown", function (e) {
      if (!lightboxOverlay.classList.contains("is-active")) return;
      if (e.key === "Escape") closeLightbox();
      if (e.key === "ArrowLeft") lightboxNav(-1);
      if (e.key === "ArrowRight") lightboxNav(1);
    });
  }

  function updateLightboxImage() {
    lightboxImg.src = lightboxImages[lightboxIndex];
  }

  function lightboxNav(direction) {
    if (lightboxImages.length < 2) return;
    lightboxIndex = (lightboxIndex + direction + lightboxImages.length) % lightboxImages.length;
    updateLightboxImage();
  }

  function openLightbox(images, index) {
    initLightbox();
    lightboxImages = images;
    lightboxIndex = index;
    updateLightboxImage();
    lightboxOverlay.classList.add("is-active");
    var contentLayer = document.getElementById("contentLayer");
    if (contentLayer) contentLayer.classList.add("is-blurred");
  }

  function closeLightbox() {
    if (lightboxOverlay) lightboxOverlay.classList.remove("is-active");
    var contentLayer = document.getElementById("contentLayer");
    if (contentLayer) contentLayer.classList.remove("is-blurred");
  }

  // 스크롤 트리거 팝업 — 여백이 충분한 화면(min-width:1100px)에서는 해당 이미지 지점의
  // 좌/우 여백에 고정 배치(스크롤 위치에 자연스럽게 붙어있음)하고, IntersectionObserver로
  // 그 지점이 보이면 fade-in. 여백이 좁은 화면/모바일에서는 페이지 맨 아래 3열 그리드로 모아서 보여준다.
  var POPUP_DESKTOP_QUERY = "(min-width: 1100px)";

  function makePopupCard(popup) {
    var card = document.createElement(popup.type === "link" ? "a" : "div");
    card.className = "popup-card" + (popup.type === "memo" ? " popup-memo" : "");
    if (popup.type === "link" && popup.linkProjectId) {
      card.href = "project.html?id=" + encodeURIComponent(popup.linkProjectId);
    }
    var img = document.createElement("img");
    img.src = popup.imageUrl;
    img.alt = popup.caption || "";
    card.appendChild(img);
    return card;
  }

  function renderPopups(popups, imageAnchors, imagesWrap) {
    if (!popups.length) return;

    if (imageAnchors.length && window.matchMedia(POPUP_DESKTOP_QUERY).matches) {
      popups.forEach(function (popup) {
        var idx = Math.min(Math.max((popup.triggerAfterImage || 1) - 1, 0), imageAnchors.length - 1);
        var anchor = imageAnchors[idx];
        var card = makePopupCard(popup);
        card.classList.add("popup-card-" + (popup.side === "left" ? "left" : "right"));
        anchor.appendChild(card);

        var observer = new IntersectionObserver(
          function (entries) {
            entries.forEach(function (entry) {
              if (entry.isIntersecting) {
                card.classList.add("is-visible");
                observer.disconnect();
              }
            });
          },
          { threshold: 0.2 }
        );
        observer.observe(anchor);
      });
    } else {
      var grid = document.createElement("div");
      grid.className = "popup-grid";
      popups.forEach(function (popup) {
        grid.appendChild(makePopupCard(popup));
      });
      imagesWrap.parentNode.insertBefore(grid, imagesWrap.nextSibling);
    }
  }

  var params = new URLSearchParams(location.search);
  var id = params.get("id");
  var type = params.get("type") || "year";
  var value = params.get("value");

  fetch("/api/projects/" + encodeURIComponent(id))
    .then(function (res) { return res.json(); })
    .then(function (data) {
      var project = data.project;
      if (!project) return;

      if (project.backgroundColor) {
        document.body.style.background = project.backgroundColor;
      }

      // URL에 분류 컨텍스트가 없으면(예: 직접 링크로 들어온 경우) 프로젝트의 첫 분류로 대체
      if (!value) {
        var fallback =
          project.categories.filter(function (c) { return c.typeKey === type; })[0] ||
          project.categories[0];
        if (fallback) {
          type = fallback.typeKey;
          value = fallback.label;
        }
      }

      document.title = project.title + " — jeongminsoo";

      var backLink = document.getElementById("categoryBackLink");
      backLink.textContent = value || "";
      backLink.href = "category.html?type=" + encodeURIComponent(type) + "&value=" + encodeURIComponent(value || "");

      document.getElementById("projectTitle").textContent = project.title;

      var metaWrap = document.getElementById("projectMeta");
      metaWrap.innerHTML = "";
      (project.metaItems || []).forEach(function (metaValue) {
        var line = document.createElement("p");
        line.className = "meta-line";
        renderLinkedText(line, metaValue);
        metaWrap.appendChild(line);
      });

      renderLinkedText(document.getElementById("projectDescription"), project.description);

      var imagesWrap = document.getElementById("projectImages");
      imagesWrap.innerHTML = "";

      var lightboxUrls = (project.images || [])
        .filter(function (m) { return m.type !== "video"; })
        .map(function (m) { return m.url; });

      function makeMediaEl(media) {
        var el;
        if (media.type === "video") {
          el = document.createElement("video");
          el.src = media.url;
          el.controls = true;
          el.playsInline = true;
        } else {
          el = document.createElement("img");
          el.src = media.url;
          el.alt = project.title;
          el.addEventListener("click", function () {
            openLightbox(lightboxUrls, lightboxUrls.indexOf(media.url));
          });
        }
        el.className = "project-thumb";
        return el;
      }

      // 팝업 위치 기준점 — project.images와 같은 순서로 쌓인다 (1번째 이미지 = imageAnchors[0]).
      var imageAnchors = [];
      function makeAnchor(media) {
        var anchor = document.createElement("div");
        anchor.className = "img-anchor";
        anchor.appendChild(makeMediaEl(media));
        imageAnchors.push(anchor);
        return anchor;
      }

      var imgs = project.images || [];
      // 연속된 half(최대 2개)/third(최대 3개)는 한 줄 그리드로, full은 혼자 한 줄.
      var ROW_CAP = { half: 2, third: 3 };
      var i = 0;
      while (i < imgs.length) {
        var media = imgs[i];
        var layout = media.layout || "full";
        if (layout === "full") {
          imagesWrap.appendChild(makeAnchor(media));
          i++;
          continue;
        }
        var cap = ROW_CAP[layout] || 1;
        var group = [media];
        var j = i + 1;
        while (j < imgs.length && (imgs[j].layout || "full") === layout && group.length < cap) {
          group.push(imgs[j]);
          j++;
        }
        var row = document.createElement("div");
        row.className = "project-image-row";
        group.forEach(function (m) { row.appendChild(makeAnchor(m)); });
        imagesWrap.appendChild(row);
        i = j;
      }

      if (imgs.length === 0) {
        var placeholder = document.createElement("div");
        placeholder.className = "project-thumb-placeholder";
        imagesWrap.appendChild(placeholder);
      }

      renderPopups(project.popups || [], imageAnchors, imagesWrap);

      if (!value) return;

      return fetch("/api/projects?typeKey=" + encodeURIComponent(type) + "&value=" + encodeURIComponent(value))
        .then(function (res) { return res.json(); })
        .then(function (siblingData) {
          var siblings = siblingData.projects || [];
          var index = -1;
          for (var i = 0; i < siblings.length; i++) {
            if (siblings[i].id === project.id) { index = i; break; }
          }
          var prevProject = index > -1 ? siblings[index - 1] : null;
          var nextProject = index > -1 ? siblings[index + 1] : null;

          var prevDot = document.getElementById("prevDot");
          var nextDot = document.getElementById("nextDot");

          function goTo(target) {
            location.href =
              "project.html?id=" +
              encodeURIComponent(target.id) +
              "&type=" +
              encodeURIComponent(type) +
              "&value=" +
              encodeURIComponent(value);
          }

          if (prevProject) {
            prevDot.disabled = false;
            prevDot.addEventListener("click", function () { goTo(prevProject); });
          }
          if (nextProject) {
            nextDot.disabled = false;
            nextDot.addEventListener("click", function () { goTo(nextProject); });
          }
        });
    });
})();
