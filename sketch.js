// 建立六個幼兒日常生活常識題目，GIF 使用 Google Noto Emoji 公開圖片。
const quizItems = [
  { id: "hands", label: "吃飯前洗手", emoji: "🧼", gif: "https://fonts.gstatic.com/s/e/notoemoji/latest/1f9fc/512.gif" },
  { id: "fruit", label: "每天吃水果", emoji: "🍎", gif: "https://fonts.gstatic.com/s/e/notoemoji/latest/1f34e/512.gif" },
  { id: "traffic", label: "紅燈停下來", emoji: "🚦", gif: "https://fonts.gstatic.com/s/e/notoemoji/latest/1f6a6/512.gif" },
  { id: "sleep", label: "晚上好好睡覺", emoji: "🛏️", gif: "https://fonts.gstatic.com/s/e/notoemoji/latest/1f6cc/512.gif" },
  { id: "trash", label: "垃圾丟垃圾桶", emoji: "🗑️", gif: "https://fonts.gstatic.com/s/e/notoemoji/latest/1f5d1/512.gif" },
  { id: "teeth", label: "早晚刷牙齒", emoji: "🪥", gif: "https://fonts.gstatic.com/s/e/notoemoji/latest/1faa5/512.gif" }
];

// 設定作答狀態、拖曳資料與煙火粒子。
let answers = [];
let placements = Array(quizItems.length).fill(null);
let gifElements = [];
let draggingId = null;
let dragSourceSlot = -1;
let dragOffsetX = 0;
let dragOffsetY = 0;
let resultScore = null;
let fireworks = [];
let reduceMotion = false;

// 建立全螢幕畫布、GIF 圖片與符合手機尺寸的頁面樣式。
function setup() {
  createCanvas(windowWidth, windowHeight);
  pixelDensity(Math.min(window.devicePixelRatio || 1, 2));
  textFont("Arial, sans-serif");
  textAlign(CENTER, CENTER);
  reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  document.documentElement.lang = "zh-Hant";
  document.title = "生活小達人｜拖曳配對測驗";
  document.body.insertAdjacentHTML("beforeend", `
    <style>
      html, body { width: 100%; height: 100%; margin: 0; overflow: hidden; }
      body { background: #fffaf0; touch-action: none; }
      canvas { display: block; width: 100%; height: 100%; }
      .quiz-gif { position: fixed; z-index: 2; object-fit: contain; pointer-events: none; }
      @media (max-height: 620px) { body { overflow-y: auto; } canvas { min-height: 620px; } }
    </style>
  `);
  quizItems.forEach((item) => {
    const image = createImg(item.gif, item.label);
    image.addClass("quiz-gif");
    image.attribute("draggable", "false");
    image.elt.onerror = () => image.hide();
    gifElements.push(image);
  });
  answers = shuffle([...quizItems]);
}

// 繪製背景、題目配對區、答案卡與目前的作答狀態。
function draw() {
  background("#fffaf0");
  const layout = getLayout();
  drawBackgroundPattern();
  drawHeader(layout);
  drawQuestionSlots(layout);
  drawAnswerCards(layout);
  drawSubmitButton(layout);
  positionGifImages(layout);
  if (resultScore !== null) drawResultOverlay();
  drawFireworks();
}

// 計算不同螢幕寬度下的版面座標與卡片尺寸。
function getLayout() {
  const narrow = width < 980;
  const mobile = width < 700;
  const compact = narrow && height < 640;
  const margin = mobile ? 18 : 36;
  const contentWidth = Math.min(width - margin * 2, 1120);
  const left = (width - contentWidth) / 2;
  const top = compact ? 88 : mobile ? 106 : 112;
  const columns = narrow ? 3 : 6;
  const gap = mobile ? 8 : 14;
  const tileWidth = (contentWidth - gap * (columns - 1)) / columns;
  const tileHeight = compact ? 116 : mobile ? 150 : 204;
  const rows = Math.ceil(quizItems.length / columns);
  const gridHeight = rows * tileHeight + (rows - 1) * gap;
  const answerTitleY = top + gridHeight + (mobile ? 22 : 31);
  const answerTop = answerTitleY + (mobile ? 20 : 28);
  const answerColumns = narrow ? 3 : 6;
  const answerGap = mobile ? 8 : 12;
  const answerWidth = (contentWidth - answerGap * (answerColumns - 1)) / answerColumns;
  const answerHeight = compact ? 50 : mobile ? 62 : 72;
  const answerRows = Math.ceil(quizItems.length / answerColumns);
  const buttonY = answerTop + answerRows * (answerHeight + answerGap) + (mobile ? 15 : 25);
  return { narrow, mobile, compact, left, contentWidth, top, columns, gap, tileWidth, tileHeight, rows, answerTitleY, answerTop, answerColumns, answerGap, answerWidth, answerHeight, buttonY };
}

