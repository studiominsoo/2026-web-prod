// 연도별/매체별 분류 항목을 눌렀을 때 이동하는 필터링된 그리드 페이지
(function () {
  var params = new URLSearchParams(location.search);
  var type = params.get("type") || "year";
  var value = params.get("value") || "";

  document.getElementById("categoryLabel").textContent = value;
  document.title = value + " — jeongminsoo";

  var grid = document.getElementById("categoryGrid");

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

  fetch("/api/projects?typeKey=" + encodeURIComponent(type) + "&value=" + encodeURIComponent(value))
    .then(function (res) { return res.json(); })
    .then(function (data) {
      grid.innerHTML = "";
      shuffle(data.projects || []).forEach(function (project) {
        var a = document.createElement("a");
        a.className = "item";
        a.href =
          "project.html?id=" +
          encodeURIComponent(project.id) +
          "&type=" +
          encodeURIComponent(type) +
          "&value=" +
          encodeURIComponent(value);
        a.appendChild(renderThumb(project));
        grid.appendChild(a);
      });
    });
})();
