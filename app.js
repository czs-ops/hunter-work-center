const PRODUCT_NAME = "猎手活动";
const AD_CHANNELS = [
  { taskNo: "T01", channel: "普通广告", entry: "广告管理 -> 普通广告", needsPushCopy: false },
  { taskNo: "T02", channel: "App弹窗广告", entry: "广告管理 -> APP弹窗广告", needsPushCopy: false },
  { taskNo: "T03", channel: "PC弹窗广告", entry: "PC客户端 -> 弹窗推送", needsPushCopy: false },
  { taskNo: "T04", channel: "Push", entry: "股票APP -> 通知栏推送", needsPushCopy: true }
];

const STATUS_LABELS = {
  pending: "待确认计划",
  checking: "验证中",
  done: "验证完成",
  skipped: "已存在跳过",
  error: "验证异常"
};

const STORAGE_KEY = "hunter-work-center-state-v1";

const defaultState = {
  targetDate: "",
  tasks: [],
  notes: {
    daily: "",
    material: "",
    campaign: "",
    campaignPhase: "",
    mainMaterial: "",
    backupMaterial: "",
    specialMaterial: "",
    copyDraft: "",
    copyBenefit: "",
    copyLink: "",
    executionResult: "",
    exceptionNote: ""
  },
  push: {
    title: "",
    summary: "",
    url: "",
    time: "",
    platform: "全部",
    uid: ""
  },
  audienceRows: [
    { name: "1454 - 营销策划测试分组", performance: "待观察", note: "从后台目标用户复制后补充表现。" }
  ],
  reportRows: [
    { id: "", channel: "App弹窗广告", title: "", audience: "", impressions: "", clicks: "", deals: "" }
  ],
  reportDraft: "",
  strategyItems: [],
  reportDates: {
    current: "",
    compare: ""
  },
  communityCopy: {
    input: "",
    summary: null
  },
  adstatHistory: []
};

let state = loadState();

function $(selector) {
  return document.querySelector(selector);
}

function $all(selector) {
  return [...document.querySelectorAll(selector)];
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return structuredClone(defaultState);
    return { ...structuredClone(defaultState), ...JSON.parse(raw) };
  } catch {
    return structuredClone(defaultState);
  }
}

function saveState(showMessage = true) {
  collectInputs();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  if (showMessage) showToast("已保存到本地浏览器");
  renderAll();
}

function showToast(message) {
  const toast = $("#toast");
  toast.textContent = message;
  toast.classList.add("show");
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => toast.classList.remove("show"), 2200);
}

function formatDate(date) {
  return date.toISOString().slice(0, 10);
}

function addDays(dateText, offset) {
  if (!dateText) return "";
  const date = new Date(`${dateText}T00:00:00`);
  date.setDate(date.getDate() + offset);
  return formatDate(date);
}

function todayText() {
  return formatDate(new Date());
}

function getSourceDate(targetDate) {
  return addDays(targetDate, -1);
}

function createTasks(targetDate, material = "") {
  const sourceDate = getSourceDate(targetDate);
  return AD_CHANNELS.map((item) => ({
    ...item,
    product: PRODUCT_NAME,
    groupName: PRODUCT_NAME,
    sourceDate,
    targetDate,
    sourceRule: "来源日 = 目标日前 1 天",
    duplicateAction: $("#duplicateAction")?.value || "目标日已有则跳过",
    material,
    status: "pending",
    checked: false,
    note: item.needsPushCopy ? "Push 需确认标题、摘要、跳转网址和计划推送时间。" : "执行前先查重，目标日已有则跳过或人工复核。",
    createdCount: "",
    replacedCount: ""
  }));
}