// 畫出柔和的點點底紋，讓畫布看起來活潑但不干擾作答。
function drawBackgroundPattern() {
  noStroke();
  fill("#f6ead0");
  for (let x = 20; x < width; x += 34) {
    for (let y = 18; y < height; y += 34) circle(x, y, 2.5);
  }
}

// 顯示測驗名稱、簡短說明與完成題數。
function drawHeader(layout) {
  noStroke();
  fill("#24483f");
  textStyle(BOLD);
  textSize(layout.compact ? 27 : layout.mobile ? 27 : 36);
  text("生活小達人", width / 2, layout.compact ? 25 : 35);
  fill("#69796f");
  textStyle(NORMAL);
  textSize(layout.mobile ? 15 : 17);
  text("把文字拖到正確的圖案下方", width / 2, layout.compact ? 52 : 67);
  const completed = placements.filter((answer) => answer !== null).length;
  fill("#e7f0df");
  rect(width / 2 - 60, layout.compact ? 61 : 82, 120, 26, 13);
  fill("#426b4e");
  textStyle(BOLD);
  textSize(14);
  text(`${completed} / ${quizItems.length} 題完成`, width / 2, layout.compact ? 74 : 95);
}

// 畫出六個 GIF 題目，以及各自接受文字答案的放置區。
function drawQuestionSlots(layout) {
  quizItems.forEach((item, index) => {
    const position = slotPosition(layout, index);
    const selectedAnswer = placements[index];
    const cardY = position.y;
    noStroke();
    fill("#ffffff");
    rect(position.x, cardY, layout.tileWidth, layout.tileHeight, 17);
    stroke(selectedAnswer ? "#7cb78a" : "#e5dbc7");
    strokeWeight(selectedAnswer ? 2 : 1);
    noFill();
    rect(position.x, cardY, layout.tileWidth, layout.tileHeight, 17);
    noStroke();
    const haloColors = ["#e8f3df", "#fff0d7", "#e0f1f4", "#fde4df", "#f1e8fa", "#fae8f0"];
    const imageCenterY = cardY + (layout.compact ? 35 : layout.mobile ? 46 : 63);
    fill(haloColors[index]);
    circle(position.x + layout.tileWidth / 2, imageCenterY, Math.min(layout.compact ? 78 : layout.mobile ? 104 : 144, layout.tileWidth * 0.86));
    fill("#ffffff");
    circle(position.x + layout.tileWidth / 2 - layout.tileWidth * 0.28, imageCenterY - 17, 8);
    circle(position.x + layout.tileWidth / 2 + layout.tileWidth * 0.29, imageCenterY + 14, 6);
    const dropY = cardY + (layout.compact ? 66 : layout.mobile ? 91 : 130);
    const dropHeight = layout.compact ? 43 : layout.mobile ? 51 : 60;
    if (selectedAnswer) {
      fill("#eaf4e8");
      rect(position.x + 7, dropY, layout.tileWidth - 14, dropHeight, 10);
      fill("#315c43");
      textStyle(BOLD);
      textSize(layout.compact ? 13 : layout.mobile ? 15 : 18);
      text(selectedAnswer.label, position.x + 10, dropY + dropHeight / 2, layout.tileWidth - 20, dropHeight - 4);
    } else {
      noFill();
      stroke("#c8d1c5");
      strokeWeight(1.5);
      drawingContext.setLineDash([5, 4]);
      rect(position.x + 7, dropY, layout.tileWidth - 14, dropHeight, 10);
      drawingContext.setLineDash([]);
      noStroke();
      fill("#89958b");
      textStyle(NORMAL);
      textSize(layout.compact ? 12 : layout.mobile ? 14 : 16);
      text("放這裡", position.x + layout.tileWidth / 2, dropY + dropHeight / 2);
    }
  });
}

// 顯示還未使用的文字選項，並把正在拖曳的選項跟隨指標。
function drawAnswerCards(layout) {
  fill("#24483f");
  noStroke();
  textStyle(BOLD);
  textSize(layout.mobile ? 17 : 20);
  text("選一選，拖曳到上方配對", width / 2, layout.answerTitleY);
  const available = answers.filter((answer) => !placements.some((placed) => placed && placed.id === answer.id) && answer.id !== draggingId);
  available.forEach((answer) => {
    const index = answers.indexOf(answer);
    const position = answerPosition(layout, index);
    drawAnswerCard(answer, position.x, position.y, layout.answerWidth, layout.answerHeight, false, layout.mobile);
  });
  if (draggingId) {
    const answer = answers.find((entry) => entry.id === draggingId);
    if (answer) drawAnswerCard(answer, mouseX - dragOffsetX, mouseY - dragOffsetY, layout.answerWidth, layout.answerHeight, true, layout.mobile);
  }
}

