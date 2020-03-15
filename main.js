const FONT_WIDTH = 6;
const FONT_HEIGHT = 8;

function globalize(obj) {
  Object.assign(globalThis, obj);
}

function main() {
  customElements.define("helix-files", HelixFilesElement);
  customElements.define("helix-preview", HelixPreviewElement);
  customElements.define("helix-font", HelixFontElement);
}

function getTemplate(selector) {
  const template = document.querySelector(selector);
  return document.importNode(template.content, true);
}

class HelixFilesElement extends HTMLElement {
  connectedCallback() {
    this.innerHTML = "";
    this.appendChild(getTemplate("#template-helix-files-element"));
    this.input = this.querySelector("input");
  }
}

class HelixPreviewElement extends HTMLElement {
  connectedCallback() {
    this.innerHTML = "";
    this.classList.add("helix-preview");
    this.appendChild(getTemplate("#template-helix-preview-element"));
    this.hCanvas = this.querySelector("[data-orientation='horizontal']");
    this.vCanvas = this.querySelector("[data-orientation='vertical']");
    // this.longSize = 192;
    // this.shortSize = 192;
    this.longSize = 192;
    this.shortSize = 64;
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

    globalize({
      vCtx: this.vCtx,
      hCtx: this.hCtx,
      img: this.img
    });
  }

  get file0() {
    return this._file0;
  }

  set file0(file0) {
    this._file0 = file0;
    this._update();
  }

  get file1() {
    return this._file1;
  }

  set file1(file1) {
    this._file1 = file1;
    this._update();
  }

  _update() {
    console.log({
      vCtx: this.vCtx,
      hCtx: this.hCtx,
      file0: this.file0,
      file1: this.file1,
      img: this.img
    });

    this.hCtx.fillStyle = "var(--bit-color0)";
    this.hCtx.fillRect(0, 0, this.hCanvas.width, this.hCanvas.height);
    this.hCtx.drawImage(this.img, 0, 0);

    this.vCtx.fillStyle = "var(--bit-color0)";
    this.vCtx.fillRect(0, 0, this.vCanvas.width, this.vCanvas.height);
    this._drawRotated(Math.PI / 2);
    const imageData = this.vCtx.getImageData(
      0,
      0,
      this.vCanvas.width,
      this.vCanvas.height
    );
    const event = new CustomEvent("update", { detail: { imageData } });
    this.dispatchEvent(event);
  }

  _drawRotated(radians) {
    const { width, height } = this.vCanvas;
    this.vCtx.save();
    this.vCtx.translate(width / 2, height / 2);
    this.vCtx.rotate(radians);
    this.vCtx.drawImage(this.img, -height / 2, -width / 2);
    this.vCtx.restore();
  }
}

class HelixFontElement extends HTMLElement {
  connectedCallback() {
    this.innerHTML = "";
    this.appendChild(getTemplate("#template-helix-font-element"));
    document.querySelector("#preview").addEventListener("update", event => {
      this._update(event.detail.imageData);
    });
  }

  _update(imageData) {
    const array = imageDataToArray(imageData);
    const lines = [];
    const COL_MAX = 8;
    const ROW_MAX = 32;
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
        lines.push(line.join(", "));
      }
    }
    const code = formatLines(lines);
    this.querySelector("textarea").value = code;
  }
}

function formatLines(lines) {
  return `\
// This is the 'classic' fixed-space bitmap font for Adafruit_GFX since 1.0.
// See gfxfont.h for newer custom bitmap font info.

#ifndef FONT5X7_H
#define FONT5X7_H

#ifdef __AVR__
 #include <avr/io.h>
 #include <avr/pgmspace.h>
#elif defined(ESP8266)
 #include <pgmspace.h>
#else
 #define PROGMEM
#endif

// Standard ASCII 5x7 font

static const unsigned char font[] PROGMEM = {
${lines.join("\n")}
};
#endif // FONT5X7_H
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

// ---[ HACK ]---------
globalize({ imageDataToArray });

main();

// <helix-file id="file1"></file-uploader>
// <helix-file id="file2"></file-uploader>
// <helix-preview></helix-preview>
// <helix-font></helix-font>
