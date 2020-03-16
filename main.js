const FONT_WIDTH = 6;
const FONT_HEIGHT = 8;
const COL_MAX = 8;
const ROW_MAX = 32;
const IMAGE_LONG_SIZE = 192;
const IMAGE_SHORT_SIZE = 64;

function getTemplate(selector) {
  const template = document.querySelector(selector);
  return document.importNode(template.content, true);
}

class HelixFilesElement extends HTMLElement {
  connectedCallback() {
    this.innerHTML = "";
    this.appendChild(getTemplate("#template-helix-files-element"));
    this.button0 = this.querySelector("[data-file='button0']");
    this.button1 = this.querySelector("[data-file='button1']");
    this.file0 = this.querySelector("[data-file='file0']");
    this.file1 = this.querySelector("[data-file='file1']");
    this.label0 = this.querySelector("[data-file='label0']");
    this.label1 = this.querySelector("[data-file='label1']");
    this.button0.addEventListener("click", _event => {
      this.file0.click();
    });
    this.button1.addEventListener("click", _event => {
      this.file1.click();
    });
    this.file0.addEventListener("change", event => {
      event.preventDefault();
      const file = event.target.files[0];
      this.button0.textContent = `Change file 0... [${file.name}]`;
      const obj = { detail: { file } };
      this.dispatchEvent(new CustomEvent(`change-file0`, obj));
    });
    this.file1.addEventListener("change", event => {
      event.preventDefault();
      const file = event.target.files[0];
      this.button1.textContent = `Change file 1... [${file.name}]`;
      const obj = { detail: { file } };
      this.dispatchEvent(new CustomEvent(`change-file0`, obj));
    });
    const createDragHandler = element => event => {
      event.preventDefault();
      event.stopPropagation();
      event.dataTransfer.dropEffect = "copy";
      const isDragging =
        event.type === "dragover" || event.type === "dragenter";
      element.classList.toggle("dnd-hover", isDragging);
    };
    const eventNames = [
      "drag",
      "dragstart",
      "dragend",
      "dragover",
      "dragenter",
      "dragleave",
      "drop"
    ];
    for (const name of eventNames) {
      this.button0.addEventListener(name, createDragHandler(this.button0));
      this.button1.addEventListener(name, createDragHandler(this.button1));
    }
    this.button0.addEventListener("drop", event => {
      event.preventDefault();
      dispatchChangeFileEvent(0, event.dataTransfer.files[0]);
    });
    this.button1.addEventListener("drop", event => {
      event.preventDefault();
      dispatchChangeFileEvent(1, event.dataTransfer.files[0]);
    });
  }
}

class HelixPreviewElement extends HTMLElement {
  connectedCallback() {
    this.innerHTML = "";
    this.classList.add("size-min", "grid", "gap-1rem");
    this.appendChild(getTemplate("#template-helix-preview-element"));
    this.hCanvas = this.querySelector("[data-orientation='horizontal']");
    this.vCanvas = this.querySelector("[data-orientation='vertical']");
    this.longSize = IMAGE_LONG_SIZE;
    this.shortSize = IMAGE_SHORT_SIZE;
    this.scale = 3;

    this.hCanvas.width = this.longSize;
    this.hCanvas.height = this.shortSize;
    this.hCanvas.style.width = this.longSize * this.scale + "px";
    this.hCanvas.style.height = this.shortSize * this.scale + "px";
    this.hCanvas.style.imageRendering = "crisp-edges";
    this.hCanvas.style.imageRendering = "pixelated";
    this.hCtx = this.hCanvas.getContext("2d");

    this.vCanvas.width = this.shortSize;
    this.vCanvas.height = this.longSize;
    this.vCanvas.style.width = this.shortSize * this.scale + "px";
    this.vCanvas.style.height = this.longSize * this.scale + "px";
    this.vCanvas.style.imageRendering = "crisp-edges";
    this.vCanvas.style.imageRendering = "pixelated";
    this.vCtx = this.vCanvas.getContext("2d");

    this.img = document.createElement("img");
    this.img.onload = () => {
      this._update();
    };
    this.img.src = "font5x7.png";

    const files = document.querySelector("#files");
    files.addEventListener("change-file0", event => {
      createImageBitmap(event.detail.file).then(bitmap => {
        this.bitmap0 = bitmap;
        this._update();
      });
    });
    files.addEventListener("change-file1", event => {
      createImageBitmap(event.detail.file).then(bitmap => {
        this.bitmap1 = bitmap;
        this._update();
      });
    });
  }

