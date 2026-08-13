const COLORS = {
  background: "#060a16",
  lane: "#0c1326",
  laneGrid: "rgba(141, 178, 255, 0.055)",
  text: "#f7f9ff",
  muted: "#98a3bd",
};

function roundedRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, radius);
}

function initials(name) {
  return String(name || "?")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("") || "?";
}

export class RaceRenderer {
  constructor(canvas, config) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d", { alpha: true });
    this.config = config;
  }

  render(game) {
    const ctx = this.ctx;
    const size = this.config.logicalSize;
    ctx.clearRect(0, 0, size, size);
    this.drawBackdrop(game);

    ctx.save();
    ctx.translate(0, -game.cameraY);
    this.drawSections(game);
    this.drawBodies(game);
    this.drawFinish(game);
    this.drawBalls(game);
    ctx.restore();

    this.drawHud(game);
    this.drawOffscreenMarkers(game);
    this.drawCenterMessage(game);
  }

  drawBackdrop(game) {
    const { ctx } = this;
    const gradient = ctx.createLinearGradient(0, 0, 1080, 1080);
    gradient.addColorStop(0, "#070c1d");
    gradient.addColorStop(0.55, "#0b1022");
    gradient.addColorStop(1, "#050813");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 1080, 1080);

    ctx.fillStyle = COLORS.lane;
    ctx.fillRect(74, 0, 932, 1080);
    ctx.strokeStyle = COLORS.laneGrid;
    ctx.lineWidth = 2;
    const offset = -(game.cameraY % 90);
    for (let y = offset; y < 1080; y += 90) {
      ctx.beginPath();
      ctx.moveTo(74, y);
      ctx.lineTo(1006, y);
      ctx.stroke();
    }
  }

  drawSections(game) {
    const { ctx } = this;
    game.track.sections.forEach((section, index) => {
      if (section.top + section.height < game.cameraY - 80) return;
      if (section.top > game.cameraY + 1160) return;
      ctx.fillStyle = index % 2 === 0 ? "rgba(255,255,255,0.018)" : "transparent";
      ctx.fillRect(76, section.top, 928, section.height);
      ctx.fillStyle = section.accent;
      ctx.globalAlpha = 0.5;
      ctx.fillRect(76, section.top, 7, section.height);
      ctx.globalAlpha = 1;

      if (this.config.debugModuleLabels) {
        ctx.fillStyle = "rgba(255,255,255,0.38)";
        ctx.font = "700 22px system-ui";
        ctx.fillText(section.id, 105, section.top + 38);
      }
    });
  }

  drawBodies(game) {
    const { ctx } = this;
    const bodies = game.Matter.Composite.allBodies(game.engine.world);
    bodies.forEach((body) => {
      const data = body.plugin?.x1;
      if (!data || data.kind === "ball" || data.kind.includes("sensor")) return;
      if (body.bounds.max.y < game.cameraY - 120) return;
      if (body.bounds.min.y > game.cameraY + 1200) return;

      if (data.kind === "wind-zone") {
        this.drawWindZone(body, data);
      } else if (data.kind === "fan") {
        this.drawFan(body, data);
      } else if (data.kind === "spring") {
        this.drawSpring(body, data);
      } else if (["peg", "bumper", "seesaw-pivot"].includes(data.kind)) {
        this.drawCircleBody(body, data);
      } else if (data.kind !== "pinball-marker") {
        this.drawPolygonBody(body, data);
      }
    });
  }

  drawWindZone(body, data) {
    const { ctx } = this;
    const width = data.width ?? 186;
    const height = data.height ?? 650;
    const active = (data.activeUntil ?? 0) > performance.now();
    const gradient = ctx.createLinearGradient(0, body.position.y + height / 2, 0, body.position.y - height / 2);
    gradient.addColorStop(0, active ? "rgba(119,232,255,.25)" : "rgba(119,232,255,.13)");
    gradient.addColorStop(1, "rgba(119,232,255,0)");
    ctx.save();
    ctx.fillStyle = gradient;
    ctx.fillRect(body.position.x - width / 2, body.position.y - height / 2, width, height);
    ctx.strokeStyle = active ? "rgba(210,249,255,.72)" : "rgba(119,232,255,.42)";
    ctx.lineWidth = 5;
    const motion = (performance.now() / 18) % 90;
    for (let y = body.position.y + height / 2 - motion; y > body.position.y - height / 2; y -= 90) {
      ctx.beginPath();
      ctx.moveTo(body.position.x, y - 34);
      ctx.lineTo(body.position.x - 16, y - 10);
      ctx.moveTo(body.position.x, y - 34);
      ctx.lineTo(body.position.x + 16, y - 10);
      ctx.stroke();
    }
    ctx.restore();
  }

  drawFan(body, data) {
    const { ctx } = this;
    const width = data.width ?? 186;
    const height = data.height ?? 82;
    ctx.save();
    ctx.translate(body.position.x, body.position.y);
    ctx.fillStyle = "#17263e";
    ctx.strokeStyle = data.color;
    ctx.lineWidth = 6;
    roundedRect(ctx, -width / 2, -height / 2, width, height, 24);
    ctx.fill();
    ctx.stroke();
    ctx.rotate(-performance.now() / 180);
    ctx.fillStyle = data.color;
    for (let index = 0; index < 4; index += 1) {
      ctx.rotate(Math.PI / 2);
      ctx.beginPath();
      ctx.ellipse(29, 0, 29, 11, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(0, 0, 11, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  drawSpring(body, data) {
    this.drawPolygonBody(body, data);
    const { ctx } = this;
    const flashing = (data.flashUntil ?? 0) > performance.now();
    const vertices = body.vertices;
    const minX = Math.min(...vertices.map((vertex) => vertex.x));
    const maxX = Math.max(...vertices.map((vertex) => vertex.x));
    ctx.save();
    ctx.strokeStyle = flashing ? "#ffffff" : "#433d10";
    ctx.lineWidth = 7;
    ctx.beginPath();
    for (let index = 0; index <= 8; index += 1) {
      const x = minX + ((maxX - minX) * index) / 8;
      const y = body.position.y + (index % 2 === 0 ? -8 : 8);
      if (index === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.restore();
  }

  drawCircleBody(body, data) {
    const { ctx } = this;
    const radius = data.radius ?? body.circleRadius ?? 18;
    const flashing = data.flashUntil > performance.now();
    ctx.save();
    ctx.shadowColor = data.color;
    ctx.shadowBlur = data.kind === "bumper" ? (flashing ? 42 : 22) : 10;
    ctx.fillStyle = flashing ? "#ffffff" : data.color;
    ctx.beginPath();
    ctx.arc(body.position.x, body.position.y, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = data.kind === "bumper" ? 8 : 4;
    ctx.strokeStyle = data.kind === "bumper" ? "rgba(255,255,255,.76)" : "rgba(255,255,255,.38)";
    ctx.stroke();
    if (data.kind === "bumper") {
      ctx.beginPath();
      ctx.arc(body.position.x, body.position.y, radius * 0.45, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(24,8,34,.5)";
      ctx.lineWidth = 9;
      ctx.stroke();
    }
    ctx.restore();
  }

  drawPolygonBody(body, data) {
    const { ctx } = this;
    const parts = body.parts.length > 1 ? body.parts.slice(1) : body.parts;
    ctx.save();
    ctx.fillStyle = data.color;
    ctx.strokeStyle = "rgba(255,255,255,.34)";
    ctx.lineWidth = data.kind === "boundary" ? 2 : 5;
    ctx.shadowColor = data.color;
    ctx.shadowBlur = data.kind === "boundary" ? 0 : 12;
    parts.forEach((part) => {
      ctx.beginPath();
      part.vertices.forEach((vertex, index) => {
        if (index === 0) ctx.moveTo(vertex.x, vertex.y);
        else ctx.lineTo(vertex.x, vertex.y);
      });
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    });
    ctx.restore();
  }

  drawFinish(game) {
    const { ctx } = this;
    const y = game.track.finishY;
    const cell = 22;
    for (let index = 0; index < 8; index += 1) {
      ctx.fillStyle = index % 2 === 0 ? "#ffffff" : "#151b2e";
      ctx.fillRect(452 + index * cell, y - 13, cell, 13);
      ctx.fillStyle = index % 2 === 0 ? "#151b2e" : "#ffffff";
      ctx.fillRect(452 + index * cell, y, cell, 13);
    }
  }

  drawBalls(game) {
    game.balls.forEach((entry) => {
      const { body, participant, color, image } = entry;
      const { x, y } = body.position;
      const radius = body.circleRadius;
      const ctx = this.ctx;

      ctx.save();
      ctx.translate(x, y);
      ctx.shadowColor = color;
      ctx.shadowBlur = 28;
      ctx.fillStyle = "#11192e";
      ctx.beginPath();
      ctx.arc(0, 0, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.clip();

      if (image?.complete && image.naturalWidth > 0) {
        ctx.drawImage(image, -radius, -radius, radius * 2, radius * 2);
      } else {
        const gradient = ctx.createLinearGradient(-radius, -radius, radius, radius);
        gradient.addColorStop(0, color);
        gradient.addColorStop(1, "#18203a");
        ctx.fillStyle = gradient;
        ctx.fillRect(-radius, -radius, radius * 2, radius * 2);
        ctx.fillStyle = "#ffffff";
        ctx.font = `900 ${radius * 0.72}px system-ui`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(initials(participant.displayName), 0, 2);
      }
      ctx.restore();

      ctx.save();
      ctx.strokeStyle = color;
      ctx.lineWidth = 10;
      ctx.shadowColor = color;
      ctx.shadowBlur = 18;
      ctx.beginPath();
      ctx.arc(x, y, radius + 2, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    });
  }

  drawHud(game) {
    const { ctx } = this;
    const gradient = ctx.createLinearGradient(0, 0, 0, 170);
    gradient.addColorStop(0, "rgba(4,7,16,.98)");
    gradient.addColorStop(0.72, "rgba(5,9,21,.9)");
    gradient.addColorStop(1, "rgba(5,9,21,0)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 1080, 185);

    this.drawParticipantCard(game, game.balls[0], 54, 40, 404, "left");
    this.drawParticipantCard(game, game.balls[1], 622, 40, 404, "right");

    ctx.fillStyle = "#8b96b2";
    ctx.font = "900 28px system-ui";
    ctx.textAlign = "center";
    ctx.fillText("VS", 540, 90);

    const elapsed = Math.min(game.elapsedMs, game.config.hardLimitMs);
    ctx.fillStyle = "rgba(255,255,255,.11)";
    roundedRect(ctx, 438, 112, 204, 12, 6);
    ctx.fill();
    ctx.fillStyle = "#73e8ff";
    roundedRect(ctx, 438, 112, 204 * (elapsed / game.config.hardLimitMs), 12, 6);
    ctx.fill();
  }

  drawParticipantCard(game, entry, x, y, width, align) {
    const { ctx } = this;
    const progress = Math.max(0, Math.min(1, entry.body.position.y / game.track.finishY));
    ctx.fillStyle = "rgba(255,255,255,.055)";
    roundedRect(ctx, x, y, width, 92, 24);
    ctx.fill();
    ctx.strokeStyle = `${entry.color}88`;
    ctx.lineWidth = 3;
    ctx.stroke();

    const avatarX = align === "left" ? x + 50 : x + width - 50;
    ctx.save();
    ctx.beginPath();
    ctx.arc(avatarX, y + 45, 31, 0, Math.PI * 2);
    ctx.clip();
    if (entry.image?.complete && entry.image.naturalWidth > 0) {
      ctx.drawImage(entry.image, avatarX - 31, y + 14, 62, 62);
    } else {
      ctx.fillStyle = entry.color;
      ctx.fillRect(avatarX - 31, y + 14, 62, 62);
    }
    ctx.restore();
    ctx.strokeStyle = entry.color;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(avatarX, y + 45, 33, 0, Math.PI * 2);
    ctx.stroke();

    ctx.textAlign = align;
    const textX = align === "left" ? x + 98 : x + width - 98;
    ctx.fillStyle = COLORS.text;
    ctx.font = "900 30px system-ui";
    ctx.fillText(entry.participant.displayName.slice(0, 18), textX, y + 40);
    ctx.fillStyle = COLORS.muted;
    ctx.font = "800 18px system-ui";
    ctx.fillText(`${Math.round(progress * 100)}%`, textX, y + 67);
  }

  drawOffscreenMarkers(game) {
    game.balls.forEach((entry) => {
      const screenY = entry.body.position.y - game.cameraY;
      if (screenY >= 165) return;
      const ctx = this.ctx;
      const x = Math.max(130, Math.min(950, entry.body.position.x));
      ctx.fillStyle = entry.color;
      ctx.beginPath();
      ctx.moveTo(x, 174);
      ctx.lineTo(x - 18, 146);
      ctx.lineTo(x + 18, 146);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = COLORS.text;
      ctx.textAlign = "center";
      ctx.font = "800 18px system-ui";
      ctx.fillText(entry.participant.displayName.slice(0, 12), x, 139);
    });
  }

  drawCenterMessage(game) {
    const { ctx } = this;
    if (game.state === "countdown") {
      const remaining = Math.max(0, game.config.countdownMs - game.countdownElapsedMs);
      const number = Math.max(1, Math.ceil((remaining / game.config.countdownMs) * 3));
      ctx.fillStyle = "rgba(4,7,17,.48)";
      ctx.fillRect(0, 0, 1080, 1080);
      ctx.fillStyle = "#ffffff";
      ctx.shadowColor = "#69ddff";
      ctx.shadowBlur = 48;
      ctx.font = "1000 190px system-ui";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(String(number), 540, 520);
      ctx.shadowBlur = 0;
    }

    if (game.state === "finished" && game.result) {
      ctx.fillStyle = "rgba(4,7,17,.7)";
      ctx.fillRect(0, 0, 1080, 1080);
      const winner = game.balls.find((entry) => entry.participant.id === game.result.winnerId);
      ctx.fillStyle = winner?.color ?? "#ffffff";
      ctx.font = "1000 58px system-ui";
      ctx.textAlign = "center";
      ctx.fillText("VENCEDOR", 540, 450);
      ctx.fillStyle = "#ffffff";
      ctx.font = "1000 82px system-ui";
      ctx.fillText(winner?.participant.displayName ?? "—", 540, 550);
      ctx.fillStyle = COLORS.muted;
      ctx.font = "800 25px system-ui";
      ctx.fillText(
        `${(game.result.finishTimeMs / 1000).toFixed(2)}s • ${game.result.resultReason}`,
        540,
        610,
      );
    }
  }
}