function bindNavigation() {
  const titles = {
    home: ["首页", "今日计划、广告任务、数据入口和异常提醒集中处理。"],
    content: ["内容创作", "沉淀社群、Push、活动和直播课程话术，默认只生成不发送。"],
    audience: ["用户洞察", "记录高点击人群、低效人群和后台目标用户备注。"],
    campaign: ["活动策划", "管理活动节奏、素材链接、推广计划和复盘备注。"],
    reports: ["数据报表", "连接广告统计后台，录入日报数据并生成策略草稿。"],
    workflow: ["智能工作流", "生成 T01-T04 广告计划，管理铺设进度、结果和异常。"]
  };

  const activateView = (view, sourceButton) => {
    $all(".nav-item").forEach((item) => item.classList.remove("active"));
    $all(".subnav button").forEach((item) => item.classList.remove("active"));
    $all(".nav-group").forEach((item) => item.classList.remove("active"));
    $all(".view").forEach((item) => item.classList.remove("active"));
    $all(".panel.focused-panel").forEach((item) => item.classList.remove("focused-panel"));
    $all(".view.subpage-mode").forEach((item) => item.classList.remove("subpage-mode"));
    $all(".panel.subpage-active").forEach((item) => item.classList.remove("subpage-active"));

    const group = sourceButton.closest(".nav-group");
    const mainButton = group?.querySelector(".nav-item");
    group?.classList.add("active");
    mainButton?.classList.add("active");
    if (sourceButton.matches(".subnav button")) sourceButton.classList.add("active");

    const activeView = $(`#${view}`);
    activeView.classList.add("active");
    const isSubPage = sourceButton.matches(".subnav button");
    $("#pageTitle").textContent = isSubPage ? `${titles[view][0]} / ${sourceButton.textContent}` : titles[view][0];
    $("#pageSubtitle").textContent = isSubPage ? `当前只显示“${sourceButton.textContent}”页面。` : titles[view][1];

    const anchor = sourceButton.dataset.anchor;
    if (anchor) {
      window.setTimeout(() => {
        const targets = anchor.split(",").map((id) => document.getElementById(id.trim())).filter(Boolean);
        const target = targets[0];
        if (!target) return;
        activeView.classList.add("subpage-mode");
        targets.forEach((item) => item.classList.add("subpage-active"));
        window.scrollTo({ top: 0, behavior: "smooth" });
        target.classList.add("focused-panel");
        window.clearTimeout(target._focusTimer);
        target._focusTimer = window.setTimeout(() => target.classList.remove("focused-panel"), 1800);
      }, 40);
    } else {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  $all(".nav-item, .subnav button").forEach((button) => {
    button.addEventListener("click", () => {
      activateView(button.dataset.view, button);
    });
  });
}

function bindEvents() {
  $("#collapseSidebar").addEventListener("click", () => {
    $(".app-shell").classList.toggle("collapsed");
  });

  $("#saveAll").addEventListener("click", () => saveState(true));

  $("#targetDate").addEventListener("change", (event) => {
    state.targetDate = event.target.value;
    $("#workflowTargetDate").value = event.target.value;
    renderDates();
    saveState(false);
  });

  $("#workflowTargetDate").addEventListener("change", (event) => {
    state.targetDate = event.target.value;
    $("#targetDate").value = event.target.value;
    renderDates();
    saveState(false);
  });

  $("#generateTasks").addEventListener("click", () => generateTasksFromHome());
  $("#generateWorkflowTasks").addEventListener("click", () => generateTasksFromWorkflow());
  $("#runSelected").addEventListener("click", () => updateCheckedTasks("checking"));
  $("#clearErrors").addEventListener("click", clearErrorTasks);
  $("#copyContent").addEventListener("click", copyDraftText);
  $("#addAudienceRow").addEventListener("click", addAudienceRow);
  $("#addReportRow").addEventListener("click", addReportRow);
  $("#buildReport").addEventListener("click", buildReportDraft);
  $("#buildStrategy").addEventListener("click", buildStrategy);
  $("#buildCommunityCopy").addEventListener("click", buildCommunityCopy);
  $("#importReportData").addEventListener("click", importReportData);
  $("#loadBackendData").addEventListener("click", loadBackendData);
  $("#refreshDailyDetails").addEventListener("click", () => {
    collectInputs();
    renderDailyDetails();
    showToast("猎手活动日报视图已刷新");
  });
  $("#addIssuesTodo").addEventListener("click", addIssuesToTodo);
  $("#exportWord").addEventListener("click", () => fakeExport("Word"));
  $("#exportExcel").addEventListener("click", () => fakeExport("Excel"));
  $("#exportPpt").addEventListener("click", () => fakeExport("PPT"));
  $("#refreshDailyData").addEventListener("click", refreshDailyDataFromLoadedFile);
  $("#copyDailyReport").addEventListener("click", copyDailyReport);
  $("#downloadDailyWord").addEventListener("click", () => fakeExport("Word"));
  $("#downloadDailyExcel").addEventListener("click", () => fakeExport("Excel"));
  $("#downloadDailyPpt").addEventListener("click", () => fakeExport("PPT"));
  $("#refreshSummary").addEventListener("click", () => {
    collectInputs();
    renderSummary();
    showToast("数据摘要已刷新");
  });
  $all("[data-template]").forEach((button) => {
    button.addEventListener("click", () => applyPushTemplate(button.dataset.template));
  });
  $all("[data-copy-note]").forEach((button) => {
    button.addEventListener("click", () => copyNote(button.dataset.copyNote));
  });

  document.addEventListener("input", (event) => {
    if (event.target.matches("input, textarea, select")) {
      collectInputs();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      renderMetrics();
    }
  });
}

function generateTasksFromHome() {
  const date = $("#targetDate").value || todayText();
  state.targetDate = date;
  state.tasks = createTasks(date, $("#mainMaterial").value);
  saveState(false);
  showToast("已生成 T01-T04 今日任务");
}

function generateTasksFromWorkflow() {
  const date = $("#workflowTargetDate").value || $("#targetDate").value || todayText();
  state.targetDate = date;
  state.tasks = createTasks(date, $("#workflowMaterial").value);
  saveState(false);
  showToast("已按猎手规则生成四类广告计划");
}

function collectInputs() {
  state.targetDate = $("#targetDate").value || state.targetDate;
  state.notes.daily = $("#dailyNotes").value;
  state.notes.material = $("#materialNotes").value;
  state.notes.campaign = $("#campaignPlan").value;
  state.notes.campaignPhase = $("#campaignPhase").value;
  state.notes.mainMaterial = $("#mainMaterial").value;
  state.notes.backupMaterial = $("#backupMaterial").value;
  state.notes.specialMaterial = $("#specialMaterial").value;
  state.notes.copyDraft = $("#copyDraft").value;
  state.notes.copyBenefit = $("#copyBenefit").value;
  state.notes.copyLink = $("#copyLink").value;
  state.notes.executionResult = $("#executionResult").value;
  state.notes.exceptionNote = $("#exceptionNote").value;
  $all("[data-note]").forEach((input) => {
    state.notes[input.dataset.note] = input.value;
  });
  state.push.title = $("#pushTitle").value;
  state.push.summary = $("#pushSummary").value;
  state.push.url = $("#pushUrl").value;
  state.push.time = $("#pushTime").value;
  state.push.platform = $("#pushPlatform").value;
  state.push.uid = $("#pushUid").value;
  state.reportDraft = $("#reportDraft").value;
  state.notes.dataImportText = $("#dataImportText").value;
  state.reportDates.current = $("#reportCurrentDate").value;
  state.reportDates.compare = $("#reportCompareDate").value;
  state.reportDates.current = $("#dailyCurrentDate")?.value || state.reportDates.current;
  state.reportDates.compare = $("#dailyCompareDate")?.value || state.reportDates.compare;
  state.notes.dailyScope = $("#dailyScope")?.value || state.notes.dailyScope || "APP+PC全部";
  state.notes.dailyWarnThreshold = $("#dailyWarnThreshold")?.value || state.notes.dailyWarnThreshold || "10000";
  state.communityCopy.input = $("#communityCopyInput").value;
  state.notes.reviewArchive = $("#reviewArchive").value;
  state.audienceRows = readAudienceRows();
  state.reportRows = readReportRows();
}

function hydrateInputs() {
  const targetDate = state.targetDate || todayText();
  $("#targetDate").value = targetDate;
  $("#workflowTargetDate").value = targetDate;
  $("#dailyNotes").value = state.notes.daily || "";
  $("#materialNotes").value = state.notes.material || "";
  $("#campaignPlan").value = state.notes.campaign || "";
  $("#campaignPhase").value = state.notes.campaignPhase || "";
  $("#mainMaterial").value = state.notes.mainMaterial || "";
  $("#backupMaterial").value = state.notes.backupMaterial || "";
  $("#specialMaterial").value = state.notes.specialMaterial || "";
  $("#workflowMaterial").value = state.notes.mainMaterial || "";
  $("#copyDraft").value = state.notes.copyDraft || "";
  $("#copyBenefit").value = state.notes.copyBenefit || "";
  $("#copyLink").value = state.notes.copyLink || "";
  $("#executionResult").value = state.notes.executionResult || "";
  $("#exceptionNote").value = state.notes.exceptionNote || "";
  $all("[data-note]").forEach((input) => {
    input.value = state.notes[input.dataset.note] || "";
  });
  $("#pushTitle").value = state.push.title || "";
  $("#pushSummary").value = state.push.summary || "";
  $("#pushUrl").value = state.push.url || "";
  $("#pushTime").value = state.push.time || "";
  $("#pushPlatform").value = state.push.platform || "全部";
  $("#pushUid").value = state.push.uid || "";
  $("#reportDraft").value = state.reportDraft || "";
  $("#dataImportText").value = state.notes.dataImportText || "";
  $("#reportCurrentDate").value = state.reportDates?.current || state.targetDate || todayText();
  $("#reportCompareDate").value = state.reportDates?.compare || getSourceDate(state.targetDate || todayText());
  $("#dailyCurrentDate").value = state.reportDates?.current || state.targetDate || todayText();
  $("#dailyCompareDate").value = state.reportDates?.compare || getSourceDate(state.targetDate || todayText());
  $("#dailyScope").value = state.notes.dailyScope || "APP+PC全部";
  $("#dailyWarnThreshold").value = state.notes.dailyWarnThreshold || "10000";
  $("#communityCopyInput").value = state.communityCopy?.input || "";
  $("#reviewArchive").value = state.notes.reviewArchive || "";
}

function renderAll() {
  hydrateInputs();
  renderDates();
  renderTasks();
  renderAudienceRows();
  renderReportRows();
  renderStrategy();
  renderCommunityCopy();
  renderDailyDetails();
  renderMetrics();
  renderSummary();
  loadIndexPerformance();
  loadMarketKline();
}

function renderDates() {
  const target = $("#targetDate").value || state.targetDate;
  $("#sourceDateText").textContent = target ? getSourceDate(target) : "-";
}

function renderMetrics() {
  const tasks = state.tasks || [];
  $("#pendingCount").textContent = tasks.filter((task) => task.status === "pending").length;
  $("#doneCount").textContent = tasks.filter((task) => task.status === "done").length;
  $("#errorCount").textContent = tasks.filter((task) => task.status === "error").length;
  $("#reportCount").textContent = (state.reportRows || []).filter((row) => row.id || row.title).length;
}

function renderSummary() {
  const rows = state.reportRows || [];
  const totalImpressions = rows.reduce((sum, row) => sum + Number(row.impressions || 0), 0);
  const totalClicks = rows.reduce((sum, row) => sum + Number(row.clicks || 0), 0);
  const totalDeals = rows.reduce((sum, row) => sum + Number(row.deals || 0), 0);
  $("#summaryImpressions").textContent = totalImpressions;
  $("#summaryClicks").textContent = totalClicks;
  $("#summaryDeals").textContent = totalDeals;
  $("#summaryRate").textContent = calcRate(totalClicks, totalImpressions);
}

function renderTasks() {
  const tasks = state.tasks || [];
  $("#homeTaskList").innerHTML = tasks.length ? tasks.map(taskCardHtml).join("") : emptyTasksHtml();
  $("#workflowTasks").innerHTML = tasks.length ? tasks.map(taskCardHtml).join("") : emptyTasksHtml();
  bindTaskButtons();
}

function applyPushTemplate(template) {
  const [title, summary] = template.split("|");
  $("#pushTitle").value = title || "";
  $("#pushSummary").value = summary || "";
  state.push.title = $("#pushTitle").value;
  state.push.summary = $("#pushSummary").value;
  saveState(false);
  showToast("Push 标题和摘要已填入");
}

function emptyTasksHtml() {
  return `<div class="task-card"><div></div><div><strong>还没有任务</strong><p>选择目标日期后生成 T01-T04。</p></div><div></div></div>`;
}

function taskCardHtml(task) {
  const pushInfo = task.channel === "Push" ? `<p>Push：${state.push.title || "待填标题"} / ${state.push.summary || "待填摘要"}</p>` : "";
  return `
    <article class="task-card ${task.status === "done" || task.status === "skipped" ? "done" : ""}">
      <input type="checkbox" data-task-check="${task.taskNo}" ${task.checked ? "checked" : ""}>
      <div>
        <strong>${task.taskNo} ${task.product} / ${task.channel}</strong>
        <p>来源日：${task.sourceDate || "-"}　目标日：${task.targetDate || "-"}</p>
        <p>入口：${task.entry}</p>
        <p>广告分组：${task.groupName}　规则：${task.sourceRule}</p>
        <p>素材：${task.material || "待填写"}</p>
        ${pushInfo}
        <p>备注：${task.note || "-"}</p>
      </div>
      <div class="task-actions">
        <span class="status ${task.status}">${STATUS_LABELS[task.status]}</span>
        <button class="mini-btn" data-task-status="${task.taskNo}:done">完成</button>
        <button class="mini-btn" data-task-status="${task.taskNo}:skipped">跳过</button>
        <button class="mini-btn" data-task-status="${task.taskNo}:error">异常</button>
        <button class="mini-btn" data-task-delete="${task.taskNo}">删除</button>
      </div>
    </article>
  `;
}

function bindTaskButtons() {
  $all("[data-task-check]").forEach((checkbox) => {
    checkbox.addEventListener("change", () => {
      const task = state.tasks.find((item) => item.taskNo === checkbox.dataset.taskCheck);
      if (task) task.checked = checkbox.checked;
      saveState(false);
    });
  });

  $all("[data-task-status]").forEach((button) => {
    button.addEventListener("click", () => {
      const [taskNo, status] = button.dataset.taskStatus.split(":");
      const task = state.tasks.find((item) => item.taskNo === taskNo);
      if (task) task.status = status;
      saveState(false);
      showToast(`${taskNo} 已更新为${STATUS_LABELS[status]}`);
    });
  });

  $all("[data-task-delete]").forEach((button) => {
    button.addEventListener("click", () => {
      state.tasks = state.tasks.filter((item) => item.taskNo !== button.dataset.taskDelete);
      saveState(false);
      showToast("任务记录已删除");
    });
  });
}

function updateCheckedTasks(status) {
  const checked = state.tasks.filter((task) => task.checked);
  if (!checked.length) {
    showToast("请先勾选任务");
    return;
  }
  checked.forEach((task) => {
    task.status = status;
    task.checked = false;
  });
  saveState(false);
  showToast("已按勾选任务更新状态");
}

function clearErrorTasks() {
  const errors = state.tasks.filter((task) => task.status === "error");
  errors.forEach((task) => {
    task.status = "pending";
    task.note = `${task.note || ""} 已清除异常，待重新确认。`.trim();
  });
  saveState(false);
  showToast(errors.length ? "异常状态已清除" : "当前没有异常任务");
}

function renderAudienceRows() {
  $("#audienceRows").innerHTML = (state.audienceRows || []).map((row, index) => `
    <tr>
      <td><input data-audience="${index}:name" value="${escapeHtml(row.name)}"></td>
      <td><input data-audience="${index}:performance" value="${escapeHtml(row.performance)}"></td>
      <td><input data-audience="${index}:note" value="${escapeHtml(row.note)}"></td>
    </tr>
  `).join("");
}

function addAudienceRow() {
  collectInputs();
  state.audienceRows.push({ name: "", performance: "", note: "" });
  saveState(false);
  showToast("已新增人群记录");
}

function readAudienceRows() {
  const rows = [];
  $all("[data-audience]").forEach((input) => {
    const [index, key] = input.dataset.audience.split(":");
    rows[index] ||= { name: "", performance: "", note: "" };
    rows[index][key] = input.value;
  });
  return rows;
}

function renderReportRows() {
  $("#reportRows").innerHTML = (state.reportRows || []).map((row, index) => {
    const rate = calcRate(row.clicks, row.impressions);
    return `
      <tr>
        <td><input data-report="${index}:id" value="${escapeHtml(row.id)}"></td>
        <td>
          <select data-report="${index}:channel">
            ${["普通广告", "App弹窗广告", "PC弹窗广告", "Push"].map((channel) => `<option ${row.channel === channel ? "selected" : ""}>${channel}</option>`).join("")}
          </select>
        </td>
        <td><input data-report="${index}:title" value="${escapeHtml(row.title)}"></td>
        <td><input data-report="${index}:audience" value="${escapeHtml(row.audience)}"></td>
        <td><input data-report="${index}:impressions" type="number" value="${escapeHtml(row.impressions)}"></td>
        <td><input data-report="${index}:clicks" type="number" value="${escapeHtml(row.clicks)}"></td>
        <td><input data-report="${index}:deals" type="number" value="${escapeHtml(row.deals)}"></td>
        <td>${rate}</td>
      </tr>
    `;
  }).join("");
}

function addReportRow() {
  collectInputs();
  state.reportRows.push({ id: "", channel: "App弹窗广告", title: "", audience: "", impressions: "", clicks: "", deals: "" });
  saveState(false);
  showToast("已新增日报数据行");
}

function importReportData() {
  collectInputs();
  const text = $("#dataImportText").value.trim();
  if (!text) {
    showToast("请先粘贴后台数据");
    return;
  }
  const rows = text
    .split(/\r?\n/)
    .map((line) => line.split(/\t|,/).map((cell) => cell.trim()))
    .filter((cells) => cells.length >= 3)
    .map((cells) => ({
      id: cells[0] || "",
      channel: normalizeChannel(cells[1] || "App弹窗广告"),
      title: cells[2] || "",
      audience: cells[3] || "",
      impressions: cells[4] || "",
      clicks: cells[5] || "",
      deals: cells[6] || ""
    }));
  if (!rows.length) {
    showToast("没有识别到可导入数据");
    return;
  }
  state.reportRows = rows;
  saveState(false);
  showToast(`已导入 ${rows.length} 条日报数据`);
}

function loadBackendData() {
  const payload = window.HUNTER_ADSTAT_DATA;
  if (!payload || !Array.isArray(payload.rows) || !payload.rows.length) {
    showToast("暂无后台数据，请先运行刷新脚本生成数据文件");
    return;
  }
  applyBackendRows(payload);
  persistState(false);
  showToast(`已加载猎手活动后台数据 ${state.reportRows.length} 条`);
}

function applyBackendRows(payload) {
  state.reportRows = payload.rows.map((row) => ({
    id: row.id || "",
    channel: normalizeChannel(row.channel || ""),
    title: row.title || "",
    audience: row.audience || "",
    impressions: row.impressions || "",
    clicks: row.clicks || "",
    orders: row.orders || "",
    deals: row.deals || "",
    image: row.image || ""
  }));
  state.adstatHistory = normalizeAdstatHistory(payload);
  state.targetDate = payload.date || state.targetDate;
  state.reportDates.current = payload.date || state.reportDates.current;
  state.reportDates.compare = addDays(state.reportDates.current, -1);
  state.strategyItems = computeStrategyItems(state.reportRows);
  syncAudienceInsightsFromRows(state.reportRows);
}

function normalizeAdstatHistory(payload) {
  if (!payload?.history?.length) {
    return [{
      date: payload.date || state.targetDate || todayText(),
      rows: payload.rows || []
    }];
  }
  return payload.history.map((day) => ({
    date: day.date,
    rows: (day.rows || []).map((row) => ({
      id: row.id || "",
      channel: normalizeChannel(row.channel || ""),
      title: row.title || "",
      audience: row.audience || "",
      impressions: row.impressions || "",
      clicks: row.clicks || "",
      orders: row.orders || "",
      deals: row.deals || "",
      image: row.image || ""
    }))
  }));
}

function persistState(showMessage = true) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  if (showMessage) showToast("已保存到本地浏览器");
  renderAll();
}

function shouldAutoLoadBackendRows() {
  const payload = window.HUNTER_ADSTAT_DATA;
  if (!payload || !Array.isArray(payload.rows) || !payload.rows.length) return false;
  const rows = state.reportRows || [];
  if (!rows.length) return true;
  return rows.every((row) => String(row.id || "").startsWith("示例-") || !row.id);
}

function normalizeChannel(value) {
  if (value.includes("Normal")) return "普通广告";
  if (value.includes("PcPopup")) return "PC弹窗广告";
  if (value.includes("AppPopup")) return "App弹窗广告";
  if (value.includes("普通")) return "普通广告";
  if (value.includes("PC")) return "PC弹窗广告";
  if (value.includes("Push") || value.includes("通知")) return "Push";
  return "App弹窗广告";
}

function readReportRows() {
  const rows = [];
  $all("[data-report]").forEach((input) => {
    const [index, key] = input.dataset.report.split(":");
    rows[index] ||= { id: "", channel: "App弹窗广告", title: "", audience: "", impressions: "", clicks: "", deals: "", image: "" };
    rows[index][key] = input.value;
  });
  return rows;
}

function calcRate(clicks, impressions) {
  const clickNum = Number(clicks);
  const impressionNum = Number(impressions);
  if (!impressionNum) return "-";
  return `${((clickNum / impressionNum) * 100).toFixed(2)}%`;
}

function buildReportDraft() {
  collectInputs();
  const rows = state.reportRows.filter((row) => row.id || row.title);
  if (!rows.length) {
    showToast("请先录入日报数据");
    return;
  }
  const totalImpressions = rows.reduce((sum, row) => sum + Number(row.impressions || 0), 0);
  const totalClicks = rows.reduce((sum, row) => sum + Number(row.clicks || 0), 0);
  const totalDeals = rows.reduce((sum, row) => sum + Number(row.deals || 0), 0);
  const lowRows = rows
    .filter((row) => Number(row.impressions || 0) >= 100 && Number(row.clicks || 0) === 0)
    .slice(0, 5);
  const channelLines = ["普通广告", "App弹窗广告", "PC弹窗广告", "Push"].map((channel) => {
    const channelRows = rows.filter((row) => row.channel === channel);
    const impressions = channelRows.reduce((sum, row) => sum + Number(row.impressions || 0), 0);
    const clicks = channelRows.reduce((sum, row) => sum + Number(row.clicks || 0), 0);
    return `${channel}：弹出/曝光 ${impressions}，点击 ${clicks}，点击率 ${calcRate(clicks, impressions)}`;
  });

  state.reportDraft = [
    `猎手活动日报（${state.reportDates?.current || state.targetDate || todayText()}）`,
    `对比日期：${state.reportDates?.compare || getSourceDate(state.targetDate || todayText())}`,
    "",
    `整体：弹出/曝光 ${totalImpressions}，点击 ${totalClicks}，成交 ${totalDeals}，整体点击率 ${calcRate(totalClicks, totalImpressions)}。`,
    "",
    "渠道拆分：",
    ...channelLines,
    "",
    "问题素材：",
    lowRows.length ? lowRows.map((row) => `广告 ${row.id || "-"}「${row.title || "未命名"}」弹出 ${row.impressions}、点击 0，建议同人群重新做差异化图。`).join("\n") : "暂无明显点击为 0 的问题素材。",
    "",
    "策略提醒：普通广告不进入换图策略；App/PC 弹窗只在同产品、同渠道、同人群内参考替换。"
  ].join("\n");

  $("#reportDraft").value = state.reportDraft;
  saveState(false);
  showToast("日报草稿已生成");
}

function buildStrategy() {
  collectInputs();
  const rows = state.reportRows
    .filter((row) => row.id || row.title)
    .filter((row) => row.channel === "App弹窗广告" || row.channel === "PC弹窗广告");

  if (!rows.length) {
    state.strategyItems = [
      {
        title: "暂无可分析的 App/PC 弹窗数据",
        detail: "请先录入 App 弹窗或 PC 弹窗数据。普通广告和 Push 暂不进入换图策略。",
        action: "待补数据"
      }
    ];
    saveState(false);
    showToast("暂无可生成策略的数据");
    return;
  }

  state.strategyItems = computeStrategyItems(state.reportRows);

  saveState(false);
  showToast("策略建议已生成");
}

function computeStrategyItems(sourceRows) {
  const rows = sourceRows
    .filter((row) => row.id || row.title)
    .filter((row) => row.channel === "App弹窗广告" || row.channel === "PC弹窗广告");
  if (!rows.length) return [];

  const channelAverage = {};
  rows.forEach((row) => {
    channelAverage[row.channel] ||= { impressions: 0, clicks: 0 };
    channelAverage[row.channel].impressions += Number(row.impressions || 0);
    channelAverage[row.channel].clicks += Number(row.clicks || 0);
  });

  return rows.map((row) => {
    const impressions = Number(row.impressions || 0);
    const clicks = Number(row.clicks || 0);
    const rate = impressions ? clicks / impressions : 0;
    const avgBase = channelAverage[row.channel];
    const avg = avgBase.impressions ? avgBase.clicks / avgBase.impressions : 0;
    const weak = impressions >= 100 && (clicks === 0 || rate < avg * 0.65);
    const replacement = findReplacement(row, rows);
    const replacementText = replacement
      ? `建议替换图：参考 ${replacement.id || "未填ID"}「${replacement.title || "未命名"}」，同人群点击率 ${calcRate(replacement.clicks, replacement.impressions)}。`
      : "建议替换图：无同人群更优素材。";
    const creativeText = creativePrompt(row);
    return {
      title: `${row.channel} / ${row.id || "未填ID"} / ${row.title || "未命名广告"}`,
      detail: `人群：${row.audience || "待补"}；弹出/曝光：${impressions}；点击：${clicks}；点击率：${calcRate(clicks, impressions)}；渠道均值：${(avg * 100).toFixed(2)}%。\n${replacementText}\n创新方向：${creativeText}`,
      action: weak ? "建议同人群找高效图做衍生，不跨产品、不跨渠道、不跨人群。" : "暂不标记低效，继续观察。"
    };
  });
}

function findReplacement(row, rows) {
  const rowRate = Number(row.impressions || 0) ? Number(row.clicks || 0) / Number(row.impressions || 0) : 0;
  return rows
    .filter((candidate) => candidate !== row)
    .filter((candidate) => candidate.channel === row.channel)
    .filter((candidate) => (candidate.audience || "") === (row.audience || ""))
    .map((candidate) => ({
      ...candidate,
      rate: Number(candidate.impressions || 0) ? Number(candidate.clicks || 0) / Number(candidate.impressions || 0) : 0
    }))
    .filter((candidate) => candidate.rate > rowRate)
    .sort((a, b) => b.rate - a.rate)[0];
}

function creativePrompt(row) {
  return `基于猎手活动「${row.title || "当前素材"}」做差异化新图，保留同人群承接逻辑，强化标题钩子、福利表达、行动指令，避免直接复刻原图。`;
}

function renderStrategy() {
  const list = $("#strategyList");
  if (!list) return;
  const items = state.strategyItems || [];
  list.innerHTML = items.length ? items.map((item) => `
    <article class="strategy-item">
      <div>
        <strong>${escapeHtml(item.title)}</strong>
        <span>${escapeHtml(item.detail)}</span>
      </div>
      <span class="status ${item.action.includes("建议") ? "error" : "skipped"}">${escapeHtml(item.action)}</span>
    </article>
  `).join("") : `
    <article class="strategy-item">
      <div>
        <strong>等待日报数据</strong>
        <span>录入 App/PC 弹窗数据后，可生成低效素材和同人群替换建议。</span>
      </div>
      <span class="status skipped">待分析</span>
    </article>
  `;
}

function buildCommunityCopy() {
  collectInputs();
  const text = state.communityCopy.input.trim();
  const rows = parseCommunityCopy(text);
  const total = rows.length;
  const usageTotal = rows.reduce((sum, row) => sum + row.usage, 0);
  const avg = total ? usageTotal / total : 0;
  const top = rows.sort((a, b) => b.usage - a.usage).slice(0, 3);
  const suggestion = total === 0
    ? "当天未发布社群文案，建议补齐承接文案。"
    : avg < 3
      ? "平均引用偏低，建议优化标题钩子、行动指令和福利表达。"
      : "可复用 TOP 文案结构，并调整低引用文案。";

  state.communityCopy.summary = {
    total,
    usageTotal,
    avg: avg.toFixed(2),
    top,
    suggestion
  };
  saveState(false);
  showToast("社群文案分析已生成");
}

function applyCommunityCopyData(payload) {
  if (!payload || !Array.isArray(payload.rows)) return;
  state.communityCopy.summary = {
    total: payload.total || payload.rows.length || 0,
    allCount: payload.allCount || payload.rows.length || 0,
    usageTotal: payload.usageTotal || 0,
    avg: String(payload.avg || 0),
    tags: (payload.tags || []).map((tag) => ({
      tagName: tag.tagName || "",
      tagId: tag.tagId || "",
      allCount: tag.allCount || 0,
      total: tag.total || 0,
      usageTotal: tag.usageTotal || 0,
      avg: String(tag.avg || 0),
      top: (tag.top || []).map((item) => ({
        content: item.content || "",
        usage: Number(item.usage || 0),
        createdAt: item.createdAt || "",
        status: item.status || ""
      })),
      error: tag.error || ""
    })),
    top: (payload.top || []).map((item) => ({
      content: item.content || "",
      usage: Number(item.usage || 0),
      createdAt: item.createdAt || "",
      status: item.status || ""
    })),
    suggestion: getCommunitySuggestion(payload.total || 0, Number(payload.avg || 0))
  };
}

function getCommunitySuggestion(total, avg) {
  if (!total) return "当天未发布社群文案，建议补齐承接文案。";
  if (avg < 3) return "平均引用偏低，建议优化标题钩子、行动指令和福利表达。";
  return "可复用 TOP 文案结构，并调整低引用文案。";
}

function parseCommunityCopy(text) {
  if (!text) return [];
  return text
    .split(/\r?\n/)
    .map((line) => line.split(/\t|,/).map((cell) => cell.trim()))
    .filter((cells) => cells.some(Boolean))
    .map((cells) => {
      const content = cells[0] || "";
      const usage = Number((cells[1] || "0").replace(/[^\d.]/g, "")) || 0;
      return {
        content,
        usage,
        createdAt: cells[2] || "",
        status: cells[3] || ""
      };
    });
}

function renderCommunityCopy() {
  const wrap = $("#communitySummary");
  if (!wrap) return;
  const summary = state.communityCopy?.summary;
  if (!summary) {
    wrap.innerHTML = `
      <div class="copy-card">
        <strong>社群文案数据未更新</strong>
        <p>打开企业微信素材管理，按标签“猎手活动”和当前日期筛选，复制数据后粘贴生成分析。</p>
      </div>
    `;
    return;
  }
  wrap.innerHTML = `
    <div class="summary-cards">
      <article><span>标签素材总数</span><strong>${summary.allCount || summary.total}</strong></article>
      <article><span>文案当天总数</span><strong>${summary.total}</strong></article>
      <article><span>引用总数</span><strong>${summary.usageTotal}</strong></article>
      <article><span>平均引用次数</span><strong>${summary.avg}</strong></article>
    </div>
    ${summary.tags?.length ? `
      <div class="tag-summary-grid">
        ${summary.tags.map((tag) => `
          <article class="copy-card tag-copy-card">
            <span>${escapeHtml(tag.tagName)} / tag_id ${escapeHtml(tag.tagId || "未识别")}</span>
            <strong>${tag.total}</strong>
            <p>当天文案数 ${tag.total}，标签素材总数 ${tag.allCount}，引用总数 ${tag.usageTotal}，平均引用 ${tag.avg}</p>
            ${tag.error ? `<p>状态：${escapeHtml(tag.error)}</p>` : ""}
          </article>
        `).join("")}
      </div>
    ` : ""}
    ${summary.top.length ? summary.top.map((item, index) => `
      <div class="copy-card">
        <span>TOP${index + 1} / 使用人数 ${item.usage} / ${escapeHtml(item.createdAt || "创建时间待补")} / ${escapeHtml(item.status || "状态待补")}</span>
        <p>${escapeHtml(item.content || "内容摘要待补")}</p>
      </div>
    `).join("") : ""}
    <div class="copy-card">
      <span>自动建议</span>
      <p>${escapeHtml(summary.suggestion)}</p>
    </div>
  `;
}

function renderDailyDetails() {
  const currentDate = state.reportDates?.current || state.targetDate || todayText();
  const previousDate = addDays(currentDate, -1);
  const previous2Date = addDays(currentDate, -2);
  const rows = getRowsForReportDate(currentDate);
  const previousRows = getRowsForReportDate(previousDate);
  const previous2Rows = getRowsForReportDate(previous2Date);
  const metrics = buildDailyMetrics(rows);
  const previousMetrics = buildDailyMetrics(previousRows);
  const previous2Metrics = buildDailyMetrics(previous2Rows);
  const issueRows = getIssueRows(rows);
  const scope = state.notes.dailyScope || "APP+PC全部";
  $("#dailyHeaderDesc").textContent = `日报日期：${currentDate}；对比日期：${previousDate} / ${previous2Date}；当前项目：猎手活动；当前口径：${scope}。`;

  $("#dailyKpis").innerHTML = [
    ["广告条数", metrics.count, previousMetrics.count, previous2Metrics.count, "投放素材"],
    ["曝光/弹出", metrics.impressions, previousMetrics.impressions, previous2Metrics.impressions, "曝光触达"],
    ["点击", metrics.clicks, previousMetrics.clicks, previous2Metrics.clicks, "点击人群"],
    ["成交", metrics.deals, previousMetrics.deals, previous2Metrics.deals, "今日重点"],
    ["点击率", metrics.clickRateText, previousMetrics.clickRate, previous2Metrics.clickRate, "点击/弹出"],
    ["付款完成率", metrics.payRateText, previousMetrics.payRate, previous2Metrics.payRate, "成交/订单"],
    ["提交订单", metrics.orders, previousMetrics.orders, previous2Metrics.orders, "订单线索"],
    ["问题素材", issueRows.length, getIssueRows(previousRows).length, getIssueRows(previous2Rows).length, "需复核"]
  ].map(([label, value, prev, prev2, hint]) => metricCardHtml(label, value, prev, prev2, hint)).join("") + `
    <div class="kpi-section-label">社群文案数据</div>
    ${[
      ["文案当天总数", getCommunityMetric("total"), null, null, "社群文案"],
      ["引用总数", getCommunityMetric("usageTotal"), null, null, "社群引用"],
      ["平均引用次数", getCommunityMetric("avg"), null, null, "引用/文案"]
    ].map(([label, value, prev, prev2, hint]) => metricCardHtml(label, value, prev, prev2, hint)).join("")}
  `;

  renderMarketBrief(metrics, previousMetrics, previous2Metrics, currentDate);

  $("#dailyFunnel").innerHTML = [
    ["曝光/弹出", metrics.impressions],
    ["点击", metrics.clicks],
    ["提交订单", metrics.orders],
    ["成交", metrics.deals]
  ].map(([label, value]) => `<article><span>${label}</span><strong>${value}</strong></article>`).join("");

  $("#channelBreakdown").innerHTML = buildBreakdownRows(groupRows(rows, "channel"), "channel");
  $("#audienceBreakdown").innerHTML = buildBreakdownRows(groupRows(rows, "audience"), "audience");
  $("#issueTopRows").innerHTML = issueRows.length ? issueRows.map((row) => {
    const replacement = findReplacement(row, rows);
    return `
      <tr>
        <td>${imageThumb(row.image, "素材")}</td>
        <td>${escapeHtml(row.id || "-")}</td>
        <td>${escapeHtml(row.channel || "-")}</td>
        <td>${escapeHtml(row.title || "-")}</td>
        <td>${escapeHtml(row.audience || "-")}</td>
        <td>${Number(row.impressions || 0)}</td>
        <td>${calcRate(row.clicks, row.impressions)}</td>
        <td>${Number(row.deals || 0)}</td>
        <td>${replacement ? `${imageThumb(replacement.image, "建议替换图")}<div>参考ID：${escapeHtml(replacement.id || "-")}</div><div>点击率：${calcRate(replacement.clicks, replacement.impressions)}</div>` : "无同人群更优素材"}</td>
        <td>${escapeHtml(creativePrompt(row))}</td>
        <td><button class="mini-btn" data-issue-todo="${escapeHtml(row.id || "")}">加入待办</button></td>
      </tr>
    `;
  }).join("") : `<tr><td colspan="11">暂无明显问题素材</td></tr>`;
  bindIssueTodoButtons();
}

function imageThumb(src, alt) {
  if (!src) return `<div class="image-empty">无图</div>`;
  return `<img class="material-thumb" src="${escapeHtml(src)}" alt="${escapeHtml(alt)}" loading="lazy">`;
}

function bindIssueTodoButtons() {
  $all("[data-issue-todo]").forEach((button) => {
    button.addEventListener("click", () => {
      const id = button.dataset.issueTodo;
      const row = (state.reportRows || []).find((item) => String(item.id) === String(id));
      if (!row) return;
      const line = `待办：复查问题素材 ${row.channel} 广告 ${row.id || "-"}「${row.title || "未命名"}」，点击率 ${calcRate(row.clicks, row.impressions)}。`;
      state.notes.daily = [state.notes.daily, line].filter(Boolean).join("\n");
      $("#dailyNotes").value = state.notes.daily;
      persistState(false);
      showToast("已加入待办");
    });
  });
}

function getCommunityMetric(key) {
  const summary = state.communityCopy?.summary;
  if (!summary) return key === "avg" ? "0.00" : 0;
  if (key === "avg") return Number(summary.avg || 0).toFixed(2);
  return Number(summary[key] || 0);
}

function getRowsForReportDate(date) {
  const history = state.adstatHistory || [];
  const found = history.find((day) => day.date === date);
  const rows = found ? found.rows : (date === (state.reportDates?.current || state.targetDate) ? state.reportRows : []);
  return filterRowsByDailyScope((rows || []).filter((row) => row.id || row.title));
}

function filterRowsByDailyScope(rows) {
  const scope = state.notes.dailyScope || "APP+PC全部";
  if (scope === "APP+PC全部") return rows.filter((row) => row.channel === "App弹窗广告" || row.channel === "PC弹窗广告");
  return rows.filter((row) => row.channel === scope);
}

function buildDailyMetrics(rows) {
  const impressions = rows.reduce((sum, row) => sum + Number(row.impressions || 0), 0);
  const clicks = rows.reduce((sum, row) => sum + Number(row.clicks || 0), 0);
  const orders = rows.reduce((sum, row) => sum + Number(row.orders || 0), 0);
  const deals = rows.reduce((sum, row) => sum + Number(row.deals || 0), 0);
  const clickRate = impressions ? clicks / impressions : 0;
  const payRate = orders ? deals / orders : 0;
  return {
    count: rows.length,
    impressions,
    clicks,
    orders,
    deals,
    clickRate,
    clickRateText: `${(clickRate * 100).toFixed(2)}%`,
    payRate,
    payRateText: orders ? `${(payRate * 100).toFixed(2)}%` : "0.00%"
  };
}

function metricCardHtml(label, value, previous, previous2, hint) {
  const currentNumber = typeof value === "string" && value.endsWith("%") ? Number(value.replace("%", "")) / 100 : Number(value || 0);
  const delta1 = deltaBadge(currentNumber, previous, "前日");
  const delta2 = deltaBadge(currentNumber, previous2, "前前日");
  return `<article><span>${label}${delta1}${delta2}</span><strong>${value}</strong><em>${hint}</em></article>`;
}

function deltaBadge(current, previous, label) {
  if (previous === null || previous === undefined || previous === "") return "";
  if (!previous) return `<b class="metric-delta">较${label} → 0.0%</b>`;
  const diff = (current - previous) / Math.abs(previous);
  const cls = diff > 0 ? "up" : diff < 0 ? "down" : "";
  const sign = diff > 0 ? "↑" : diff < 0 ? "↓" : "→";
  return `<b class="metric-delta ${cls}">较${label} ${sign} ${Math.abs(diff * 100).toFixed(1)}%</b>`;
}

function renderMarketBrief(metrics, previousMetrics, previous2Metrics, currentDate) {
  const clickTrend = metrics.clickRate > previousMetrics.clickRate ? "点击率较前一日改善" : metrics.clickRate < previousMetrics.clickRate ? "点击率较前一日回落" : "点击率与前一日基本持平";
  const dealTrend = metrics.deals > previousMetrics.deals ? "成交人数提升" : metrics.deals < previousMetrics.deals ? "成交人数下降" : "成交人数持平";
  $("#marketBriefText").innerHTML = `
    <p><strong>市场情绪：</strong><span id="marketMood">读取东方财富指数表现中...</span></p>
    <p><strong>指数表现：</strong><span id="indexPerformance">等待指数表现数据</span></p>
    <p><strong>赚钱效应：</strong>${clickTrend}，${dealTrend}；当前口径曝光/弹出 ${metrics.impressions}，点击 ${metrics.clicks}，提交订单 ${metrics.orders}，成交 ${metrics.deals}。</p>
    <p><strong>热点标签：</strong>${deriveHotTags()}</p>
    <p><strong>更新时间：</strong><span id="marketUpdatedAt">${currentDate}</span></p>
  `;
  $("#marketMiniChart").innerHTML = `
    <div class="chart-title"><span>上证指数日K走势</span><span id="klineDateLabel">加载中</span></div>
    <p>正在读取东方财富公开日线接口...</p>
  `;
}

function loadIndexPerformance() {
  if (!$("#indexPerformance")) return;
  const callback = `emIndex_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
  const secids = "1.000001,0.399001,0.399006";
  const url = `https://push2.eastmoney.com/api/qt/ulist.np/get?cb=${callback}&fltt=2&invt=2&fields=f12,f13,f14,f2,f3,f4,f6&secids=${secids}`;

  window[callback] = (payload) => {
    try {
      const rows = payload?.data?.diff || [];
      renderIndexPerformance(rows);
    } catch {
      renderIndexPerformanceFallback();
    } finally {
      delete window[callback];
      script.remove();
    }
  };

  const script = document.createElement("script");
  script.src = url;
  script.onerror = () => {
    renderIndexPerformanceFallback();
    delete window[callback];
    script.remove();
  };
  document.body.appendChild(script);
}

function renderIndexPerformance(rows) {
  const indexes = rows.map((row) => ({
    code: row.f12,
    name: row.f14,
    price: Number(row.f2),
    pct: Number(row.f3),
    change: Number(row.f4)
  })).filter((row) => row.name && Number.isFinite(row.pct));

  if (!indexes.length) {
    renderIndexPerformanceFallback();
    return;
  }

  const avgPct = indexes.reduce((sum, item) => sum + item.pct, 0) / indexes.length;
  const mood = avgPct >= 0.5 ? "偏强" : avgPct <= -0.5 ? "偏弱" : "震荡";
  const lines = indexes.map((item) => `${item.name} ${item.price.toFixed(2)} (${item.pct >= 0 ? "+" : ""}${item.pct.toFixed(2)}%)`);

  $("#marketMood").textContent = `${mood}，以上证指数、深证成指、创业板指综合表现判断。`;
  $("#indexPerformance").textContent = lines.join("；");
  $("#marketUpdatedAt").textContent = `${new Date().toLocaleString("zh-CN", { hour12: false })} / 东方财富公开指数表现`;
}

function renderIndexPerformanceFallback() {
  $("#marketMood").textContent = "指数表现暂未更新，先以猎手活动广告数据判断情绪。";
  $("#indexPerformance").textContent = "东方财富公开指数表现接口读取失败或无返回。";
}

function deriveHotTags() {
  const rows = getRowsForReportDate(state.reportDates?.current || state.targetDate || todayText());
  const titles = rows.map((row) => row.title || "").join(" ");
  const tags = [];
  if (/过期|到期/.test(titles)) tags.push("到期提醒");
  if (/福利|权益|名额/.test(titles)) tags.push("福利权益");
  if (/从未获得|新客|未获得/.test(titles)) tags.push("未获得人群");
  if (/91|90|30|7|3|1天/.test(titles)) tags.push("分层触达");
  return tags.length ? tags.join("、") : "猎手活动、主题机会、权益承接";
}

function loadMarketKline() {
  const chart = $("#marketMiniChart");
  if (!chart) return;
  const end = (state.reportDates?.current || state.targetDate || todayText()).replaceAll("-", "");
  const startDate = new Date(`${state.reportDates?.current || state.targetDate || todayText()}T00:00:00`);
  startDate.setDate(startDate.getDate() - 90);
  const beg = formatDate(startDate).replaceAll("-", "");
  const callback = `emKline_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
  const url = `https://push2his.eastmoney.com/api/qt/stock/kline/get?cb=${callback}&secid=1.000001&ut=fa5fd1943c7b386f172d6893dbfba10b&fields1=f1,f2,f3,f4,f5,f6&fields2=f51,f52,f53,f54,f55,f56,f57,f58,f59,f60,f61&klt=101&fqt=1&beg=${beg}&end=${end}`;

  window[callback] = (payload) => {
    try {
      const klines = payload?.data?.klines || [];
      renderKlineChart(klines);
    } catch {
      renderKlineFallback();
    } finally {
      delete window[callback];
      script.remove();
    }
  };

  const script = document.createElement("script");
  script.src = url;
  script.onerror = () => {
    renderKlineFallback();
    delete window[callback];
    script.remove();
  };
  document.body.appendChild(script);
}

function renderKlineChart(klines) {
  if (!klines.length) {
    renderKlineFallback();
    return;
  }
  const data = klines.slice(-42).map((line) => {
    const [date, open, close, high, low] = line.split(",");
    return { date, open: Number(open), close: Number(close), high: Number(high), low: Number(low) };
  });
  const latest = data[data.length - 1];
  const first = data[0];
  const min = Math.min(...data.map((item) => item.low));
  const max = Math.max(...data.map((item) => item.high));
  const width = 520;
  const height = 190;
  const pad = 22;
  const candleWidth = Math.max(4, (width - pad * 2) / data.length * 0.58);
  const y = (value) => height - pad - ((value - min) / (max - min || 1)) * (height - pad * 2);
  const x = (index) => pad + index * ((width - pad * 2) / Math.max(1, data.length - 1));
  const candles = data.map((item, index) => {
    const cx = x(index);
    const color = item.close >= item.open ? "#f05a28" : "#16a36b";
    const top = Math.min(y(item.open), y(item.close));
    const bodyHeight = Math.max(2, Math.abs(y(item.open) - y(item.close)));
    return `
      <line x1="${cx}" y1="${y(item.high)}" x2="${cx}" y2="${y(item.low)}" stroke="${color}" stroke-width="1"/>
      <rect x="${cx - candleWidth / 2}" y="${top}" width="${candleWidth}" height="${bodyHeight}" fill="${color}" opacity="0.82"/>
    `;
  }).join("");
  const change = latest.close - first.close;
  const changePct = first.close ? (change / first.close) * 100 : 0;
  $("#klineDateLabel").textContent = `${latest.date} 收 ${latest.close.toFixed(2)} ${changePct >= 0 ? "+" : "-"}${Math.abs(changePct).toFixed(2)}%`;
  $("#marketMiniChart").innerHTML = `
    <div class="chart-title"><span>上证指数日K走势</span><span>${latest.date} 收 ${latest.close.toFixed(2)}</span></div>
    <svg viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" aria-label="上证指数K线图">
      <line x1="${pad}" y1="${y(max)}" x2="${width - pad}" y2="${y(max)}" stroke="#efd8b8" stroke-dasharray="4 4"/>
      <line x1="${pad}" y1="${y((max + min) / 2)}" x2="${width - pad}" y2="${y((max + min) / 2)}" stroke="#efd8b8" stroke-dasharray="4 4"/>
      <line x1="${pad}" y1="${y(min)}" x2="${width - pad}" y2="${y(min)}" stroke="#efd8b8" stroke-dasharray="4 4"/>
      ${candles}
    </svg>
    <p>红/空心为上涨，绿/实心为下跌；K线来自东方财富公开日线接口。</p>
  `;
}

function renderKlineFallback() {
  $("#marketMiniChart").innerHTML = `
    <div class="chart-title"><span>上证指数日K走势</span><span>暂无数据</span></div>
    <p>暂未读取到 K 线数据。请稍后刷新，或检查网络访问。</p>
  `;
}

function groupRows(rows, key) {
  return rows.reduce((map, row) => {
    const name = row[key] || "未填写";
    map[name] ||= { name, count: 0, impressions: 0, clicks: 0, deals: 0 };
    map[name].count += 1;
    map[name].impressions += Number(row.impressions || 0);
    map[name].clicks += Number(row.clicks || 0);
    map[name].deals += Number(row.deals || 0);
    return map;
  }, {});
}

function buildBreakdownRows(grouped, type) {
  const rows = Object.values(grouped);
  if (!rows.length) return `<tr><td colspan="${type === "channel" ? 5 : 6}">暂无数据</td></tr>`;
  return rows
    .sort((a, b) => b.impressions - a.impressions)
    .map((row) => type === "channel" ? `
      <tr>
        <td>${escapeHtml(row.name)}</td>
        <td>${row.impressions}</td>
        <td>${row.clicks}</td>
        <td>${calcRate(row.clicks, row.impressions)}</td>
        <td>${row.deals}</td>
      </tr>
    ` : `
      <tr>
        <td>${escapeHtml(row.name)}</td>
        <td>${row.count}</td>
        <td>${row.impressions}</td>
        <td>${row.clicks}</td>
        <td>${calcRate(row.clicks, row.impressions)}</td>
        <td>${row.deals}</td>
      </tr>
    `).join("");
}

function getIssueRows(rows) {
  return rows
    .map((row) => {
      const impressions = Number(row.impressions || 0);
      const clicks = Number(row.clicks || 0);
      const rate = impressions ? clicks / impressions : 0;
      const score = impressions >= 100 && clicks === 0 ? 1000 + impressions : impressions * (1 - rate);
      return { ...row, score };
    })
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);
}

