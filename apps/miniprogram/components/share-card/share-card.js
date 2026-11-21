// 成就卡片：canvas 2d 绘制 1080×1350 的图，可保存到相册或直接转发。
// 布局与 apps/mobile/src/share/ShareCardView.tsx 对应（设计稿 1080×1350）。

var palette = require("../../lib/share");

var FONT = '-apple-system, "PingFang SC", "Helvetica Neue", sans-serif';

Component({
  options: {
    styleIsolation: "apply-shared"
  },

  data: {
    show: false,
    title: "",
    busy: false,
    readyVersion: 0
  },

  methods: {
    // type: mobile 一致的三类标题
    titleFor: function (type) {
      if (type === "milestone") return "里程碑";
      if (type === "review") return "回顾";
      return "今日";
    },

    open: function (card) {
      if (!card) return;
      var version = this.resetImage();
      this.setData({
        show: true,
        title: this.titleFor(card.type),
        busy: false,
        readyVersion: 0
      }, this.draw.bind(this, card, version));
    },

    close: function () {
      this.resetImage();
      this.setData({ show: false, busy: false, readyVersion: 0 });
      this.triggerEvent("close");
    },

    resetImage: function () {
      this.tempPath = "";
      this.shareVersion = (this.shareVersion || 0) + 1;
      return this.shareVersion;
    },

    shareImage: function (event) {
      var target = event && event.from === "button" && event.target;
      var version = target && target.dataset && target.dataset.cardVersion;
      return this.data.show && version && Number(version) === this.shareVersion
        ? this.tempPath
        : "";
    },

    draw: function (card, version) {
      var self = this;
      if (version !== this.shareVersion) return;

      this.createSelectorQuery()
        .select("#card")
        .fields({ node: true, size: true })
        .exec(function (res) {
          if (version !== self.shareVersion || !res || !res[0] || !res[0].node) return;
          var canvas = res[0].node;
          var ctx = canvas.getContext("2d");
          canvas.width = palette.CARD_W;
          canvas.height = palette.CARD_H;
          self.paint(ctx, card);
          setTimeout(function () {
            if (version !== self.shareVersion) return;
            wx.canvasToTempFilePath(
              {
                canvas: canvas,
                x: 0,
                y: 0,
                width: palette.CARD_W,
                height: palette.CARD_H,
                destWidth: palette.CARD_W,
                destHeight: palette.CARD_H,
                success: function (r) {
                  if (version !== self.shareVersion) return;
                  self.tempPath = r.tempFilePath;
                  self.setData({ readyVersion: version });
                }
              },
              self
            );
          }, 80);
        });
    },

    // ---------- 绘制 ----------
    paint: function (ctx, card) {
      var c = card.colors;
      var W = palette.CARD_W;
      var H = palette.CARD_H;
      var pad = 96;

      ctx.fillStyle = c.paper;
      ctx.fillRect(0, 0, W, H);
      ctx.textBaseline = "top";

      if (card.type !== "milestone" && card.eyebrow) {
        ctx.fillStyle = c.text3;
        ctx.font = 'bold 30px ' + FONT;
        ctx.textAlign = "left";
        ctx.fillText(card.eyebrow, pad, 92);
      }

      if (card.type === "milestone") {
        ctx.textAlign = "center";
        ctx.fillStyle = c.accent;
        ctx.font = 'bold 104px ' + FONT;
        ctx.fillText(card.eyebrow, W / 2, 286);

        ctx.fillStyle = c.text;
        ctx.font = 'bold 56px ' + FONT;
        this.centerBlock(ctx, card.headline, W / 2, 450, W - pad * 2, 72);

        if (card.badge) {
          this.pill(ctx, card.badge, W / 2, 600, c);
        }

        ctx.fillStyle = c.text3;
        ctx.font = '30px ' + FONT;
        ctx.textAlign = "center";
        ctx.fillText("连续 " + card.streakDays + " 天", W / 2, 726);

        this.quote(ctx, card, W, pad, 860);
      } else if (card.type === "review" && card.heat) {
        ctx.textAlign = "left";
        ctx.fillStyle = c.text;
        ctx.font = 'bold 52px ' + FONT;
        var lines = this.wrap(ctx, card.headline, W - pad * 2);
        for (var li = 0; li < lines.length; li++) {
          ctx.fillText(lines[li], pad, 92 + li * 68);
        }

        var cols = card.heatCols || 6;
        var cell = 110;
        var gap = 14;
        var gridW = cols * cell + (cols - 1) * gap;
        var startX = (W - gridW) / 2;
        var startY = 264;
        var rows = Math.ceil(card.heat.length / cols);

        for (var i = 0; i < card.heat.length; i++) {
          var r = Math.floor(i / cols);
          var col = i % cols;
          var x = startX + col * (cell + gap);
          var y = startY + r * (cell + gap);
          var lit = card.streakDays === 0 && i === card.heat.length - 1;
          this.roundRect(ctx, x, y, cell, cell, cell * 0.22);
          ctx.fillStyle = lit ? c.heat3 : palette.heatColor(c, card.heat[i]);
          ctx.fill();
          ctx.lineWidth = lit ? 3 : 1;
          ctx.strokeStyle = lit ? c.accent : c.rule;
          ctx.stroke();
        }

        ctx.textAlign = "center";
        ctx.fillStyle = c.accent;
        ctx.font = 'bold 44px ' + FONT;
        ctx.fillText(
          card.streakDays > 0 ? "连续 " + card.streakDays + " 天" : "从今天，开始打卡",
          W / 2,
          startY + rows * (cell + gap) + 26
        );
      } else {
        ctx.textAlign = "left";
        ctx.fillStyle = c.text;
        ctx.font = 'bold 58px ' + FONT;
        ctx.fillText(card.headline, pad, 146);

        ctx.textAlign = "center";
        ctx.fillStyle = c.accent;
        ctx.font = 'bold 190px ' + FONT;
        ctx.fillText(String(card.streakDays), W / 2, 320);

        ctx.fillStyle = c.text3;
        ctx.font = '30px ' + FONT;
        ctx.fillText("连续天数", W / 2, 540);

        ctx.fillStyle = c.text2;
        ctx.fillText("今日  " + card.goalDone + " / " + card.goalTotal + " 组", W / 2, 645);

        // 进度条
        var barY = 690;
        var barW = W - pad * 2;
        this.roundRect(ctx, pad, barY, barW, 14, 7);
        ctx.fillStyle = c.paperDeep;
        ctx.fill();
        var ratio = card.goalTotal > 0 ? Math.min(1, card.goalDone / card.goalTotal) : 0;
        if (ratio > 0) {
          this.roundRect(ctx, pad, barY, barW * ratio, 14, 7);
          ctx.fillStyle = c.accent;
          ctx.fill();
        }

        this.quote(ctx, card, W, pad, 820);
      }

      // 落款
      ctx.textAlign = "right";
      ctx.fillStyle = c.text;
      ctx.font = 'bold 38px ' + FONT;
      ctx.fillText(card.brand, W - pad, H - 130 - 38);
      ctx.textAlign = "left";
      ctx.fillStyle = c.text3;
      ctx.font = '26px ' + FONT;
      ctx.fillText("微信小程序 · 提了么", pad, H - 60 - 26);
    },

    quote: function (ctx, card, W, pad, top) {
      if (!card.sub) return;
      ctx.textAlign = "center";
      ctx.fillStyle = card.colors.text2;
      ctx.font = '30px ' + FONT;
      var lines = this.wrap(ctx, "「" + card.sub + "」", W - pad * 2);
      for (var i = 0; i < lines.length && i < 2; i++) {
        ctx.fillText(lines[i], W / 2, top + i * 44);
      }
    },

    centerBlock: function (ctx, text, cx, top, maxWidth, lineHeight) {
      ctx.textAlign = "center";
      var lines = this.wrap(ctx, text, maxWidth);
      for (var i = 0; i < lines.length; i++) {
        ctx.fillText(lines[i], cx, top + i * lineHeight);
      }
    },

    pill: function (ctx, text, cx, top, c) {
      ctx.font = 'bold 32px ' + FONT;
      var w = ctx.measureText(text).width;
      var pw = w + 80;
      var ph = 64;
      ctx.textAlign = "center";
      this.roundRect(ctx, cx - pw / 2, top, pw, ph, 32);
      ctx.fillStyle = c.accent;
      ctx.fill();
      ctx.fillStyle = "#FFFFFF";
      ctx.textBaseline = "top";
      ctx.fillText(text, cx, top + 14);
    },

    wrap: function (ctx, text, maxWidth) {
      var str = typeof text === "string" ? text : text == null ? "" : String(text);
      var out = [];
      var line = "";
      for (var i = 0; i < str.length; i++) {
        var ch = str.charAt(i);
        var test = line + ch;
        if (ctx.measureText(test).width > maxWidth && line) {
          out.push(line);
          line = ch;
        } else {
          line = test;
        }
      }
      if (line) out.push(line);
      return out;
    },

    roundRect: function (ctx, x, y, w, h, r) {
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.arcTo(x + w, y, x + w, y + h, r);
      ctx.arcTo(x + w, y + h, x, y + h, r);
      ctx.arcTo(x, y + h, x, y, r);
      ctx.arcTo(x, y, x + w, y, r);
      ctx.closePath();
    },

    // ---------- 动作 ----------
    onSave: function () {
      var self = this;
      if (this.data.busy) return;
      if (!this.tempPath) {
        wx.showToast({ title: "图还没画好", icon: "none" });
        return;
      }
      var version = this.shareVersion;
      var path = this.tempPath;
      this.setData({ busy: true });
      var save = function () {
        if (version !== self.shareVersion) return;
        wx.saveImageToPhotosAlbum({
          filePath: path,
          success: function () {
            if (version !== self.shareVersion) return;
            self.setData({ busy: false });
            wx.showToast({ title: "已保存到相册", icon: "success" });
          },
          fail: function () {
            if (version !== self.shareVersion) return;
            self.setData({ busy: false });
            wx.showToast({ title: "保存失败，可试转发", icon: "none" });
          }
        });
      };
      wx.getSetting({
        success: function (res) {
          if (version !== self.shareVersion) return;
          if (res.authSetting["scope.writePhotosAlbum"] === false) {
            self.setData({ busy: false });
            wx.showModal({
              title: "需要相册权限",
              content: "在设置里打开「保存到相册」后才能保存图片。",
              confirmText: "去设置",
              success: function (r) {
                if (r.confirm) wx.openSetting({});
              }
            });
            return;
          }
          save();
        },
        fail: save
      });
    },

    onTapClose: function () {
      this.close();
    },

    noop: function () {}
  }
});