  _update() {
    this.hCtx.fillStyle = "var(--bit-color0)";
    this.hCtx.fillRect(0, 0, this.hCanvas.width, this.hCanvas.height);
    this.hCtx.drawImage(this.img, 0, 0);
    if (this.bitmap0) {
      this._drawRotated(this.hCtx, this.bitmap0, 0, 0, -Math.PI / 2);
    }
    if (this.bitmap1) {
      this._drawRotated(
        this.hCtx,
        this.bitmap1,
        0,
        IMAGE_LONG_SIZE / 2,
        -Math.PI / 2
      );
    }

    this.vCtx.fillStyle = "var(--bit-color0)";
    this.vCtx.fillRect(0, 0, this.vCanvas.width, this.vCanvas.height);
    this._drawRotated(this.vCtx, this.img, 0, 0, Math.PI / 2);
    if (this.bitmap0) {
      this.vCtx.drawImage(this.bitmap0, 0, 0);
    }
    if (this.bitmap1) {
      this.vCtx.drawImage(this.bitmap1, 0, IMAGE_LONG_SIZE / 2);
    }
    const imageData = this.vCtx.getImageData(
      0,
      0,
      this.vCanvas.width,
      this.vCanvas.height
    );
    const obj = { detail: { imageData } };
    this.dispatchEvent(new CustomEvent("update", obj));
  }

  _drawRotated(ctx, img, x, y, radians) {
    const { width, height } = ctx.canvas;
    ctx.save();
    ctx.translate(width / 2, height / 2);
    ctx.rotate(radians);
    ctx.drawImage(img, x - height / 2, y - width / 2);
    ctx.restore();
  }
}

class HelixFontElement extends HTMLElement {
  connectedCallback() {
    this.innerHTML = "";
    this.classList.add("grid", "gap-1rem");
    this.appendChild(getTemplate("#template-helix-font-element"));
    document.querySelector("#preview").addEventListener("update", event => {
      this._update(event.detail.imageData);
    });
    this.querySelector("button").addEventListener("click", _event => {
      const textarea = this.querySelector("textarea");
      textarea.select();
      document.execCommand("copy");
      setTimeout(() => {
        textarea.scrollTop = 0;
        document.getSelection().removeAllRanges();
      }, 200);
    });
  }

  _update(imageData) {
    const array = imageDataToArray(imageData);
    const lines = [];
    for (let outerCol = COL_MAX - 1; outerCol >= 0; outerCol--) {
      for (let outerRow = 0; outerRow < ROW_MAX; outerRow++) {
        const line = [];
        for (let innerRow = 0; innerRow < FONT_WIDTH; innerRow++) {
          let curByte = 0;
          for (let innerCol = 0; innerCol < FONT_HEIGHT; innerCol++) {
            const x = outerCol * FONT_HEIGHT + innerCol;
            const y = outerRow * FONT_WIDTH + innerRow;
            const bit = array[y][x];
            curByte = (curByte << 1) | bit;
          }
          line.push(formatByte(curByte));
        }
        lines.push("    " + line.join(", ") + ",");
      }
    }
    const code = formatLines(lines);
    const textarea = this.querySelector("textarea");
    textarea.value = code;
    textarea.scrollTop = 0;
  }
}

function formatLines(lines) {
  return `\
// helixfont.h

#pragma once

#if defined(__AVR__)
    #include <avr/io.h>
    #include <avr/pgmspace.h>
#elif defined(ESP8266)
    #include <pgmspace.h>
#else
    #define PROGMEM
#endif

static const unsigned char font[] PROGMEM = {
${lines.join("\n")}
};
`;
}

function formatByte(b) {
  return "0x" + b.toString(16).padStart(2, "0");
}

function imageDataToArray(imageData) {
  const { data, width, height } = imageData;
  const bpp = 4;
  const threshold = 128;
  const array = [];
  for (let y = 0; y < height; y++) {
    const row = [];
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * bpp;
      const red = data[i];
      row.push(red > threshold ? 1 : 0);
    }
    array.push(row);
  }
  return array;
}

customElements.define("helix-files", HelixFilesElement);
customElements.define("helix-preview", HelixPreviewElement);
customElements.define("helix-font", HelixFontElement);