function syncAudienceInsightsFromRows(rows) {
  const grouped = Object.values(groupRows(rows.filter((row) => row.audience), "audience"))
    .filter((item) => item.impressions > 0)
    .map((item) => ({
      ...item,
      rate: item.clicks / item.impressions
    }));

  const high = grouped
    .filter((item) => item.clicks > 0)
    .sort((a, b) => (b.rate - a.rate) || (b.deals - a.deals))
    .slice(0, 8);

  const low = grouped
    .filter((item) => item.impressions >= 100 && (item.clicks === 0 || item.rate < 0.005))
    .sort((a, b) => b.impressions - a.impressions)
    .slice(0, 8);

  state.notes.highAudience = high.length ? high.map((item, index) =>
    `TOP${index + 1}：${item.name}\n曝光/弹出 ${item.impressions}，点击 ${item.clicks}，点击率 ${calcRate(item.clicks, item.impressions)}，成交 ${item.deals}。`
  ).join("\n\n") : "后台数据中暂未识别出高点击人群。";

  state.notes.lowAudience = low.length ? low.map((item, index) =>
    `低效${index + 1}：${item.name}\n曝光/弹出 ${item.impressions}，点击 ${item.clicks}，点击率 ${calcRate(item.clicks, item.impressions)}，成交 ${item.deals}。`
  ).join("\n\n") : "后台数据中暂未识别出明显低效人群。";

  state.notes.backendAudienceNote = grouped
    .sort((a, b) => b.impressions - a.impressions)
    .slice(0, 12)
    .map((item) => `${item.name}｜广告数 ${item.count}｜曝光/弹出 ${item.impressions}｜点击 ${item.clicks}｜成交 ${item.deals}`)
    .join("\n");

  state.audienceRows = grouped
    .sort((a, b) => b.impressions - a.impressions)
    .slice(0, 20)
    .map((item) => ({
      name: item.name,
      performance: `点击率 ${calcRate(item.clicks, item.impressions)} / 成交 ${item.deals}`,
      note: `后台猎手活动数据同步：曝光/弹出 ${item.impressions}，点击 ${item.clicks}`
    }));
}

