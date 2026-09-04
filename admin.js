(function () {
  var loginView = document.getElementById("loginView");
  var dashboardView = document.getElementById("dashboardView");
  var loginError = document.getElementById("loginError");
  var passwordInput = document.getElementById("passwordInput");
  var loginBtn = document.getElementById("loginBtn");
  var logoutBtn = document.getElementById("logoutBtn");

  var typesContainer = document.getElementById("typesContainer");
  var newTypeForm = document.getElementById("newTypeForm");
  var newTypeKey = document.getElementById("newTypeKey");
  var newTypeLabel = document.getElementById("newTypeLabel");

  var projectForm = document.getElementById("projectForm");
  var projectFormTitle = document.getElementById("projectFormTitle");
  var projectTitle = document.getElementById("projectTitle");
  var projectBgColor = document.getElementById("projectBgColor");
  var resetBgColorBtn = document.getElementById("resetBgColorBtn");
  var projectDescription = document.getElementById("projectDescription");
  var categoryCheckboxes = document.getElementById("categoryCheckboxes");
  var metaItemsList = document.getElementById("metaItemsList");
  var addMetaBtn = document.getElementById("addMetaBtn");
  var existingImagesList = document.getElementById("existingImagesList");
  var projectImages = document.getElementById("projectImages");
  var popupsList = document.getElementById("popupsList");
  var addPopupBtn = document.getElementById("addPopupBtn");
  var editingProjectId = document.getElementById("editingProjectId");
  var projectSubmitBtn = document.getElementById("projectSubmitBtn");
  var cancelEditBtn = document.getElementById("cancelEditBtn");
  var projectFormStatus = document.getElementById("projectFormStatus");
  var projectList = document.getElementById("projectList");

  var currentTypes = [];
  var existingImages = []; // [{url, type}] 수정 모드에서 기존 미디어 목록
  var coverImageUrl = null;
  var hasCustomBg = false;
  var currentPopups = []; // [{triggerAfterImage, side, type, imageUrl, linkProjectId, caption}]
  var allProjectsCache = []; // 연계 대상 프로젝트 선택용

  projectBgColor.addEventListener("input", function () { hasCustomBg = true; });
  resetBgColorBtn.addEventListener("click", function () {
    projectBgColor.value = "#f2f2f2";
    hasCustomBg = false;
  });

  function api(path, options) {
    return fetch(path, Object.assign({ headers: { "Content-Type": "application/json" } }, options)).then(
      function (res) {
        return res.json().then(function (data) {
          if (!res.ok) throw new Error(data.error || "요청 실패");
          return data;
        });
      }
    );
  }

  function showStatus(el, message, isError) {
    el.textContent = message;
    el.className = "status-msg " + (isError ? "error" : "success");
  }

  // ---- 로그인 ----
  function checkSession() {
    api("/api/session").then(function (data) {
      if (data.isAdmin) {
        loginView.hidden = true;
        dashboardView.hidden = false;
        loadTypes();
        loadProjects();
        loadAllProjectsForPopups();
      } else {
        loginView.hidden = false;
        dashboardView.hidden = true;
      }
    });
  }

  loginBtn.addEventListener("click", function () {
    api("/api/login", { method: "POST", body: JSON.stringify({ password: passwordInput.value }) })
      .then(function () {
        loginError.hidden = true;
        checkSession();
      })
      .catch(function () {
        loginError.hidden = false;
      });
  });

  passwordInput.addEventListener("keydown", function (e) {
    if (e.key === "Enter") loginBtn.click();
  });

  logoutBtn.addEventListener("click", function () {
    api("/api/logout", { method: "POST" }).then(checkSession);
  });

  // ---- 분류 기준 / 항목 (추가·수정·삭제·순서변경) ----
  function reorder(list, index, direction, urlBase) {
    var otherIndex = index + direction;
    if (otherIndex < 0 || otherIndex >= list.length) return Promise.resolve();
    var a = list[index];
    var b = list[otherIndex];
    return Promise.all([
      api(urlBase + "/" + a.id, { method: "PATCH", body: JSON.stringify({ sortOrder: b.sortOrder }) }),
      api(urlBase + "/" + b.id, { method: "PATCH", body: JSON.stringify({ sortOrder: a.sortOrder }) })
    ]);
  }

  function renderTypes() {
    typesContainer.innerHTML = "";
    categoryCheckboxes.innerHTML = "";

    currentTypes.forEach(function (type, typeIndex) {
      var block = document.createElement("div");
      block.className = "type-block";

      var head = document.createElement("div");
      head.className = "type-head";

      var heading = document.createElement("h3");
      heading.textContent = type.label + " (" + type.key + ")";
      head.appendChild(heading);

      var typeUp = document.createElement("button");
      typeUp.type = "button";
      typeUp.className = "move-btn";
      typeUp.textContent = "▲";
      typeUp.addEventListener("click", function () {
        reorder(currentTypes, typeIndex, -1, "/api/taxonomy-types").then(loadTypes);
      });

      var typeDown = document.createElement("button");
      typeDown.type = "button";
      typeDown.className = "move-btn";
      typeDown.textContent = "▼";
      typeDown.addEventListener("click", function () {
        reorder(currentTypes, typeIndex, 1, "/api/taxonomy-types").then(loadTypes);
      });

      var typeRename = document.createElement("button");
      typeRename.type = "button";
      typeRename.className = "rename-btn";
      typeRename.textContent = "이름 수정";
      typeRename.addEventListener("click", function () {
        var newLabel = prompt("분류 기준 이름", type.label);
        if (newLabel === null || !newLabel.trim()) return;
        api("/api/taxonomy-types/" + type.id, {
          method: "PATCH",
          body: JSON.stringify({ label: newLabel.trim() })
        }).then(loadTypes);
      });

      head.appendChild(typeUp);
      head.appendChild(typeDown);
      head.appendChild(typeRename);
      block.appendChild(head);

      var tagList = document.createElement("div");
      tagList.className = "tag-list";
      type.categories.forEach(function (category, catIndex) {
        var tag = document.createElement("span");
        tag.className = "tag";

        var text = document.createElement("span");
        text.textContent = category.label;

        var upBtn = document.createElement("button");
        upBtn.type = "button";
        upBtn.className = "move-btn";
        upBtn.textContent = "▲";
        upBtn.addEventListener("click", function () {
          reorder(type.categories, catIndex, -1, "/api/categories").then(loadTypes);
        });

        var downBtn = document.createElement("button");
        downBtn.type = "button";
        downBtn.className = "move-btn";
        downBtn.textContent = "▼";
        downBtn.addEventListener("click", function () {
          reorder(type.categories, catIndex, 1, "/api/categories").then(loadTypes);
        });

        var renameBtn = document.createElement("button");
        renameBtn.type = "button";
        renameBtn.textContent = "✎";
        renameBtn.addEventListener("click", function () {
          var newLabel = prompt("항목 이름", category.label);
          if (newLabel === null || !newLabel.trim()) return;
          api("/api/categories/" + category.id, {
            method: "PATCH",
            body: JSON.stringify({ label: newLabel.trim() })
          }).then(loadTypes);
        });

        var removeBtn = document.createElement("button");
        removeBtn.type = "button";
        removeBtn.textContent = "×";
        removeBtn.addEventListener("click", function () {
          if (!confirm(category.label + " 항목을 삭제할까요? 연결된 프로젝트에서도 분류가 해제됩니다.")) return;
          api("/api/categories/" + category.id, { method: "DELETE" }).then(loadTypes);
        });

        tag.appendChild(text);
        tag.appendChild(upBtn);
        tag.appendChild(downBtn);
        tag.appendChild(renameBtn);
        tag.appendChild(removeBtn);
        tagList.appendChild(tag);
      });
      block.appendChild(tagList);

      var form = document.createElement("form");
      form.className = "inline-form";
      var input = document.createElement("input");
      input.type = "text";
      input.placeholder = type.label + "에 새 항목 추가";
      var button = document.createElement("button");
      button.type = "submit";
      button.textContent = "추가";
      form.appendChild(input);
      form.appendChild(button);
      form.addEventListener("submit", function (e) {
        e.preventDefault();
        if (!input.value.trim()) return;
        api("/api/categories", {
          method: "POST",
          body: JSON.stringify({ typeId: type.id, label: input.value.trim() })
        }).then(function () {
          input.value = "";
          loadTypes();
        });
      });
      block.appendChild(form);

      typesContainer.appendChild(block);

      // 프로젝트 폼의 분류 체크박스도 같이 구성
      type.categories.forEach(function (category) {
        var label = document.createElement("label");
        var checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.value = category.id;
        checkbox.dataset.typeKey = type.key;
        label.appendChild(checkbox);
        label.appendChild(document.createTextNode(type.label + ": " + category.label));
        categoryCheckboxes.appendChild(label);
      });
    });
  }

  function loadTypes() {
    return api("/api/categories").then(function (data) {
      currentTypes = data.types;
      renderTypes();
    });
  }

  newTypeForm.addEventListener("submit", function (e) {
    e.preventDefault();
    api("/api/taxonomy-types", {
      method: "POST",
      body: JSON.stringify({ key: newTypeKey.value.trim(), label: newTypeLabel.value.trim() })
    }).then(function () {
      newTypeKey.value = "";
      newTypeLabel.value = "";
      loadTypes();
    });
  });

  // ---- 메타 항목 목록 (추가/삭제/순서변경) ----
  function moveMetaRow(row, direction) {
    if (direction === -1 && row.previousElementSibling) {
      metaItemsList.insertBefore(row, row.previousElementSibling);
    } else if (direction === 1 && row.nextElementSibling) {
      metaItemsList.insertBefore(row.nextElementSibling, row);
    }
  }

  function addMetaRow(value) {
    var row = document.createElement("div");
    row.className = "meta-row";

    var input = document.createElement("input");
    input.type = "text";
    input.value = value || "";
    input.placeholder = "예: Music Box Score:830×70mm/";

    var upBtn = document.createElement("button");
    upBtn.type = "button";
    upBtn.textContent = "▲";
    upBtn.addEventListener("click", function () { moveMetaRow(row, -1); });

    var downBtn = document.createElement("button");
    downBtn.type = "button";
    downBtn.textContent = "▼";
    downBtn.addEventListener("click", function () { moveMetaRow(row, 1); });

    var removeBtn = document.createElement("button");
    removeBtn.type = "button";
    removeBtn.textContent = "×";
    removeBtn.addEventListener("click", function () { row.remove(); });

    row.appendChild(input);
    row.appendChild(upBtn);
    row.appendChild(downBtn);
    row.appendChild(removeBtn);
    metaItemsList.appendChild(row);
  }

  function collectMetaItems() {
    return Array.prototype.map
      .call(metaItemsList.querySelectorAll("input"), function (i) { return i.value.trim(); })
      .filter(Boolean);
  }

  addMetaBtn.addEventListener("click", function () { addMetaRow(""); });

  // ---- 기존 이미지/영상: 대표 지정 + 삭제 ----
  function renderExistingImages() {
    existingImagesList.innerHTML = "";
    existingImages.forEach(function (media, index) {
      var wrap = document.createElement("div");
      wrap.className = "image-thumb" + (media.url === coverImageUrl ? " is-cover" : "");

      var el = media.type === "video" ? document.createElement("video") : document.createElement("img");
      el.src = media.url;
      if (media.type === "video") el.muted = true;
      wrap.appendChild(el);

      if (media.url === coverImageUrl) {
        var badge = document.createElement("span");
        badge.className = "cover-badge";
        badge.textContent = "대표";
        wrap.appendChild(badge);
      }

      var layoutSelect = document.createElement("select");
      layoutSelect.className = "layout-select";
      [
        { value: "full", label: "전체(1개)" },
        { value: "half", label: "절반(2개씩)" },
        { value: "third", label: "1/3(3개씩)" }
      ].forEach(function (opt) {
        var option = document.createElement("option");
        option.value = opt.value;
        option.textContent = opt.label;
        if ((media.layout || "full") === opt.value) option.selected = true;
        layoutSelect.appendChild(option);
      });
      layoutSelect.addEventListener("change", function () {
        media.layout = layoutSelect.value;
      });
      wrap.appendChild(layoutSelect);

      var actions = document.createElement("div");
      actions.className = "thumb-actions";

      var upBtn = document.createElement("button");
      upBtn.type = "button";
      upBtn.textContent = "▲";
      upBtn.disabled = index === 0;
      upBtn.addEventListener("click", function () {
        if (index === 0) return;
        var tmp = existingImages[index - 1];
        existingImages[index - 1] = existingImages[index];
        existingImages[index] = tmp;
        renderExistingImages();
      });

      var downBtn = document.createElement("button");
      downBtn.type = "button";
      downBtn.textContent = "▼";
      downBtn.disabled = index === existingImages.length - 1;
      downBtn.addEventListener("click", function () {
        if (index === existingImages.length - 1) return;
        var tmp = existingImages[index + 1];
        existingImages[index + 1] = existingImages[index];
        existingImages[index] = tmp;
        renderExistingImages();
      });

      var coverBtn = document.createElement("button");
      coverBtn.type = "button";
      coverBtn.textContent = "대표로";
      coverBtn.addEventListener("click", function () {
        coverImageUrl = media.url;
        renderExistingImages();
      });

      var removeBtn = document.createElement("button");
      removeBtn.type = "button";
      removeBtn.textContent = "삭제";
      removeBtn.addEventListener("click", function () {
        existingImages.splice(index, 1);
        if (coverImageUrl === media.url) {
          coverImageUrl = existingImages[0] ? existingImages[0].url : null;
        }
        renderExistingImages();
        renderPopups();
      });

      actions.appendChild(upBtn);
      actions.appendChild(downBtn);
      actions.appendChild(coverBtn);
      actions.appendChild(removeBtn);
      wrap.appendChild(actions);
      existingImagesList.appendChild(wrap);
    });
  }

  // ---- 연계/메모 팝업 ----
  function loadAllProjectsForPopups() {
    return api("/api/projects").then(function (data) {
      allProjectsCache = data.projects || [];
    });
  }

  function renderPopups() {
    popupsList.innerHTML = "";
    var imageCount = Math.max(existingImages.length, 1);

    currentPopups.forEach(function (popup, index) {
      var row = document.createElement("div");
      row.className = "popup-row";

      // 몇 번째 이미지 다음
      var triggerSelect = document.createElement("select");
      for (var n = 1; n <= imageCount; n++) {
        var opt = document.createElement("option");
        opt.value = n;
        opt.textContent = n + "번째 이미지 다음";
        if (Number(popup.triggerAfterImage) === n) opt.selected = true;
        triggerSelect.appendChild(opt);
      }
      triggerSelect.addEventListener("change", function () {
        popup.triggerAfterImage = Number(triggerSelect.value);
      });
      row.appendChild(triggerSelect);

      // 왼쪽/오른쪽
      var sideSelect = document.createElement("select");
      [["right", "오른쪽"], ["left", "왼쪽"]].forEach(function (pair) {
        var opt = document.createElement("option");
        opt.value = pair[0];
        opt.textContent = pair[1];
        if (popup.side === pair[0]) opt.selected = true;
        sideSelect.appendChild(opt);
      });
      sideSelect.addEventListener("change", function () {
        popup.side = sideSelect.value;
      });
      row.appendChild(sideSelect);

      // 타입
      var typeSelect = document.createElement("select");
      [["memo", "메모 이미지"], ["link", "연계 작업물"]].forEach(function (pair) {
        var opt = document.createElement("option");
        opt.value = pair[0];
        opt.textContent = pair[1];
        if (popup.type === pair[0]) opt.selected = true;
        typeSelect.appendChild(opt);
      });
      typeSelect.addEventListener("change", function () {
        popup.type = typeSelect.value;
        renderPopups();
      });
      row.appendChild(typeSelect);

      // 연계 대상 (type=link일 때만)
      if (popup.type === "link") {
        var linkSelect = document.createElement("select");
        var emptyOpt = document.createElement("option");
        emptyOpt.value = "";
        emptyOpt.textContent = "-- 프로젝트 선택 --";
        linkSelect.appendChild(emptyOpt);
        allProjectsCache
          .filter(function (p) { return p.id !== editingProjectId.value; })
          .forEach(function (p) {
            var opt = document.createElement("option");
            opt.value = p.id;
            opt.textContent = p.title;
            if (popup.linkProjectId === p.id) opt.selected = true;
            linkSelect.appendChild(opt);
          });
        linkSelect.addEventListener("change", function () {
          popup.linkProjectId = linkSelect.value;
        });
        row.appendChild(linkSelect);
      }

      // 이미지 업로드/미리보기
      if (popup.imageUrl) {
        var preview = document.createElement("img");
        preview.className = "popup-thumb-preview";
        preview.src = popup.imageUrl;
        row.appendChild(preview);
      }

      var fileInput = document.createElement("input");
      fileInput.type = "file";
      fileInput.accept = "image/jpeg,image/png,image/gif,image/webp";
      fileInput.addEventListener("change", function () {
        if (!fileInput.files[0]) return;
        fileToDataUrl(fileInput.files[0])
          .then(function (dataUrl) {
            return api("/api/upload", { method: "POST", body: JSON.stringify({ image: dataUrl }) });
          })
          .then(function (res) {
            popup.imageUrl = res.url;
            renderPopups();
          });
      });
      row.appendChild(fileInput);

      var removeBtn = document.createElement("button");
      removeBtn.type = "button";
      removeBtn.className = "popup-remove";
      removeBtn.textContent = "삭제";
      removeBtn.addEventListener("click", function () {
        currentPopups.splice(index, 1);
        renderPopups();
      });
      row.appendChild(removeBtn);

      popupsList.appendChild(row);
    });
  }

  addPopupBtn.addEventListener("click", function () {
    currentPopups.push({ triggerAfterImage: 1, side: "right", type: "memo", imageUrl: "", linkProjectId: "", caption: "" });
    renderPopups();
  });

  // ---- 프로젝트 목록 ----
  function loadProjects() {
    return api("/api/projects").then(function (data) {
      projectList.innerHTML = "";
      data.projects.forEach(function (project) {
        var row = document.createElement("div");
        row.className = "project-row";

        var titleSpan = document.createElement("span");
        titleSpan.textContent = project.title;

        var actions = document.createElement("span");
        actions.className = "actions";

        var editBtn = document.createElement("button");
        editBtn.type = "button";
        editBtn.textContent = "수정";
        editBtn.addEventListener("click", function () {
          api("/api/projects/" + encodeURIComponent(project.id)).then(function (data) {
            startEdit(data.project);
          });
        });

        var deleteBtn = document.createElement("button");
        deleteBtn.type = "button";
        deleteBtn.textContent = "삭제";
        deleteBtn.addEventListener("click", function () {
          if (!confirm(project.title + " 프로젝트를 삭제할까요?")) return;
          api("/api/projects/" + encodeURIComponent(project.id), { method: "DELETE" }).then(loadProjects);
        });

        actions.appendChild(editBtn);
        actions.appendChild(deleteBtn);
        row.appendChild(titleSpan);
        row.appendChild(actions);
        projectList.appendChild(row);
      });
    });
  }

  // ---- 프로젝트 추가/수정 폼 ----
  function resetProjectForm() {
    editingProjectId.value = "";
    projectForm.reset();
    metaItemsList.innerHTML = "";
    addMetaRow("");
    existingImages = [];
    coverImageUrl = null;
    projectBgColor.value = "#f2f2f2";
    hasCustomBg = false;
    renderExistingImages();
    currentPopups = [];
    renderPopups();
    projectFormTitle.textContent = "새 프로젝트 추가";
    projectSubmitBtn.textContent = "추가";
    cancelEditBtn.hidden = true;
    projectFormStatus.textContent = "";
  }

  function startEdit(project) {
    editingProjectId.value = project.id;
    projectTitle.value = project.title;
    projectDescription.value = project.description || "";
    if (project.backgroundColor) {
      projectBgColor.value = project.backgroundColor;
      hasCustomBg = true;
    } else {
      projectBgColor.value = "#f2f2f2";
      hasCustomBg = false;
    }

    metaItemsList.innerHTML = "";
    (project.metaItems && project.metaItems.length ? project.metaItems : [""]).forEach(addMetaRow);

    existingImages = (project.images || []).slice();
    coverImageUrl = project.coverImageUrl || (existingImages[0] && existingImages[0].url) || null;
    renderExistingImages();

    currentPopups = (project.popups || []).map(function (p) {
      return {
        triggerAfterImage: p.triggerAfterImage,
        side: p.side,
        type: p.type,
        imageUrl: p.imageUrl,
        linkProjectId: p.linkProjectId || "",
        caption: p.caption || ""
      };
    });
    renderPopups();

    var checkedIds = (project.categories || []).map(function (c) { return String(c.categoryId); });
    Array.prototype.forEach.call(categoryCheckboxes.querySelectorAll("input[type=checkbox]"), function (box) {
      box.checked = checkedIds.indexOf(box.value) !== -1;
    });

    projectFormTitle.textContent = "프로젝트 수정: " + project.title;
    projectSubmitBtn.textContent = "수정 저장";
    cancelEditBtn.hidden = false;
    projectFormStatus.textContent = "";
    window.scrollTo({ top: projectForm.offsetTop - 20, behavior: "smooth" });
  }

  cancelEditBtn.addEventListener("click", resetProjectForm);

  function fileToDataUrl(file) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onload = function () { resolve(reader.result); };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  function uploadFiles(files) {
    var uploads = Array.prototype.map.call(files, function (file) {
      return fileToDataUrl(file)
        .then(function (dataUrl) {
          return api("/api/upload", { method: "POST", body: JSON.stringify({ image: dataUrl }) });
        })
        .then(function (res) {
          return { url: res.url, type: res.type };
        });
    });
    return Promise.all(uploads);
  }

  // 파일 선택 즉시 업로드해서 미리보기 목록에 반영 — "새 프로젝트"든 "수정"이든
  // 저장 버튼을 누르기 전부터 바로 대표 지정/순서변경/레이아웃 설정이 가능해진다.
  projectImages.addEventListener("change", function () {
    if (!projectImages.files.length) return;
    showStatus(projectFormStatus, "이미지 업로드 중...", false);
    uploadFiles(projectImages.files)
      .then(function (uploaded) {
        existingImages = existingImages.concat(uploaded);
        if (!coverImageUrl && existingImages[0]) coverImageUrl = existingImages[0].url;
        projectImages.value = "";
        renderExistingImages();
        renderPopups();
        projectFormStatus.textContent = "";
      })
      .catch(function (err) {
        showStatus(projectFormStatus, "업로드 오류: " + err.message, true);
      });
  });

  projectForm.addEventListener("submit", function (e) {
    e.preventDefault();
    showStatus(projectFormStatus, "저장 중...", false);

    Promise.resolve().then(function () {
      var categoryIds = Array.prototype
        .filter.call(categoryCheckboxes.querySelectorAll("input[type=checkbox]"), function (box) { return box.checked; })
        .map(function (box) { return Number(box.value); });

      var cover = coverImageUrl || (existingImages[0] && existingImages[0].url) || null;

      var payload = {
        title: projectTitle.value.trim(),
        description: projectDescription.value.trim(),
        categoryIds: categoryIds,
        metaItems: collectMetaItems(),
        images: existingImages,
        coverImageUrl: cover,
        backgroundColor: hasCustomBg ? projectBgColor.value : "",
        popups: currentPopups.filter(function (p) { return p.imageUrl; })
      };

      var id = editingProjectId.value;
      var request;
      if (id) {
        request = api("/api/projects/" + encodeURIComponent(id), { method: "PATCH", body: JSON.stringify(payload) });
      } else {
        var slug =
          payload.title
            .toLowerCase()
            .trim()
            .replace(/[^a-z0-9가-힣]+/g, "-")
            .replace(/(^-|-$)/g, "") +
          "-" +
          Math.random().toString(36).slice(2, 6);
        request = api("/api/projects", { method: "POST", body: JSON.stringify(Object.assign({ id: slug }, payload)) });
      }

      return request;
    }).then(function () {
      showStatus(projectFormStatus, "저장되었습니다.", false);
      resetProjectForm();
      loadProjects();
    }).catch(function (err) {
      showStatus(projectFormStatus, "오류: " + err.message, true);
    });
  });

  resetProjectForm();
  checkSession();
})();