// 繪製單張文字答案卡，拖曳時加上清楚的浮起效果。
function drawAnswerCard(answer, x, y, cardWidth, cardHeight, isDragging, mobile) {
  noStroke();
  fill(isDragging ? "#f0b35a" : "#fffdf8");
  rect(x, y + (isDragging ? 2 : 4), cardWidth, cardHeight, 12);
  fill(isDragging ? "#dfa14d" : "#eadfce");
  rect(x, y, cardWidth, cardHeight, 12);
  fill(isDragging ? "#ffffff" : "#334d42");
  textStyle(BOLD);
  textSize(mobile ? 15 : 19);
  text(answer.label, x + 6, y + 2, cardWidth - 12, cardHeight - 4);
}

// 作答全部完成後才顯示交卷按鈕，避免未完成時誤送出。
function drawSubmitButton(layout) {
  if (placements.some((answer) => answer === null) || resultScore !== null) return;
  const buttonWidth = Math.min(layout.contentWidth, 250);
  const buttonHeight = layout.compact ? 46 : layout.mobile ? 54 : 62;
  const buttonX = (width - buttonWidth) / 2;
  const buttonY = layout.buttonY;
  noStroke();
  fill("#f1a45b");
  rect(buttonX, buttonY + 4, buttonWidth, buttonHeight, 15);
  fill("#e98543");
  rect(buttonX, buttonY, buttonWidth, buttonHeight, 15);
  fill("#ffffff");
  textStyle(BOLD);
  textSize(layout.mobile ? 18 : 21);
  text("交卷看成績", width / 2, buttonY + buttonHeight / 2);
}

// 將 GIF 放在對應題目卡片上方，載入失敗時改用彩色表情符號。
function positionGifImages(layout) {
  quizItems.forEach((item, index) => {
    const position = slotPosition(layout, index);
    const image = gifElements[index];
    const imageSize = Math.min(layout.compact ? 60 : layout.mobile ? 82 : 116, layout.tileWidth * 0.68);
    const imageX = position.x + (layout.tileWidth - imageSize) / 2;
    const imageY = position.y + (layout.compact ? 5 : layout.mobile ? 8 : 12);
    image.position(imageX, imageY);
    image.size(imageSize, imageSize);
    if (image.elt.complete && image.elt.naturalWidth > 0) {
      image.show();
    } else {
      image.hide();
      noStroke();
      textSize(Math.min(layout.compact ? 46 : layout.mobile ? 62 : 86, layout.tileWidth * 0.68));
      text(item.emoji, position.x + layout.tileWidth / 2, position.y + (layout.compact ? 35 : layout.mobile ? 46 : 63));
    }
  });
}

// 顯示交卷結果，並依正確率給予不同的鼓勵訊息。
function drawResultOverlay() {
  noStroke();
  fill(36, 57, 48, 155);
  rect(0, 0, width, height);
  const panelWidth = Math.min(width - 36, 360);
  const panelHeight = 270;
  const panelX = (width - panelWidth) / 2;
  const panelY = (height - panelHeight) / 2;
  fill("#fffdf7");
  rect(panelX, panelY, panelWidth, panelHeight, 22);
  fill("#24483f");
  textStyle(BOLD);
  textSize(22);
  text("測驗完成！", width / 2, panelY + 43);
  fill("#e98543");
  textSize(58);
  text(`${resultScore}%`, width / 2, panelY + 112);
  fill("#52665a");
  textStyle(NORMAL);
  textSize(15);
  text(resultScore > 80 ? "太棒了，你是生活小達人！" : "再試一次，你會越來越棒！", width / 2, panelY + 160);
  fill("#e98543");
  rect(width / 2 - 78, panelY + 194, 156, 46, 13);
  fill("#ffffff");
  textStyle(BOLD);
  textSize(15);
  text("再玩一次", width / 2, panelY + 217);
}

// 高於 80 分時週期性發射彩色粒子，並持續更新煙火的重力與淡出。
function drawFireworks() {
  if (resultScore > 80 && !reduceMotion && frameCount % 22 === 0) createFirework();
  fireworks = fireworks.filter((particle) => particle.life > 0);
  fireworks.forEach((particle) => {
    particle.x += particle.vx;
    particle.y += particle.vy;
    particle.vy += 0.035;
    particle.life -= 1;
    noStroke();
    fill(red(particle.color), green(particle.color), blue(particle.color), particle.life * 4);
    circle(particle.x, particle.y, particle.size);
  });
}