function addIssuesToTodo() {
  const issues = getIssueRows(state.reportRows || []);
  if (!issues.length) {
    showToast("暂无问题素材可加入待办");
    return;
  }
  const lines = issues.slice(0, 5).map((row) => `待办：复查 ${row.channel} 广告 ${row.id || "-"}「${row.title || "未命名"}」，人群 ${row.audience || "待补"}，点击率 ${calcRate(row.clicks, row.impressions)}。`);
  state.notes.daily = [state.notes.daily, ...lines].filter(Boolean).join("\n");
  $("#dailyNotes").value = state.notes.daily;
  saveState(false);
  showToast("问题素材已加入首页待办/异常备注");
}

function fakeExport(type) {
  const message = `猎手活动日报已生成 ${type} 导出占位。当前轻量版先保留页面内容和草稿，后续接入真实文件导出。`;
  state.notes.reviewArchive = [state.notes.reviewArchive, message].filter(Boolean).join("\n");
  $("#reviewArchive").value = state.notes.reviewArchive;
  saveState(false);
  showToast(`${type} 导出占位已记录`);
}

function refreshDailyDataFromLoadedFile() {
  const payload = window.HUNTER_ADSTAT_DATA;
  if (!payload || !Array.isArray(payload.rows) || !payload.rows.length) {
    showToast("暂无已生成的后台数据，请先运行刷新脚本");
    return;
  }
  applyBackendRows(payload);
  persistState(false);
  showToast("已用后台数据刷新日报");
}

