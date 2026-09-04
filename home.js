// 홈 그리드 — 전체 프로젝트를 불러와 화면에는 매번 무작위 순서로 masonry 그리드에 렌더링
(function () {
  var grid = document.getElementById("homeGrid");
  if (!grid) return;

  function shuffle(list) {
    for (var i = list.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = list[i];
      list[i] = list[j];
      list[j] = tmp;
    }
    return list;
  }

  function renderThumb(project) {
    if (!project.coverImage) {
      var placeholder = document.createElement("div");
      placeholder.className = "thumb";
      placeholder.style.aspectRatio = "3/4";
      return placeholder;
    }
    if (project.coverType === "video") {
      var video = document.createElement("video");
      video.className = "thumb";
      video.src = project.coverImage;
      video.muted = true;
      video.playsInline = true;
      video.preload = "metadata";
      return video;
    }
    var img = document.createElement("img");
    img.className = "thumb";
    img.src = project.coverImage;
    img.alt = project.title;
    return img;
  }

  fetch("/api/projects")
    .then(function (res) { return res.json(); })
    .then(function (data) {
      grid.innerHTML = "";
      shuffle(data.projects || []).forEach(function (project) {
        var a = document.createElement("a");
        a.className = "item";
        a.href = "project.html?id=" + encodeURIComponent(project.id);
        a.appendChild(renderThumb(project));
        grid.appendChild(a);
      });
    });
})();