// 在畫面上方建立一束由多色粒子組成的煙火。
function createFirework() {
  const colors = ["#ef755d", "#f3b744", "#65a889", "#68a9c0", "#ed8bb2"];
  const centerX = random(width * 0.12, width * 0.88);
  const centerY = random(height * 0.12, height * 0.55);
  for (let index = 0; index < 26; index += 1) {
    const angle = (TWO_PI * index) / 26;
    const speed = random(1.4, 4.2);
    fireworks.push({ x: centerX, y: centerY, vx: cos(angle) * speed, vy: sin(angle) * speed, life: random(34, 62), size: random(3, 6), color: color(random(colors)) });
  }
}

// 回傳題目卡片的位置，方便繪圖、GIF 定位與拖曳命中共用。
function slotPosition(layout, index) {
  const row = Math.floor(index / layout.columns);
  const column = index % layout.columns;
  return { x: layout.left + column * (layout.tileWidth + layout.gap), y: layout.top + row * (layout.tileHeight + layout.gap) };
}

// 回傳文字選項的位置，確保觸控與滑鼠都使用相同的命中範圍。
function answerPosition(layout, index) {
  const column = index % layout.answerColumns;
  const row = Math.floor(index / layout.answerColumns);
  return { x: layout.left + column * (layout.answerWidth + layout.answerGap), y: layout.answerTop + row * (layout.answerHeight + layout.answerGap) };
}

// 從答案卡或已放置的答案開始拖曳，保留卡片相對於指標的抓取位置。
function mousePressed() {
  if (resultScore !== null) {
    const panelY = (height - 270) / 2;
    if (mouseX > width / 2 - 90 && mouseX < width / 2 + 90 && mouseY > panelY + 185 && mouseY < panelY + 250) resetQuiz();
    return false;
  }
  const layout = getLayout();
  for (let index = 0; index < placements.length; index += 1) {
    if (!placements[index]) continue;
    const position = slotPosition(layout, index);
    if (inside(mouseX, mouseY, position.x, position.y, layout.tileWidth, layout.tileHeight)) {
      draggingId = placements[index].id;
      dragSourceSlot = index;
      dragOffsetX = layout.tileWidth / 2;
      dragOffsetY = layout.answerHeight / 2;
      return false;
    }
  }
  const available = answers.filter((answer) => !placements.some((placed) => placed && placed.id === answer.id));
  for (const answer of available) {
    const position = answerPosition(layout, answers.indexOf(answer));
    if (inside(mouseX, mouseY, position.x, position.y, layout.answerWidth, layout.answerHeight)) {
      draggingId = answer.id;
      dragSourceSlot = -1;
      dragOffsetX = mouseX - position.x;
      dragOffsetY = mouseY - position.y;
      return false;
    }
  }
  if (!placements.includes(null)) {
    const buttonWidth = Math.min(layout.contentWidth, 250);
    if (inside(mouseX, mouseY, (width - buttonWidth) / 2, layout.buttonY, buttonWidth, 52)) submitQuiz();
  }
  return false;
}

// 放開滑鼠或手指時，把文字答案放入命中的題目欄位。
function mouseReleased() {
  if (!draggingId) return false;
  const layout = getLayout();
  const target = quizItems.findIndex((item, index) => {
    const position = slotPosition(layout, index);
    return inside(mouseX, mouseY, position.x, position.y, layout.tileWidth, layout.tileHeight);
  });
  if (target >= 0) {
    if (dragSourceSlot >= 0) placements[dragSourceSlot] = null;
    placements[target] = answers.find((answer) => answer.id === draggingId);
  } else if (dragSourceSlot >= 0) {
    placements[dragSourceSlot] = null;
  }
  draggingId = null;
  dragSourceSlot = -1;
  return false;
}

// 計算答對題數並顯示成績；超過 80 分時立刻啟動煙火。
function submitQuiz() {
  const correctCount = placements.reduce((total, answer, index) => total + (answer && answer.id === quizItems[index].id ? 1 : 0), 0);
  resultScore = Math.round((correctCount / quizItems.length) * 100);
  if (resultScore > 80 && !reduceMotion) createFirework();
}

// 重新排列答案並清除成績、作答內容與煙火狀態。
function resetQuiz() {
  placements = Array(quizItems.length).fill(null);
  answers = shuffle([...quizItems]);
  resultScore = null;
  fireworks = [];
}

// 判斷滑鼠或手指座標是否落在指定矩形中。
function inside(pointerX, pointerY, x, y, rectangleWidth, rectangleHeight) {
  return pointerX >= x && pointerX <= x + rectangleWidth && pointerY >= y && pointerY <= y + rectangleHeight;
}

// 視窗尺寸改變時重新調整全螢幕畫布。
function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}