async function copyDailyReport() {
  collectInputs();
  buildReportDraft();
  const text = $("#reportDraft").value || "";
  if (!text.trim()) {
    showToast("暂无日报内容可复制");
    return;
  }
  try {
    await navigator.clipboard.writeText(text);
    showToast("日报已复制");
  } catch {
    showToast("日报已生成，可手动复制");
  }
}

async function copyDraftText() {
  const benefit = $("#copyBenefit").value || "猎手活动权益";
  const link = $("#copyLink").value || "【填写链接】";
  const type = $("#copyType").value;
  const text = $("#copyDraft").value || `${type}\n${benefit}已开启，适合关注主题机会和节奏跟踪的用户查看。\n入口：${link}\n风险提示：以上内容仅供运营素材参考，不构成投资建议。`;
  $("#copyDraft").value = text;
  state.notes.copyDraft = text;
  try {
    await navigator.clipboard.writeText(text);
    showToast("文案已复制");
  } catch {
    showToast("已生成文案，可手动复制");
  }
  saveState(false);
}

async function copyNote(noteKey) {
  collectInputs();
  const text = state.notes[noteKey] || "";
  if (!text.trim()) {
    showToast("这里还没有可复制内容");
    return;
  }
  try {
    await navigator.clipboard.writeText(text);
    showToast("已复制");
  } catch {
    showToast("可手动复制文本");
  }
}

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function init() {
  if (!state.targetDate) state.targetDate = todayText();
  if (!state.tasks || !state.tasks.length) {
    state.tasks = createTasks(state.targetDate, state.notes.mainMaterial || "");
  }
  if (shouldAutoLoadBackendRows()) {
    applyBackendRows(window.HUNTER_ADSTAT_DATA);
  }
  if (window.HUNTER_COMMUNITY_COPY_DATA && window.HUNTER_COMMUNITY_COPY_DATA.updatedAt) {
    applyCommunityCopyData(window.HUNTER_COMMUNITY_COPY_DATA);
  }
  if (!state.reportRows || !state.reportRows.some((row) => row.id || row.title)) {
    state.reportRows = [
      { id: "示例-APP01", channel: "App弹窗广告", title: "名额告急", audience: "猎手活动目标人群", impressions: "1200", clicks: "18", deals: "1" },
      { id: "示例-PC01", channel: "PC弹窗广告", title: "今晚别错过", audience: "猎手活动目标人群", impressions: "980", clicks: "0", deals: "0" },
      { id: "示例-PUSH01", channel: "Push", title: "名额告急！！！", audience: "全部", impressions: "2000", clicks: "36", deals: "2" }
    ];
  }
  bindNavigation();
  bindEvents();
  renderAll();
}

init();
