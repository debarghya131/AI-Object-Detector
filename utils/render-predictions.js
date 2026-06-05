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
    const confidence = Math.round(prediction.score * 100);
    const label = `${prediction.class} ${confidence}%`;
    const color = getPredictionColor(prediction.class);

    ctx.strokeStyle = color;
    ctx.lineWidth = 4;
    ctx.strokeRect(x, y, width, height);

    ctx.fillStyle = hexToRgba(color, 0.14);
    ctx.fillRect(x, y, width, height);

    ctx.fillStyle = color;
    const textWidth = ctx.measureText(label).width;
    const textHeight = parseInt(font, 10);
    const labelWidth = textWidth + 8;
    const labelHeight = textHeight + 6;
    const labelX = Math.max(0, Math.min(x, ctx.canvas.width - labelWidth));
    const labelY = y > labelHeight ? y - labelHeight : y + 4;

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
