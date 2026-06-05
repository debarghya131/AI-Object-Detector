export const renderPredictions = (predictions, ctx) => {
  if (!ctx) {
    return;
  }

  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

  const font = "16px sans-serif";
  ctx.font = font;
  ctx.textBaseline = "top";
  ctx.lineJoin = "round";

  predictions.forEach((prediction) => {
    const [x, y, width, height] = prediction["bbox"];
    const lineWidth = 4;
    const inset = lineWidth / 2;
    const boxX = clamp(x, inset, ctx.canvas.width - inset);
    const boxY = clamp(y, inset, ctx.canvas.height - inset);
    const boxWidth = clamp(width, 0, ctx.canvas.width - boxX - inset);
    const boxHeight = clamp(height, 0, ctx.canvas.height - boxY - inset);
    const confidence = Math.round(prediction.score * 100);
    const label = `${prediction.class} ${confidence}%`;
    const color = getPredictionColor(prediction.class);

    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.strokeRect(boxX, boxY, boxWidth, boxHeight);

    ctx.fillStyle = hexToRgba(color, 0.14);
    ctx.fillRect(boxX, boxY, boxWidth, boxHeight);

    ctx.fillStyle = color;
    const textWidth = ctx.measureText(label).width;
    const textHeight = parseInt(font, 10);
    const labelWidth = textWidth + 8;
    const labelHeight = textHeight + 6;
    const labelX = clamp(boxX, 0, ctx.canvas.width - labelWidth);
    const labelY =
      boxY > labelHeight
        ? boxY - labelHeight
        : clamp(boxY + 4, 0, ctx.canvas.height - labelHeight);

    ctx.fillRect(labelX, labelY, labelWidth, labelHeight);

    ctx.fillStyle = "#000000";
    ctx.fillText(label, labelX + 4, labelY + 3);
  });
};

const getPredictionColor = (label) => {
  const colors = ["#22c55e", "#06b6d4", "#f59e0b", "#ef4444", "#a855f7"];
  const index = [...label].reduce((total, char) => total + char.charCodeAt(0), 0);

  return colors[index % colors.length];
};

const hexToRgba = (hex, alpha) => {
  const value = hex.replace("#", "");
  const red = parseInt(value.slice(0, 2), 16);
  const green = parseInt(value.slice(2, 4), 16);
  const blue = parseInt(value.slice(4, 6), 16);

  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
};

const clamp = (value, min, max) =>
  Math.min(Math.max(value, min), Math.max(min, max));
